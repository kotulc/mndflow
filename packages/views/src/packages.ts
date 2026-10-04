/** The overview, and any layer flattened. Drawn, never stored: each is a graph handed back for a
 *  projection to read, with every block keeping its real id. */

import { is_folder, packages, type Block, type Graph, type Id } from "@mnd/core";

/** The layer the overview is drawn on: above every package root. */
export const FOREST = "@forest";


/** The graph with every folder drawn as a group, so what it holds reads on the layer above. */
export function flat_graph(graph: Graph): Graph {
  const blocks: Record<Id, Block> = { ...graph.blocks };
  for (const b of Object.values(graph.blocks)) {
    if (is_folder(graph, b.id)) blocks[b.id] = { ...b, type: "group" };
  }
  return { ...graph, blocks };
}

/** The graph with each package a box on one layer above them all — the ones named, in the order
 *  named, else every package as the explorer lists them — its domain inside it and its folders
 *  flattened, laid out as a page `across` cards wide. A pick on it is the block itself. */
export function forest_graph(graph: Graph, only?: readonly Id[], across?: number): Graph {
  const flat = flat_graph(graph);
  const shown = only ? only.filter((id) => graph.blocks[id]?.parent === null)
    : packages(graph).map((p) => p.id);
  const blocks: Record<Id, Block> = { ...flat.blocks,
    [FOREST]: { id: FOREST, parent: null, name: "packages",
                settings: { layout: { kind: "page", ...(across ? { across } : {}) } } } };
  for (const p of packages(graph)) {
    const at = shown.indexOf(p.id);
    blocks[p.id] = at < 0 ? { ...p, parent: `${FOREST}:hidden` }
      : { ...p, parent: FOREST, type: "group", order: at + 1 };
  }
  return { ...flat, blocks };
}
