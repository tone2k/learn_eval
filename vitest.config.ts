import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Global setup file
    setupFiles: [
      "dotenv/config",
      "./src/test/setup.ts",
      "./src/test/environment.ts"
    ],
    
    // Test environment
    environment: "node",
    
    // Enable globals
    globals: true,
    
    // Test patterns
    include: [
      "src/test/**/*.test.ts",
      "src/test/**/*.spec.ts"
    ],
    
    // Exclude patterns
    exclude: [
      "node_modules",
      "dist",
      ".next",
      "src/test/setup.ts",
      "src/test/environment.ts"
    ],
    
    // Test timeouts
    testTimeout: 120000, // 2 minutes for integration tests
    hookTimeout: 30000,  // 30 seconds for hooks
    
    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        ".next/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/coverage/**"
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    
    // Reporter configuration
    reporters: [
      "default",
      "verbose"
    ],
    
    // Pool configuration for parallel tests
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    
    // Environment variables for tests
    env: {
      NODE_ENV: "test",
      TEST_TIMEOUT: "120000"
    },
    
    // Test isolation
    isolate: true,
    
    // Retry failed tests
    retry: 1,
    
    // Slow test threshold
    slowTestThreshold: 5000,
    
    // Maximum number of concurrent tests
    maxConcurrency: 1,
    
    // Test sequence
    sequence: {
      shuffle: false
    }
  },
  
  plugins: [tsconfigPaths()],
  
  // Vite configuration
  define: {
    "process.env.NODE_ENV": '"test"'
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      "vitest",
      "@vitest/ui"
    ]
  }
});
