import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import yaml from "@rollup/plugin-yaml";

/** The vendored MiniLM weights and ONNX runtime live at the repo root, shared
 *  by every host that binds `score`. Nothing is fetched from a network, and the
 *  domain wording is compiled in rather than parsed at run time.
 *
 *  onnxruntime-web ships a webpack bundle whose two halves only resolve once
 *  Vite has pre-bundled it, so it is asked for by name rather than discovered. */
export default defineConfig({
  root: __dirname,
  publicDir: resolve(__dirname, "../../public"),
  plugins: [react(), yaml()],
  optimizeDeps: { include: ["@xenova/transformers"] },
  build: { chunkSizeWarningLimit: 900 },
});
