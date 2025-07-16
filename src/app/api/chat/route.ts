import { streamText } from "ai";
import { z } from "zod";
import { defaultModel } from "~/models";
import { searchSerper } from "~/serper";
import { auth } from "~/server/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    console.log("🔍 Session check:", !!session?.user, session?.user?.name);

    if (!session?.user) {
      console.log("❌ No session, returning 401");
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages } = await req.json();
    console.log("📝 Processing messages:", messages.length);
    console.log("📝 Last message:", messages[messages.length - 1]?.content);

    // Define tools object
    const tools = {
      searchWeb: {
        description: "Search the web for current information using Google search",
        parameters: z.object({
          query: z.string().describe("The search query to look up"),
          num: z.number().default(10).describe("Number of search results to return (default: 10)"),
        }),
        execute: async (args: { query: string; num: number }, options: { abortSignal?: AbortSignal }) => {
          console.log("🔍 Search tool called with query:", args.query);
          try {
            const results = await searchSerper({ q: args.query, num: args.num }, options.abortSignal);
            console.log("✅ Search successful, found", results.organic.length, "results");

            // Return formatted results for the AI to use
            return {
              query: args.query,
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
            console.error("❌ Search error:", error);
            return {
              error: "Failed to search the web. Please try again.",
              query: args.query,
            };
          }
        },
      },
    };

    console.log("🔧 Tools configuration:", Object.keys(tools));
    console.log("🔧 Model being used:", defaultModel.modelId);

    const result = await streamText({
      model: defaultModel,
      messages,
      maxSteps: 10,
      toolChoice: 'auto', // Explicitly enable automatic tool choice
      system: `You are a helpful AI assistant with access to real-time web search capabilities.

MANDATORY TOOL USAGE:
- You HAVE a searchWeb tool available RIGHT NOW
- For the user's questions, you MUST call searchWeb("users_question", 10)
- Do NOT say you need the function provided - IT IS ALREADY AVAILABLE
- Do NOT say you cannot access information - USE THE TOOL

INSTRUCTIONS:
1. IMMEDIATELY use searchWeb for any news, current events, or factual questions
2. ALWAYS cite sources with [title](URL) format
3. Provide comprehensive, current information

The user is asking about current news - USE THE SEARCH TOOL NOW.`,
      tools,
      onStepFinish: (step) => {
        console.log("🚀 Step finished:", step.stepType);
        if (step.toolCalls) {
          console.log("🔨 Tool calls in this step:", step.toolCalls.length);
          step.toolCalls.forEach(call => {
            console.log("🔨 Tool call:", call.toolName, call.args);
          });
        }
        if (step.toolResults) {
          console.log("📊 Tool results:", step.toolResults.length);
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
} 