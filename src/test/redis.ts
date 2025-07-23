import { redis } from "~/server/redis/redis";
import { testEnvUtils } from "./config";

// Redis test utilities
export const testRedis = {
  // Initialize test Redis
  async initialize() {
    try {
      // Test Redis connection
      await redis.ping();
      console.log("✅ Test Redis connection established");
      
      // Clean up any existing test keys
      await this.cleanup();
      
      return { success: true };
    } catch (error) {
      console.error("❌ Test Redis initialization failed:", error);
      return { success: false, error };
    }
  },

  // Clean up test keys
  async cleanup(prefixes: string[] = ["test_", "e2e_", "integration_"]) {
    try {
      let totalCleaned = 0;
      
      for (const prefix of prefixes) {
        const keys = await redis.keys(`${prefix}*`);
        if (keys.length > 0) {
          await redis.del(...keys);
          totalCleaned += keys.length;
        }
      }
      
      if (totalCleaned > 0) {
        console.log(`🧹 Cleaned up ${totalCleaned} Redis test keys`);
      }
      
      return { success: true, cleanedCount: totalCleaned };
    } catch (error) {
      console.error("❌ Test Redis cleanup failed:", error);
      return { success: false, error };
    }
  },

  // Set test key
  async setTestKey(key: string, value: string, ttl?: number) {
    try {
      const fullKey = `test_${key}`;
      if (ttl) {
        await redis.setex(fullKey, ttl, value);
      } else {
        await redis.set(fullKey, value);
      }
      return { success: true, key: fullKey };
    } catch (error) {
      console.error("❌ Failed to set test Redis key:", error);
      return { success: false, error };
    }
  },

  // Get test key
  async getTestKey(key: string) {
    try {
      const fullKey = `test_${key}`;
      const value = await redis.get(fullKey);
      return { success: true, value, key: fullKey };
    } catch (error) {
      console.error("❌ Failed to get test Redis key:", error);
      return { success: false, error };
    }
  },

  // Delete test key
  async deleteTestKey(key: string) {
    try {
      const fullKey = `test_${key}`;
      const deleted = await redis.del(fullKey);
      return { success: true, deleted: deleted > 0, key: fullKey };
    } catch (error) {
      console.error("❌ Failed to delete test Redis key:", error);
      return { success: false, error };
    }
  },

  // Set test hash
  async setTestHash(key: string, hash: Record<string, string>, ttl?: number) {
    try {
      const fullKey = `test_${key}`;
      await redis.hset(fullKey, hash);
      
      if (ttl) {
        await redis.expire(fullKey, ttl);
      }
      
      return { success: true, key: fullKey };
    } catch (error) {
      console.error("❌ Failed to set test Redis hash:", error);
      return { success: false, error };
    }
  },

  // Get test hash
  async getTestHash(key: string) {
    try {
      const fullKey = `test_${key}`;
      const hash = await redis.hgetall(fullKey);
      return { success: true, hash, key: fullKey };
    } catch (error) {
      console.error("❌ Failed to get test Redis hash:", error);
      return { success: false, error };
    }
  },

  // Set test list
  async setTestList(key: string, values: string[], ttl?: number) {
    try {
      const fullKey = `test_${key}`;
      
      // Clear existing list
      await redis.del(fullKey);
      
      // Add new values
      if (values.length > 0) {
        await redis.lpush(fullKey, ...values);
      }
      
      if (ttl) {
        await redis.expire(fullKey, ttl);
      }
      
      return { success: true, key: fullKey };
    } catch (error) {
      console.error("❌ Failed to set test Redis list:", error);
      return { success: false, error };
    }
  },

  // Get test list
  async getTestList(key: string) {
    try {
      const fullKey = `test_${key}`;
      const list = await redis.lrange(fullKey, 0, -1);
      return { success: true, list, key: fullKey };
    } catch (error) {
      console.error("❌ Failed to get test Redis list:", error);
      return { success: false, error };
    }
  },

  // Set test set
  async setTestSet(key: string, members: string[], ttl?: number) {
    try {
      const fullKey = `test_${key}`;
      
      // Clear existing set
      await redis.del(fullKey);
      
      // Add new members
      if (members.length > 0) {
        await redis.sadd(fullKey, ...members);
      }
      
      if (ttl) {
        await redis.expire(fullKey, ttl);
      }
      
      return { success: true, key: fullKey };
    } catch (error) {
      console.error("❌ Failed to set test Redis set:", error);
      return { success: false, error };
    }
  },

  // Get test set
  async getTestSet(key: string) {
    try {
      const fullKey = `test_${key}`;
      const set = await redis.smembers(fullKey);
      return { success: true, set, key: fullKey };
    } catch (error) {
      console.error("❌ Failed to get test Redis set:", error);
      return { success: false, error };
    }
  },

  // Increment test counter
  async incrementTestCounter(key: string, ttl?: number) {
    try {
      const fullKey = `test_${key}`;
      const value = await redis.incr(fullKey);
      
      if (ttl) {
        await redis.expire(fullKey, ttl);
      }
      
      return { success: true, value, key: fullKey };
    } catch (error) {
      console.error("❌ Failed to increment test Redis counter:", error);
      return { success: false, error };
    }
  },

  // Get test counter
  async getTestCounter(key: string) {
    try {
      const fullKey = `test_${key}`;
      const value = await redis.get(fullKey);
      return { success: true, value: value ? parseInt(value, 10) : 0, key: fullKey };
    } catch (error) {
      console.error("❌ Failed to get test Redis counter:", error);
      return { success: false, error };
    }
  },

  // Set test key with expiration
  async setTestKeyWithExpiry(key: string, value: string, seconds: number) {
    try {
      const fullKey = `test_${key}`;
      await redis.setex(fullKey, seconds, value);
      return { success: true, key: fullKey, ttl: seconds };
    } catch (error) {
      console.error("❌ Failed to set test Redis key with expiry:", error);
      return { success: false, error };
    }
  },

  // Get test key TTL
  async getTestKeyTTL(key: string) {
    try {
      const fullKey = `test_${key}`;
      const ttl = await redis.ttl(fullKey);
      return { success: true, ttl, key: fullKey };
    } catch (error) {
      console.error("❌ Failed to get test Redis key TTL:", error);
      return { success: false, error };
    }
  },

  // Check if test key exists
  async testKeyExists(key: string) {
    try {
      const fullKey = `test_${key}`;
      const exists = await redis.exists(fullKey);
      return { success: true, exists: exists > 0, key: fullKey };
    } catch (error) {
      console.error("❌ Failed to check test Redis key existence:", error);
      return { success: false, error };
    }
  },

  // Get all test keys
  async getAllTestKeys(pattern: string = "test_*") {
    try {
      const keys = await redis.keys(pattern);
      return { success: true, keys, count: keys.length };
    } catch (error) {
      console.error("❌ Failed to get test Redis keys:", error);
      return { success: false, error };
    }
  },

  // Flush test database
  async flushTestDB() {
    try {
      await redis.flushdb();
      console.log("🧹 Flushed test Redis database");
      return { success: true };
    } catch (error) {
      console.error("❌ Failed to flush test Redis database:", error);
      return { success: false, error };
    }
  },

  // Get Redis info
  async getInfo() {
    try {
      const info = await redis.info();
      return { success: true, info };
    } catch (error) {
      console.error("❌ Failed to get Redis info:", error);
      return { success: false, error };
    }
  },

  // Wait for key to exist
  async waitForKey(key: string, timeoutMs: number = 5000) {
    try {
      const fullKey = `test_${key}`;
      const startTime = Date.now();
      
      while (Date.now() - startTime < timeoutMs) {
        const exists = await redis.exists(fullKey);
        if (exists > 0) {
          return { success: true, key: fullKey };
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return { success: false, error: "Timeout waiting for key" };
    } catch (error) {
      console.error("❌ Failed to wait for Redis key:", error);
      return { success: false, error };
    }
  },

  // Wait for key to not exist
  async waitForKeyToExpire(key: string, timeoutMs: number = 5000) {
    try {
      const fullKey = `test_${key}`;
      const startTime = Date.now();
      
      while (Date.now() - startTime < timeoutMs) {
        const exists = await redis.exists(fullKey);
        if (exists === 0) {
          return { success: true, key: fullKey };
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return { success: false, error: "Timeout waiting for key to expire" };
    } catch (error) {
      console.error("❌ Failed to wait for Redis key to expire:", error);
      return { success: false, error };
    }
  },

  // Pipeline operations
  async pipeline(operations: Array<{ command: string; args: string[] }>) {
    try {
      const pipeline = redis.pipeline();
      
      for (const op of operations) {
        (pipeline as any)[op.command](...op.args);
      }
      
      const results = await pipeline.exec();
      return { success: true, results };
    } catch (error) {
      console.error("❌ Failed to execute Redis pipeline:", error);
      return { success: false, error };
    }
  },

  // Monitor Redis operations (for debugging)
  async monitor(callback: (message: string) => void, durationMs: number = 5000) {
    try {
      const monitor = redis.monitor();
      
      monitor.on("monitor", (time, args) => {
        callback(`${time}: ${args.join(" ")}`);
      });
      
      // Stop monitoring after duration
      setTimeout(() => {
        monitor.disconnect();
      }, durationMs);
      
      return { success: true };
    } catch (error) {
      console.error("❌ Failed to start Redis monitor:", error);
      return { success: false, error };
    }
  },
};

// Export for use in tests
export { testRedis as redis };