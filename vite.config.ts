import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import yaml from "@rollup/plugin-yaml";

export default defineConfig({
  // Workflow definitions are authored as YAML and compiled in at build time,
  // so nothing parses them at runtime.
  plugins: [react(), yaml()],
  // onnxruntime-web ships a webpack bundle that only resolves its
  // onnxruntime-common half once Vite has pre-bundled it. Excluding it from
  // optimizeDeps breaks the ONNX backend at import time.
  optimizeDeps: { include: ["@xenova/transformers"] },
  build: { chunkSizeWarningLimit: 900 },
  server: { port: 5173 },
  // Agent sittings used to leave orphan vitest trees; keep workers few and
  // individual tests bounded. The hard wall clock is scripts/test-ci.mjs.
  // Both ends are named: a lone maxWorkers leaves the minimum at the CPU
  // count, which conflicts with it and kills the run before it collects.
  test: {
    pool: "forks",
    minWorkers: 1,
    maxWorkers: 2,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    teardownTimeout: 10_000,
  },
});
