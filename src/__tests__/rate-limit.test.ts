import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, recordRateLimit, type RateLimitConfig } from '../server/rate-limit';

// Mock Redis
vi.mock('../server/redis/redis', () => ({
  redis: {
    get: vi.fn(),
    pipeline: vi.fn(() => ({
      incr: vi.fn(),
      expire: vi.fn(),
      exec: vi.fn(),
    })),
  },
}));

import { redis } from '../server/redis/redis';

const mockRedis = vi.mocked(redis);

describe('rate-limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    const baseConfig: RateLimitConfig = {
      maxRequests: 10,
      windowMs: 60000, // 1 minute
      keyPrefix: 'test_rate_limit',
    };

    it('should allow request when under limit', async () => {
      mockRedis.get.mockResolvedValue('5'); // 5 requests in current window

      const result = await checkRateLimit(baseConfig);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
      expect(result.totalHits).toBe(5);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should deny request when at limit', async () => {
      mockRedis.get.mockResolvedValue('10'); // At the limit

      const result = await checkRateLimit(baseConfig);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.totalHits).toBe(10);
    });

    it('should deny request when over limit', async () => {
      mockRedis.get.mockResolvedValue('15'); // Over the limit

      const result = await checkRateLimit(baseConfig);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.totalHits).toBe(15);
    });

    it('should handle no existing count', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await checkRateLimit(baseConfig);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
      expect(result.totalHits).toBe(0);
    });

    it('should handle empty string count', async () => {
      mockRedis.get.mockResolvedValue('');

      const result = await checkRateLimit(baseConfig);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
      expect(result.totalHits).toBe(0);
    });

    it('should use default key prefix when not provided', async () => {
      const config = { ...baseConfig };
      delete config.keyPrefix;
      mockRedis.get.mockResolvedValue('5');

      await checkRateLimit(config);

      expect(mockRedis.get).toHaveBeenCalledWith(expect.stringContaining('rate_limit:'));
    });

    it('should calculate correct window start time', async () => {
      const now = new Date('2023-01-01T12:00:30.500Z');
      vi.setSystemTime(now);
      mockRedis.get.mockResolvedValue('5');

      await checkRateLimit(baseConfig);

      // Should round down to the nearest minute
      const expectedWindowStart = Math.floor(now.getTime() / 60000) * 60000;
      expect(mockRedis.get).toHaveBeenCalledWith(
        expect.stringContaining(`test_rate_limit:${expectedWindowStart}`)
      );
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      await expect(checkRateLimit(baseConfig)).rejects.toThrow('Redis connection failed');
    });

    it('should provide retry function', async () => {
      mockRedis.get.mockResolvedValue('10'); // At limit

      const result = await checkRateLimit(baseConfig);

      expect(typeof result.retry).toBe('function');
    });

    it('should retry with waiting when rate limited', async () => {
      const now = new Date('2023-01-01T12:00:00Z');
      vi.setSystemTime(now);
      
      // First call: at limit
      mockRedis.get.mockResolvedValueOnce('10');
      // Second call: under limit after waiting
      mockRedis.get.mockResolvedValueOnce('5');

      const result = await checkRateLimit(baseConfig);
      expect(result.allowed).toBe(false);

      // Fast forward time to simulate waiting
      vi.advanceTimersByTime(60000); // 1 minute

      const retryResult = await result.retry();
      expect(retryResult).toBe(true);
    });

    it('should respect maxRetries in retry function', async () => {
      const config = { ...baseConfig, maxRetries: 2 };
      mockRedis.get.mockResolvedValue('10'); // Always at limit

      const result = await checkRateLimit(config);

      // Fast forward time multiple times
      vi.advanceTimersByTime(60000);
      const retry1 = await result.retry();
      expect(retry1).toBe(false);

      vi.advanceTimersByTime(60000);
      const retry2 = await result.retry();
      expect(retry2).toBe(false);

      vi.advanceTimersByTime(60000);
      const retry3 = await result.retry();
      expect(retry3).toBe(false); // Should fail after max retries
    });
  });

  describe('recordRateLimit', () => {
    const baseConfig = {
      windowMs: 60000,
      keyPrefix: 'test_rate_limit',
    };

    it('should record a new request', async () => {
      const mockPipeline = {
        incr: vi.fn(),
        expire: vi.fn(),
        exec: vi.fn().mockResolvedValue([
          [null, 6], // incr result
          [null, 1], // expire result
        ]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      await recordRateLimit(baseConfig);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.incr).toHaveBeenCalled();
      expect(mockPipeline.expire).toHaveBeenCalled();
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should use correct key format', async () => {
      const now = new Date('2023-01-01T12:00:30.500Z');
      vi.setSystemTime(now);
      
      const mockPipeline = {
        incr: vi.fn(),
        expire: vi.fn(),
        exec: vi.fn().mockResolvedValue([[null, 1], [null, 1]]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      await recordRateLimit(baseConfig);

      const expectedWindowStart = Math.floor(now.getTime() / 60000) * 60000;
      const expectedKey = `test_rate_limit:${expectedWindowStart}`;
      
      expect(mockPipeline.incr).toHaveBeenCalledWith(expectedKey);
    });

    it('should set correct expiration time', async () => {
      const mockPipeline = {
        incr: vi.fn(),
        expire: vi.fn(),
        exec: vi.fn().mockResolvedValue([[null, 1], [null, 1]]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      await recordRateLimit(baseConfig);

      // Should expire after windowMs / 1000 seconds
      expect(mockPipeline.expire).toHaveBeenCalledWith(expect.any(String), 60);
    });

    it('should handle pipeline execution failure', async () => {
      const mockPipeline = {
        incr: vi.fn(),
        expire: vi.fn(),
        exec: vi.fn().mockResolvedValue(null),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      await expect(recordRateLimit(baseConfig)).rejects.toThrow('Redis pipeline execution failed');
    });

    it('should handle Redis errors', async () => {
      const mockPipeline = {
        incr: vi.fn(),
        expire: vi.fn(),
        exec: vi.fn().mockRejectedValue(new Error('Redis error')),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      await expect(recordRateLimit(baseConfig)).rejects.toThrow('Redis error');
    });

    it('should use default key prefix when not provided', async () => {
      const config = { windowMs: 60000 };
      const mockPipeline = {
        incr: vi.fn(),
        expire: vi.fn(),
        exec: vi.fn().mockResolvedValue([[null, 1], [null, 1]]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      await recordRateLimit(config);

      expect(mockPipeline.incr).toHaveBeenCalledWith(expect.stringContaining('rate_limit:'));
    });
  });
});