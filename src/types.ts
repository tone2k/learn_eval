import type { Message } from "ai";

export interface ChatMessage extends Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: Date;
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

export interface SearchAction {
  type: "search";
  title: string;
  reasoning: string;
  query: string;
}

export interface AnswerAction {
  type: "answer";
  title: string;
  reasoning: string;
}

export type Action = SearchAction | AnswerAction;

// Message annotation type for progress indicators
export type OurMessageAnnotation = {
  type: "NEW_ACTION";
  action: Action;
}; 