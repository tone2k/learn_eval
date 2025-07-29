import { streamText, type UIMessage, type StreamTextResult, type UIMessageStreamWriter } from "ai";
import { randomUUID } from "crypto";
import { answerQuestion } from "~/answer-question";
import { getNextAction } from "~/deep-search";
import { env } from "~/env";
import { addFaviconsToSources } from "~/favicon-utils";
import { checkIsSafe } from "~/guardrails";
import { checkIfQuestionNeedsClarification } from "~/clarification";
import { defaultModel } from "~/models";
import { rewriteQuery } from "~/query-rewriter";
import { searchSerper } from "~/serper";
import { cacheWithRedis } from "~/server/redis/redis";
import { bulkCrawlWebsites } from "~/server/tools/crawler";
import { summarizeURLs } from "~/summarize-url";
import { SystemContext } from "~/system-context";
import type { Action, OurMessage, SearchSource, SummarizeURLInput, UserLocation } from "~/types";

// Static ID for usage data part to prevent duplication
const USAGE_DATA_PART_ID = randomUUID();

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
  writeMessagePart?: UIMessageStreamWriter<OurMessage>['write']
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
    if (writeMessagePart) {
      const sources: SearchSource[] = searchResults.organic
        .slice(0, env.MAX_PAGES_TO_SCRAPE)
        .map(result => ({
          title: result.title,
          url: result.link,
          snippet: result.snippet,
        }));
      
      const sourcesWithFavicons = addFaviconsToSources(sources);
      
      await writeMessagePart({
        type: "data-sources",
        data: sourcesWithFavicons,
      });
    }
    
    // Summarize all URLs in parallel
    const summaryResults = await summarizeURLs(
      summarizationInputs, 
      langfuseTraceId, 
      (description, usage) => context.reportUsage(description, usage)
    );
    
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
  conversationMessages: UIMessage[],
  opts: {
    langfuseTraceId?: string;
    writeMessagePart?: UIMessageStreamWriter<OurMessage>['write'];
    userLocation?: UserLocation;
    systemContext?: SystemContext;
  }
): Promise<StreamTextResult<{}, string>> {
  console.log("🚀 runAgentLoop STARTED - New execution");
  const { langfuseTraceId, writeMessagePart, userLocation, systemContext } = opts;
  // A persistent container for the state of our system
  const ctx = systemContext || new SystemContext(conversationMessages, userLocation);
  
  // Guardrail check before entering the main loop
  console.log("🛡️ Running safety check...");
  const guardrailResult = await checkIsSafe(ctx, langfuseTraceId);
  
  if (guardrailResult.classification === "refuse") {
    console.log("🚨 Query refused:", guardrailResult.reason);
    
    // Return a refusal message as a streamText result
    const refusalResult = streamText({
      model: defaultModel,
      system: "You are a content safety guardrail. Refuse to answer unsafe questions.",
      prompt: guardrailResult.reason || "Sorry, I can't help with that request.",
      experimental_telemetry: langfuseTraceId ? {
        isEnabled: true,
        functionId: "guardrail-refusal",
        metadata: {
          langfuseTraceId: langfuseTraceId,
        },
      } : {
        isEnabled: false,
      },
    });

    // Report usage to context (usage is a promise for streaming calls)
    refusalResult.usage.then((usage: any) => {
      ctx.reportUsage("guardrail-refusal", usage);
    });

    return refusalResult;
  }
  
  console.log("✅ Safety check passed");
  
  // Clarification check before entering the main loop
  console.log("❓ Checking if question needs clarification...");
  const clarificationResult = await checkIfQuestionNeedsClarification(ctx, langfuseTraceId);
  
  if (clarificationResult.needsClarification) {
    console.log("🔍 Question needs clarification:", clarificationResult.reason);
    
    // Return a clarification response
    const clarificationResponse = streamText({
      model: defaultModel,
      system: `You are a clarification agent. Provide a helpful clarification request based on the identified issue.`,
      prompt: `The user's question needs clarification for this reason: ${clarificationResult.reason}

Please provide a friendly clarification request that helps the user understand what additional information you need.`,
      experimental_telemetry: langfuseTraceId ? {
        isEnabled: true,
        functionId: "clarification-response",
        metadata: {
          langfuseTraceId: langfuseTraceId,
        },
      } : {
        isEnabled: false,
      },
    });

    // Report usage to context (usage is a promise for streaming calls)
    clarificationResponse.usage.then((usage: any) => {
      ctx.reportUsage("clarification-response", usage);
    });

    return clarificationResponse;
  }
  
  console.log("✅ Question is clear, proceeding with search");
  
  // Get the latest user message for logging purposes
  const latestUserMessage = ctx.getLatestUserMessage();
  console.log("🤖 Starting agent loop for query:", latestUserMessage);
  
  // A loop that continues until we have an answer or we've taken 5 actions
  while (!ctx.shouldStop()) {
    const currentStep = ctx.getCurrentStep() + 1; // 1-indexed for display
    console.log(`🔄 Step ${currentStep}/5`);
    
    // Safety check to prevent infinite loops
    if (currentStep > 5) {
      console.error("🚨 Safety break: step exceeded maximum, forcing exit");
      break;
    }
    
    // We choose the next action based on the state of our system
    const nextAction: Action = await getNextAction(ctx, langfuseTraceId);
    console.log("🎯 Next action:", nextAction);
    
    // Store the feedback in the context
    if (nextAction.feedback) {
      ctx.setLastFeedback(nextAction.feedback);
    }
    
    // Send progress annotation to the UI with step information
    if (writeMessagePart) {
      await writeMessagePart({
        type: "data-newAction",
        data: {
          ...nextAction,
          step: currentStep,
          maxSteps: 5,
        },
      });
    }

    // Send token usage annotation after each action
    if (writeMessagePart) {
      const usageEntries = ctx.getUsageEntries();
      if (usageEntries.length > 0) {
        const totalTokens = usageEntries.reduce((sum, entry) => sum + entry.totalTokens, 0);
        await writeMessagePart({
          type: "data-usage",
          data: { totalTokens },
          id: USAGE_DATA_PART_ID,
        });
      }
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
      
      await searchAndScrape(ctx, optimizedQuery, langfuseTraceId, writeMessagePart);
      
      // Send updated token usage annotation after search and scrape
      if (writeMessagePart) {
        const usageEntries = ctx.getUsageEntries();
        if (usageEntries.length > 0) {
          const totalTokens = usageEntries.reduce((sum, entry) => sum + entry.totalTokens, 0);
          await writeMessagePart({
            type: "data-usage",
            data: { totalTokens },
            id: USAGE_DATA_PART_ID,
          });
        }
      }
    } else if (nextAction.type === "answer") {
      console.log("🎯 Ready to answer the question");
      console.log("🏁 runAgentLoop COMPLETED - Answer action");
      return answerQuestion(ctx, { 
        isFinal: false,
        langfuseTraceId,
      });
    }
    
    // Increment step counter AFTER executing the action to ensure proper counting
    ctx.incrementStep();
  }
  
  // If we've taken 5 actions and still don't have an answer,
  // we ask the LLM to give its best attempt at an answer
  console.log("⏰ Reached maximum steps, providing final answer");
  console.log("🏁 runAgentLoop COMPLETED - Final answer");
  return answerQuestion(ctx, { 
    isFinal: true, 
    langfuseTraceId,
  });
} 