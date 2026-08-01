/** Sizing and placement for the canvas.
 *
 *  Two jobs. `pack` lays out a container's child chips as tiled 1|2 groups.
 *  `place` lays out a whole layer around the centre, so the mass of blocks
 *  grows outward from the origin instead of trailing off one corner.
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

/** How many child chips a container card will draw. Three 1|2 groups of three;
 *  at ten or more the last slot is "..." for the overflow. */
export const CHIP_CAP = 9;

/** One 1|2 unit inside a region: full, two horizontal rows, or large-left with
 *  two stacked on the right. Horizontal first for two so labels stay wide. */
function unit(count: number, box: { w: number; h: number }): Tile[] {
  const n = Math.min(Math.max(count, 0), 3);
  if (n < 1) return [];
  if (n === 1) return [{ x: 0, y: 0, w: box.w, h: box.h }];

  if (n === 2) {
    const top = box.h / 2;
    return [
      { x: 0, y: 0, w: box.w, h: top },
      { x: 0, y: top, w: box.w, h: box.h - top },
    ];
  }

  const left = box.w / 2;
  const top = box.h / 2;
  return [
    { x: 0, y: 0, w: left, h: box.h },
    { x: left, y: 0, w: box.w - left, h: top },
    { x: left, y: top, w: box.w - left, h: box.h - top },
  ];
}

/** Meta-regions: one full band, two columns, or left | top-right / bottom-right. */
function regions(groups: 1 | 2 | 3, box: { w: number; h: number }): Tile[] {
  if (groups === 1) return [{ x: 0, y: 0, w: box.w, h: box.h }];

  const left = box.w / 2;
  const right = box.w - left;
  if (groups === 2) {
    return [
      { x: 0, y: 0, w: left, h: box.h },
      { x: left, y: 0, w: right, h: box.h },
    ];
  }

  const top = box.h / 2;
  return [
    { x: 0, y: 0, w: left, h: box.h },
    { x: left, y: 0, w: right, h: top },
    { x: left, y: top, w: right, h: box.h - top },
  ];
}

/** Pack up to {@link CHIP_CAP} children into the band.
 *
 *  The unit is 1|2 (or two horizontal rows when there are only two). One group
 *  uses the full band (1–3). Two sit as columns (4–6). Three tile as
 *  left | top-right / bottom-right (7–9) — each region its own 1|2. */
export function pack(count: number, box: { w: number; h: number }): Tile[] {
  const n = Math.min(Math.max(count, 0), CHIP_CAP);
  if (n < 1) return [];

  const groups = (n <= 3 ? 1 : n <= 6 ? 2 : 3) as 1 | 2 | 3;
  const sizes = Array<number>(groups).fill(0);
  const base = Math.floor(n / groups);
  const extra = n % groups;
  for (let g = 0; g < groups; g += 1) sizes[g] = base + (g < extra ? 1 : 0);

  const seats = regions(groups, box);
  const out: Tile[] = [];
  for (let g = 0; g < groups; g += 1) {
    const local = unit(sizes[g], { w: seats[g].w, h: seats[g].h });
    for (const cell of local) {
      out.push({
        x: seats[g].x + cell.x,
        y: seats[g].y + cell.y,
        w: cell.w,
        h: cell.h,
      });
    }
  }

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
