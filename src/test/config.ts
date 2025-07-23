import { z } from "zod";

// Test environment schema
const TestEnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Redis
  REDIS_URL: z.string().url(),
  
  // Authentication (test values)
  AUTH_SECRET: z.string().default("test-secret-key"),
  AUTH_DISCORD_ID: z.string().default("test-discord-id"),
  AUTH_DISCORD_SECRET: z.string().default("test-discord-secret"),
  
  // External Services (test keys)
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().default("test-google-ai-key"),
  SERPER_API_KEY: z.string().default("test-serper-key"),
  LANGFUSE_SECRET_KEY: z.string().default("test-langfuse-secret"),
  LANGFUSE_PUBLIC_KEY: z.string().default("test-langfuse-public"),
  LANGFUSE_BASEURL: z.string().url().default("https://test.langfuse.com"),
  
  // Test Configuration
  NODE_ENV: z.enum(["test"]).default("test"),
  EVAL_DATASET: z.enum(["dev", "ci", "regression"]).default("dev"),
  SEARCH_RESULTS_COUNT: z.coerce.number().default(3),
  MAX_PAGES_TO_SCRAPE: z.coerce.number().default(6),
  
  // Test-specific settings
  TEST_TIMEOUT: z.coerce.number().default(30000),
  TEST_DATABASE_PREFIX: z.string().default("test_"),
  TEST_REDIS_PREFIX: z.string().default("test_"),
});

// Test configuration
export const TEST_CONFIG = {
  // Database
  DATABASE: {
    URL: process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test_db",
    CLEANUP_PATTERNS: ["test-%", "e2e-%", "integration-%"],
    TRANSACTION_TIMEOUT: 10000,
  },
  
  // Redis
  REDIS: {
    URL: process.env.REDIS_URL || "redis://localhost:6379",
    PREFIXES: ["test_", "e2e_", "integration_"],
    CONNECTION_TIMEOUT: 5000,
  },
  
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
  
  // External services
  EXTERNAL_SERVICES: {
    GOOGLE_AI: {
      MODEL: "gemini-1.5-flash",
      MAX_TOKENS: 1000,
      TEMPERATURE: 0.7,
    },
    SERPER: {
      MAX_RESULTS: 5,
      SEARCH_TYPE: "search",
    },
    LANGFUSE: {
      PROJECT_NAME: "test-project",
      ENVIRONMENT: "test",
    },
  },
  
  // Test data
  TEST_DATA: {
    USERS: {
      DEFAULT: {
        id: "test-user-default",
        name: "Test User",
        email: "test@example.com",
      },
      ADMIN: {
        id: "test-user-admin",
        name: "Admin User",
        email: "admin@example.com",
      },
      GUEST: {
        id: "test-user-guest",
        name: "Guest User",
        email: "guest@example.com",
      },
    },
    CHATS: {
      DEFAULT_TITLE: "Test Chat",
      MAX_MESSAGES: 100,
      MAX_CONTENT_LENGTH: 10000,
    },
    MESSAGES: {
      DEFAULT_CONTENT: "Hello, this is a test message",
      MAX_CONTENT_LENGTH: 5000,
    },
  },
  
  // Performance thresholds
  PERFORMANCE: {
    DATABASE_QUERY_TIMEOUT: 1000,
    REDIS_OPERATION_TIMEOUT: 500,
    API_RESPONSE_TIMEOUT: 5000,
    LARGE_DATASET_SIZE: 1000,
  },
  
  // Error scenarios
  ERROR_SCENARIOS: {
    DATABASE_CONNECTION_FAILURE: "database_connection_failure",
    REDIS_CONNECTION_FAILURE: "redis_connection_failure",
    EXTERNAL_SERVICE_FAILURE: "external_service_failure",
    RATE_LIMIT_EXCEEDED: "rate_limit_exceeded",
    AUTHENTICATION_FAILURE: "authentication_failure",
    VALIDATION_FAILURE: "validation_failure",
  },
};

