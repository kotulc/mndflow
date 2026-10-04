/** The overhead views: the forest of every package, and any layer flattened. Drawn, never stored:
 *  each is a graph handed back for a projection to read, with every block keeping its real id. */

import { is_folder, packages, type Block, type Graph, type Id } from "@mnd/core";

/** The layer the forest is drawn on: above every package root. */
export const FOREST = "@forest";


/** The graph with every folder drawn as a group, so what it holds reads on the layer above. */
export function flat_graph(graph: Graph): Graph {
  const blocks: Record<Id, Block> = { ...graph.blocks };
  for (const b of Object.values(graph.blocks)) {
    if (is_folder(graph, b.id)) blocks[b.id] = { ...b, type: "group" };
  }
  return { ...graph, blocks };
}

/** The graph with every package a box on one layer above them all, its domain inside it and its
 *  folders flattened. A pick on it is the block itself. */
export function forest_graph(graph: Graph): Graph {
  const flat = flat_graph(graph);
  const blocks: Record<Id, Block> = { ...flat.blocks,
    [FOREST]: { id: FOREST, parent: null, name: "packages",
                settings: { layout: { kind: "auto" } } } };
  packages(graph).forEach((p, n) => {
    blocks[p.id] = { ...p, parent: FOREST, type: "group", order: n + 1 };
  });
  return { ...flat, blocks };
}
