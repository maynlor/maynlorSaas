import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    testTimeout: 10000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "src/shared"),
      "@modules": path.resolve(__dirname, "src/modules"),
      "@presentation": path.resolve(__dirname, "src/presentation"),
    },
  },
});
