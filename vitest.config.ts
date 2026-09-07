import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["packages/*/test/**/*.test.{ts,tsx}", "apps/*/test/**/*.test.{ts,tsx}",
              "test/**/*.test.ts"],
    environment: "node",
    environmentMatchGlobs: [["packages/{render,explorer,stage}/test/**", "happy-dom"],
                            ["apps/*/test/**", "happy-dom"]],
  },
});
