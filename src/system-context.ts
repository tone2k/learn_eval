import type { Message } from "ai";

type QueryResultSearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
};

type QueryResult = {
  query: string;
  results: QueryResultSearchResult[];
};

type ScrapeResult = {
  url: string;
  result: string;
};

const toQueryResult = (
  query: QueryResultSearchResult,
) =>
  [
    `### ${query.date} - ${query.title}`,
    query.url,
    query.snippet,
  ].join("\n\n");

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
   * The history of all queries searched
   */
  private queryHistory: QueryResult[] = [];

  /**
   * The history of all URLs scraped
   */
  private scrapeHistory: ScrapeResult[] = [];

  constructor(conversationMessages: Message[]) {
    this.conversationMessages = conversationMessages;
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

  reportQueries(queries: QueryResult[]) {
    this.queryHistory.push(...queries);
  }

  reportScrapes(scrapes: ScrapeResult[]) {
    this.scrapeHistory.push(...scrapes);
  }

  getQueryHistory(): string {
    return this.queryHistory
      .map((query) =>
        [
          `## Query: "${query.query}"`,
          ...query.results.map(toQueryResult),
        ].join("\n\n"),
      )
      .join("\n\n");
  }

  getScrapeHistory(): string {
    return this.scrapeHistory
      .map((scrape) =>
        [
          `## Scrape: "${scrape.url}"`,
          `<scrape_result>`,
          scrape.result,
          `</scrape_result>`,
        ].join("\n\n"),
      )
      .join("\n\n");
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
} 