// Validate test environment
export function validateTestEnvironment() {
  try {
    const env = TestEnvSchema.parse(process.env);
    return { success: true, env };
  } catch (error) {
    console.error("❌ Test environment validation failed:", error);
    return { success: false, error };
  }
}

// Test environment utilities
export const testEnvUtils = {
  // Generate test database URL
  getTestDatabaseUrl(): string {
    return process.env.DATABASE_URL || TEST_CONFIG.DATABASE.URL;
  },
  
  // Generate test Redis URL
  getTestRedisUrl(): string {
    return process.env.REDIS_URL || TEST_CONFIG.REDIS.URL;
  },
  
  // Check if running in test environment
  isTestEnvironment(): boolean {
    return process.env.NODE_ENV === "test";
  },
  
  // Get test timeout
  getTestTimeout(): number {
    return parseInt(process.env.TEST_TIMEOUT || TEST_CONFIG.TIMEOUTS.LONG.toString());
  },
  
  // Generate unique test identifier
  generateTestId(prefix: string = "test"): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}-${timestamp}-${random}`;
  },
  
  // Generate test user data
  generateTestUser(overrides: Partial<typeof TEST_CONFIG.TEST_DATA.USERS.DEFAULT> = {}) {
    return {
      ...TEST_CONFIG.TEST_DATA.USERS.DEFAULT,
      id: this.generateTestId("user"),
      ...overrides,
    };
  },
  
  // Generate test chat data
  generateTestChat(overrides: Partial<{ id: string; title: string; userId: string }> = {}) {
    return {
      id: this.generateTestId("chat"),
      title: TEST_CONFIG.TEST_DATA.CHATS.DEFAULT_TITLE,
      userId: this.generateTestId("user"),
      ...overrides,
    };
  },
  
  // Generate test message data
  generateTestMessage(overrides: Partial<{ content: string; role: "user" | "assistant" }> = {}) {
    return {
      content: TEST_CONFIG.TEST_DATA.MESSAGES.DEFAULT_CONTENT,
      role: "user" as const,
      ...overrides,
    };
  },
  
  // Create test environment variables
  createTestEnvVars(overrides: Record<string, string> = {}): Record<string, string> {
    const baseEnv = {
      NODE_ENV: "test",
      DATABASE_URL: this.getTestDatabaseUrl(),
      REDIS_URL: this.getTestRedisUrl(),
      AUTH_SECRET: "test-secret-key",
      AUTH_DISCORD_ID: "test-discord-id",
      AUTH_DISCORD_SECRET: "test-discord-secret",
      GOOGLE_GENERATIVE_AI_API_KEY: "test-google-ai-key",
      SERPER_API_KEY: "test-serper-key",
      LANGFUSE_SECRET_KEY: "test-langfuse-secret",
      LANGFUSE_PUBLIC_KEY: "test-langfuse-public",
      LANGFUSE_BASEURL: "https://test.langfuse.com",
      EVAL_DATASET: "dev",
      SEARCH_RESULTS_COUNT: "3",
      MAX_PAGES_TO_SCRAPE: "6",
      TEST_TIMEOUT: TEST_CONFIG.TIMEOUTS.LONG.toString(),
    };
    
    return { ...baseEnv, ...overrides };
  },
  
  // Mock external service responses
  mockResponses: {
    googleAI: {
      generateText: (text: string = "Mocked AI response") => ({
        text,
        finishReason: "stop" as const,
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      }),
      streamText: (text: string = "Mocked streamed response") => ({
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
      searchWeb: (query: string = "test query") => ({
        organic: [
          {
            title: `Search result for: ${query}`,
            link: "https://example.com",
            snippet: `Mock search result for query: ${query}`,
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
    },
    
    langfuse: {
      trace: {
        id: "test-trace-id",
        update: vi.fn(),
        span: vi.fn().mockReturnValue({
          end: vi.fn(),
          setAttributes: vi.fn(),
        }),
        score: vi.fn(),
        event: vi.fn(),
      },
      flushAsync: vi.fn().mockResolvedValue(undefined),
    },
  },
};

// Export for use in tests
export { TEST_CONFIG as config };