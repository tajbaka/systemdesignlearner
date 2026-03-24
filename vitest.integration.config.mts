import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    globalSetup: ["./config/vitest.integration.global-setup.ts"],
    include: ["integration-tests/**/*.{test,spec}.ts?(x)"],
    maxWorkers: 1,
    minWorkers: 1,
  },
});
