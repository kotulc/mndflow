/** Sizing and placement for the canvas.
 *
 *  Two jobs. `tile` divides a box into a grid of child cells — the treemap a
 *  group shows its contents in. `place` lays out a whole layer, giving bigger
 *  things more room and wrapping into rows so no corner of the canvas ends up
 *  carrying everything.
 *
 *  Both are pure geometry; nothing here knows about React Flow. */

import { similarity } from "./match";
import type { Graph, Node } from "./types";

export const LEAF = { w: 170, h: 56 };
const CELL = 34;
const PAD = 10;
const GAP = 34;
/** Rows wrap past this width so a layer spreads out instead of trailing off. */
const SPAN = 1100;

/** Columns and rows for `count` cells, kept as square as possible. */
export function tile(count: number): { cols: number; rows: number } {
  if (count < 1) return { cols: 0, rows: 0 };

  const cols = Math.ceil(Math.sqrt(count));

  return { cols, rows: Math.ceil(count / cols) };
}

/** How strongly a child belongs to its parent, 0–1. Drives the fill of its
 *  chip, so a group reads at a glance as coherent or ragged. */
export function affinity(graph: Graph, child: Node): number {
  const parent = child.parent ? graph.nodes[child.parent] : null;
  if (!parent) return 0;

  const own = similarity(child.label, parent.label);
  const bodied = parent.body ? similarity(child.label, parent.body) : 0;

  return Math.max(own, bodied);
}

/** Size of one node's card. A group grows with its contents so the treemap
 *  inside it stays legible rather than shrinking towards nothing. */
export function sizeOf(graph: Graph, node: Node): { w: number; h: number } {
  if (node.kind !== "group") return { ...LEAF };

  const kids = Object.values(graph.nodes).filter((n) => n.parent === node.id).length;
  const { cols, rows } = tile(kids);

  return {
    w: Math.min(360, Math.max(LEAF.w, cols * CELL + PAD * 2)),
    h: Math.min(300, Math.max(LEAF.h, rows * CELL + PAD * 2 + 22)),
  };
}

/** Row-wrapping placement for one layer. Nodes the user has dragged keep the
 *  position they were given; the rest fill the gaps around them. */
export function place(graph: Graph, nodes: Node[]): Record<string, { x: number; y: number }> {
  const spots: Record<string, { x: number; y: number }> = {};
  let x = 0;
  let y = 0;
  let tallest = 0;

  for (const node of nodes) {
    const { w, h } = sizeOf(graph, node);

    if (node.x !== null && node.y !== null) {
      spots[node.id] = { x: node.x, y: node.y };
      continue;
    }

    if (x > 0 && x + w > SPAN) {
      x = 0;
      y += tallest + GAP;
      tallest = 0;
    }

    spots[node.id] = { x, y };
    x += w + GAP;
    tallest = Math.max(tallest, h);
  }

  return spots;
}
