/** The `base` package: one definition per block module, shipped and locked. */

import { empty_graph, type Definition, type Graph, type Package } from "@mnd/core";

/** What every definition here says it came from. */
export const PACKAGE = "base";

function def(name: string, module: string | null, extend?: string,
             card: Record<string, unknown> = {},
             style: Record<string, unknown> = {},
             allows?: Record<string, unknown>): Definition {
  return {
    id: name, from: PACKAGE, group: "block", name,
    extends: extend,
    components: { ...(module ? { block: { module } } : {}), card, style,
                  ...(allows ? { allows } : {}) },
  };
}

/** Eight base kinds; every subtype extends one. `folder`, `resource` and `note` are the plain
 *  block module with different configuration — what separates them is what they allow. */
export const BASE: Definition[] = [
  def("folder", "block", undefined,
      {}, { family: "neutral", border_contrast: "faint", name_contrast: "faint" }),
  def("block", "block", undefined,
      {}, { family: "primary" }),
  /** A reference is painted as elsewhere. */
  def("reference", "reference", undefined,
      {}, { family: "away", border_contrast: "strong", name_contrast: "strong",
            fill: "hatch", opacity: 0.55 }),
  /** An interface draws as its seat, so only its family matters. */
  def("interface", "interface", undefined,
      {}, { family: "secondary", border_width: "thin" }),
  def("resource", "block", undefined,
      {}, { family: "secondary", border_contrast: "faint", name_contrast: "faint" }),
  /** A holder is not a block: these two carry a look for one to draw with, and no module. */
  def("group", null, undefined,
      {}, { family: "muted", border_contrast: "faint", name_contrast: "faint" },
      { ports: false }),
  def("grid", null, undefined,
      {}, { family: "muted", border_contrast: "faint", name_contrast: "faint" },
      { ports: false }),
  /** A remark, in the amber every theme keeps for one. */
  /** A remark: its own height, and it holds nothing. */
  def("note", "block", "resource",
      { height: "free" }, { family: "note", border_contrast: "strong", name_contrast: "faint",
            fill: "wash", opacity: 0.06 },
      { ports: false, holds: false }),
];

/** One relation definition per relation module, shipped and locked, exactly as a block kind is. */
function rel(module: string): Definition {
  return { id: module, from: PACKAGE, group: "relation", name: module,
           components: { relation: { module }, line: {} } };
}

/** A line and a tie. */
export const RELATIONS: Definition[] = [rel("line"), rel("tie")];

export const ALL: Definition[] = [...BASE, ...RELATIONS];

export function by_id(id: string): Definition | null {
  return ALL.find((d) => d.id === id) ?? null;
}

/** The floor's own package record, so a definition's `from` always names something there. */
export const BASE_PKG: Package = { id: PACKAGE, name: PACKAGE };

/** The base package as mutations, through the same door as everything else. */
export function seed(): { op: "set_def"; def: Definition }[] {
  return ALL.map((d) => ({ op: "set_def" as const, def: d }));
}

/** The same package as state: a fresh graph with the floor in it. */
export function base_graph(): Graph {
  const defs: Graph["defs"] = {};
  for (const d of ALL) defs[d.id] = d;
  return { ...empty_graph(), defs, packages: { [BASE_PKG.id]: BASE_PKG } };
}
