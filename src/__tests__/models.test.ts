import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the AI SDK
const mockCreateGoogleGenerativeAI = vi.fn();
vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: mockCreateGoogleGenerativeAI,
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
    vi.resetModules();
  });

  it('should export all required models', async () => {
    // Mock the Google AI factory to return mock models
    const mockGoogleAI = {
      __esModule: true,
      default: vi.fn((modelId) => ({ modelId, type: 'google-ai' })),
    };
    mockCreateGoogleGenerativeAI.mockReturnValue(mockGoogleAI);

    const { geminiFlash, geminiPro, defaultModel, factualityModel, summarizerModel } = await import('../models');

    expect(geminiFlash).toBeDefined();
    expect(geminiPro).toBeDefined();
    expect(defaultModel).toBeDefined();
    expect(factualityModel).toBeDefined();
    expect(summarizerModel).toBeDefined();
  });

  it('should set defaultModel to geminiPro', async () => {
    const mockGoogleAI = {
      __esModule: true,
      default: vi.fn((modelId) => ({ modelId, type: 'google-ai' })),
    };
    mockCreateGoogleGenerativeAI.mockReturnValue(mockGoogleAI);

    const { defaultModel, geminiPro } = await import('../models');

    expect(defaultModel).toBe(geminiPro);
  });

  it('should set factualityModel to geminiFlash', async () => {
    const mockGoogleAI = {
      __esModule: true,
      default: vi.fn((modelId) => ({ modelId, type: 'google-ai' })),
    };
    mockCreateGoogleGenerativeAI.mockReturnValue(mockGoogleAI);

    const { factualityModel, geminiFlash } = await import('../models');

    expect(factualityModel).toBe(geminiFlash);
  });

  it('should create Google AI instance with correct API key', async () => {
    const mockGoogleAI = {
      __esModule: true,
      default: vi.fn((modelId) => ({ modelId, type: 'google-ai' })),
    };
    mockCreateGoogleGenerativeAI.mockReturnValue(mockGoogleAI);
    
    await import('../models');

    expect(mockCreateGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: 'test-api-key',
    });
  });

  it('should create models with correct identifiers', async () => {
    const mockGoogleAI = {
      __esModule: true,
      default: vi.fn((modelId) => ({ modelId, type: 'google-ai' })),
    };
    mockCreateGoogleGenerativeAI.mockReturnValue(mockGoogleAI);

    const { geminiFlash, geminiPro, summarizerModel } = await import('../models');

    expect(geminiFlash.modelId).toBe('gemini-1.5-flash-latest');
    expect(geminiPro.modelId).toBe('gemini-1.5-pro-latest');
    expect(summarizerModel.modelId).toBe('gemini-2.0-flash-lite');
  });

  it('should call Google AI factory with correct model IDs', async () => {
    const mockGoogleAI = {
      __esModule: true,
      default: vi.fn((modelId) => ({ modelId, type: 'google-ai' })),
    };
    mockCreateGoogleGenerativeAI.mockReturnValue(mockGoogleAI);

    await import('../models');

    expect(mockGoogleAI.default).toHaveBeenCalledWith('gemini-1.5-flash-latest');
    expect(mockGoogleAI.default).toHaveBeenCalledWith('gemini-1.5-pro-latest');
    expect(mockGoogleAI.default).toHaveBeenCalledWith('gemini-2.0-flash-lite');
  });

  it('should handle environment variable changes', async () => {
    // Test that the module can be re-imported with different env values
    vi.doMock('../env', () => ({
      env: {
        GOOGLE_GENERATIVE_AI_API_KEY: 'different-api-key',
      },
    }));

    const mockGoogleAI = {
      __esModule: true,
      default: vi.fn((modelId) => ({ modelId, type: 'google-ai' })),
    };
    mockCreateGoogleGenerativeAI.mockReturnValue(mockGoogleAI);
    
    // Clear the module cache to force re-import
    vi.resetModules();
    
    await import('../models');

    expect(mockCreateGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: 'different-api-key',
    });
  });

  it('should create models only once per import', async () => {
    const mockGoogleAI = {
      __esModule: true,
      default: vi.fn((modelId) => ({ modelId, type: 'google-ai' })),
    };
    mockCreateGoogleGenerativeAI.mockReturnValue(mockGoogleAI);

    // Import multiple times
    await import('../models');
    await import('../models');
    await import('../models');

    // Should only create the Google AI instance once
    expect(mockCreateGoogleGenerativeAI).toHaveBeenCalledTimes(1);
    expect(mockGoogleAI.default).toHaveBeenCalledTimes(3); // Once for each model
  });
});