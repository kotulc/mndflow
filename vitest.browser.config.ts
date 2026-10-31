import { defineConfig } from "vitest/config";

/** Tests that drive the real app in installed Edge: slow, so kept out of `npm test`. */
export default defineConfig({
  test: {
    include: ["test/browser/**/*.test.ts"],
    environment: "node",
    testTimeout: 600_000,
    hookTimeout: 60_000,
  },
});
