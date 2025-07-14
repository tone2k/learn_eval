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