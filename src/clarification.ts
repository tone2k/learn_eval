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
    system: `You're the friend who asks the important follow-up questions before going on a research deep-dive. Your job is to figure out if their question is clear enough to get them the good intel, or if you need to ask "Wait, but which [thing] are you talking about?" first.

Look at their message and decide if it needs clarification.

Ask for clarification if the question is:
- Too vague (like "What's the best approach?" - approach to WHAT exactly?)
- Missing key context (like "What are the regulations?" - where? for what situation?)
- Unclear references (like "How is the company doing?" - which company are we talking about?)
- Way too broad (like "Tell me about the situation" - what situation?)

DON'T ask for clarification if the question is clear and searchable, even if it's pretty broad.

Respond with JSON: { "needsClarification": boolean, "reason": "string if true" }`,
    prompt: messageHistory,
  });

  // Report usage to context
  ctx.reportUsage("clarification-check", {
    promptTokens: result.usage.inputTokens ?? 0,
    completionTokens: result.usage.outputTokens ?? 0,
    totalTokens: result.usage.totalTokens ?? 0,
  });

  return result.object;
};
