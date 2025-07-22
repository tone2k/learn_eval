import {
  generateObject,
  type Message,
  type StreamTextResult,
  type TelemetrySettings,
} from "ai";
import { z } from "zod";
import { env } from "~/env";
import { defaultModel } from "~/models";
import { runAgentLoop } from "~/run-agent-loop";
import { searchSerper } from "~/serper";
import { cacheWithRedis } from "~/server/redis/redis";
import { bulkCrawlWebsites } from "~/server/tools/crawler";
import type { SystemContext } from "~/system-context";
import type { Action, OurMessageAnnotation, UserLocation } from "~/types";

// Action schema for structured outputs - avoiding z.union for better LLM compatibility
export const actionSchema = z.object({
  title: z
    .string()
    .describe(
      "The title of the action, to be displayed in the UI. Be extremely concise. 'Searching Saka's injury history', 'Checking HMRC industrial action', 'Comparing toaster ovens'",
    ),
  reasoning: z
    .string()
    .describe("The reason you chose this step."),
  type: z
    .enum(["search", "answer"])
    .describe(
      `The type of action to take.
      - 'search': Search the web for information and automatically scrape the most relevant URLs found.
      - 'answer': Answer the user's question and complete the loop.`,
    ),
  query: z
    .string()
    .describe(
      "The query to search for. Required if type is 'search'.",
    )
    .optional(),
});

export const getNextAction = async (
  context: SystemContext,
  langfuseTraceId?: string,
): Promise<Action> => {
  // Get current date for the system prompt
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const result = await generateObject({
    model: defaultModel,
    schema: actionSchema,
    experimental_telemetry: langfuseTraceId ? {
      isEnabled: true,
      functionId: "get-next-action",
      metadata: {
        langfuseTraceId: langfuseTraceId,
      },
    } : {
      isEnabled: false,
    },
    prompt: `Current date: ${currentDate}

${context.getUserLocationContext()}You are a helpful AI assistant that needs to choose the next action to take in a deep search conversation.

DATE AWARENESS:
- Today's date is ${currentDate}
- When users ask for "recent", "latest", "current", or "up to date" information, prioritize searching with date-specific terms
- Pay attention to publication dates in search results to ensure information freshness

AVAILABLE ACTIONS:
1. search - Search the web for information and automatically scrape relevant URLs
   - Use this when you need to find and extract detailed information from web pages
   - The system will automatically search for relevant pages AND scrape their content
   - Include specific search terms that would help find the most relevant results
   - Consider using date-specific terms when looking for recent information
   - The system will fetch up to ${env.MAX_PAGES_TO_SCRAPE} most relevant pages and extract their full content

2. answer - Answer the user's question and complete the loop
   - Use this when you have gathered sufficient information to provide a comprehensive answer
   - Only choose this when you have enough context from previous searches

ACTION SELECTION STRATEGY:
- ALWAYS start with 'search' unless you already have sufficient information to answer
- The search action will automatically find AND scrape the most relevant content, eliminating the need for separate scraping decisions
- Only use 'answer' when you have comprehensive information to fully address the user's question
- For ANY question requiring factual, current, or specific information, you MUST search first
- Only skip searching for clearly conversational messages like greetings or thanks

CONVERSATION HISTORY:
${context.getConversationHistory()}

MOST RECENT USER MESSAGE: "${context.getLatestUserMessage()}"

FIRST USER QUESTION: "${context.getInitialQuestion()}"

CONTEXT HISTORY:
${context.getSearchHistory()}

Based on the conversation history and the user's most recent message, determine the next action to take. 

IMPORTANT: Pay close attention to the conversation history above. If the user is asking a follow-up question that references previous parts of the conversation (like "that's not working" or "can you explain more about X"), make sure to understand what they're referring to based on the conversation context. Use this context to inform your search queries and action selection.`,
  });

  return result.object as Action;
};

// Create cached version of bulkCrawlWebsites
const cachedBulkCrawlWebsites = cacheWithRedis(
  "bulkCrawlWebsites",
  bulkCrawlWebsites
);

// Define tools object
const tools = {
  searchWeb: {
    description: "Search the web for current information using Google search",
    parameters: z.object({
      query: z.string().describe("The search query to look up"),
      num: z.number().default(env.SEARCH_RESULTS_COUNT).describe(`Number of search results to return (default: ${env.SEARCH_RESULTS_COUNT})`),
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
  scrapePages: {
    description: "Fetch and extract the full content of web pages in markdown format",
    parameters: z.object({
      urls: z.array(z.string()).describe("Array of URLs to scrape and extract content from"),
    }),
    execute: async (args: { urls: string[] }, options: { abortSignal?: AbortSignal }) => {
      console.log("🌐 Scrape pages tool called with URLs:", args.urls);
      try {
        const results = await cachedBulkCrawlWebsites({ urls: args.urls });
        console.log("✅ Scraping completed, success:", results.success);

        if (results.success) {
          // Return successful results formatted for the AI
          return {
            success: true,
            pages: results.results.map(r => ({
              url: r.url,
              content: r.result.data,
            })),
            totalPages: results.results.length,
          };
        } else {
          // Return with error details
          return {
            success: false,
            error: results.error,
            pages: results.results.map(r => ({
              url: r.url,
              content: r.result.success ? r.result.data : null,
              error: !r.result.success ? r.result.error : null,
            })),
          };
        }
      } catch (error) {
        console.error("❌ Scraping error:", error);
        return {
          success: false,
          error: "Failed to scrape web pages. Please try again.",
          urls: args.urls,
        };
      }
    },
  },
} as const;

export async function streamFromDeepSearch(opts: {
  messages: Message[];
  onFinish: any;
  telemetry: TelemetrySettings;
  writeMessageAnnotation?: (annotation: OurMessageAnnotation) => void;
  userLocation?: UserLocation;
}): Promise<StreamTextResult<{}, string>> {
  // Extract langfuseTraceId from telemetry metadata if available
  const langfuseTraceId = opts.telemetry.isEnabled ? opts.telemetry.metadata?.langfuseTraceId as string | undefined : undefined;
  
  // Run the agent loop with the full conversation history
  const result = await runAgentLoop(opts.messages, {
    langfuseTraceId,
    writeMessageAnnotation: opts.writeMessageAnnotation,
    onFinish: opts.onFinish,
    userLocation: opts.userLocation,
  });
  
  return result;
};

export async function askDeepSearch(messages: Message[], userLocation?: UserLocation) {
  const result = await streamFromDeepSearch({
    messages,
    onFinish: () => {}, // just a stub
    telemetry: {
      isEnabled: false,
    },
    userLocation,
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
} 