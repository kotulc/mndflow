/** What the matrix's chrome is built from — the crumb trail and the kinds its
 *  `types` group lists.
 *
 *  A cell's kind is a **relationship name**, which is the vocabulary a grid is
 *  for reading. The control itself is the rail's (Y.4); this only answers what
 *  goes in it. */

import type { Graph } from "../../../graph/types";
import type { Grid } from "./grid";

/** Nodes from the project down to the open layer — same trail the page
 *  builds for the diagram crumbs. */
export function trailOf(graph: Graph, view: string | null): string[] {
  const trail: string[] = [];
  let cursor = view;

  while (cursor && graph.elements[cursor]) {
    trail.unshift(cursor);
    cursor = graph.elements[cursor].parent;
  }

  return trail;
}

/** Relationship type marks present in the grid, for the types cycle. */
export function kindsOf(grid: Grid): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const row of grid.cells) {
    for (const cell of row) {
      for (const mark of cell.marks) {
        if (seen.has(mark)) continue;
        seen.add(mark);
        out.push(mark);
      }
    }
  }

  return out;
}
