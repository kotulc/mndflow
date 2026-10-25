import { existsSync, readFileSync } from "node:fs";
import { join, normalize, relative, resolve, sep } from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";

/** The repo root, two levels above this app. */
const ROOT = resolve(__dirname, "../..");

/** Serves the bootstrap and the samples from the repo, so a fresh browser can open one. A path
 *  that leaves those two places is left for Vite. */
function repo_files(): Plugin {
  const send = (server: ViteDevServer) => {
    server.middlewares.use((req, res, next) => {
      const url = req.url?.split("?")[0] ?? "";
      const file = repo_file(url);
      if (!file) { next(); return; }
      res.setHeader("content-type", file.endsWith(".yaml") ? "text/yaml" : "application/json");
      res.end(readFileSync(file));
    });
  };
  return { name: "repo-files", configureServer: send, configurePreviewServer: send };
}

/** The file a URL may read: the bootstrap, or something under samples. */
function repo_file(url: string): string | null {
  if (url === "/mndflow.yaml") return join(ROOT, "mndflow.yaml");
  if (!url.startsWith("/samples/")) return null;
  const rel = normalize(url.slice(1)).replaceAll("/", sep);
  if (rel.startsWith("..") || rel.includes(`..${sep}`)) return null;
  const file = join(ROOT, rel);
  const under = relative(join(ROOT, "samples"), file);
  if (under.startsWith("..") || under.includes(`..${sep}`)) return null;
  return existsSync(file) ? file : null;
}

/** The definition packages are served from the repo root. */
export default defineConfig({
  root: __dirname,
  publicDir: resolve(__dirname, "../../public"),
  plugins: [react(), repo_files()],
  /** libavoid's wasm, which its package does not export, served as a url. */
  resolve: { alias: [{ find: /^libavoid-wasm/,
                       replacement: resolve(__dirname, "../../node_modules/libavoid-js/dist/libavoid.wasm") }] },
  build: { chunkSizeWarningLimit: 900 },
});
