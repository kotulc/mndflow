/** The types, bundled the same way the code is.
 *
 *  `tsc` emits one declaration per source file, each still naming `@mnd/core`
 *  and its siblings — specifiers that mean something in this repo and nothing
 *  in a consumer's `node_modules`. This flattens the tree the same way `tsup`
 *  flattens the modules, so what ships is **one file with no workspace left in
 *  it**, which is the whole point of the seam. */

import dts from "rollup-plugin-dts";

const resolved = {
  baseUrl: ".",
  paths: { "@mnd/*": ["./.types/packages/*/src/index.d.ts"] },
};

const entry = (name) => ({
  input: `.types/packages/kit/src/${name}.d.ts`,
  output: { file: `dist/${name}.d.ts`, format: "es" },
  external: [/^react/],
  plugins: [dts({ compilerOptions: resolved })],
});

export default [entry("index"), entry("react")];
