import type { Message, StreamTextResult } from "ai";
import { answerQuestion } from "~/answer-question";
import { getNextAction } from "~/deep-search";
import { env } from "~/env";
import { addFaviconsToSources } from "~/favicon-utils";
import { rewriteQuery } from "~/query-rewriter";
import { searchSerper } from "~/serper";
import { cacheWithRedis } from "~/server/redis/redis";
import { bulkCrawlWebsites } from "~/server/tools/crawler";
import { summarizeURLs } from "~/summarize-url";
import { SystemContext } from "~/system-context";
import type { Action, OurMessageAnnotation, SearchSource, SummarizeURLInput, UserLocation } from "~/types";

// Create cached version of bulkCrawlWebsites
const cachedBulkCrawlWebsites = cacheWithRedis(
  "bulkCrawlWebsites",
  bulkCrawlWebsites
);

/**
 * Search the web, scrape URLs, and automatically summarize content
 */
export async function searchAndScrape(
  context: SystemContext, 
  query: string,
  langfuseTraceId?: string,
  writeMessageAnnotation?: (annotation: OurMessageAnnotation) => void
): Promise<void> {
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
    
    // Prepare inputs for summarization
    const conversationHistory = context.getFullConversationMessages();
    const summarizationInputs: SummarizeURLInput[] = searchResults.organic
      .slice(0, env.MAX_PAGES_TO_SCRAPE)
      .map(result => ({
        conversationHistory,
        scrapedContent: scrapeContentMap.get(result.link) ?? "Failed to scrape content",
        searchMetadata: {
          title: result.title,
          url: result.link,
          snippet: result.snippet,
          date: result.date,
        },
        query,
      }));
    
    console.log("📝 Starting URL summarization for", summarizationInputs.length, "URLs");
    
    // Display sources to the user before starting summarization
    if (writeMessageAnnotation) {
      const sources: SearchSource[] = searchResults.organic
        .slice(0, env.MAX_PAGES_TO_SCRAPE)
        .map(result => ({
          title: result.title,
          url: result.link,
          snippet: result.snippet,
        }));
      
      const sourcesWithFavicons = addFaviconsToSources(sources);
      
      writeMessageAnnotation({
        type: "SOURCES",
        sources: sourcesWithFavicons,
      });
    }
    
    // Summarize all URLs in parallel
    const summaryResults = await summarizeURLs(summarizationInputs, langfuseTraceId);
    
    console.log("✅ URL summarization completed");
    
    // Create a map of URL to summary
    const summaryMap = new Map<string, string>();
    summaryResults.forEach(result => {
      summaryMap.set(result.url, result.summary);
    });
    
    // Combine search results with summaries
    const combinedResults = searchResults.organic.slice(0, env.MAX_PAGES_TO_SCRAPE).map(result => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      date: result.date ?? "",
      summary: summaryMap.get(result.link) ?? "Failed to generate summary",
    }));
    
    // Report the combined search with summarized content
    context.reportSearch({
      query,
      results: combinedResults,
    });
    
    console.log("✅ Combined search, scrape, and summarization completed");
  } catch (error) {
    console.error("❌ Search, scrape, and summarization error:", error);
    
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
    
    // Store the feedback in the context
    if (nextAction.feedback) {
      ctx.setLastFeedback(nextAction.feedback);
    }
    
    // Send progress annotation to the UI
    if (writeMessageAnnotation) {
      writeMessageAnnotation({
        type: "NEW_ACTION",
        action: nextAction,
      });
    }
    
    // We execute the action and update the state of our system
    if (nextAction.type === "continue") {
      if (!nextAction.query) {
        console.error("❌ Continue action missing query");
        break;
      }
      
      // Use the query rewriter to optimize the search query based on feedback
      const optimizedQuery = await rewriteQuery(nextAction.query, ctx, langfuseTraceId);
      console.log("🔄 Original query:", nextAction.query);
      console.log("✨ Optimized query:", optimizedQuery);
      
      await searchAndScrape(ctx, optimizedQuery, langfuseTraceId, writeMessageAnnotation);
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