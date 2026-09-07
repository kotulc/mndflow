import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Its own root, so no package depends on a central harness. */
export default defineConfig({ root: __dirname, plugins: [react()], server: { open: true } });
