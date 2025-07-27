import type { UIMessage } from "ai";

export const ciData: { input: any[]; expected: string }[] = [
  {
    input: [
      {
        id: "1",
        role: "user",
        content:
          "What are the current best practices for microservices architecture in 2024?",
      },
    ],
    expected:
      "Current best practices include service mesh adoption, event-driven architecture, containerization with Kubernetes, observability with OpenTelemetry, and API gateway patterns.",
  },
  {
    input: [
      {
        id: "2",
        role: "user",
        content:
          "What are the latest breakthroughs in renewable energy storage?",
      },
    ],
    expected:
      "Recent breakthroughs include solid-state batteries, gravity-based energy storage, advanced flow batteries, and green hydrogen storage systems with improved efficiency.",
  },
  {
    input: [
      {
        id: "3",
        role: "user",
        content:
          "How do large language models like GPT handle context windows?",
      },
    ],
    expected:
      "LLMs use attention mechanisms, positional encodings, and sliding window techniques to manage context, with recent models employing techniques like Flash Attention for efficiency.",
  },
  {
    input: [
      {
        id: "4",
        role: "user",
        content:
          "What are the privacy implications of facial recognition technology?",
      },
    ],
    expected:
      "Facial recognition raises concerns about mass surveillance, bias in algorithms, data breaches, consent issues, and potential misuse by authorities or malicious actors."
  },
]; 