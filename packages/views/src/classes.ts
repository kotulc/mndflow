/** Class and entity diagrams: a layer's definition references, drawn as one diagram of cards —
 *  class cards (fields, then behaviours) or schema cards (columns and keys).
 *
 *  Members are the references that stand for definitions, one card each. **No line is derived**,
 *  but one: on a class diagram, a member joins the nearest member it extends — the chain itself.
 *  Every other line is stored: one between two members, or one between the definitions two
 *  members stand for. Each carries what its ends mean. Anything else the layer holds is left out.
 *  Laid out layered: cards ranked the way their lines point, so owners sit above what they own.
 *  Nothing is written back. */

import { attributes_of, children, edges_in, ends_of, isa, is_reference, links_to, resolved,
         stood_def, type Block, type Graph, type Id, type Relation } from "@mnd/core";
import { row_mid } from "./face";
import type { Rect } from "./seat";

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
      settings: { ...host.settings, diagram: { placing: "layered", cards: "large" } } };
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

/** **Where a class or entity line meets its cards** (docs/diagrams/class.md, entity.md), as a
 *  fraction down each card, by `edge|end`: at the owner, the row of the field holding or naming
 *  the other; on an entity diagram, at the other, the row of its primary key. An end with no such
 *  row meets the card as any line does. */
export function field_rows(graph: Graph, lines: readonly Relation[], at: ReadonlyMap<Id, Rect>,
                           kind: "class" | "er"): Map<string, number> {
  const out = new Map<string, number>();
  const def = (id: Id) => resolved(graph, id).stands_in?.id ?? graph.blocks[id]?.of ?? id;
  const attrs = (id: Id) => attributes_of(graph, def(id));
  const put = (edge: Id, end: "from" | "to", on: Id, i: number) => {
    const box = at.get(on);
    if (!box || i < 0) return;
    const f = row_mid(i) / box.h;
    if (f > 0 && f < 1) out.set(`${edge}|${end}`, f);
  };
  for (const e of lines) {
    const field = (on: Id, other: Id) => attrs(on).findIndex((a) =>
      (links_to(graph, a) ?? a.type) === def(other));
    const [fa, fz] = [field(e.from, e.to), field(e.to, e.from)];
    const [owner, end, held, back] = fa >= 0 ? [e.from, "from", e.to, "to"] as const
      : fz >= 0 ? [e.to, "to", e.from, "from"] as const : [null, null, null, null];
    if (!owner) continue;
    put(e.id, end, owner, Math.max(fa, fz));
    if (kind === "er") put(e.id, back, held, attrs(held).findIndex((a) => a.key === "primary"));
  }
  return out;
}
