/** The packages drawn: a stand-in card for each package, on a layer of their own. Drawn, never
 *  stored: the layer and its cards live only in the graph handed back. */

import { packages, type Block, type Graph, type Id } from "@mnd/core";

/** The layer the packages are drawn on. */
export const PACKAGES = "@packages";

/** What a package's card is called on that layer. */
const CARD = "@package:";


/** The graph with the packages laid on a layer of their own, a card each, in order. */
export function packages_graph(graph: Graph): Graph {
  const cards: Block[] = packages(graph).map((p, n) =>
    ({ id: `${CARD}${p.id}`, parent: PACKAGES, of: p.id, order: n + 1 }));
  const blocks: Record<Id, Block> = { ...graph.blocks,
    [PACKAGES]: { id: PACKAGES, parent: null, name: "packages", arrangement: "auto" } };
  for (const card of cards) blocks[card.id] = card;
  return { ...graph, blocks };
}

/** The package a card on that layer stands for, or null for anything else. */
export function package_card(id: Id | null | undefined): Id | null {
  return id?.startsWith(CARD) ? id.slice(CARD.length) : null;
}

/** The card a package draws as on that layer. */
export function card_of(pkg: Id): Id {
  return `${CARD}${pkg}`;
}
