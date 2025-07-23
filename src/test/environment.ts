import { beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { testDatabase } from "./database";
import { testRedis } from "./redis";
import { testEnvUtils, validateTestEnvironment } from "./config";

// Test environment manager
export class TestEnvironment {
  private static instance: TestEnvironment;
  private isInitialized = false;
  private isShuttingDown = false;

  // Singleton pattern
  static getInstance(): TestEnvironment {
    if (!TestEnvironment.instance) {
      TestEnvironment.instance = new TestEnvironment();
    }
    return TestEnvironment.instance;
  }

  // Initialize test environment
  async initialize() {
    if (this.isInitialized) {
      console.log("ℹ️ Test environment already initialized");
      return { success: true };
    }

    console.log("🧪 Initializing test environment...");

    try {
      // Validate environment variables
      const envValidation = validateTestEnvironment();
      if (!envValidation.success) {
        throw new Error(`Environment validation failed: ${envValidation.error}`);
      }

      // Initialize database
      const dbInit = await testDatabase.initialize();
      if (!dbInit.success) {
        throw new Error(`Database initialization failed: ${dbInit.error}`);
      }

      // Initialize Redis
      const redisInit = await testRedis.initialize();
      if (!redisInit.success) {
        throw new Error(`Redis initialization failed: ${redisInit.error}`);
      }

      // Setup external service mocks
      this.setupExternalServiceMocks();

      // Verify data integrity
      const integrityCheck = await testDatabase.verifyDataIntegrity();
      if (!integrityCheck.success) {
        console.warn("⚠️ Data integrity check failed, but continuing...");
      }

      this.isInitialized = true;
      console.log("✅ Test environment initialized successfully");
      return { success: true };
    } catch (error) {
      console.error("❌ Test environment initialization failed:", error);
      return { success: false, error };
    }
  }

  // Cleanup test environment
  async cleanup() {
    if (this.isShuttingDown) {
      return { success: true };
    }

    this.isShuttingDown = true;
    console.log("🧹 Cleaning up test environment...");

    try {
      // Clean up database
      const dbCleanup = await testDatabase.cleanup();
      if (!dbCleanup.success) {
        console.warn("⚠️ Database cleanup failed:", dbCleanup.error);
      }

      // Clean up Redis
      const redisCleanup = await testRedis.cleanup();
      if (!redisCleanup.success) {
        console.warn("⚠️ Redis cleanup failed:", redisCleanup.error);
      }

      console.log("✅ Test environment cleaned up");
      return { success: true };
    } catch (error) {
      console.error("❌ Test environment cleanup failed:", error);
      return { success: false, error };
    }
  }

  // Setup external service mocks
  private setupExternalServiceMocks() {
    console.log("🔧 Setting up external service mocks...");

    // Mock Google AI
    vi.mock("@ai-sdk/google", () => ({
      google: vi.fn().mockImplementation(() => ({
        generateText: vi.fn().mockResolvedValue({
          text: "Mocked AI response",
          finishReason: "stop",
          usage: {
            promptTokens: 10,
            completionTokens: 20,
            totalTokens: 30,
          },
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
            position: 1,
          },
        ],
        knowledgeGraph: {
          title: "Mock Knowledge Graph",
          description: "Mock knowledge graph description",
          attributes: {
            "Entity Type": "Test Entity",
          },
        },
        answerBox: {
          title: "Mock Answer",
          answer: "This is a mock answer for testing",
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
            setAttributes: vi.fn(),
          }),
          score: vi.fn(),
          event: vi.fn(),
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

    console.log("✅ External service mocks configured");
  }

  // Get environment status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isShuttingDown: this.isShuttingDown,
    };
  }

  // Reset environment state
  reset() {
    this.isInitialized = false;
    this.isShuttingDown = false;
  }
}

// Global test environment instance
const testEnv = TestEnvironment.getInstance();

// Global test setup
beforeAll(async () => {
  console.log("🚀 Starting test suite...");
  
  // Set test environment
  process.env.NODE_ENV = "test";
  
  // Initialize test environment
  const initResult = await testEnv.initialize();
  if (!initResult.success) {
    throw new Error(`Failed to initialize test environment: ${initResult.error}`);
  }
}, 30000); // 30 second timeout for initialization

// Global test teardown
afterAll(async () => {
  console.log("🏁 Finishing test suite...");
  
  // Cleanup test environment
  await testEnv.cleanup();
  
  // Reset environment state
  testEnv.reset();
}, 10000); // 10 second timeout for cleanup

// Per-test setup
beforeEach(async () => {
  // Ensure environment is initialized
  if (!testEnv.getStatus().isInitialized) {
    await testEnv.initialize();
  }
  
  // Clean up test data before each test
  await Promise.all([
    testDatabase.cleanup(),
    testRedis.cleanup(),
  ]);
}, 5000); // 5 second timeout for per-test setup

// Per-test cleanup
afterEach(async () => {
  // Clean up test data after each test
  await Promise.all([
    testDatabase.cleanup(),
    testRedis.cleanup(),
  ]);
}, 5000); // 5 second timeout for per-test cleanup

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

// Export test environment utilities
export const testEnvironment = {
  // Get test environment instance
  getInstance: () => testEnv,
  
  // Initialize test environment
  initialize: () => testEnv.initialize(),
  
  // Cleanup test environment
  cleanup: () => testEnv.cleanup(),
  
  // Get environment status
  getStatus: () => testEnv.getStatus(),
  
  // Reset environment state
  reset: () => testEnv.reset(),
  
  // Test utilities
  utils: {
    // Generate test data
    generateTestUser: testEnvUtils.generateTestUser,
    generateTestChat: testEnvUtils.generateTestChat,
    generateTestMessage: testEnvUtils.generateTestMessage,
    generateTestId: testEnvUtils.generateTestId,
    
    // Wait utility
    wait: (ms: number, timeoutMs: number = 5000) => 
      new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Wait timeout after ${timeoutMs}ms`));
        }, timeoutMs);
        
        setTimeout(() => {
          clearTimeout(timeout);
          resolve();
        }, ms);
      }),
    
    // Performance measurement
    measurePerformance: async <T>(
      operation: () => Promise<T>,
      timeoutMs: number = 5000
    ): Promise<{ result: T; duration: number }> => {
      const startTime = Date.now();
      const result = await operation();
      const duration = Date.now() - startTime;
      
      if (duration > timeoutMs) {
        throw new Error(`Operation exceeded timeout of ${timeoutMs}ms`);
      }
      
      return { result, duration };
    },
    
    // Retry utility
    retry: async <T>(
      operation: () => Promise<T>,
      maxAttempts: number = 3,
      delayMs: number = 1000
    ): Promise<T> => {
      let lastError: Error;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error as Error;
          
          if (attempt === maxAttempts) {
            throw lastError;
          }
          
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
      
      throw lastError!;
    },
  },
  
  // Database utilities
  database: testDatabase,
  
  // Redis utilities
  redis: testRedis,
  
  // Configuration
  config: testEnvUtils,
};

// Export for use in tests
export { testEnvironment as env };