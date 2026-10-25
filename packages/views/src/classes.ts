/** Class and entity diagrams: a layer's definition references, drawn as one diagram of cards —
 *  class cards (fields, then behaviours) or schema cards (columns and keys).
 *
 *  Members are the references that stand for definitions, one card each. **No line is derived**,
 *  but one: on a class diagram, a member joins the nearest member it extends — the chain itself.
 *  Every other line is stored: one between two members, or one between the definitions two
 *  members stand for. Each carries what its ends mean. Anything else the layer holds is left out.
 *  Laid out layered: cards ranked the way their lines point, so owners sit above what they own.
 *  Nothing is written back. */

import { children, edges_in, ends_of, isa, is_reference, stood_def, type Block, type Graph,
         type Id, type Relation } from "@mnd/core";

/** What a line a diagram drew starts with: read, never picked. */
export const DRAWN_BY = "diagram:";

/** An extends line: the hollow head at the ancestor says it, as UML draws it, so its name is not
 *  drawn. Never a stored edge. */
const EXTENDS = { line: { dir: "forward", to_arrow: "hollow", name: "hide" } };


/** The class (`class`) or entity (`er`) diagram of a layer, or null where it holds no definition
 *  reference. Drawn as an internal view of the graph returned. */
export function class_graph(graph: Graph, layer: Id, kind: "class" | "er"): Graph | null {
  const by_def = new Map<Id, Id>();
  const kept: Id[] = [];
  for (const b of children(graph, layer)) {
    if (!is_reference(graph, b.id)) continue;
    const def = stood_def(graph, b.id);
    if (!def || by_def.has(def.id)) continue;
    by_def.set(def.id, b.id);
    kept.push(b.id);
  }
  if (!kept.length) return null;

  const blocks: Record<Id, Block> = { ...graph.blocks };
  const keep = new Set(kept);
  for (const b of children(graph, layer)) {
    if (!keep.has(b.id)) delete blocks[b.id];
  }
  const host = blocks[layer];
  if (host) {
    blocks[layer] = { ...host, type: "block",
      settings: { ...host.settings, layout: { kind: "layered", cards: "large" } } };
  }
  const face = kind === "class" ? "class" : "table";
  for (const id of kept) {
    const b = blocks[id];
    if (!b) continue;
    const { cell: _cell, ...rest } = b;
    blocks[id] = { ...rest,
      settings: { ...rest.settings, card: { ...rest.settings?.["card"], face } } };
  }
  return { ...graph, blocks, edges: { ...lines(graph, layer, kept, by_def),
                                      ...(kind === "class" ? extended(graph, kept, by_def) : {}) } };
}

/** The stored lines a diagram draws, each carrying its ends as they hold: one between two
 *  members as it is, and one between two definitions the members stand for, drawn between them. */
function lines(graph: Graph, layer: Id, kept: readonly Id[],
               by_def: ReadonlyMap<Id, Id>): Record<Id, Relation> {
  const out: Record<Id, Relation> = {};
  const members = new Set(kept);
  for (const e of edges_in(graph, layer)) {
    if (members.has(e.from) && members.has(e.to)) out[e.id] = { ...e, ends: ends_of(graph, e.id) };
  }
  for (const e of Object.values(graph.edges)) {
    const from = by_def.get(e.from);
    const to = by_def.get(e.to);
    if (!from || !to) continue;
    const id = `${DRAWN_BY}${e.id}`;
    out[id] = { ...e, id, from, to, ends: ends_of(graph, e.id) };
  }
  return out;
}

/** A member joined to the nearest member it extends. */
function extended(graph: Graph, kept: readonly Id[],
                  by_def: ReadonlyMap<Id, Id>): Record<Id, Relation> {
  const out: Record<Id, Relation> = {};
  for (const id of kept) {
    const def = stood_def(graph, id);
    const ancestor = def ? isa(graph, def.type).find((d) => by_def.has(d.id)) : undefined;
    const to = ancestor ? by_def.get(ancestor.id) : undefined;
    if (!to || to === id) continue;
    const eid = `${DRAWN_BY}extends:${id}`;
    out[eid] = { id: eid, from: id, to, name: "extends", settings: EXTENDS };
  }
  return out;
}
