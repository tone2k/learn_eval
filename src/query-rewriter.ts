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

You're the search strategist who takes feedback about what's missing and figures out the best way to actually FIND that info. Time to optimize this search query based on what we learned didn't work.

ORIGINAL QUERY: "${originalQuery}"

FEEDBACK ON WHAT'S MISSING:
${feedback}

WHAT WE'VE ALREADY TRIED:
${context.getSearchHistory()}

WHAT THEY ORIGINALLY ASKED: "${context.getInitialQuestion()}"

THEIR LATEST MESSAGE: "${context.getLatestUserMessage()}"

Based on the feedback about missing info and what we've already searched, rewrite the query to:
1. Target exactly what's missing from the feedback
2. Use keywords that are more likely to actually find results
3. Add date-specific terms if they want recent stuff
4. Don't repeat searches we've already done
5. Fill in those information gaps we identified

SMART SEARCH STRATEGY:
- If previous searches got 0 results, don't make it MORE specific - try broader terms
- If super specific searches are failing, go more general first
- Don't pile on too many qualifiers that might kill the search
- If the feedback wants very specific details, try a general approach first to see what's out there

Return ONLY the optimized search query, nothing else.`,
  });

  // Report usage to context
  context.reportUsage("rewrite-query", {
    promptTokens: result.usage.inputTokens ?? 0,
    completionTokens: result.usage.outputTokens ?? 0,
    totalTokens: result.usage.totalTokens ?? 0,
  });

  return result.text.trim();
}