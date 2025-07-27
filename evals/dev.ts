import type { UIMessage } from "ai";

export const devData: { input: any[]; expected: string }[] = [
  // Deep research test cases for development
  {
    input: [
      {
        id: "1",
        role: "user",
        content:
          "What are the latest advancements in quantum computing error correction in 2024?",
      },
    ],
    expected:
      "Recent advancements include improved topological error correction codes, real-time error mitigation techniques, and breakthroughs in surface code implementations achieving lower error thresholds.",
  },
  {
    input: [
      {
        id: "2",
        role: "user",
        content:
          "What are the environmental impacts of lithium mining for EV batteries?",
      },
    ],
    expected:
      "Lithium mining causes water depletion, soil contamination, toxic chemical release, habitat destruction, and significant carbon emissions during extraction and processing.",
  },
  {
    input: [
      {
        id: "3",
        role: "user",
        content:
          "Compare the performance of GPT-4 vs Claude 3 for code generation tasks",
      },
    ],
    expected:
      "Both models excel at code generation, with GPT-4 showing strength in diverse programming languages while Claude 3 demonstrates superior debugging capabilities and cleaner code structure.",
  },
  {
    input: [
      {
        id: "4",
        role: "user",
        content:
          "What are the latest developments in CRISPR gene editing technology?",
      },
    ],
    expected:
      "Recent CRISPR advances include prime editing 3, epigenome editors, improved delivery methods using AAV vectors, and enhanced specificity reducing off-target effects."
  },
]; 