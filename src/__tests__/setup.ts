import { vi } from 'vitest';

// Global mocks for testing
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.AUTH_SECRET = 'test-secret';
process.env.AUTH_DISCORD_ID = 'discord-id';
process.env.AUTH_DISCORD_SECRET = 'discord-secret';
process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'google-api-key';
process.env.SERPER_API_KEY = 'serper-api-key';
process.env.LANGFUSE_SECRET_KEY = 'langfuse-secret';
process.env.LANGFUSE_PUBLIC_KEY = 'langfuse-public';
process.env.LANGFUSE_BASEURL = 'https://cloud.langfuse.com';
process.env.EVAL_DATASET = 'dev';
process.env.SEARCH_RESULTS_COUNT = '3';
process.env.MAX_PAGES_TO_SCRAPE = '6';

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});