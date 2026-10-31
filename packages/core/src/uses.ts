/** Where a definition is used: **the one query** for a definition's footprint, read by the
 *  library's chips, its registries and the tray alike. Worked out once per graph, never stored. */

import { is_tie, model_of } from "./defs";
import { kept } from "./memo";
import { layer_of } from "./holders";
import { line_layer, of_ref, owner_of, stands_for } from "./tree";
import type { Graph, Id } from "./types";

/** One use of a definition: a usage typed by it, a reference standing for it, or a line typed by
 *  it. */
export type DefinitionUse = { id: Id; kind: "block" | "reference" | "relation" };

/** Every use of a definition **inside a model**, at any depth, in every loaded package. Parts
 *  stored in a definition that is not a model are not uses of their own: they appear through
 *  that definition's uses. A subtype extends it rather than using it, and a tie means nothing.
 *  The same answer every time: blocks, then lines, each by id. */
export function definition_uses(graph: Graph, def: Id): readonly DefinitionUse[] {
  return used(graph).get(def) ?? [];
}

/** Every definition's uses at once, read once per set of blocks and lines: kept with the blocks,
 *  so whatever forgets them forgets this, and by the lines beside them. */
function used(graph: Graph): Map<Id, DefinitionUse[]> {
  const by = kept(graph, "uses", () => new WeakMap<object, Map<Id, DefinitionUse[]>>());
  let made = by.get(graph.edges);
  if (!made) { made = index(graph); by.set(graph.edges, made); }
  return made;
}

/** Each definition's uses, by its id. */
function index(graph: Graph): Map<Id, DefinitionUse[]> {
  const by = new Map<Id, DefinitionUse[]>();
  const add = (def: Id, use: DefinitionUse) => {
    const list = by.get(def);
    if (list) list.push(use);
    else by.set(def, [use]);
  };
  const blocks = Object.values(graph.blocks).sort((a, z) => a.id.localeCompare(z.id));
  for (const b of blocks) {
    if (b.def || !model_of(graph, b.id)) continue;
    if (of_ref(graph, b.id)) {
      const target = stands_for(graph, b.id);
      if (target && target.id !== b.id) add(target.id, { id: b.id, kind: "reference" });
    }
    else add(b.type ?? "block", { id: b.id, kind: "block" });
  }
  const edges = Object.values(graph.edges).sort((a, z) => a.id.localeCompare(z.id));
  for (const e of edges) {
    if (is_tie(graph, e.id)) continue;
    if (model_of(graph, owner_of(graph, e.from)) && model_of(graph, owner_of(graph, e.to))) {
      add(e.type ?? "line", { id: e.id, kind: "relation" });
    }
  }
  return by;
}

/** **Where a use is drawn**: the layer holding it, a line's the layer it crosses; null outside
 *  every model. */
export function use_place(graph: Graph, id: Id): Id | null {
  const place = graph.edges[id] ? line_layer(graph, id) : layer_of(graph, id);
  return place && model_of(graph, place) ? place : null;
}

/** The places a definition's uses are drawn in, each once. */
export function use_places(graph: Graph, def: Id): Id[] {
  return [...new Set(definition_uses(graph, def).map((u) => use_place(graph, u.id))
    .filter((p): p is Id => !!p))];
}
