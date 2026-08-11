import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(process.cwd()),
      "@bb/plugin-sdk": resolve(process.cwd(), "test-plugin-sdk-runtime.ts"),
    },
  },
});
