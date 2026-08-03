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

import { isContainer, portsOf } from "./fold";
import { similarity } from "./match";
import type { Graph, Node, Side } from "./types";

/** The canvas grid. Everything with a place of its own lands on it, so that two
 *  things meant to line up line up exactly rather than nearly.
 *
 *  Applied here rather than only while dragging, so a layer laid out before
 *  there was a grid comes onto it by being drawn — the log keeps whatever the
 *  user actually did, and this is a fact about how it is shown. */
export const CELL = 24;

/** The nearest grid line. */
export const cell = (n: number) => Math.round(n / CELL) * CELL;

/** How far apart the seats an interface may sit in are, along its own edge.
 *
 *  Half a cell, on the canvas lattice — so a port on a container and a port on
 *  a block at the same absolute place are exactly level, rather than each being
 *  counted from its own corner (corners of differently-tall cards do not share
 *  a lattice). How many seats an edge holds still follows its length: a block
 *  is one grid row tall, so its sides have room for one seat at the centre; a
 *  container is taller and holds several. */
export const SEAT = CELL / 2;

/** A block is one grid row of content and half a row of margin round it; a
 *  container is three rows and the same margin. Nothing is held back for text
 *  that might arrive — a card that will not fit its name clips it.
 *
 *  Sizes are whole seats, which is all a size has to satisfy: it makes the
 *  seats along an edge evenly spaced, finishing the same distance from the far
 *  corner as they start from the near one. Whole *cells* would be a stronger
 *  rule than anything needs — a card's far edge landing on the lattice aligns
 *  it with nothing, since what a card is lined up against is another card, and
 *  two of the same height are level wherever they sit. */
export const LEAF = { w: 168, h: CELL + SEAT };
/** How much taller a container is than a block: the band its grid sits in.
 *  Exported because the treemap has to be worked out in the band's real shape
 *  — tiled in a square and then stretched, every cell comes out the wrong way
 *  round.
 *
 *  Two cells, and this is the size that genuinely is constrained: it is half of
 *  it that separates a block's middle from a container's, so at two cells they
 *  differ by one and grid steps can bring them level. At the old 52 they
 *  differed by 26 and no amount of grid-perfect placement would ever have
 *  squared a block against a container. */
export const GRID = CELL * 2;
/** Clear space kept between auto-placed cards. One cell: at two, the air
 *  between compact cards was wider than the cards. */
const GAP = CELL;

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

/** Put a card on the grid by its middle rather than by its corner.
 *
 *  A block is one row of content with a little padding round it, so it stands a
 *  cell and a half tall. Landing its corner on a line leaves it covering one
 *  row and half of the next: its top border sits on the grid and its bottom
 *  border sits between lines, which is an awkward place for the interfaces
 *  seated along it. Landing its middle on the middle of a row instead, it sits
 *  squarely on that row and overhangs evenly, and its two horizontal borders
 *  are the same distance from a line as each other.
 *
 *  Applied to both axes, and the axes come out differently because the sizes
 *  do: a card is a whole number of cells wide, so its sides still land on
 *  lines. */
export function middled(at: { x: number; y: number }, size: { w: number; h: number }) {
  // A row's middle is a line plus a seat, seats being half a cell.
  const on = (v: number, extent: number) => cell(v + extent / 2 - SEAT) + SEAT - extent / 2;

  return { x: on(at.x, size.w), y: on(at.y, size.h) };
}

/** Absolute canvas positions along an edge that are valid seats.
 *
 *  Counted on the canvas lattice (every {@link SEAT}), not as a run of offsets
 *  from the card's own corner — corners of a block and a container do not share
 *  a lattice, so corner-relative seats never lined a container port up with the
 *  grid or with a block beside it. An edge only one row tall still has a single
 *  seat at its centre. */
function seatMarks(origin: number, extent: number): number[] {
  const last = Math.max(1, Math.floor(extent / SEAT) - 1);
  if (last <= 2) return [origin + extent / 2];

  const lo = origin + SEAT;
  const hi = origin + extent - SEAT;
  const marks: number[] = [];
  let at = Math.ceil(lo / SEAT) * SEAT;
  for (; at <= hi + 1e-6; at += SEAT) marks.push(at);

  return marks;
}

/** The nearest seat to a place along an edge, as the 0–1 fraction that gets
 *  stored. A fraction is still what an interface carries — it has to be, or the
 *  port would not survive its frame being resized — but the fractions it can
 *  take are the ones that land on a seat of the canvas lattice.
 *
 *  `origin` is the edge's near end in canvas units (the card's left or top), so
 *  seats are absolute rather than card-local. */
export function seatAt(at: number, extent: number, origin = 0): number {
  const marks = seatMarks(origin, extent);
  if (!marks.length) return 0.5;

  const abs = origin + at * extent;
  let best = marks[0];
  for (const mark of marks) {
    if (Math.abs(mark - abs) < Math.abs(best - abs)) best = mark;
  }

  return (best - origin) / extent;
}

/** The nearest seat that no sibling is already sitting in, searched outward
 *  from the one asked for.
 *
 *  Seats make stacking possible for the first time: with a free fraction two
 *  interfaces never landed on exactly the same point, and now they would. The
 *  spec says interfaces do not stack, so a drop onto an occupied seat takes the
 *  next one along rather than being refused — a drag that has to be repeated to
 *  find a gap is worse than one that lands beside it. */
export function freeSeat(graph: Graph, port: Node, side: Side, at: number,
                         extent: number, origin = 0): number {
  const marks = seatMarks(origin, extent);
  if (!marks.length) return 0.5;
  if (marks.length === 1) return (marks[0] - origin) / extent;

  const abs = origin + at * extent;
  const key = (mark: number) => Math.round(mark / SEAT);
  const taken = new Set(
    portsOf(graph, port.parent)
      .filter((p) => p.id !== port.id && p.side === side && p.at != null)
      .map((p) => key(origin + seatAt(p.at!, extent, origin) * extent)),
  );

  const ordered = [...marks].sort((a, b) => Math.abs(a - abs) - Math.abs(b - abs));
  for (const mark of ordered) {
    if (!taken.has(key(mark))) return (mark - origin) / extent;
  }

  return (ordered[0] - origin) / extent;
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

    const size = sizeOf(graph, node);
    const at = middled({ x: node.x, y: node.y }, size);
    spots[node.id] = at;
    taken.push({ ...at, ...size });
  }

  const loose = neighbourly(graph, nodes.filter((n) => n.x === null || n.y === null));
  const step = { x: LEAF.w + GAP, y: LEAF.h + GAP };
  const rounds = nodes.length + taken.length + 2;

  for (const node of loose) {
    const { w, h } = sizeOf(graph, node);

    for (const point of rings(step, rounds)) {
      // Grid points mark centres, so a wide card still sits on the middle —
      // then onto the grid, before the collision test rather than after it, so
      // what is checked for overlap is where the card will actually be.
      const box = { ...middled({ x: point.x - w / 2, y: point.y - h / 2 }, { w, h }), w, h };
      if (taken.some((other) => collides(box, other))) continue;

      spots[node.id] = { x: box.x, y: box.y };
      taken.push(box);
      break;
    }

    spots[node.id] ??= { x: 0, y: 0 };
  }

  return spots;
}
