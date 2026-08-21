/** The eight block modules the base package names — stubs until later rows
 *  wire drawing, placement and option surfaces. Each owns its own check; the
 *  `block` component delegates module-specific keys here. */

import type { Component, Config } from "../index";
import { resolved } from "../../graph/fold";
import type { Element, Graph } from "../../graph/types";

/** Every block module this build registers. Open: grow by a code change. */
export const BLOCK_MODULES = [
  "workspace", "project", "folder", "base", "view", "resource", "group", "note",
] as const;

export type BlockModuleName = (typeof BLOCK_MODULES)[number];

/** Why this module's slice of a configuration would not work, or null. */
function stub(name: string, config: Config): string | null {
  const stray = Object.keys(config);

  return stray.length ? `\`${name}\` knows nothing about \`${stray[0]}\`` : null;
}

function make(name: BlockModuleName): Component {
  return { name, check: (config) => stub(name, config) };
}

export const workspace = make("workspace");
export const project = make("project");
export const folder = make("folder");
export const base = make("base");
export const view = make("view");
export const resource = make("resource");
export const group = make("group");
export const note = make("note");

/** How one block module reads its configuration for an element. Direct key
 *  first; then `components.block` when its `module` matches — how the base
 *  package names a module without colliding with the `view` component. */
export function modOf(name: BlockModuleName) {
  return (graph: Graph, element: Element): Config => {
    const direct = resolved(graph, element.type)?.components?.[name];
    if (direct) return direct;

    const via = resolved(graph, element.type)?.components?.block;
    if (via?.module === name) {
      const { module: _module, ...rest } = via;
      return rest;
    }

    return {};
  };
}
