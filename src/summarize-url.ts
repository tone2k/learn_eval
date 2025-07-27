import { generateText } from "ai";
import { summarizerModel } from "~/models";
import { cacheWithRedis } from "~/server/redis/redis";
import type { SummarizeURLInput, SummarizeURLResult } from "~/types";
import { messageToString } from "~/utils";

/**
 * Summarize URL content using a specialized LLM for summarization.
 * This function is cached with Redis to avoid expensive re-summarization calls.
 */
const uncachedSummarizeURL = async (
  input: SummarizeURLInput,
  langfuseTraceId?: string,
  reportUsage?: (description: string, usage: { promptTokens: number; completionTokens: number; totalTokens: number }) => void,
): Promise<SummarizeURLResult> => {
  const { conversationHistory, scrapedContent, searchMetadata, query } = input;

  // Format conversation history for context
  const conversationContext = conversationHistory
    .map((message) => {
      const role = message.role === "user" ? "Human" : "Assistant";
      const content = messageToString(message);
      return `${role}: ${content}`;
    })
    .join("\n\n");

  // Create the summarization prompt
  const prompt = `You are a research extraction specialist. Given a research topic and raw web content, create a thoroughly detailed synthesis as a cohesive narrative that flows naturally between key concepts.

Extract the most valuable information related to the research topic, including relevant facts, statistics, methodologies, claims, and contextual information. Preserve technical terminology and domain-specific language from the source material.

Structure your synthesis as a coherent document with natural transitions between ideas. Begin with an introduction that captures the core thesis and purpose of the source material. Develop the narrative by weaving together key findings and their supporting details, ensuring each concept flows logically to the next.

Integrate specific metrics, dates, and quantitative information within their proper context. Explore how concepts interconnect within the source material, highlighting meaningful relationships between ideas. Acknowledge limitations by noting where information related to aspects of the research topic may be missing or incomplete.

Important guidelines:
- Maintain original data context (e.g., "2024 study of 150 patients" rather than generic "recent study")
- Preserve the integrity of information by keeping details anchored to their original context
- Create a cohesive narrative rather than disconnected bullet points or lists
- Use paragraph breaks only when transitioning between major themes

Critical Reminder: If content lacks a specific aspect of the research topic, clearly state that in the synthesis, and you should NEVER make up information and NEVER rely on external knowledge.

RESEARCH TOPIC/QUERY: "${query}"

CONVERSATION CONTEXT:
${conversationContext}

SOURCE METADATA:
Title: ${searchMetadata.title}
URL: ${searchMetadata.url}
Date: ${searchMetadata.date ?? "Not specified"}
Snippet: ${searchMetadata.snippet}

RAW WEB CONTENT:
${scrapedContent}

Create a detailed synthesis that captures the essential information from this source as it relates to the research topic.`;

  try {
    const result = await generateText({
      model: summarizerModel,
      prompt,
      experimental_telemetry: langfuseTraceId ? {
        isEnabled: true,
        functionId: "summarize-url",
        metadata: {
          langfuseTraceId: langfuseTraceId,
          url: searchMetadata.url,
          query: query,
        },
      } : {
        isEnabled: false,
      },
    });

    // Report usage if callback provided
    if (reportUsage) {
      reportUsage(`summarize-url:${searchMetadata.url}`, {
        promptTokens: result.usage.inputTokens || 0,
        completionTokens: result.usage.outputTokens || 0,
        totalTokens: result.usage.totalTokens || 0,
      });
    }

    return {
      summary: result.text,
      url: searchMetadata.url,
    };
  } catch (error) {
    console.error("❌ Summarization error for URL:", searchMetadata.url, error);
    
    // Return a fallback summary that includes the snippet and indicates the error
    return {
      summary: `Unable to generate detailed summary due to processing error. Based on search snippet: ${searchMetadata.snippet}`,
      url: searchMetadata.url,
    };
  }
};

/**
 * Cached version of summarizeURL function.
 * Cache key includes the URL, query, and a hash of the content to ensure freshness.
 */
export const summarizeURL = cacheWithRedis(
  "summarizeURL",
  uncachedSummarizeURL,
);

/**
 * Summarize multiple URLs in parallel.
 * This is the main function that should be called to summarize multiple URLs efficiently.
 */
export async function summarizeURLs(
  inputs: SummarizeURLInput[],
  langfuseTraceId?: string,
  reportUsage?: (description: string, usage: { promptTokens: number; completionTokens: number; totalTokens: number }) => void,
): Promise<SummarizeURLResult[]> {
  console.log("📝 Starting parallel summarization of", inputs.length, "URLs");
  
  try {
    const summaryPromises = inputs.map(input => 
      summarizeURL(input, langfuseTraceId, reportUsage)
    );
    
    const results = await Promise.all(summaryPromises);
    
    console.log("✅ Parallel summarization completed successfully");
    return results;
  } catch (error) {
    console.error("❌ Error in parallel summarization:", error);
    
    // Return fallback summaries for all inputs
    return inputs.map(input => ({
      summary: `Unable to generate summary due to processing error. Based on search snippet: ${input.searchMetadata.snippet}`,
      url: input.searchMetadata.url,
    }));
  }
} 