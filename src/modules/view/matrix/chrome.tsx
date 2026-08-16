/** Chrome the matrix hosts beside its grid — crumbs and types.
 *
 *  Declared on the surface with the module; parked until the panel shell
 *  landed. Types filter by relationship names in the cells — the vocabulary
 *  a grid is for reading. */

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

function clipped(name: string, at = 14): string {
  return name.length > at ? `${name.slice(0, at - 1)}…` : name;
}

export type TypesProps = {
  kinds: string[];
  shown: string | null;
  onShown: (next: string | null) => void;
};

/** Which relationship types the cells show — all, or one named kind. */
export function Types({ kinds, shown, onShown }: TypesProps) {
  return (
    <div className="arrange">
      <button
        className={shown ? "on" : ""}
        disabled={!kinds.length}
        onClick={() => {
          const order: (string | null)[] = [null, ...kinds];
          const at = order.indexOf(shown);
          onShown(order[(at + 1) % order.length] ?? null);
        }}
        title={shown ? `Showing only “${shown}”` : "All relationship types"}
      >
        {shown ? `⊂ ${clipped(shown)}` : "· types"}
      </button>
    </div>
  );
}
