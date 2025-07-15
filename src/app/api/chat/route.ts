import { streamText } from "ai";
import { z } from "zod";
import { defaultModel } from "~/models";
import { searchSerper } from "~/serper";
import { auth } from "~/server/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages } = await req.json();

    const result = await streamText({
      model: defaultModel,
      messages,
      maxSteps: 10,
      system: `You are a helpful AI assistant with access to real-time web search capabilities. 

IMPORTANT INSTRUCTIONS:
- You have access to a searchWeb tool that provides current, accurate information from Google search
- ALWAYS use the searchWeb tool to find current information rather than relying on your pre-trained knowledge
- For any factual questions, current events, recent developments, or information that could change over time, you MUST search the web first
- ALWAYS cite your sources by including inline links in your responses using markdown format: [source title](URL)
- When presenting information from search results, include multiple sources when available
- Be concise but thorough in your responses
- If search results are insufficient, perform additional searches with different queries

Remember: Your goal is to provide the most current and accurate information possible by leveraging web search, not your training data.`,
      tools: {
        searchWeb: {
          description: "Search the web for current information using Google search",
          parameters: z.object({
            query: z.string().describe("The search query to look up"),
            num: z.number().default(10).describe("Number of search results to return (default: 10)"),
          }),
          execute: async ({ query, num }, { abortSignal }) => {
            try {
              const results = await searchSerper({ q: query, num }, abortSignal);

              // Return formatted results for the AI to use
              return {
                query,
                results: results.organic.map(result => ({
                  title: result.title,
                  url: result.link,
                  snippet: result.snippet,
                  date: result.date,
                })),
                knowledgeGraph: results.knowledgeGraph,
                peopleAlsoAsk: results.peopleAlsoAsk,
                relatedSearches: results.relatedSearches,
                totalResults: results.organic.length,
              };
            } catch (error) {
              console.error("Search error:", error);
              return {
                error: "Failed to search the web. Please try again.",
                query,
              };
            }
          },
        },
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
} 