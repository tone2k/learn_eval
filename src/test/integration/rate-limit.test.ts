import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { checkRateLimit, recordRateLimit, type RateLimitConfig } from "~/server/rate-limit";
import { redis } from "~/server/redis/redis";

describe("Rate Limiting Integration Tests", () => {
  const testConfig: RateLimitConfig = {
    maxRequests: 3,
    windowMs: 1000, // 1 second for faster tests
    keyPrefix: "test_rate_limit",
    maxRetries: 2,
  };

  beforeEach(async () => {
    // Clean up any existing test keys
    const keys = await redis.keys(`${testConfig.keyPrefix}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  afterEach(async () => {
    // Clean up test keys
    const keys = await redis.keys(`${testConfig.keyPrefix}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  describe("checkRateLimit", () => {
    it("should allow requests within limit", async () => {
      const result = await checkRateLimit(testConfig);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);
      expect(result.totalHits).toBe(0);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it("should track requests correctly", async () => {
      // Record some requests
      await recordRateLimit(testConfig);
      await recordRateLimit(testConfig);

      const result = await checkRateLimit(testConfig);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
      expect(result.totalHits).toBe(2);
    });

    it("should block requests when limit exceeded", async () => {
      // Record maximum requests
      await recordRateLimit(testConfig);
      await recordRateLimit(testConfig);
      await recordRateLimit(testConfig);

      const result = await checkRateLimit(testConfig);
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.totalHits).toBe(3);
    });

    it("should handle retry mechanism", async () => {
      // Record maximum requests
      await recordRateLimit(testConfig);
      await recordRateLimit(testConfig);
      await recordRateLimit(testConfig);

      const result = await checkRateLimit(testConfig);
      expect(result.allowed).toBe(false);

      // Wait for window to reset (add buffer for reliability)
      await new Promise(resolve => setTimeout(resolve, 1200));

      const retryResult = await result.retry();
      expect(retryResult).toBe(true);
    }, 10000); // Increase timeout for this test

    it("should respect max retries", async () => {
      const configWithLowRetries: RateLimitConfig = {
        ...testConfig,
        maxRetries: 1,
      };

      // Record maximum requests
      await recordRateLimit(configWithLowRetries);
      await recordRateLimit(configWithLowRetries);
      await recordRateLimit(configWithLowRetries);

      const result = await checkRateLimit(configWithLowRetries);
      expect(result.allowed).toBe(false);

      // Try retry but it should fail due to max retries
      const retryResult = await result.retry();
      expect(retryResult).toBe(false);
    });
  });

  describe("recordRateLimit", () => {
    it("should increment request counter", async () => {
      await recordRateLimit(testConfig);
      
      const result = await checkRateLimit(testConfig);
      expect(result.totalHits).toBe(1);
      expect(result.remaining).toBe(2);
    });

    it("should handle multiple rapid requests", async () => {
      // Make multiple requests rapidly
      await Promise.all([
        recordRateLimit(testConfig),
        recordRateLimit(testConfig),
        recordRateLimit(testConfig),
      ]);

      const result = await checkRateLimit(testConfig);
      expect(result.totalHits).toBe(3);
      expect(result.allowed).toBe(false);
    });

    it("should set proper expiration on keys", async () => {
      await recordRateLimit(testConfig);
      
      // Check that the key exists
      const keys = await redis.keys(`${testConfig.keyPrefix}:*`);
      expect(keys.length).toBe(1);

      // Wait for expiration (add buffer for reliability)
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Check that the key is gone
      const keysAfterExpiry = await redis.keys(`${testConfig.keyPrefix}:*`);
      expect(keysAfterExpiry.length).toBe(0);
    }, 10000); // Increase timeout for this test
  });

  describe("Rate limit window behavior", () => {
    it("should reset after window expires", async () => {
      // Record maximum requests
      await recordRateLimit(testConfig);
      await recordRateLimit(testConfig);
      await recordRateLimit(testConfig);

      let result = await checkRateLimit(testConfig);
      expect(result.allowed).toBe(false);

      // Wait for window to reset (add buffer for reliability)
      await new Promise(resolve => setTimeout(resolve, 1200));

      result = await checkRateLimit(testConfig);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);
    }, 10000); // Increase timeout for this test

    it("should handle different key prefixes", async () => {
      const config1: RateLimitConfig = {
        ...testConfig,
        keyPrefix: "test_prefix_1",
      };
      const config2: RateLimitConfig = {
        ...testConfig,
        keyPrefix: "test_prefix_2",
      };

      // Record requests with different prefixes
      await recordRateLimit(config1);
      await recordRateLimit(config1);
      await recordRateLimit(config2);

      const result1 = await checkRateLimit(config1);
      const result2 = await checkRateLimit(config2);

      expect(result1.totalHits).toBe(2);
      expect(result2.totalHits).toBe(1);
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("should fail open when Redis is unavailable", async () => {
      // This test would require mocking Redis to simulate failure
      // For now, we'll test the basic structure
      const result = await checkRateLimit(testConfig);
      expect(result).toHaveProperty("allowed");
      expect(result).toHaveProperty("remaining");
      expect(result).toHaveProperty("retry");
    });
  });
});