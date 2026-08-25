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
             card: Record<string, unknown> = {}): Definition {
  return {
    id: name, home: ROOT, group: "block", name,
    extends: extend,
    components: { block: { module }, card },
  };
}

/** Nine, and every package or project subtype extends one of them. */
export const BASE: Definition[] = [
  def("folder", "folder", undefined, { layout: "name", shape: "rect" }),
  def("structure", "structure", undefined, { layout: "type", shape: "rect" }),
  def("behavior", "behavior", "structure", { layout: "type", shape: "round" }),
  def("reference", "reference", undefined, { layout: "name", shape: "rect" }),
  def("interface", "interface", undefined, { layout: "name", label: "none", shape: "rect" }),
  def("resource", "resource", undefined, { layout: "name", shape: "rect" }),
  def("group", "group", undefined, { layout: "name", shape: "rect" }),
  def("note", "note", "resource", { layout: "fields", shape: "rect" }),
  def("view", "view", undefined, { layout: "name", shape: "rect" }),
];

/** The behavior vocabulary: `action` and `state` extend the base behavior
 *  definition and carry the verb its usages are named by. **Definitions, never
 *  modules** — doing against being is the vocabulary, not the shape. */
export const BEHAVIOR: Definition[] = [
  { id: "action", home: ROOT, group: "block", name: "action", extends: "behavior",
    components: { card: { layout: "type", shape: "round", word: "do" } } },
  { id: "state", home: ROOT, group: "block", name: "state", extends: "behavior",
    components: { card: { layout: "type", shape: "round", word: "in" } } },
];

/** The six views, as definitions. **A reading is a view definition, never a
 *  module**: `block` is any planar projection and the reading says how to look
 *  at it, which is why three of these name the same module. */
export const VIEWS: Definition[] = [
  { id: "view.block", home: ROOT, group: "view", name: "block",
    components: { view: { module: "block" } } },
  { id: "view.table", home: ROOT, group: "view", name: "table",
    components: { view: { module: "table" } } },
  { id: "view.matrix", home: ROOT, group: "view", name: "matrix",
    components: { view: { module: "matrix" } } },
  { id: "view.activity", home: ROOT, group: "view", name: "activity",
    components: { view: { module: "block", reading: "activity" } } },
  { id: "view.sequence", home: ROOT, group: "view", name: "sequence",
    components: { view: { module: "block", reading: "sequence" } } },
  { id: "view.state", home: ROOT, group: "view", name: "state",
    components: { view: { module: "block", reading: "state" } } },
];

/** The two relation definitions the base ships, so an untyped line still
 *  resolves to something with a name. */
export const RELATIONS: Definition[] = [
  { id: "line", home: ROOT, group: "relation", name: "line" },
  { id: "directed", home: ROOT, group: "relation", name: "directed" },
];

export const ALL: Definition[] = [...BASE, ...BEHAVIOR, ...VIEWS, ...RELATIONS];

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
