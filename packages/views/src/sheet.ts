/** The grid view: an opened grid drawn from inside, its frame of cells standing in for the room.
 *
 *  Drawn, never stored: a graph handed back for a projection to read. The grid keeps its own id
 *  and draws flattened, so its cells, handles, headers and interfaces are the ones it always
 *  draws; a stand-in for it is the layer it sits on. **A swimlane is turned by the canvas**
 *  (docs/diagrams/swimlane.md): its phases run along the long side, so on a landscape canvas its
 *  lanes are rows. */

import { chain_of, type Block, type Graph, type Id } from "@mnd/core";
import { SHAPE } from "./size";

/** The layer a grid view is drawn on, standing in for the grid opened. */
export const GRID_LAYER = "@grid";


/** An opened grid as a layer: the stand-in holds the grid, at the corner. */
export function sheet_graph(given: Graph, id: Id): Graph {
  const graph = turned(given, id) ? transposed(given, id) : given;
  const { cell: _cell, ...g } = graph.blocks[id]!;
  /** The stand-in sits in no cell, so no grid the opened one sits in counts it as a member. */
  const blocks: Record<Id, Block> = { ...graph.blocks,
    [GRID_LAYER]: { ...g, id: GRID_LAYER,
                    settings: { ...g.settings, diagram: { placing: "auto" } } },
    [id]: { ...g, parent: GRID_LAYER, x: 0, y: 0,
            settings: { ...g.settings, holder: { ...g.settings?.["holder"], flat: true } } } };
  return { ...graph, blocks };
}

/** Whether a grid is drawn turned: a swimlane, its lanes stored as columns, on a landscape
 *  canvas. A turned grid is read only until a move in it is turned back. */
export function turned(graph: Graph, id: Id): boolean {
  const b = graph.blocks[id];
  const kind = b?.def ? id : b?.type;
  return SHAPE.aspect >= 1 && chain_of(graph, kind).some((d) => d.id === "swimlane");
}

/** A grid with its rows and columns swapped: its lattice, labels, merges and every cell in it. */
function transposed(graph: Graph, id: Id): Graph {
  const g = graph.blocks[id]!;
  const blocks: Record<Id, Block> = { ...graph.blocks };
  if (g.grid) {
    blocks[id] = { ...g, grid: {
      ...g.grid, rows: g.grid.cols, cols: g.grid.rows,
      ...(g.grid.labels ? { labels: g.grid.labels.map((l) => ({ ...l, r: l.c, c: l.r })) } : {}),
      ...(g.grid.merges ? { merges: g.grid.merges.map((m) => ({ r: m.c, c: m.r, rows: m.cols,
                                                                cols: m.rows })) } : {}) } };
  }
  for (const b of Object.values(graph.blocks)) {
    if (b.parent === id && b.cell) blocks[b.id] = { ...b, cell: { r: b.cell.c, c: b.cell.r } };
  }
  return { ...graph, blocks };
}
