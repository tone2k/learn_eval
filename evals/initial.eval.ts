import type { Message } from "ai";
import { generateObject } from "ai";
import { createScorer, evalite } from "evalite";
import { z } from "zod";
import { askDeepSearch } from "~/deep-search";
import { env } from "~/env";
import { factualityModel } from "~/models";
import { ciData } from "./ci";
import { devData } from "./dev";
import { regressionData } from "./regression";

export const checkFactuality = async (opts: {
  question: string;
  groundTruth: string;
  submission: string;
}) => {
  const { object } = await generateObject({
    model: factualityModel,
    /**
     * Prompt taken from autoevals:
     *
     * {@link https://github.com/braintrustdata/autoevals/blob/5aa20a0a9eb8fc9e07e9e5722ebf71c68d082f32/templates/factuality.yaml}
     */
    prompt: `
      You are comparing a submitted answer to an expert answer on a given question. Here is the data:
      [BEGIN DATA]
      ************
      [Question]: ${opts.question}
      ************
      [Expert]: ${opts.groundTruth}
      ************
      [Submission]: ${opts.submission}
      ************
      [END DATA]

      Compare the factual content of the submitted answer with the expert answer. Ignore any differences in style, grammar, or punctuation.
      The submitted answer may either be a subset or superset of the expert answer, or it may conflict with it. Determine which case applies. Answer the question by selecting one of the following options:
      (A) The submitted answer is a subset of the expert answer and is fully consistent with it.
      (B) The submitted answer is a superset of the expert answer and is fully consistent with it.
      (C) The submitted answer contains all the same details as the expert answer.
      (D) There is a disagreement between the submitted answer and the expert answer.
      (E) The answers differ, but these differences don't matter from the perspective of factuality.
    `,
    schema: z.object({
      answer: z
        .enum(["A", "B", "C", "D", "E"])
        .describe("Your selection."),
      rationale: z
        .string()
        .describe(
          "Why you chose this answer. Be very detailed.",
        ),
    }),
  });

  /**
   * LLM's are well documented at being poor at generating
   */
  const scores = {
    A: 0.4,
    B: 0.6,
    C: 1,
    D: 0,
    E: 1,
  };

  return {
    score: scores[object.answer],
    metadata: {
      rationale: object.rationale,
    },
  };
};

// This is the scorer that can be passed into the scorers in Evalite
export const Factuality = createScorer<
  Message[],
  string,
  string
>({
  name: "Factuality",
  scorer: async ({ input, expected, output }) => {
    // Extract the question from the last user message
    const question = input
      .filter(msg => msg.role === "user")
      .pop()?.content || "";
      
    return checkFactuality({
      question,
      groundTruth: expected!,
      submission: output,
    });
  },
});

evalite("Deep Search Eval", {
  data: async (): Promise<
    { input: Message[]; expected: string }[]
  > => {
    const data = [...devData];

    // If CI, add the CI data
    if (env.EVAL_DATASET === "ci") {
      data.push(...ciData);
      // If Regression, add the regression data AND the CI data
    } else if (env.EVAL_DATASET === "regression") {
      data.push(...ciData, ...regressionData);
    }

    return data;
  },
  task: async (input) => {
    return askDeepSearch(input);
  },
  scorers: [
    {
      name: "Contains Links",
      description:
        "Checks if the output contains any markdown links.",
      scorer: ({ output }) => {
        // Check for markdown link pattern: [text](url)
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
        const containsLinks = markdownLinkRegex.test(output);

        return containsLinks ? 1 : 0;
      },
    },
    {
      name: "Multi-hop Reasoning",
      description:
        "Checks if the output shows evidence of multi-step reasoning by mentioning intermediate steps or connections.",
      scorer: ({ output }) => {
        // Look for indicators of multi-step reasoning
        const reasoningIndicators = [
          /first|initially|starting with/i,
          /then|next|subsequently|therefore/i,
          /because|since|as a result/i,
          /which means|this leads to|consequently/i,
          /step \d+|stage \d+/i,
          /born in|located in|capital of|symbol for/i
        ];
        
        const indicatorCount = reasoningIndicators.filter(pattern => 
          pattern.test(output)
        ).length;
        
        // Score based on how many reasoning indicators are present
        return Math.min(indicatorCount / 3, 1); // Normalize to 0-1 scale
      },
    },
    Factuality,
  ],
}); 