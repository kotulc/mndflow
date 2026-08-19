/** What a table may put in a column beyond its fixed head (P.8).
 *
 *  The head — kind, name, what, type — is the default set, because every row
 *  can answer it. Anything further is a **field in scope**: a name some row's
 *  element carries, which is what a requirements table is made of.
 *
 *  Which of them are shown is the **table's** state and never a definition's.
 *  `components.card.shows` is the precedent and not the mechanism: that is one
 *  definition saying what its own card shows, and this is one view saying what
 *  its columns are. */

import {
  actual, blocksOf, childrenOf, edgesIn, fieldsOf, portsOf,
} from "../../../graph/fold";
import type { Graph } from "../../../graph/types";

/** Everything the table lists for a layer — not `rowsOf`'s blocks and proxies
 *  alone, because a column is drawn against every row there is, and a field
 *  only an edge or an interface carries is still a field in scope. */
function listed(graph: Graph, layer: string | null): string[] {
  const ids = childrenOf(graph, layer).map((n) => n.id);
  const ports = blocksOf(graph, layer).flatMap((n) => portsOf(graph, n.id).map((p) => p.id));

  return [
    ...ids, ...ports,
    ...portsOf(graph, layer).map((p) => p.id),
    ...edgesIn(graph, layer).map((e) => e.id),
  ];
}

/** Field names the layer's rows carry, once each, in the order they are met —
 *  the list a column picker offers. Read through a proxy, since that is what
 *  the row itself shows. */
export function fieldsIn(graph: Graph, layer: string | null): string[] {
  const seen = new Set<string>();

  for (const id of listed(graph, layer)) {
    for (const field of fieldsOf(graph, actual(graph, id)?.id ?? id)) seen.add(field.name);
  }

  return [...seen];
}
