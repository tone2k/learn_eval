import type { UIMessage } from "ai";
import type { UserLocation, UsageEntry } from "~/types";
import { messageToString } from "~/utils";

type SearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
  summary: string; // Changed from scrapedContent to summary
};

type SearchHistoryEntry = {
  query: string;
  results: SearchResult[];
};

export class SystemContext {
  /**
   * The current step in the loop
   */
  private step = 0;

  /**
   * The full conversation history
   */
  private readonly conversationUIMessages: UIMessage[];

  /**
   * The history of all searches performed, including URL summaries
   */
  private searchHistory: SearchHistoryEntry[] = [];

  /**
   * User's location information
   */
  private readonly userLocation?: UserLocation;

  /**
   * The most recent feedback from the evaluator
   */
  private latestFeedback?: string;

  /**
   * Token usage tracking for the current request
   */
  private usageEntries: UsageEntry[] = [];

  constructor(conversationUIMessages: UIMessage[], userLocation?: UserLocation) {
    this.conversationUIMessages = conversationUIMessages;
    this.userLocation = userLocation;
  }

  shouldStop() {
    const shouldStop = this.step >= 5; // Reduced from 10 to 5 for better performance
    console.log(`🛑 shouldStop() check: step=${this.step}, shouldStop=${shouldStop}`);
    return shouldStop;
  }

  incrementStep() {
    console.log(`📈 incrementStep(): ${this.step} → ${this.step + 1}`);
    this.step++;
  }

  getCurrentStep() {
    return this.step;
  }

  reportSearch(search: SearchHistoryEntry) {
    this.searchHistory.push(search);
  }

  getSearchHistory(): string {
    return this.searchHistory
      .map((search) =>
        [
          `## Query: "${search.query}"`,
          ...search.results.map((result) =>
            [
              `### ${result.date} - ${result.title}`,
              result.url,
              result.snippet,
              `<url_summary>`,
              result.summary,
              `</url_summary>`,
            ].join("\n\n"),
          ),
        ].join("\n\n"),
      )
      .join("\n\n");
  }

  // Keep these methods for backward compatibility during transition
  getQueryHistory(): string {
    return this.getSearchHistory();
  }

  getScrapeHistory(): string {
    return ""; // No longer used since summaries are included in search history
  }

  getInitialQuestion(): string {
    // Get the first user message from the conversation
    const firstUserMessage = this.conversationUIMessages.find((m: UIMessage) => m.role === "user");
    return firstUserMessage ? messageToString(firstUserMessage) : "";
  }

  getLatestUserMessage(): string {
    // Get the most recent user message
    const userMessages = this.conversationUIMessages.filter((m: UIMessage) => m.role === "user");
    const latestMessage = userMessages[userMessages.length - 1];
    return latestMessage ? messageToString(latestMessage) : "";
  }

  getConversationHistory(): string {
    // Format the conversation history for use in prompts
    return this.conversationUIMessages
      .map((message: UIMessage) => {
        const role = message.role === "user" ? "Human" : "Assistant";
        const content = messageToString(message);
        return `${role}: ${content}`;
      })
      .join("\n\n");
  }

  getFullConversationMessages(): UIMessage[] {
    return this.conversationUIMessages;
  }

  getUserLocationContext(): string {
    if (!this.userLocation) {
      return "";
    }

    const locationParts = [];

    if (this.userLocation.latitude && this.userLocation.longitude) {
      locationParts.push(`- lat: ${this.userLocation.latitude}`);
      locationParts.push(`- lon: ${this.userLocation.longitude}`);
    }

    if (this.userLocation.city) {
      locationParts.push(`- city: ${this.userLocation.city}`);
    }

    if (this.userLocation.country) {
      locationParts.push(`- country: ${this.userLocation.country}`);
    }

    if (locationParts.length === 0) {
      return "";
    }

    return `About the origin of user's request:
${locationParts.join("\n")}

`;
  }

  setLastFeedback(feedback: string | undefined) {
    this.latestFeedback = feedback;
  }

  getLastFeedback(): string | undefined {
    return this.latestFeedback;
  }

  getMessageHistory(): string {
    // Format the conversation history with XML tags for clarification check
    return this.conversationUIMessages
      .map((message: UIMessage) => {
        const role = message.role === "user" ? "User" : "Assistant";
        const content = messageToString(message);
        return `<${role}>${content}</${role}>`;
      })
      .join("\n");
  }

  reportUsage(description: string, usage: { promptTokens: number; completionTokens: number; totalTokens: number }) {
    this.usageEntries.push({
      description,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
    });
  }

  getTotalTokensUsed(): number {
    return this.usageEntries.reduce((total, entry) => total + entry.totalTokens, 0);
  }

  getUsageEntries(): UsageEntry[] {
    return this.usageEntries;
  }
}