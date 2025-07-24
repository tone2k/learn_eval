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
    .enum(["continue", "answer"])
    .describe(
      `The type of action to take.
      - 'continue': Continue searching for more information as the current data is insufficient.
      - 'answer': Answer the user's question and complete the loop.`,
    ),
  query: z
    .string()
    .describe(
      "The query to search for. Required if type is 'continue'.",
    )
    .optional(),
  feedback: z
    .string()
    .describe(
      "Required only when type is 'continue'. Detailed feedback about what information is missing or what needs to be improved in the search. This will be used to guide the next search iteration.",
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

${context.getUserLocationContext()}You are a research query optimizer. Your task is to analyze search results against the original research goal and either decide to answer the question or to search for more information.

PROCESS:
1. Identify ALL information explicitly requested in the original research goal
2. Analyze what specific information has been successfully retrieved in the search results
3. Identify ALL information gaps between what was requested and what was found
4. For entity-specific gaps: Create targeted queries for each missing attribute of identified entities
5. For general knowledge gaps: Create focused queries to find the missing conceptual information

DATE AWARENESS:
- Today's date is ${currentDate}
- When users ask for "recent", "latest", "current", or "up to date" information, prioritize searching with date-specific terms
- Pay attention to publication dates in search results to ensure information freshness

AVAILABLE ACTIONS:
1. continue - Continue searching for more information
   - Use this when you need to find and extract more detailed information from web pages
   - The system will automatically search for relevant pages AND scrape their content
   - Include specific search terms that would help find the most relevant results
   - The system will fetch up to ${env.MAX_PAGES_TO_SCRAPE} most relevant pages and extract their full content
   - IMPORTANT: When choosing continue, provide detailed feedback about what information is missing and how to search for it

2. answer - Answer the user's question and complete the loop
   - Use this when you have gathered sufficient information to provide a comprehensive answer
   - Only choose this when you have enough context from previous searches

EVALUATION CRITERIA:
- Completeness: Do we have ALL the information requested by the user?
- Accuracy: Is the information from reliable sources and up-to-date?
- Specificity: Do we have specific details, not just general information?
- Coverage: Have we explored different aspects of the question?

PREVIOUS FEEDBACK:
${context.getLastFeedback() || "No previous feedback available."}

CONVERSATION HISTORY:
${context.getConversationHistory()}

MOST RECENT USER MESSAGE: "${context.getLatestUserMessage()}"

FIRST USER QUESTION: "${context.getInitialQuestion()}"

SEARCH HISTORY AND SUMMARIES:
${context.getSearchHistory()}

Based on your evaluation, determine the next action. When providing feedback (only required when type is 'continue'), include specific details about:
- What information is still missing
- Why the current information is insufficient
- Specific search strategies or keywords to try
- Any patterns or issues noticed in previous searches

This feedback will be used to improve subsequent search queries.`,
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