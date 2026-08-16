/** Chrome the table hosts beside its rows — crumbs and types.
 *
 *  Declared on the surface since A.1; parked until the panel shell landed.
 *  Types filter by the members' definition names — the vocabulary that
 *  matters on a list, not a relationship kind on a plane. */

import type { Graph } from "../../../graph/types";
import type { Row } from "./rows";

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

/** Definition names present on the rows, for the types cycle. */
export function kindsOf(rows: Row[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const row of rows) {
    if (!row.type || seen.has(row.type)) continue;
    seen.add(row.type);
    out.push(row.type);
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

/** Which definition types the list shows — all, or one named kind. */
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
        title={shown ? `Showing only “${shown}”` : "All types"}
      >
        {shown ? `⊂ ${clipped(shown)}` : "· types"}
      </button>
    </div>
  );
}
