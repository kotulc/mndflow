/** The style component: how a usage of a definition is coloured.
 *
 *  A **style set** by name, over the portable typed fields — colour, line,
 *  arrowhead — that render without one. Absent a set, a usage still draws on
 *  those fields; a set missing from the build degrades the same way.
 *
 *  It reads its own key under a definition's `components` and no other's.
 *
 *  **Style sets are open** — extended by a code change, additively. A set is an
 *  asset under `styles/`; this module names the ones the build ships. That is
 *  the line between an engine and a plugin host: a definition picks from what
 *  the build knows and cannot describe a new one. */

import type { Component, Config } from "../index";
import { resolved } from "../../graph/fold";
import type { Definition, Element, Graph } from "../../graph/types";
import { sysml } from "../../../styles/sysml";

/** A style set shipped as an asset. */
export type Sheet = { name: string };

/** Style sets this build ships. Open: add a file under `styles/` and name it
 *  here. */
const SHEETS: Record<string, Sheet> = {
  [sysml.name]: sysml,
};

/** Names of every style set in the build — the open set a definition picks from. */
export const SETS = Object.keys(SHEETS) as readonly string[];

export type StyleConfig = {
  /** Which style set colours usages of this. `null` means the portable fields
   *  alone. */
  set: string | null;
};

/** What every definition that says nothing gets: no set, portable fields alone. */
export const NONE: StyleConfig = { set: null };

/** The portable typed fields a usage draws from without a style set. */
export type Look = {
  color?: string;
  icon?: string;
  line?: Definition["line"];
  head?: Definition["head"];
  /** Set name when one is named and in the build; absent means portable alone. */
  set?: string;
};

/** The sheet for a name, or undefined when this build does not ship it. */
export function sheet(name: string): Sheet | undefined {
  return SHEETS[name];
}

/** Why this configuration would not work, in words, or null.
 *
 *  An unknown key is refused rather than ignored. A component owning its key
 *  owns the whole of it — a misspelt `sett` is a mistake this build can see,
 *  unlike an unknown *component*, which may be a newer build's. */
function check(config: Config): string | null {
  if (config.set !== undefined) {
    if (typeof config.set !== "string" || !SHEETS[config.set]) {
      return SETS.length
        ? `\`style.set\` has to be one of ${SETS.join(", ")}`
        : "`style.set` names a style set, and this build ships none";
    }
  }

  const stray = Object.keys(config).filter((key) => !(key in NONE));

  return stray.length ? `\`style\` knows nothing about \`${stray[0]}\`` : null;
}

export const style: Component = { name: "style", check };

/** How this element's usages are coloured: its definition's answer over none.
 *
 *  Per definition and never per element. Reads the resolved view, so a subtype
 *  inherits a style key it does not mention and replaces one it does — never
 *  a deep merge inside the key. */
export function styleOf(graph: Graph, element: Element): StyleConfig {
  const config = resolved(graph, element.type)?.components?.style;

  return config ? { ...NONE, ...config } as StyleConfig : NONE;
}

/** How this usage draws: the definition's portable fields, and the set it
 *  names when that set is in the build.
 *
 *  A package must be useful with portable presentation alone — the set is the
 *  custom look, gained only where it is present. */
export function lookOf(graph: Graph, element: Element): Look {
  const def = graph.defs[element.type];
  const named = styleOf(graph, element).set;
  const held = named && SHEETS[named] ? named : undefined;

  return {
    color: def?.color,
    icon: def?.icon,
    line: def?.line,
    head: def?.head,
    ...(held ? { set: held } : {}),
  };
}
