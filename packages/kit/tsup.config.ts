/** How the seam is built.
 *
 *  Every `@mnd/*` package is bundled **in**, so the tarball carries no
 *  workspace references and a consumer installs one thing. React stays out:
 *  a host brings its own, and two copies in one page is a broken app. */

import { copyFileSync } from "node:fs";
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
  /** The stylesheet the React renderer reads. It is a file rather than an
   *  import because `render` does not import it either — a host loads it,
   *  and here the host is whoever installs this. */
  onSuccess: async () => {
    copyFileSync("../render/src/scene.css", "dist/react.css");
  },
});
