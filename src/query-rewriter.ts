import { generateText } from "ai";
import { defaultModel } from "~/models";
import type { SystemContext } from "~/system-context";

export async function rewriteQuery(
  originalQuery: string,
  context: SystemContext,
  langfuseTraceId?: string
): Promise<string> {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const feedback = context.getLastFeedback();
  
  // If no feedback is available, return the original query
  if (!feedback) {
    return originalQuery;
  }

  const result = await generateText({
    model: defaultModel,
    experimental_telemetry: langfuseTraceId ? {
      isEnabled: true,
      functionId: "rewrite-query",
      metadata: {
        langfuseTraceId: langfuseTraceId,
      },
    } : {
      isEnabled: false,
    },
    prompt: `Current date: ${currentDate}

You are a search query optimizer. Your task is to rewrite search queries based on evaluator feedback to find missing information more effectively.

ORIGINAL QUERY: "${originalQuery}"

EVALUATOR FEEDBACK:
${feedback}

SEARCH HISTORY:
${context.getSearchHistory()}

USER'S ORIGINAL QUESTION: "${context.getInitialQuestion()}"

MOST RECENT USER MESSAGE: "${context.getLatestUserMessage()}"

Based on the evaluator's feedback about what information is missing and the search history, rewrite the query to:
1. Target the specific missing information mentioned in the feedback
2. Use more precise keywords that are likely to yield better results
3. Include date-specific terms if looking for recent information
4. Avoid repeating searches that have already been done
5. Focus on filling the identified information gaps

Return ONLY the optimized search query, nothing else.`,
  });

  // Report usage to context
  context.reportUsage("rewrite-query", {
    promptTokens: result.usage.inputTokens || 0,
    completionTokens: result.usage.outputTokens || 0,
    totalTokens: result.usage.totalTokens || 0,
  });

  return result.text.trim();
}