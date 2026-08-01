/** Sizing and placement for the canvas.
 *
 *  Two jobs. `tile` divides a box into a grid of child cells — the treemap a
 *  container shows its contents in. `place` lays out a whole layer around the
 *  centre, so the mass of blocks grows outward from the origin instead of
 *  trailing off one corner.
 *
 *  There is one layout, applied everywhere. Nothing here ranks nodes or offers
 *  arrangements to choose between.
 *
 *  Both are pure geometry; nothing here knows about React Flow. */

import { isContainer } from "./fold";
import { similarity } from "./match";
import type { Graph, Node } from "./types";

export const LEAF = { w: 170, h: 56 };
const CELL = 34;
const PAD = 10;
const GAP = 34;

/** Columns and rows for `count` cells, kept as square as possible. */
export function tile(count: number): { cols: number; rows: number } {
  if (count < 1) return { cols: 0, rows: 0 };

  const cols = Math.ceil(Math.sqrt(count));

  return { cols, rows: Math.ceil(count / cols) };
}

/** How strongly a child belongs to its parent, 0–1. Drives the fill of its
 *  chip, so a container reads at a glance as coherent or ragged. */
export function affinity(graph: Graph, child: Node): number {
  const parent = child.parent ? graph.nodes[child.parent] : null;
  if (!parent) return 0;

  const own = similarity(child.label, parent.label);
  const bodied = parent.body ? similarity(child.label, parent.body) : 0;

  return Math.max(own, bodied);
}

/** Size of one node's card. A container grows with its contents so the treemap
 *  inside it stays legible rather than shrinking towards nothing. */
export function sizeOf(graph: Graph, node: Node): { w: number; h: number } {
  const kids = Object.values(graph.nodes)
    .filter((n) => n.parent === node.id && n.side === null).length;
  if (!kids || !isContainer(graph, node.id)) return { ...LEAF };

  const { cols, rows } = tile(kids);

  return {
    w: Math.min(360, Math.max(LEAF.w, cols * CELL + PAD * 2)),
    h: Math.min(300, Math.max(LEAF.h, rows * CELL + PAD * 2 + 22)),
  };
}

type Box = { x: number; y: number; w: number; h: number };

/** Whether two boxes touch, counting the gap that has to stay between them. */
function collides(a: Box, b: Box): boolean {
  return a.x < b.x + b.w + GAP && a.x + a.w + GAP > b.x &&
         a.y < b.y + b.h + GAP && a.y + a.h + GAP > b.y;
}

/** Grid points in rings out from the origin — the order new blocks fill the
 *  canvas in, so a layer grows evenly in every direction rather than down and
 *  to the right. Bounded, since a layer is finite and a spiral is not. */
function* rings(step: { x: number; y: number }, rounds: number) {
  for (let ring = 0; ring <= rounds; ring += 1) {
    for (let cy = -ring; cy <= ring; cy += 1) {
      for (let cx = -ring; cx <= ring; cx += 1) {
        if (Math.max(Math.abs(cx), Math.abs(cy)) !== ring) continue;
        yield { x: cx * step.x, y: cy * step.y };
      }
    }
  }
}

/** Nodes ordered so that whatever relates to what is already down comes next,
 *  which keeps related blocks near each other without a ranking pass. */
function neighbourly(graph: Graph, nodes: Node[]): Node[] {
  const here = new Map(nodes.map((n) => [n.id, n]));
  const links = new Map<string, string[]>();

  for (const edge of Object.values(graph.edges)) {
    if (!here.has(edge.source) || !here.has(edge.target)) continue;
    links.set(edge.source, [...(links.get(edge.source) ?? []), edge.target]);
    links.set(edge.target, [...(links.get(edge.target) ?? []), edge.source]);
  }

  // Busiest first, so the most connected block lands nearest the centre.
  const queue = [...nodes].sort(
    (a, b) => (links.get(b.id)?.length ?? 0) - (links.get(a.id)?.length ?? 0),
  );
  const order: Node[] = [];
  const seen = new Set<string>();

  for (const start of queue) {
    if (seen.has(start.id)) continue;

    const wave = [start];
    seen.add(start.id);

    while (wave.length) {
      const node = wave.shift()!;
      order.push(node);

      for (const id of links.get(node.id) ?? []) {
        if (seen.has(id) || !here.has(id)) continue;
        seen.add(id);
        wave.push(here.get(id)!);
      }
    }
  }

  return order;
}

/** Positions for one layer, centred on the origin. Nodes the user has dragged
 *  keep the position they were given; the rest fill the room around them,
 *  working outward from the middle and never overlapping. */
export function place(graph: Graph, nodes: Node[]): Record<string, { x: number; y: number }> {
  const spots: Record<string, { x: number; y: number }> = {};
  const taken: Box[] = [];

  for (const node of nodes) {
    if (node.x === null || node.y === null) continue;

    const { w, h } = sizeOf(graph, node);
    spots[node.id] = { x: node.x, y: node.y };
    taken.push({ x: node.x, y: node.y, w, h });
  }

  const loose = neighbourly(graph, nodes.filter((n) => n.x === null || n.y === null));
  const step = { x: LEAF.w + GAP, y: LEAF.h + GAP };
  const rounds = nodes.length + taken.length + 2;

  for (const node of loose) {
    const { w, h } = sizeOf(graph, node);

    for (const point of rings(step, rounds)) {
      // Grid points mark centres, so a wide card still sits on the middle.
      const box = { x: point.x - w / 2, y: point.y - h / 2, w, h };
      if (taken.some((other) => collides(box, other))) continue;

      spots[node.id] = { x: box.x, y: box.y };
      taken.push(box);
      break;
    }

    spots[node.id] ??= { x: 0, y: 0 };
  }

  return spots;
}
