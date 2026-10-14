/** The table view: a layer's definition references, drawn as one diagram of attribute tables.
 *
 *  Members are the references that stand for definitions, one card each. A line joins a member to
 *  the nearest member it extends. Attribute links are the same ones the internal view draws.
 *  Anything else the layer holds is left out. Nothing is written back. */

import { children, isa, is_reference, stood_def, type Block, type Graph, type Id,
         type Relation } from "@mnd/core";
import { linked_graph } from "./links";

const EXTENDS = "table:extends:";

/** An extends line: the hollow head at the ancestor says it, as UML draws it, so its name is not
 *  drawn. Never a stored edge. */
const DRAWN = { line: { dir: "forward", to_arrow: "hollow", name: "hide" } };


/** The table diagram of a layer, or null where it holds no definition reference. Drawn as an
 *  internal view of the graph returned. */
export function table_graph(graph: Graph, layer: Id): Graph | null {
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
      settings: { ...host.settings, layout: { kind: "auto", cards: "large" } } };
  }
  for (const id of kept) {
    const b = blocks[id];
    if (!b) continue;
    const { cell: _cell, ...rest } = b;
    blocks[id] = { ...rest,
      settings: { ...rest.settings, card: { ...rest.settings?.["card"], face: "table" } } };
  }

  const edges: Record<Id, Relation> = {};
  for (const id of kept) {
    const def = stood_def(graph, id);
    const ancestor = def ? isa(graph, def.type).find((d) => by_def.has(d.id)) : undefined;
    const to = ancestor ? by_def.get(ancestor.id) : undefined;
    if (!to || to === id) continue;
    const eid = `${EXTENDS}${id}`;
    edges[eid] = { id: eid, from: id, to, name: "extends", settings: DRAWN };
  }
  return linked_graph({ ...graph, blocks, edges }, layer);
}
