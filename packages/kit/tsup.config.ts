/** How the seam is built. */

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
  /** The stylesheets the React entry reads, as one file. */
  onSuccess: async () => {
    const sheets = ["../theme/icons.css", "../stage/src/flow.css",
                    "../explorer/src/explorer.css"];
    writeFileSync("dist/react.css", sheets.map((f) => readFileSync(f, "utf8")).join("\n"));
  },
});
