/// <reference types="vite/client" />

/** Workflow YAML is parsed at build time by @rollup/plugin-yaml. */
declare module "*.yaml" {
  const data: any;
  export default data;
}
