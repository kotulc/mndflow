/** The `page` layout: a layer's holders as boxes down the page.
 *
 *  Each box flows its cards onto standard cells, `across` to a row, and its own groups under them
 *  as boxes of their own, each hugging what it holds. What the package view draws: every package a box, its groups
 *  and folders nested inside it. Drawn, never stored: a place and a width live only in the graph
 *  handed back. */

import { children, is_group, is_interface, setting_of, type Graph, type Id } from "@mnd/core";
import type { Placed } from "./arrange";
import { flow, whole } from "./grid";
import { size_of, GAP, PAD } from "./size";

/** How many cards a row holds where the layer says nothing. */
const ACROSS = 4;


/** How many cards a layer's rows hold: as many as its `layout` setting's `across` says, else four. */
export function across_of(graph: Graph, layer: Id | null): number {
  const said = layer ? setting_of(graph, layer, "layout") : {};
  return typeof said["across"] === "number" ? Math.max(1, said["across"]) : ACROSS;
}

/** A layer placed as a page, its blocks already sized. Its `layout` setting may say how many cards
 *  the widest row holds (`across`). */
export function page_graph(graph: Graph, layer: Id): Graph {
  const across = across_of(graph, layer);
  const blocks = { ...graph.blocks };
  const put = (id: Id, x: number, y: number) => { blocks[id] = { ...blocks[id]!, x, y }; };
  const held = (at: Id | null) => children(graph, at).filter((b) => !is_interface(graph, b.id));
  const cards = (at: Id | null) => held(at).filter((b) => !is_group(graph, b.id));
  const boxes = (at: Id | null) => held(at).filter((b) => is_group(graph, b.id));
  const grid = (at: Id | null): Placed[] =>
    flow(cards(at).map((b) => ({ id: b.id, ...size_of(graph, b.id) })), across);

  /** How wide a box's content has to be: its cards' grid, or its widest box and that box's air. */
  const need = (at: Id | null): number => Math.max(
    reach(grid(at)), ...boxes(at).map((b) => need(b.id) + PAD * 2));

  /** What a box holds, from its own corner: its cards, then its groups below, each hugging what it
   *  holds. How far down it reaches. */
  const lay = (at: Id | null): number => {
    const placed = grid(at);
    for (const p of placed) put(p.id, p.x, p.y);
    let y = placed.length ? whole(Math.max(...placed.map((p) => p.y + p.h))) : 0;
    for (const box of boxes(at)) {
      if (y > 0) y += GAP;
      const tall = lay(box.id);
      const b = blocks[box.id]!;
      blocks[box.id] = { ...b, w: need(box.id),
                         settings: { ...b.settings, layout: { kind: "free" } } };
      put(box.id, 0, y);
      y += Math.max(tall, size_of(graph, box.id).h) + PAD * 2;
    }
    return y;
  };

  lay(layer);
  return { ...graph, blocks };
}

/** How far right a grid reaches, up to whole units. */
function reach(placed: readonly Placed[]): number {
  return placed.length ? whole(Math.max(...placed.map((p) => p.x + p.w))) : 0;
}
