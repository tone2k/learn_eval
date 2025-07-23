import { beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { db } from "~/server/db";
import { chats, messages } from "~/server/db/schema";
import { redis } from "~/server/redis/redis";
import { eq, inArray } from "drizzle-orm";

// Test environment configuration
const TEST_CONFIG = {
  // Database
  CLEANUP_PATTERNS: ["test-%", "e2e-%", "integration-%"],
  
  // Redis
  REDIS_PREFIXES: ["test_", "e2e_", "integration_"],
  
  // Timeouts
  TIMEOUTS: {
    SHORT: 5000,
    MEDIUM: 10000,
    LONG: 30000,
    VERY_LONG: 120000,
  },
  
  // Rate limiting
  RATE_LIMIT: {
    MAX_REQUESTS: 3,
    WINDOW_MS: 1000,
    KEY_PREFIX: "test_rate_limit",
    MAX_RETRIES: 2,
  },
};

// Global test setup
beforeAll(async () => {
  console.log("🧪 Setting up test environment...");
  
  // Set test environment
  process.env.NODE_ENV = "test";
  
  // Verify database connection
  try {
    await db.execute("SELECT 1");
    console.log("✅ Database connection established");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw error;
  }

  // Verify Redis connection
  try {
    await redis.ping();
    console.log("✅ Redis connection established");
  } catch (error) {
    console.error("❌ Redis connection failed:", error);
    throw error;
  }

  // Setup external service mocks
  setupExternalServiceMocks();
  
  console.log("✅ Test environment setup complete");
});

// Global test teardown
afterAll(async () => {
  console.log("🧹 Cleaning up test environment...");
  
  // Clean up all test data
  await cleanupAllTestData();
  
  // Close database connection
  await db.disconnect();
  
  // Close Redis connection
  await redis.disconnect();
  
  console.log("✅ Test environment cleaned up");
});

// Clean up test data before and after each test
beforeEach(async () => {
  await cleanupTestData();
});

afterEach(async () => {
  await cleanupTestData();
});

// Setup external service mocks
function setupExternalServiceMocks() {
  // Mock Google AI
  vi.mock("@ai-sdk/google", () => ({
    google: vi.fn().mockImplementation(() => ({
      generateText: vi.fn().mockResolvedValue({
        text: "Mocked AI response",
        finishReason: "stop",
      }),
      streamText: vi.fn().mockResolvedValue({
        textStream: {
          [Symbol.asyncIterator]: async function* () {
            yield { type: "text-delta", textDelta: "Mocked " };
            yield { type: "text-delta", textDelta: "streamed " };
            yield { type: "text-delta", textDelta: "response" };
          },
        },
      }),
    })),
  }));

  // Mock Serper API
  vi.mock("~/serper", () => ({
    searchWeb: vi.fn().mockResolvedValue({
      organic: [
        {
          title: "Mock Search Result",
          link: "https://example.com",
          snippet: "This is a mock search result for testing",
        },
      ],
      knowledgeGraph: {
        title: "Mock Knowledge Graph",
        description: "Mock knowledge graph description",
      },
    }),
  }));

  // Mock Langfuse
  vi.mock("langfuse", () => ({
    Langfuse: vi.fn().mockImplementation(() => ({
      trace: vi.fn().mockReturnValue({
        id: "test-trace-id",
        update: vi.fn(),
        span: vi.fn().mockReturnValue({
          end: vi.fn(),
        }),
        score: vi.fn(),
      }),
      flushAsync: vi.fn().mockResolvedValue(undefined),
    })),
  }));

  // Mock Vercel Functions
  vi.mock("@vercel/functions", () => ({
    geolocation: vi.fn().mockReturnValue({
      longitude: -122.4194,
      latitude: 37.7749,
      city: "San Francisco",
      country: "US",
    }),
  }));

  // Mock AI SDK
  vi.mock("ai", () => ({
    generateText: vi.fn().mockResolvedValue({
      text: "Mocked generated text",
    }),
    createDataStreamResponse: vi.fn().mockImplementation(({ execute }) => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          execute({
            writeData: (data: any) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            },
            writeMessageAnnotation: (annotation: any) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(annotation)}\n\n`));
            },
          });
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }),
    appendResponseMessages: vi.fn().mockImplementation(({ messages, responseMessages }) => {
      return [...messages, ...responseMessages];
    }),
  }));

  // Mock Deep Search
  vi.mock("~/deep-search", () => ({
    streamFromDeepSearch: vi.fn().mockResolvedValue({
      mergeIntoDataStream: vi.fn(),
    }),
  }));

  // Mock URL Summarization
  vi.mock("~/summarize-url", () => ({
    summarizeUrl: vi.fn().mockResolvedValue({
      title: "Mock Page Title",
      content: "Mock page content for testing",
      url: "https://example.com",
    }),
  }));

  // Mock Markdown Transform
  vi.mock("~/markdown-transform", () => ({
    markdownJoinerTransform: vi.fn().mockImplementation(() => () => {
      const encoder = new TextEncoder();
      return new TransformStream({
        transform(chunk: any, controller: any) {
          controller.enqueue(chunk);
        },
      });
    }),
  }));

  // Mock System Context
  vi.mock("~/system-context", () => ({
    getSystemContext: vi.fn().mockResolvedValue("Mock system context"),
  }));

  // Mock Answer Question
  vi.mock("~/answer-question", () => ({
    answerQuestion: vi.fn().mockResolvedValue({
      answer: "Mock answer to question",
      sources: ["https://example.com"],
    }),
  }));

  // Mock Run Agent Loop
  vi.mock("~/run-agent-loop", () => ({
    runAgentLoop: vi.fn().mockResolvedValue({
      messages: [
        { role: "assistant", content: "Mock agent response" },
      ],
      annotations: [],
    }),
  }));
}

// Clean up test data
async function cleanupTestData() {
  try {
    // Clean up database test data
    const testChats = await db
      .select()
      .from(chats)
      .where(
        inArray(
          chats.id,
          TEST_CONFIG.CLEANUP_PATTERNS.map(pattern => 
            db.raw(`id LIKE '${pattern}'`)
          )
        )
      );

    if (testChats.length > 0) {
      const testChatIds = testChats.map(chat => chat.id);
      
      // Delete messages first (foreign key constraint)
      await db.delete(messages).where(inArray(messages.chatId, testChatIds));
      
      // Delete chats
      await db.delete(chats).where(inArray(chats.id, testChatIds));
    }

    // Clean up Redis test keys
    for (const prefix of TEST_CONFIG.REDIS_PREFIXES) {
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  } catch (error) {
    console.error("Error during test cleanup:", error);
  }
}

// Clean up all test data
async function cleanupAllTestData() {
  try {
    // Clean up all database test data
    const testChats = await db
      .select()
      .from(chats)
      .where(
        inArray(
          chats.id,
          TEST_CONFIG.CLEANUP_PATTERNS.map(pattern => 
            db.raw(`id LIKE '${pattern}'`)
          )
        )
      );

    if (testChats.length > 0) {
      const testChatIds = testChats.map(chat => chat.id);
      
      // Delete messages first
      await db.delete(messages).where(inArray(messages.chatId, testChatIds));
      
      // Delete chats
      await db.delete(chats).where(inArray(chats.id, testChatIds));
    }

    // Clean up all Redis test keys
    for (const prefix of TEST_CONFIG.REDIS_PREFIXES) {
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  } catch (error) {
    console.error("Error during full test cleanup:", error);
  }
}

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Only show console output for errors in tests
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Export test utilities
export const testUtils = {
  TEST_CONFIG,
  
  async cleanupTestData(chatId: string) {
    try {
      await db.delete(messages).where(eq(messages.chatId, chatId));
      await db.delete(chats).where(eq(chats.id, chatId));
    } catch (error) {
      console.error("Error cleaning up test data:", error);
    }
  },

  async cleanupAllTestData() {
    await cleanupAllTestData();
  },

  async cleanupRedisTestKeys() {
    try {
      for (const prefix of TEST_CONFIG.REDIS_PREFIXES) {
        const keys = await redis.keys(`${prefix}*`);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }
    } catch (error) {
      console.error("Error cleaning up Redis test keys:", error);
    }
  },

  // Wait utility with timeout
  async wait(ms: number, timeoutMs: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Wait timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      
      setTimeout(() => {
        clearTimeout(timeout);
        resolve();
      }, ms);
    });
  },

  // Generate unique test ID
  generateTestId(prefix: string = "test"): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Create test database transaction
  async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    return await db.transaction(fn);
  },

  // Mock external service responses
  mockExternalServices: {
    googleAI: {
      generateText: (text: string) => ({
        text,
        finishReason: "stop" as const,
      }),
      streamText: (text: string) => ({
        textStream: {
          [Symbol.asyncIterator]: async function* () {
            const words = text.split(" ");
            for (const word of words) {
              yield { type: "text-delta" as const, textDelta: word + " " };
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          },
        },
      }),
    },
    
    serper: {
      searchWeb: (query: string) => ({
        organic: [
          {
            title: `Search result for: ${query}`,
            link: "https://example.com",
            snippet: `Mock search result for query: ${query}`,
          },
        ],
        knowledgeGraph: {
          title: "Mock Knowledge Graph",
          description: "Mock knowledge graph description",
        },
      }),
    },
    
    langfuse: {
      trace: {
        id: "test-trace-id",
        update: vi.fn(),
        span: vi.fn().mockReturnValue({
          end: vi.fn(),
        }),
        score: vi.fn(),
      },
      flushAsync: vi.fn().mockResolvedValue(undefined),
    },
  },
};

// Export for use in tests
export { db, redis };