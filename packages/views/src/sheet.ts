/** The grid view: an opened grid drawn from inside, its frame of cells standing in for the room.
 *
 *  Drawn, never stored: a graph handed back for a projection to read. The grid keeps its own id
 *  and draws flattened, so its cells, handles, headers and interfaces are the ones it always
 *  draws; a stand-in for it is the layer it sits on. */

import type { Block, Graph, Id } from "@mnd/core";

/** The layer a grid view is drawn on, standing in for the grid opened. */
export const GRID_LAYER = "@grid";


/** An opened grid as a layer: the stand-in holds the grid, at the corner. */
export function sheet_graph(graph: Graph, id: Id): Graph {
  const { cell: _cell, ...g } = graph.blocks[id]!;
  /** The stand-in sits in no cell, so no grid the opened one sits in counts it as a member. */
  const blocks: Record<Id, Block> = { ...graph.blocks,
    [GRID_LAYER]: { ...g, id: GRID_LAYER, settings: { ...g.settings, layout: { kind: "free" } } },
    [id]: { ...g, parent: GRID_LAYER, x: 0, y: 0,
            settings: { ...g.settings, holder: { ...g.settings?.["holder"], flat: true } } } };
  return { ...graph, blocks };
}
