import {
  generateObject,
  type StreamTextResult,
  type TelemetrySettings,
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai";
import { z } from "zod";
import { env } from "~/env";
import { defaultModel } from "~/models";
import { runAgentLoop } from "~/run-agent-loop";
import { searchSerper } from "~/serper";
import { cacheWithRedis } from "~/server/redis/redis";
import { bulkCrawlWebsites } from "~/server/tools/crawler";
import { SystemContext } from "~/system-context";
import type { Action, OurMessage, UserLocation } from "~/types";

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

  const searchHistory = context.getSearchHistory();
  console.log("🔍 getNextAction - Search History:", {
    length: searchHistory.length,
    content: searchHistory.substring(0, 500) + (searchHistory.length > 500 ? "..." : "")
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

${context.getUserLocationContext()}You're basically the research coordinator for someone who needs the FULL story. Your job is to look at what we've found so far and decide: "Do we have enough tea to give them the complete scoop, or do we need to dig deeper?"

YOUR INVESTIGATIVE PROCESS:
1. Figure out exactly what intel they're asking for in their original question
2. Look at what juicy details we've already uncovered in our searches  
3. Spot the gaps - what's still missing from the full story?
4. For specific people/companies/things: Target searches for each missing piece about them
5. For general topics: Focus searches to fill in the knowledge holes

STAYING CURRENT:
- Today's date is ${currentDate}
- When they want "recent", "latest", "current", or "up to date" info, prioritize searches with date-specific terms
- Check publication dates to make sure we're not giving them old news

YOUR OPTIONS:
1. continue - Keep digging for more intel
   - Use this when we need more details from actual web pages
   - The system will search AND scrape content automatically
   - Be specific about what search terms will find the best stuff
   - We'll grab up to ${env.MAX_PAGES_TO_SCRAPE} most relevant pages and extract everything
   - IMPORTANT: When choosing continue, explain exactly what's missing and how to find it

2. answer - Time to spill the tea and wrap this up
   - Use this when we've got enough good info to give them a solid answer
   - Only pick this when we have sufficient context from our searches

WHAT MAKES A GOOD ANSWER:
- Completeness: Do we have ALL the info they actually asked for?
- Fresh & Reliable: Is this from good sources and up-to-date?
- Specific enough: Do we have actual details, not just vague stuff?
- Well-rounded: Have we covered different angles of their question?

DECISION-MAKING RULES:
- If we found relevant info that answers their question (even if not perfect), choose "answer"
- If recent searches are turning up nothing, maybe what we have is good enough
- Don't keep searching for super specific details if we have the general answer
- If we've tried multiple search approaches and still coming up empty, better to answer with what we've got

PREVIOUS FEEDBACK:
${context.getLastFeedback() ?? "No previous feedback available."}

CONVERSATION HISTORY:
${context.getConversationHistory()}

MOST RECENT USER MESSAGE: "${context.getLatestUserMessage()}"

FIRST USER QUESTION: "${context.getInitialQuestion()}"

SEARCH HISTORY AND SUMMARIES:
${searchHistory}

Based on what we've gathered, decide what to do next. If you choose 'continue', give me the feedback breakdown:
- What specific intel is still missing from the story
- Why what we have so far isn't quite enough yet
- Exact search strategies or keywords that might find the missing pieces
- Any patterns you've noticed in what's working or not working

This feedback helps the search system get smarter about finding what we need.`,
  });

  console.log("🎯 getNextAction result:", {
    type: result.object.type,
    title: result.object.title,
    reasoning: result.object.reasoning?.substring(0, 200) + "..."
  });

  // Report usage to context
  context.reportUsage("get-next-action", {
    promptTokens: result.usage.inputTokens ?? 0,
    completionTokens: result.usage.outputTokens ?? 0,
    totalTokens: result.usage.totalTokens ?? 0,
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
  messages: UIMessage[];
  telemetry: TelemetrySettings;
  writeMessagePart?: UIMessageStreamWriter<OurMessage>['write'];
  userLocation?: UserLocation;
}): Promise<{
  result: StreamTextResult<{}, string> | null;
  getContext: () => SystemContext;
}> {
  // Extract langfuseTraceId from telemetry metadata if available
  const langfuseTraceId = opts.telemetry.isEnabled ? opts.telemetry.metadata?.langfuseTraceId as string | undefined : undefined;
  
  // Create context here so we can return it
  const ctx = new SystemContext(opts.messages, opts.userLocation);
  
  // Run the agent loop with the full conversation history
  console.log("🔄 streamFromDeepSearch calling runAgentLoop");
  const result = await runAgentLoop(opts.messages, {
    langfuseTraceId,
    writeMessagePart: opts.writeMessagePart,
    userLocation: opts.userLocation,
    systemContext: ctx,
  });
  console.log("✅ streamFromDeepSearch received result from runAgentLoop");
  
  return {
    result: result || null, // Return the actual StreamTextResult or null if no answer was generated
    getContext: () => ctx,
  };
};

export async function askDeepSearch(messages: UIMessage[], userLocation?: UserLocation) {
  const { result } = await streamFromDeepSearch({
    messages,
    telemetry: {
      isEnabled: false,
    },
    userLocation,
  });

  if (!result) {
    return "No answer was generated.";
  }

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
} 