import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** The definition packages are served from the repo root. */
export default defineConfig({
  root: __dirname,
  publicDir: resolve(__dirname, "../../public"),
  plugins: [react()],
  build: { chunkSizeWarningLimit: 900 },
});
