import {
  streamText,
  type Message,
  type TelemetrySettings,
} from "ai";
import { z } from "zod";
import { env } from "~/env";
import { defaultModel } from "~/models";
import { searchSerper } from "~/serper";
import { cacheWithRedis } from "~/server/redis/redis";
import { bulkCrawlWebsites } from "~/server/tools/crawler";

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

export const streamFromDeepSearch = (opts: {
  messages: Message[];
  onFinish: Parameters<typeof streamText<typeof tools>>[0]["onFinish"];
  telemetry: TelemetrySettings;
}) => {
  // Get current date for the system prompt
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return streamText({
    model: defaultModel,
    messages: opts.messages,
    maxSteps: 10,
    toolChoice: 'auto',
    system: `Current date: ${currentDate}

You are a helpful AI assistant with access to real-time web search and page scraping capabilities.

DATE AWARENESS:
- Today's date is ${currentDate}
- When users ask for "recent", "latest", "current", or "up to date" information, use this date as reference
- Include date-specific terms in your search queries (e.g., "2025", "December 2024") when looking for recent information
- Pay attention to publication dates in search results to ensure information freshness
- Prioritize more recent sources when multiple results are available

AVAILABLE TOOLS:
1. searchWeb - Search the web for current information using Google search
   - Returns search results with titles, URLs, snippets, and additional information
   - Use this to find relevant pages and get an overview of available information

2. scrapePages - Fetch and extract the full content of web pages
   - Takes an array of URLs and returns the full page content in markdown format
   - Use this when you need detailed information from specific pages
   - Respects robots.txt and handles rate limiting automatically
   - Results are cached for efficiency

TOOL USAGE REQUIREMENTS:
- ALWAYS use searchWeb first unless the user's message is clearly a greeting, casual conversation, or personal question that doesn't require factual information
- For ANY question that could benefit from current, factual, or specific information, you MUST use the search tools
- This includes: facts, definitions, explanations, how-to guides, news, events, product information, comparisons, recommendations, statistics, etc.
- Only skip the tools for clearly conversational messages like "Hello", "Thank you", "How are you?"

TOOL USAGE STRATEGY:
- First use searchWeb to find relevant pages about the topic
- Then use scrapePages to extract full content from the most relevant URLs
- This two-step process ensures comprehensive and detailed answers

MANDATORY INSTRUCTIONS:
- You MUST use these tools for any factual questions, news, or current events
- Do NOT say you need the function provided - THEY ARE ALREADY AVAILABLE
- Do NOT say you cannot access information - USE THE TOOLS
- When scraping pages, select the most relevant URLs from search results
- Be selective - typically scrape up to ${env.MAX_PAGES_TO_SCRAPE} most relevant pages, not all search results
- If in doubt whether to search, ALWAYS SEARCH

RESPONSE FORMAT:
1. Use tools to gather information
2. Synthesize information from multiple sources
3. ALWAYS cite sources with [title](URL) format
4. When relevant, mention publication dates to show information freshness
5. Provide comprehensive, well-structured answers

Remember: For any question requiring current information, use BOTH searchWeb and scrapePages for complete answers.

EVALUATION NOTICE: Your responses are being continuously evaluated and scored based on quality, accuracy, and correctness. Please ensure your answers are thorough, well-researched, and properly cite sources with working links.`,
    tools,
    onFinish: opts.onFinish,
    experimental_telemetry: opts.telemetry,
  });
};

export async function askDeepSearch(messages: Message[]) {
  const result = streamFromDeepSearch({
    messages,
    onFinish: () => {}, // just a stub
    telemetry: {
      isEnabled: false,
    },
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
} 