/** The `page` layout: a layer's holders as full-width boxes down the page.
 *
 *  Each box lays its cards in rows `across` cards wide, wrapping at its width, and its own groups
 *  under them as boxes of their own, each a margin narrower. What the overview draws: every
 *  package a box, its groups and folders nested inside it. Drawn, never stored: a place and a width
 *  live only in the graph handed back. */

import { children, is_group, setting_of, type Block, type Graph, type Id } from "@mnd/core";
import { GAP, size_of, UNITS } from "./size";

/** How many cards a row holds where the layer says nothing. */
const ACROSS = 4;


/** A layer placed as a page, its blocks already sized. Its `layout` setting may say how many cards
 *  the widest row holds (`across`). */
export function page_graph(graph: Graph, layer: Id): Graph {
  const said = setting_of(graph, layer, "layout");
  const across = typeof said["across"] === "number" ? Math.max(1, said["across"]) : ACROSS;
  const air = UNITS.unit;
  const gap = UNITS.gap * air;
  const card = UNITS.block.w * air;
  const wide = across * card + (across - 1) * gap;
  const blocks = { ...graph.blocks };
  const put = (id: Id, x: number, y: number) => { blocks[id] = { ...blocks[id]!, x, y }; };

  /** What a box holds, from its own corner, inside `width`: its cards in rows, then its groups
   *  below, each as wide as it is. How far down it reaches. */
  const lay = (at: Id | null, width: number): number => {
    const held = children(graph, at).filter((b) => b.side === undefined);
    const cards = held.filter((b) => !is_group(graph, b.id));
    const boxes = held.filter((b) => is_group(graph, b.id));
    let y = row(cards, width);
    for (const box of boxes) {
      if (y > 0) y += gap;
      const inner = width - GAP * 2;
      const tall = lay(box.id, inner);
      const b = blocks[box.id]!;
      blocks[box.id] = { ...b, w: inner, settings: { ...b.settings, layout: { kind: "free" } } };
      put(box.id, 0, y);
      y += Math.max(tall, size_of(graph, box.id).h) + GAP * 2;
    }
    return y;
  };

  /** Cards in rows from the corner, wrapping at `width`; how far down they reach. */
  const row = (held: Block[], width: number): number => {
    let x = 0;
    let top = 0;
    let tall = 0;
    for (const block of held) {
      const { w, h } = size_of(graph, block.id);
      if (x > 0 && x + w > width) { top += tall + gap; x = 0; tall = 0; }
      put(block.id, x, top);
      x += w + gap;
      tall = Math.max(tall, h);
    }
    return held.length ? top + tall : 0;
  };

  lay(layer, wide);
  return { ...graph, blocks };
}
