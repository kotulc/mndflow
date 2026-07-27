import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import yaml from "@rollup/plugin-yaml";

export default defineConfig({
  // Workflow definitions are authored as YAML and compiled in at build time,
  // so nothing parses them at runtime.
  plugins: [react(), yaml()],
  server: { port: 5173 },
});
