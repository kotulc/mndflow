/** What the table's chrome is built from — the crumb trail and the kinds its
 *  `types` group lists.
 *
 *  A row's kind is its **definition's name**: the vocabulary that matters on a
 *  list, not a relationship kind on a plane. The control itself is the rail's
 *  (Y.4); this only answers what goes in it. */

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
