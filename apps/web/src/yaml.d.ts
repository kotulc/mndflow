/// <reference types="vite/client" />

/** Workflow wording is authored as YAML and compiled in by @rollup/plugin-yaml,
 *  so nothing parses one at run time. */
declare module "*.yaml" {
  const data: unknown;
  export default data;
}
