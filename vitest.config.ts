import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["dotenv/config", "./src/__tests__/setup.ts"],
    testTimeout: 120000, // 2 minutes for LLM evaluations
    environment: "jsdom",
    globals: true,
  },
  plugins: [tsconfigPaths()],
});
