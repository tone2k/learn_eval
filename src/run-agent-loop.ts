import type { Message, StreamTextResult } from "ai";
import { answerQuestion } from "~/answer-question";
import { getNextAction } from "~/deep-search";
import { env } from "~/env";
import { searchSerper } from "~/serper";
import { cacheWithRedis } from "~/server/redis/redis";
import { bulkCrawlWebsites } from "~/server/tools/crawler";
import { SystemContext } from "~/system-context";
import type { Action, OurMessageAnnotation } from "~/types";

// Create cached version of bulkCrawlWebsites
const cachedBulkCrawlWebsites = cacheWithRedis(
  "bulkCrawlWebsites",
  bulkCrawlWebsites
);

/**
 * Search the web using Serper API
 */
export async function searchWeb(context: SystemContext, query: string): Promise<void> {
  console.log("🔍 Searching the web for:", query);
  
  try {
    const results = await searchSerper(
      { q: query, num: env.SEARCH_RESULTS_COUNT }, 
      undefined
    );
    
    // Convert to the format expected by SystemContext
    const queryResult = {
      query,
      results: results.organic.map(result => ({
        title: result.title,
        url: result.link,
        snippet: result.snippet,
        date: result.date ?? "",
      })),
    };
    
    context.reportQueries([queryResult]);
    console.log("✅ Search completed, found", results.organic.length, "results");
  } catch (error) {
    console.error("❌ Search error:", error);
    // Report empty results on error
    context.reportQueries([{
      query,
      results: [],
    }]);
  }
}

/**
 * Scrape URLs and extract content
 */
export async function scrapeUrl(context: SystemContext, urls: string[]): Promise<void> {
  console.log("🌐 Scraping URLs:", urls);
  
  try {
    const results = await cachedBulkCrawlWebsites({ urls });
    
    if (results.success) {
      const scrapeResults = results.results.map(r => ({
        url: r.url,
        result: r.result.data,
      }));
      
      context.reportScrapes(scrapeResults);
      console.log("✅ Scraping completed successfully");
    } else {
      // Handle partial failures
      const scrapeResults = results.results.map(r => ({
        url: r.url,
        result: r.result.success ? r.result.data : `Error: ${(r.result as { error: string }).error}`,
      }));
      
      context.reportScrapes(scrapeResults);
      console.log("⚠️ Scraping completed with some errors");
    }
  } catch (error) {
    console.error("❌ Scraping error:", error);
    
    // Report error results
    const errorResults = urls.map(url => ({
      url,
      result: `Error: Failed to scrape ${url}`,
    }));
    
    context.reportScrapes(errorResults);
  }
}

/**
 * Main agent loop implementation
 */
export async function runAgentLoop(
  conversationMessages: Message[],
  initialContext?: SystemContext,
  writeMessageAnnotation?: (annotation: OurMessageAnnotation) => void,
  langfuseTraceId?: string
): Promise<StreamTextResult<{}, string>> {
  // A persistent container for the state of our system
  const ctx = initialContext ?? new SystemContext(conversationMessages);
  
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
      await searchWeb(ctx, nextAction.query);
    } else if (nextAction.type === "scrape") {
      if (!nextAction.urls || nextAction.urls.length === 0) {
        console.error("❌ Scrape action missing URLs");
        break;
      }
      await scrapeUrl(ctx, nextAction.urls);
    } else if (nextAction.type === "answer") {
      console.log("🎯 Ready to answer the question");
      return answerQuestion(ctx, { isFinal: false }, langfuseTraceId);
    }
    
    // We increment the step counter
    ctx.incrementStep();
  }
  
  // If we've taken 10 actions and still don't have an answer,
  // we ask the LLM to give its best attempt at an answer
  console.log("⏰ Reached maximum steps, providing final answer");
  return answerQuestion(ctx, { isFinal: true }, langfuseTraceId);
} 