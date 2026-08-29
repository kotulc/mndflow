/** How the seam is built.
 *
 *  Every `@mnd/*` package is bundled **in**, so the tarball carries no
 *  workspace references and a consumer installs one thing. React stays out:
 *  a host brings its own, and two copies in one page is a broken app. */

import { readFileSync, writeFileSync } from "node:fs";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts", react: "src/react.ts" },
  format: ["esm"],
  /** Declarations are bundled separately — `rollup.dts.mjs` says why. */
  dts: false,
  noExternal: [/^@mnd\//],
  external: ["react", "react-dom", "react/jsx-runtime"],
  treeshake: true,
  clean: true,
  /** The stylesheets the React entry reads, as **one file**. They are files
   *  rather than imports because neither package imports its own — a host
   *  loads it, and here the host is whoever installs this. One `react.css`
   *  because the entry is one thing: a consumer should never have to know
   *  which component came from which package. */
  onSuccess: async () => {
    const sheets = ["../theme/icons.css", "../stage/src/flow.css",
                    "../explorer/src/explorer.css"];
    writeFileSync("dist/react.css", sheets.map((f) => readFileSync(f, "utf8")).join("\n"));
  },
});
