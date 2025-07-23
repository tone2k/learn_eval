import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the AI SDK
vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => ({
    __esModule: true,
    default: vi.fn(),
  })),
}));

// Mock the env module
vi.mock('../env', () => ({
  env: {
    GOOGLE_GENERATIVE_AI_API_KEY: 'test-api-key',
  },
}));

describe('models', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export all required models', async () => {
    const { geminiFlash, geminiPro, defaultModel, factualityModel, summarizerModel } = await import('../models');

    expect(geminiFlash).toBeDefined();
    expect(geminiPro).toBeDefined();
    expect(defaultModel).toBeDefined();
    expect(factualityModel).toBeDefined();
    expect(summarizerModel).toBeDefined();
  });

  it('should set defaultModel to geminiPro', async () => {
    const { defaultModel, geminiPro } = await import('../models');

    expect(defaultModel).toBe(geminiPro);
  });

  it('should set factualityModel to geminiFlash', async () => {
    const { factualityModel, geminiFlash } = await import('../models');

    expect(factualityModel).toBe(geminiFlash);
  });

  it('should create Google AI instance with correct API key', async () => {
    const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
    
    await import('../models');

    expect(createGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: 'test-api-key',
    });
  });

  it('should create models with correct identifiers', async () => {
    const mockCreateGoogleGenerativeAI = vi.fn(() => ({
      __esModule: true,
      default: vi.fn((modelId) => ({ modelId })),
    }));

    vi.doMock('@ai-sdk/google', () => ({
      createGoogleGenerativeAI: mockCreateGoogleGenerativeAI,
    }));

    const { geminiFlash, geminiPro, summarizerModel } = await import('../models');

    expect(geminiFlash.modelId).toBe('gemini-1.5-flash-latest');
    expect(geminiPro.modelId).toBe('gemini-1.5-pro-latest');
    expect(summarizerModel.modelId).toBe('gemini-2.0-flash-lite');
  });

  it('should handle environment variable changes', async () => {
    // Test that the module can be re-imported with different env values
    vi.doMock('../env', () => ({
      env: {
        GOOGLE_GENERATIVE_AI_API_KEY: 'different-api-key',
      },
    }));

    const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
    
    // Clear the module cache to force re-import
    vi.resetModules();
    
    await import('../models');

    expect(createGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: 'different-api-key',
    });
  });
});