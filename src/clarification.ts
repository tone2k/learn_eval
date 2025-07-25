import { generateObject } from "ai";
import { z } from "zod";
import { guardrailModel } from "~/models";
import type { SystemContext } from "~/system-context";

export const checkIfQuestionNeedsClarification = async (
  ctx: SystemContext,
  langfuseTraceId?: string,
) => {
  const messageHistory = ctx.getMessageHistory();

  const result = await generateObject({
    model: guardrailModel,
    schema: z.object({
      needsClarification: z.boolean(),
      reason: z
        .string()
        .optional()
        .describe("If needsClarification is true, explain why."),
    }),
    experimental_telemetry: langfuseTraceId ? {
      isEnabled: true,
      functionId: "clarification-check",
      metadata: {
        langfuseTraceId: langfuseTraceId,
      },
    } : {
      isEnabled: false,
    },
    system: `You are a clarification assessment agent for a DeepSearch system. Your job is to determine if a user's question needs clarification before proceeding with a search.

Analyze the conversation and determine if the latest user message needs clarification.

Request clarification if the question is:
- Vague or ambiguous (e.g., "What's the best approach?" - approach to what?)
- Missing critical context (e.g., "What are the regulations?" - where, for what?)
- Has unclear references (e.g., "How is the company doing?" - which company?)
- Too broad without focus (e.g., "Tell me about the situation" - which situation?)

Do NOT request clarification for clear, searchable questions even if broad.

Respond with JSON: { "needsClarification": boolean, "reason": "string if true" }`,
    prompt: messageHistory,
  });

  // Report usage to context
  ctx.reportUsage("clarification-check", {
    promptTokens: result.usage.inputTokens || 0,
    completionTokens: result.usage.outputTokens || 0,
    totalTokens: result.usage.totalTokens || 0,
  });

  return result.object;
};
