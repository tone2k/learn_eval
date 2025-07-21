import { streamText, type StreamTextResult } from "ai";
import { defaultModel } from "~/models";
import type { SystemContext } from "~/system-context";

interface AnswerOptions {
  isFinal?: boolean;
}

/**
 * Generate an answer to the user's question based on the collected context
 */
export function answerQuestion(
  context: SystemContext,
  options: AnswerOptions = {}
): StreamTextResult<{}, string> {
  const { isFinal = false } = options;
  
  // Get current date for the system prompt
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Build the system prompt
  const systemPrompt = `Current date: ${currentDate}

You are a helpful AI assistant tasked with answering the user's question based on the information gathered from web searches and page scraping.

USER QUERY: "${context.getInitialQuestion()}"

INFORMATION GATHERED:
${context.getQueryHistory()}

${context.getScrapeHistory()}

${isFinal ? `
IMPORTANT: This is the final attempt to answer the question. You may not have all the information needed to provide a complete answer, but you must make your best effort to answer based on the available information. If the information is insufficient, acknowledge the limitations and provide the best answer possible with the available data.
` : `
TASK: Based on the information gathered above, provide a comprehensive and accurate answer to the user's question.
`}

RESPONSE REQUIREMENTS:
1. Provide a direct, comprehensive answer to the user's question
2. Use information from the searches and scraped content to support your answer
3. Cite sources using [title](URL) format when referencing specific information
4. If you found recent information, mention publication dates to show freshness
5. Be factual and accurate based on the gathered information
6. If the information is incomplete or contradictory, acknowledge this
7. Structure your response clearly with proper formatting

Remember to synthesize information from multiple sources and provide a well-rounded answer.`;

  return streamText({
    model: defaultModel,
    prompt: systemPrompt,
  });
} 