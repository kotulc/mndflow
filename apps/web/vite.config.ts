import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** The vendored weights and ONNX runtime live at the repo root. */
export default defineConfig({
  root: __dirname,
  publicDir: resolve(__dirname, "../../public"),
  plugins: [react()],
  optimizeDeps: { include: ["@xenova/transformers"] },
  build: { chunkSizeWarningLimit: 900 },
});
