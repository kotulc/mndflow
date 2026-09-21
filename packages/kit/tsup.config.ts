/** How the seam is built. */

import { readFileSync, writeFileSync } from "node:fs";
import { defineConfig } from "tsup";

/** The stylesheets the React entry reads, in the order the app loads them.
 *
 *  **The ramp and the card table belong here.** `Viewer` and `Explorer` name
 *  no colour of their own — they draw in terms of ramp steps and card
 *  families — so a consumer given only the component sheets gets transparent
 *  cards on an unpainted ground and no way to tell why. The app's own shell
 *  (`base.css`, `stage.css`, and the panels) is not the seam's and stays out. */
const SHEETS = [
  "../theme/ramp.css",
  "../theme/icons.css",
  "../theme/card.css",
  "../stage/src/flow.css",
  "../stage/src/routes.css",
  "../stage/src/groups.css",
  "../explorer/src/explorer.css",
];

/** One file, with every `@import` at the top of it.
 *
 *  Concatenating sheets buries an `@import` in the middle, and the rule is
 *  that they must come first — so every bundler drops the buried one without
 *  failing, and what it named never loads. That is how React Flow's own
 *  stylesheet went missing from every consumer of this package. */
function sheet(files: string[]): string {
  const imports: string[] = [];
  const rest = files.map((file) =>
    readFileSync(file, "utf8").replace(/^[ \t]*@import[^;]+;[ \t]*$/gm, (line) => {
      imports.push(line.trim());
      return "";
    }));
  return [...new Set(imports), ...rest].join("\n");
}

export default defineConfig({
  entry: { index: "src/index.ts", react: "src/react.ts" },
  format: ["esm"],
  /** Declarations are bundled separately — `rollup.dts.mjs` says why. */
  dts: false,
  noExternal: [/^@mnd\//],
  external: ["react", "react-dom", "react/jsx-runtime"],
  treeshake: true,
  clean: true,
  onSuccess: async () => {
    writeFileSync("dist/react.css", sheet(SHEETS));
  },
});
