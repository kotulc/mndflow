/** Block modules: engine code behind one sort of block.
 *
 *  Open — a code change ships one more, additively. The shipped `base` package
 *  carries one definition per module; every subtype extends one of them. Each
 *  module owns a configuration surface validated through the `block` component,
 *  which names which module applies and delegates the rest.
 *
 *  Nothing reads this registry yet (B.2). Later rows wire drawing, placement
 *  and import-time enforcement. */

import type { Component, Config } from "../index";
import { resolved } from "../../graph/fold";
import type { Element, Graph } from "../../graph/types";
import {
  BLOCK_MODULES, base, folder, group, modOf, note, project, resource, view, workspace,
  type BlockModuleName,
} from "./modules";

export { BLOCK_MODULES, modOf, type BlockModuleName };
export { base, folder, group, note, project, resource, view, workspace };

export type BlockConfig = {
  /** Which block module applies. Absent means the base block defaults. */
  module: BlockModuleName;
};

/** Today's answer, and what every definition that says nothing gets. */
export const PLAIN: BlockConfig = { module: "base" };

const held = new Map<BlockModuleName, Component>([
  ["workspace", workspace],
  ["project", project],
  ["folder", folder],
  ["base", base],
  ["view", view],
  ["resource", resource],
  ["group", group],
  ["note", note],
]);

/** Everything this build knows how to interpret as a block module. */
export function blocks(): Component[] {
  return [...held.values()];
}

/** The registered module of this name, or null. */
export function named(name: string): Component | null {
  return held.get(name as BlockModuleName) ?? null;
}

/** Why this configuration would not work, in words, or null. */
function check(config: Config): string | null {
  if (config.module !== undefined) {
    if (typeof config.module !== "string" || !held.has(config.module as BlockModuleName)) {
      return `\`block.module\` has to be one of ${BLOCK_MODULES.join(", ")}`;
    }

    const { module, ...rest } = config;
    return held.get(module as BlockModuleName)!.check(rest);
  }

  const stray = Object.keys(config).filter((key) => key !== "module");

  return stray.length ? `\`block\` knows nothing about \`${stray[0]}\`` : null;
}

export const block: Component = { name: "block", check };

/** Which block module an element names: its definition's answer over base. */
export function blockOf(graph: Graph, element: Element): BlockConfig {
  const config = resolved(graph, element.type)?.components?.block;

  if (!config || typeof config.module !== "string") return PLAIN;
  if (!held.has(config.module as BlockModuleName)) return PLAIN;

  return { module: config.module as BlockModuleName };
}
