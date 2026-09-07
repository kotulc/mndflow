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

/** Eight, and every package or project subtype extends one of them.
 *
 *  **Each picks a slot, and none names a colour.** A slot is a family the theme
 *  decides per theme, so `primary` is green in retro and blue in modern and a
 *  definition never learns which. What is being said here is only that being,
 *  doing, having and connecting are different kinds of thing — and that a
 *  folder and a boundary are the furniture around them.
 *
 *  **The base names families rather than hues on purpose.** A hue means the
 *  same angle in every theme, which is right for a workspace's own vocabulary
 *  and wrong for what ships: a shipped package should look like the theme it
 *  is opened in. */
export const BASE: Definition[] = [
  def("folder", "folder", undefined,
      {}, { slot: "neutral", emphasis: "quiet" }),
  def("block", "block", undefined,
      {}, { slot: "primary" }),
  /** **Elsewhere, and it says so on its face.** The hatch and the violet were a
   *  hardcoded rule for eight months, which is why nothing could subtype a
   *  reference: whatever a subtype said about colour, the stylesheet said it
   *  louder. Said here, it is ordinary — and `away` is a family whose hue is
   *  fixed across every theme on purpose. */
  def("reference", "reference", undefined,
      {}, { slot: "away", line: "edge", ink: "edge",
            fill: "hatch", sheer: "veiled" }),
  /** An interface is a seat on a wall; a name on one is in the way. */
  def("interface", "interface", undefined,
      { name: "none" }, { slot: "secondary", weight: "thin" }),
  def("resource", "resource", undefined,
      {}, { slot: "secondary", emphasis: "quiet" }),
  def("group", "group", undefined,
      {}, { slot: "muted", emphasis: "quiet" }),
  def("grid", "grid", undefined,
      {}, { slot: "muted", emphasis: "quiet" }),
  /** A remark, in the amber every theme keeps for one. Was a hardcoded rule
   *  for the same reason the reference was. */
  def("note", "note", "resource",
      {}, { slot: "note", line: "edge", ink: "dim",
            fill: "wash", sheer: "ghost" }),
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
