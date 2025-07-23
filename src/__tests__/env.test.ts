import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the environment variables before importing env
const mockEnvVars = {
  REDIS_URL: 'redis://localhost:6379',
  AUTH_SECRET: 'test-secret',
  AUTH_DISCORD_ID: 'discord-id',
  AUTH_DISCORD_SECRET: 'discord-secret',
  DATABASE_URL: 'postgresql://localhost:5432/test',
  NODE_ENV: 'test',
  GOOGLE_GENERATIVE_AI_API_KEY: 'google-api-key',
  SERPER_API_KEY: 'serper-api-key',
  LANGFUSE_SECRET_KEY: 'langfuse-secret',
  LANGFUSE_PUBLIC_KEY: 'langfuse-public',
  LANGFUSE_BASEURL: 'https://cloud.langfuse.com',
  EVAL_DATASET: 'dev',
  SEARCH_RESULTS_COUNT: '3',
  MAX_PAGES_TO_SCRAPE: '6',
};

describe('env', () => {
  beforeEach(() => {
    // Clear all environment variables
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('REDIS_URL') || key.startsWith('AUTH_') || key.startsWith('DATABASE_URL') || 
          key.startsWith('NODE_ENV') || key.startsWith('GOOGLE_') || key.startsWith('SERPER_') || 
          key.startsWith('LANGFUSE_') || key.startsWith('EVAL_') || key.startsWith('SEARCH_') || 
          key.startsWith('MAX_PAGES_')) {
        delete process.env[key];
      }
    });

    // Set mock environment variables
    Object.entries(mockEnvVars).forEach(([key, value]) => {
      process.env[key] = value;
    });
  });

  afterEach(() => {
    // Clean up environment variables
    Object.keys(mockEnvVars).forEach(key => {
      delete process.env[key];
    });
  });

  it('should load environment variables correctly', async () => {
    // Import env after setting up environment variables
    const { env } = await import('../env');

    expect(env.REDIS_URL).toBe('redis://localhost:6379');
    expect(env.AUTH_SECRET).toBe('test-secret');
    expect(env.AUTH_DISCORD_ID).toBe('discord-id');
    expect(env.AUTH_DISCORD_SECRET).toBe('discord-secret');
    expect(env.DATABASE_URL).toBe('postgresql://localhost:5432/test');
    expect(env.NODE_ENV).toBe('test');
    expect(env.GOOGLE_GENERATIVE_AI_API_KEY).toBe('google-api-key');
    expect(env.SERPER_API_KEY).toBe('serper-api-key');
    expect(env.LANGFUSE_SECRET_KEY).toBe('langfuse-secret');
    expect(env.LANGFUSE_PUBLIC_KEY).toBe('langfuse-public');
    expect(env.LANGFUSE_BASEURL).toBe('https://cloud.langfuse.com');
    expect(env.EVAL_DATASET).toBe('dev');
    expect(env.SEARCH_RESULTS_COUNT).toBe(3);
    expect(env.MAX_PAGES_TO_SCRAPE).toBe(6);
  });

  it('should use default values for optional environment variables', async () => {
    // Remove optional environment variables
    delete process.env.NODE_ENV;
    delete process.env.EVAL_DATASET;
    delete process.env.SEARCH_RESULTS_COUNT;
    delete process.env.MAX_PAGES_TO_SCRAPE;

    const { env } = await import('../env');

    expect(env.NODE_ENV).toBe('development');
    expect(env.EVAL_DATASET).toBe('dev');
    expect(env.SEARCH_RESULTS_COUNT).toBe(3);
    expect(env.MAX_PAGES_TO_SCRAPE).toBe(6);
  });

  it('should handle different NODE_ENV values', async () => {
    const testCases = [
      { env: 'development', expected: 'development' },
      { env: 'test', expected: 'test' },
      { env: 'production', expected: 'production' },
    ];

    for (const testCase of testCases) {
      process.env.NODE_ENV = testCase.env;
      const { env } = await import('../env');
      expect(env.NODE_ENV).toBe(testCase.expected);
    }
  });

  it('should handle different EVAL_DATASET values', async () => {
    const testCases = [
      { dataset: 'dev', expected: 'dev' },
      { dataset: 'ci', expected: 'ci' },
      { dataset: 'regression', expected: 'regression' },
    ];

    for (const testCase of testCases) {
      process.env.EVAL_DATASET = testCase.dataset;
      const { env } = await import('../env');
      expect(env.EVAL_DATASET).toBe(testCase.expected);
    }
  });

  it('should coerce numeric environment variables', async () => {
    process.env.SEARCH_RESULTS_COUNT = '10';
    process.env.MAX_PAGES_TO_SCRAPE = '15';

    const { env } = await import('../env');

    expect(env.SEARCH_RESULTS_COUNT).toBe(10);
    expect(env.MAX_PAGES_TO_SCRAPE).toBe(15);
  });

  it('should handle string URLs correctly', async () => {
    const { env } = await import('../env');

    expect(env.REDIS_URL).toBe('redis://localhost:6379');
    expect(env.DATABASE_URL).toBe('postgresql://localhost:5432/test');
    expect(env.LANGFUSE_BASEURL).toBe('https://cloud.langfuse.com');
  });

  it('should make AUTH_SECRET optional in development', async () => {
    delete process.env.AUTH_SECRET;
    process.env.NODE_ENV = 'development';

    const { env } = await import('../env');
    expect(env.AUTH_SECRET).toBeUndefined();
  });

  it('should require AUTH_SECRET in production', async () => {
    delete process.env.AUTH_SECRET;
    process.env.NODE_ENV = 'production';

    await expect(import('../env')).rejects.toThrow();
  });

  it('should validate URL format for URL environment variables', async () => {
    process.env.REDIS_URL = 'invalid-url';
    
    await expect(import('../env')).rejects.toThrow();
  });

  it('should handle empty strings as undefined when emptyStringAsUndefined is true', async () => {
    process.env.SEARCH_RESULTS_COUNT = '';
    process.env.MAX_PAGES_TO_SCRAPE = '';

    const { env } = await import('../env');

    expect(env.SEARCH_RESULTS_COUNT).toBe(3); // Should use default
    expect(env.MAX_PAGES_TO_SCRAPE).toBe(6); // Should use default
  });

  it('should skip validation when SKIP_ENV_VALIDATION is set', async () => {
    process.env.SKIP_ENV_VALIDATION = 'true';
    // Set invalid values that would normally cause validation to fail
    process.env.REDIS_URL = 'invalid-url';
    process.env.DATABASE_URL = 'invalid-url';

    // Should not throw when SKIP_ENV_VALIDATION is true
    const { env } = await import('../env');
    expect(env.REDIS_URL).toBe('invalid-url');
    expect(env.DATABASE_URL).toBe('invalid-url');
  });
});