/** A registry's treemap: tiles each as large as what they weigh, nested in boxes under their
 *  headings (`registry.ts`, `library.ts`). A diagram laid out as a treemap is its map instead
 *  (`map.ts` `layer_map`). The binary layout is d3-hierarchy's: it keeps a light tile from a thin
 *  slice. */

import { hierarchy, treemap, treemapBinary } from "d3-hierarchy";
import { def_of, of_ref, stands_for, subtree, type Graph, type Id } from "@mnd/core";
import type { Placed } from "./arrange";
import { BLOCK, PAD, UNIT } from "./size";

/** One tile or box, and how much it weighs: a box nothing, so it is what it holds. */
export type Tile = { id: Id; weight: number; kids?: Tile[] };

/** How wide a treemap is for how tall, so it reads as a page laid on its side. */
const ASPECT = 1.6;

/** How many blocks' room each tile is given at least, and at most, on average. */
const LEAST = 3;
const MOST = 8;

/** The air between tiles, and round what a box holds. */
const INNER = UNIT / 3;


/** Tiles laid out on a landscape page, large enough that the lightest is about a card, within
 *  bounds so a heavy tile never blows the page up — or filling `size` where one is given. Boxes
 *  keep a heading's room at their top: over their edge, or `head` deep inside it where the box
 *  draws its heading itself. */
export function tiled(tiles: Tile[], size?: { w: number; h: number }, head = INNER): Placed[] {
  if (!tiles.length) return [];
  const root = hierarchy<Tile>({ id: "", weight: 0, kids: tiles }, (t) => t.kids)
    .sum((t) => t.weight).sort((a, z) => (z.value ?? 0) - (a.value ?? 0));
  const leaves = root.leaves();
  const card = BLOCK.w * BLOCK.h;
  const lightest = Math.min(...leaves.map((n) => n.data.weight || 1));
  const area = Math.min(MOST, Math.max(LEAST, (root.value ?? 1) / lightest / leaves.length))
    * leaves.length * card + root.descendants().filter((n) => n.children).length * card;
  const w = Math.max(BLOCK.w * 2, Math.ceil(Math.sqrt(area * ASPECT) / UNIT) * UNIT);
  const h = Math.max(BLOCK.h * 2, Math.ceil(area / w / UNIT) * UNIT);
  const boxed = (n: { depth: number; children?: unknown }) => n.depth > 0 && !!n.children;
  /** A box's heading sits over its top edge, so boxes side by side keep a heading's room between
   *  them; tiles in a box keep a little air. */
  const headed = (n: { children?: { children?: unknown }[] }) =>
    !!n.children?.some((c) => c.children);
  const laid = treemap<Tile>().tile(treemapBinary).size(size ? [size.w, size.h] : [w, h])
    .round(true)
    .paddingInner((n) => (headed(n) ? PAD : INNER))
    .paddingOuter((n) => (boxed(n) ? INNER : 0))
    .paddingTop((n) => (boxed(n) ? head : 0))(root);
  return laid.descendants().slice(1)
    .map((n) => ({ id: n.data.id, x: n.x0, y: n.y0, w: n.x1 - n.x0, h: n.y1 - n.y0 }));
}

/** How much a block holds: one for itself, and one for each block in its structure — its own, and
 *  what it reads through from its definition. A stand-in weighs what it stands for. */
export function weight_of(graph: Graph, id: Id): number {
  const target = of_ref(graph, id) ? stands_for(graph, id) : null;
  if (target && target.id !== id) return weight_of(graph, target.id);
  const own = subtree(graph, id).length - 1;
  const def = def_of(graph, id);
  return 1 + own + (def && def !== id ? subtree(graph, def).length - 1 : 0);
}
