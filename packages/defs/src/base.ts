/** The `base` package: one definition per block module, shipped and locked.
 *
 *  The engine needs a floor — something to draw and place a block that names
 *  no type — and it gets one as definitions it knows by id rather than as a
 *  closed set of engine-side sorts. It is **open**: shipping one more is an
 *  additive change, not a closed set being widened.
 *
 *  The engine may key off one of these only for **how a block draws and where
 *  it sits**. Never for what it is, and never for what may contain what. */

import { empty_graph, ROOT, type Definition, type Graph } from "@mnd/core";

function def(name: string, module: string, extend?: string,
             card: Record<string, unknown> = {},
             style: Record<string, unknown> = {}): Definition {
  return {
    id: name, home: ROOT, group: "block", name,
    extends: extend,
    components: { block: { module }, card, style },
  };
}

/** Seven, and every package or project subtype extends one of them.
 *
 *  **Each picks a slot, and none names a colour.** A slot is a hue family the
 *  theme decides per theme, so `primary` is green in retro and blue in modern
 *  and a definition never learns which. What is being said here is only that
 *  being, doing, having and connecting are four different kinds of thing — and
 *  that a folder and a boundary are the furniture around them. */
export const BASE: Definition[] = [
  def("folder", "folder", undefined,
      { layout: "name", shape: "rect" }, { slot: "neutral", emphasis: "quiet" }),
  def("structure", "structure", undefined,
      { layout: "type", shape: "rect" }, { slot: "primary" }),
  def("reference", "reference", undefined,
      { layout: "name", shape: "rect" }, { slot: "muted", emphasis: "quiet" }),
  def("interface", "interface", undefined,
      { layout: "name", label: "none", shape: "rect" },
      { slot: "quaternary", weight: "hairline" }),
  def("resource", "resource", undefined,
      { layout: "name", shape: "rect" }, { slot: "tertiary" }),
  def("group", "group", undefined,
      { layout: "name", shape: "rect" }, { slot: "muted", emphasis: "quiet" }),
  def("note", "note", "resource",
      { layout: "fields", shape: "rect" }, { slot: "tertiary", emphasis: "quiet" }),
];

/** The two relation definitions the base ships, so an untyped line still
 *  resolves to something with a name. */
export const RELATIONS: Definition[] = [
  { id: "line", home: ROOT, group: "relation", name: "line" },
  { id: "directed", home: ROOT, group: "relation", name: "directed" },
];

export const ALL: Definition[] = [...BASE, ...RELATIONS];

export function by_id(id: string): Definition | null {
  return ALL.find((d) => d.id === id) ?? null;
}

/** The base package as mutations, so it arrives through the same door as
 *  everything else rather than being spliced into a graph. */
export function seed(): { op: "set_def"; def: Definition }[] {
  return ALL.map((d) => ({ op: "set_def" as const, def: d }));
}

/** The same package as state: a fresh workspace with the floor already in it.
 *
 *  `seed` hands mutations to a session. This hands a graph to anything that
 *  has no session and wants one to build on. */
export function base_graph(): Graph {
  const defs: Graph["defs"] = {};
  for (const d of ALL) defs[d.id] = d;
  return { ...empty_graph(), defs };
}
