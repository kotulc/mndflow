/** Usages read through: a usage shows its definition's structure, never a copy of it. Drawn, never
 *  stored — the graph handed back is the one a projection reads.
 *
 *  - The layer a usage opens onto holds its definition's structure beside its own blocks. The
 *    parts keep their ids, so an edit to one goes home to the definition.
 *  - A usage's card wears its definition's interfaces, its chain's included, each under
 *    `usage/part`, and a run naming a part (`fromPart`, `toPart`) meets it there. A definition's
 *    card and room wear the interfaces its chain declares the same way. */

import { children, def_at, is_interface, part_id, ports_of, type Block, type Graph, type Id,
         type Relation } from "@mnd/core";


/** The graph a layer is drawn from, with what its usages read through laid in. */
export function read_through(graph: Graph, layer: Id | null): Graph {
  const blocks: Record<Id, Block> = { ...graph.blocks };
  const opened = layer ? graph.blocks[layer] : undefined;
  /** A usage opened: its definition's structure sits on its layer. */
  const def = opened && !opened.def ? def_at(graph, opened.type) : undefined;
  if (def && layer) {
    for (const part of children(graph, def.id)) {
      if (!part.def && !is_interface(graph, part.id)) blocks[part.id] = { ...part, parent: layer };
    }
  }
  /** Each card on the layer, and the room, wears the interfaces it reads through. */
  const drawn: Graph = { ...graph, blocks };
  for (const b of [...children(drawn, layer), ...(opened ? [opened] : [])]) {
    for (const port of worn(graph, b)) {
      const id = part_id(b.id, port.id);
      blocks[id] = { ...port, id, parent: b.id };
    }
  }
  const edges: Record<Id, Relation> = {};
  for (const [id, e] of Object.entries(graph.edges)) edges[id] = met(blocks, e);
  return { ...graph, blocks, edges };
}

/** The interfaces a block reads through: a usage its definition's, a definition its chain's. */
function worn(graph: Graph, b: Block): Block[] {
  if (b.def) return ports_of(graph, b.id).filter((p) => p.parent !== b.id);
  return def_at(graph, b.type) ? ports_of(graph, b.type) : [];
}

/** A run as drawn: an end naming a part meets the usage's copy of it, where there is one. */
function met(blocks: Record<Id, Block>, e: Relation): Relation {
  const from = e.fromPart ? part_id(e.from, e.fromPart) : e.from;
  const to = e.toPart ? part_id(e.to, e.toPart) : e.to;
  if (from === e.from && to === e.to) return e;
  return { ...e, from: blocks[from] ? from : e.from, to: blocks[to] ? to : e.to };
}
