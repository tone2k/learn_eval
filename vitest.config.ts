import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["dotenv/config"],
    testTimeout: 120000, // 2 minutes for LLM evaluations
  },
  plugins: [tsconfigPaths()],
});
