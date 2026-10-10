import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** The definition packages are served from the repo root. */
export default defineConfig({
  root: __dirname,
  publicDir: resolve(__dirname, "../../public"),
  plugins: [react()],
  /** libavoid's wasm, which its package does not export, served as a url. */
  resolve: { alias: [{ find: /^libavoid-wasm/,
                       replacement: resolve(__dirname, "../../node_modules/libavoid-js/dist/libavoid.wasm") }] },
  build: { chunkSizeWarningLimit: 900 },
});
