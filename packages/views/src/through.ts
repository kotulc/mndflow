/** Usages read through: a usage shows its definition's structure, never a copy of it. Drawn, never
 *  stored — the graph handed back is the one a projection reads.
 *
 *  - The layer a usage opens onto holds its definition's structure beside its own blocks. The
 *    parts keep their ids, so an edit to one goes home to the definition.
 *  - **Ports are data**, laid in here as blocks to seat: every card on the layer, and the room,
 *    wears its ports — its own and those its definition's chain declares — each under
 *    `block/port`, and a run naming a port (`fromPort`, `toPort`) meets it there.
 *  A reference is resolved by core `resolved`, never by `of`. */

import { children, def_at, drawn_in, part_id, ports_on, type Block, type Graph, type Id,
         type Relation, type Worn } from "@mnd/core";

/** The graph a layer is drawn from, with what its usages read through laid in. */
export function read_through(graph: Graph, layer: Id | null): Graph {
  const blocks: Record<Id, Block> = { ...graph.blocks };
  const opened = layer ? graph.blocks[layer] : undefined;
  /** A usage opened: its definition's structure sits on its layer. */
  const def = opened && !opened.def ? def_at(graph, opened.type) : undefined;
  if (def && layer) {
    for (const part of children(graph, def.id)) {
      if (!part.def) blocks[part.id] = { ...part, parent: layer };
    }
  }
  /** Each card on the layer, and the room, wears its ports: laid into a set of their own, since
   *  the set the cards were read from is not written once read. */
  const drawn: Graph = { ...graph, blocks };
  const worn: Record<Id, Block> = { ...blocks };
  for (const b of [...drawn_in(drawn, layer), ...(opened ? [opened] : [])]) {
    ports_on(graph, b.id).forEach((port, i) => {
      const id = part_id(b.id, port.id);
      worn[id] = seated(port, id, b.id, i);
    });
  }
  const edges: Record<Id, Relation> = {};
  for (const [id, e] of Object.entries(graph.edges)) {
    edges[id] = met(worn, e, layer, def?.id);
  }
  return { ...graph, blocks: worn, edges };
}

/** A port as a block to seat: its kind its interface definition, else the base `interface`. */
function seated(port: Worn, id: Id, on: Id, order: number): Block {
  return { id, parent: on, type: port.type ?? "interface", order,
           ...(port.name ? { name: port.name } : {}),
           ...(port.description ? { description: port.description } : {}),
           ...(port.side ? { side: port.side } : {}),
           ...(port.at !== undefined ? { at: port.at } : {}),
           ...(port.alias ? { alias: port.alias } : {}) };
}

/** A run as drawn: an end naming a port meets its seat. On a usage's opened layer, an end at its
 *  definition's own wall meets the usage's room. */
function met(blocks: Record<Id, Block>, e: Relation, layer: Id | null,
             def: Id | undefined): Relation {
  const at = (end: Id, port: Id | undefined) => {
    if (!port) return end;
    const on = layer && end === def ? layer : end;
    return blocks[part_id(on, port)] ? part_id(on, port) : end;
  };
  const from = at(e.from, e.fromPort);
  const to = at(e.to, e.toPort);
  return from === e.from && to === e.to ? e : { ...e, from, to };
}
