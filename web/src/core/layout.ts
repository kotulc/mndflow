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
/** How much taller a container is than a block: the band its grid sits in.
 *  Exported because the treemap has to be worked out in the band's real shape
 *  — tiled in a square and then stretched, every cell comes out the wrong way
 *  round. */
export const GRID = 52;
const GAP = 34;

/** Columns and rows for `count` cells, kept as square as possible. */
export function tile(count: number): { cols: number; rows: number } {
  if (count < 1) return { cols: 0, rows: 0 };

  const cols = Math.ceil(Math.sqrt(count));

  return { cols, rows: Math.ceil(count / cols) };
}

export type Tile = { x: number; y: number; w: number; h: number };

/** How square a row of cells would come out, laid across `short`. The measure
 *  the treemap minimises: lower is closer to square. */
function squareness(sizes: number[], sum: number, short: number): number {
  const most = Math.max(...sizes);
  const least = Math.min(...sizes);
  const side = short * short;
  const span = sum * sum;

  return Math.max((side * most) / span, span / (side * least));
}

/** A squarified treemap: rectangles whose areas follow their weights and whose
 *  shapes stay as near square as the weights allow.
 *
 *  Cells come out square, wide or tall depending on what has to fit beside
 *  what, which is the point — a uniform grid of equal cells says only how many
 *  children there are, while this says which of them the container is mostly
 *  made of. Bruls, Huizing and van Wijk's algorithm: fill the shorter side
 *  with a row, taking cells while that keeps the row squarer, then repeat on
 *  what is left. */
export function squarify(weights: number[], box: { w: number; h: number }): Tile[] {
  if (!weights.length) return [];

  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const scale = (box.w * box.h) / total;
  // Biggest first — the algorithm only squares up if it places them in order.
  const queue = weights
    .map((weight, at) => ({ at, area: weight * scale }))
    .sort((a, b) => b.area - a.area);
  const out: Tile[] = new Array(weights.length);

  let { w, h } = box;
  let x = 0;
  let y = 0;
  let next = 0;

  while (next < queue.length && w > 0 && h > 0) {
    const short = Math.min(w, h);
    const row = [queue[next]];
    let sum = row[0].area;
    let best = squareness([sum], sum, short);
    next += 1;

    while (next < queue.length) {
      const grown = sum + queue[next].area;
      const trial = squareness([...row, queue[next]].map((c) => c.area), grown, short);
      if (trial > best) break;

      row.push(queue[next]);
      sum = grown;
      best = trial;
      next += 1;
    }

    // The row runs the full short side; its thickness is whatever the areas
    // need. The rest of the box is then laid out the same way.
    const thick = sum / short;
    let along = 0;

    for (const cell of row) {
      const span = cell.area / thick;
      out[cell.at] = w >= h
        ? { x, y: y + along, w: thick, h: span }
        : { x: x + along, y, w: span, h: thick };
      along += span;
    }

    if (w >= h) {
      x += thick;
      w -= thick;
    } else {
      y += thick;
      h -= thick;
    }
  }

  // Anything the loop could not place (a zero-area box) still needs a slot.
  for (let at = 0; at < out.length; at += 1) out[at] ??= { x: 0, y: 0, w: 0, h: 0 };

  return out;
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

/** Size of one node's card.
 *
 *  A container is barely bigger than a block: room for the grid under its
 *  name, and no more. It does not grow with what it holds — a card that swells
 *  with its contents makes a busy layer into a wall of large boxes, and says
 *  the same thing the grid inside it already says. The cells shrink instead,
 *  which is what keeps a full container reading as full. */
export function sizeOf(graph: Graph, node: Node): { w: number; h: number } {
  if (!isContainer(graph, node.id)) return { ...LEAF };

  return { w: LEAF.w, h: LEAF.h + GRID };
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
