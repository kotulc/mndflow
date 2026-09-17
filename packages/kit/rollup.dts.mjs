/** The types, bundled the same way the code is. */

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
