import type { UIMessage } from "ai";

// Define our custom data parts for type-safe streaming
export type OurMessage = UIMessage<
  never, // metadata - we don't use this
  {
    newAction: Action;
    sources: SearchSource[];
    usage: { totalTokens: number };
    newChatCreated: { chatId: string };
  }
>;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: Date;
}

// Database message format
export interface DatabaseMessage {
  id: string;
  role: string;
  parts?: Array<{ type: string; text?: string; [key: string]: unknown }>;
  content?: unknown;
  annotations?: unknown;
  createdAt?: Date;
}

// Type for usage tracking
export interface UsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface Chat {
  id: string;
  title: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt?: Date;
}

export type UserLocation = {
  latitude?: string;
  longitude?: string;
  city?: string;
  country?: string;
};

export interface User {
  id: string;
  name?: string;
  email: string;
  image?: string;
  isAdmin: boolean;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
  date?: string;
}

export interface WebSearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
}

export interface ContinueAction {
  type: "continue";
  title: string;
  reasoning: string;
  query: string;
  feedback?: string;
}

export interface AnswerAction {
  type: "answer";
  title: string;
  reasoning: string;
  feedback?: string;
}

export type Action = ContinueAction | AnswerAction;

// URL Summarization types
export interface SummarizeURLInput {
  conversationHistory: UIMessage[];
  scrapedContent: string;
  searchMetadata: {
    title: string;
    url: string;
    snippet: string;
    date?: string;
  };
  query: string;
}

export interface SummarizeURLResult {
  summary: string;
  url: string;
}

// Source display types
export interface SearchSource {
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
}

// Token usage tracking types
export interface UsageEntry {
  description: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Legacy annotation type - will be removed as we migrate to data parts
export type OurMessageAnnotation = 
  | {
      type: "NEW_ACTION";
      action: Action;
    }
  | {
      type: "SOURCES";
      sources: SearchSource[];
    }
  | {
      type: "USAGE";
      totalTokens: number;
    }; 