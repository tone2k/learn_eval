import type { Message, StreamTextResult } from "ai";
import { answerQuestion } from "~/answer-question";
import { getNextAction } from "~/deep-search";
import { env } from "~/env";
import { searchSerper } from "~/serper";
import { cacheWithRedis } from "~/server/redis/redis";
import { bulkCrawlWebsites } from "~/server/tools/crawler";
import { SystemContext } from "~/system-context";
import type { Action, OurMessageAnnotation, UserLocation } from "~/types";

// Create cached version of bulkCrawlWebsites
const cachedBulkCrawlWebsites = cacheWithRedis(
  "bulkCrawlWebsites",
  bulkCrawlWebsites
);

/**
 * Search the web and automatically scrape the most relevant URLs
 */
export async function searchAndScrape(context: SystemContext, query: string): Promise<void> {
  console.log("🔍 Searching and scraping for:", query);
  
  try {
    // First, search the web
    const searchResults = await searchSerper(
      { q: query, num: env.SEARCH_RESULTS_COUNT }, 
      undefined
    );
    
    console.log("✅ Search completed, found", searchResults.organic.length, "results");
    
    // Get the most relevant URLs to scrape (up to MAX_PAGES_TO_SCRAPE)
    const urlsToScrape = searchResults.organic
      .slice(0, env.MAX_PAGES_TO_SCRAPE)
      .map(result => result.link);
    
    console.log("🌐 Scraping URLs:", urlsToScrape);
    
    // Scrape the URLs
    const scrapeResults = await cachedBulkCrawlWebsites({ urls: urlsToScrape });
    
    // Create a map of URL to scraped content
    const scrapeContentMap = new Map<string, string>();
    
    if (scrapeResults.success) {
      scrapeResults.results.forEach(r => {
        scrapeContentMap.set(r.url, r.result.data);
      });
      console.log("✅ Scraping completed successfully");
    } else {
      // Handle partial failures
      scrapeResults.results.forEach(r => {
        const content = r.result.success ? r.result.data : `Error: ${(r.result as { error: string }).error}`;
        scrapeContentMap.set(r.url, content);
      });
      console.log("⚠️ Scraping completed with some errors");
    }
    
    // Combine search results with scraped content
    const combinedResults = searchResults.organic.slice(0, env.MAX_PAGES_TO_SCRAPE).map(result => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      date: result.date ?? "",
      scrapedContent: scrapeContentMap.get(result.link) ?? "Failed to scrape content",
    }));
    
    // Report the combined search with scraped content
    context.reportSearch({
      query,
      results: combinedResults,
    });
    
    console.log("✅ Combined search and scrape completed");
  } catch (error) {
    console.error("❌ Search and scrape error:", error);
    
    // Report empty results on error
    context.reportSearch({
      query,
      results: [],
    });
  }
}

/**
 * Main agent loop implementation
 */
export async function runAgentLoop(
  conversationMessages: Message[],
  opts: {
    langfuseTraceId?: string;
    writeMessageAnnotation?: (annotation: OurMessageAnnotation) => void;
    onFinish: any;
    userLocation?: UserLocation;
  }
): Promise<StreamTextResult<{}, string>> {
  const { langfuseTraceId, writeMessageAnnotation, onFinish, userLocation } = opts;
  // A persistent container for the state of our system
  const ctx = new SystemContext(conversationMessages, userLocation);
  
  // Get the latest user message for logging purposes
  const latestUserMessage = ctx.getLatestUserMessage();
  console.log("🤖 Starting agent loop for query:", latestUserMessage);
  
  // A loop that continues until we have an answer or we've taken 10 actions
  while (!ctx.shouldStop()) {
    console.log(`🔄 Step ${ctx.getCurrentStep() + 1}/10`);
    
    // We choose the next action based on the state of our system
    const nextAction: Action = await getNextAction(ctx, langfuseTraceId);
    console.log("🎯 Next action:", nextAction);
    
    // Send progress annotation to the UI
    if (writeMessageAnnotation) {
      writeMessageAnnotation({
        type: "NEW_ACTION",
        action: nextAction,
      });
    }
    
    // We execute the action and update the state of our system
    if (nextAction.type === "search") {
      if (!nextAction.query) {
        console.error("❌ Search action missing query");
        break;
      }
      await searchAndScrape(ctx, nextAction.query);
    } else if (nextAction.type === "answer") {
      console.log("🎯 Ready to answer the question");
      return answerQuestion(ctx, { 
        isFinal: false,
        langfuseTraceId,
        onFinish,
      });
    }
    
    // We increment the step counter
    ctx.incrementStep();
  }
  
  // If we've taken 10 actions and still don't have an answer,
  // we ask the LLM to give its best attempt at an answer
  console.log("⏰ Reached maximum steps, providing final answer");
  return answerQuestion(ctx, { 
    isFinal: true, 
    langfuseTraceId,
    onFinish,
  });
} 