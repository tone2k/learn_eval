import type { Message } from "ai";
import type { UserLocation } from "~/types";

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
  private readonly conversationMessages: Message[];

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

  constructor(conversationMessages: Message[], userLocation?: UserLocation) {
    this.conversationMessages = conversationMessages;
    this.userLocation = userLocation;
  }

  shouldStop() {
    return this.step >= 10;
  }

  incrementStep() {
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
    const firstUserMessage = this.conversationMessages.find(m => m.role === "user");
    return firstUserMessage?.content?.toString() ?? "";
  }

  getLatestUserMessage(): string {
    // Get the most recent user message
    const userMessages = this.conversationMessages.filter(m => m.role === "user");
    const latestMessage = userMessages[userMessages.length - 1];
    return latestMessage?.content?.toString() ?? "";
  }

  getConversationHistory(): string {
    // Format the conversation history for use in prompts
    return this.conversationMessages
      .map((message) => {
        const role = message.role === "user" ? "Human" : "Assistant";
        const content = typeof message.content === "string" ? message.content : JSON.stringify(message.content);
        return `${role}: ${content}`;
      })
      .join("\n\n");
  }

  getFullConversationMessages(): Message[] {
    return this.conversationMessages;
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
}