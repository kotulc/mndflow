/** How big a thing is, before anything is placed.
 *
 *  Cards are as small as their contents allow. Nothing is held back for text
 *  that might arrive; a name too long for its card is clipped. */

import { covers, is_container, is_grid, is_interface, is_reference, module_of,
         type Block, type Graph, type Id, type Point } from "@mnd/core";

/** **The one place the drawing's proportions are set, and the unit is the only
 *  measure there is.**
 *
 *  Everything on the canvas is a whole number of *units* across, and the unit
 *  is one square of the guides. Change the unit and the whole drawing rescales;
 *  change an extent and one thing reshapes. Nothing below states a pixel.
 *
 *  **There is no second measure.** There used to be a *cell* — a block plus a
 *  gap — and placement was quantised to it, so a group could only move a whole
 *  cell at a time and a gap could only be a whole cell wide. Every argument
 *  about spacing and alignment came from that one mistake: two rulers on one
 *  drawing, and the coarser one winning. A grid still has *cells* in the sense
 *  of addresses to seat things at, but nothing is measured in them.
 *
 *  Settings, when there are settings, drive this object and nothing else. */
export const UNITS = {
  /** One square of the guides, in pixels. */
  unit: 24,
  /** What a block is, in units. **Five by two rather than four**: a block four
   *  units wide leaves about eight characters before a name clips, which is
   *  most of them. */
  block: { w: 5, h: 2 },
  /** How far apart the layout sets any two things, in units. **One rule for
   *  everything it places** — card to card, card to grid, grid to grid. */
  gap: 1,
};

/** One square of the guides. **Everything lands on this**: what the layout
 *  places, what a hand drops, what a grid seats. One lattice, one measure. */
export const UNIT = UNITS.unit;

/** How far apart the layout sets any two things. */
export const GAP = UNITS.gap * UNIT;

/** Seats fall every half unit, never on a corner. **A block is four of these
 *  tall, which is three seats down its side** — the middle one included, so a
 *  port can be dragged to the centre of an edge and not only near its ends.
 *
 *  A seat is not a place a *block* may land; it is where a line meets a
 *  border, which is a fraction of an edge rather than a spot on the lattice. */
export const SEAT = UNIT / 2;

export type Size = { w: number; h: number };

export const BLOCK: Size = { w: UNITS.block.w * UNIT, h: UNITS.block.h * UNIT };

/** **A group's cell**, and the one thing a cell is: a block with a gap of air
 *  on every side of it.
 *
 *  Cells are fundamental to a group — they are what it seats things at and what
 *  it draws. What a cell is *not* is a measure: nothing outside a group is
 *  quantised to one, no gap is counted in them, and no arrangement steps by
 *  one. That was the mistake, and it is the only part that was wrong.
 *
 *  **A gap on each side rather than one shared between two.** Every element on
 *  this drawing keeps a gap of clear space around itself, so a block seated in
 *  a cell keeps its own — which also makes the surplus two whole units, and a
 *  block centred in it lands on the lattice like everything else. Half a unit
 *  of surplus would put it between two lines. */
export const CELL: Size = { w: BLOCK.w + GAP * 2, h: BLOCK.h + GAP * 2 };

/** **Exactly two blocks tall**, which is the ratio you can read off the
 *  drawing — a container is a block with a block's worth of picture under it. */
export const CONTAINER: Size = { w: BLOCK.w, h: BLOCK.h * 2 };

/** The room a container's picture of itself gets: exactly how much taller a
 *  container is than a block, so the name above it keeps a block's worth. */
export const BAND: Size = { w: CONTAINER.w, h: CONTAINER.h - BLOCK.h };

/** An interface is smaller than a seat is wide, so two never touch. */
export const PORT: Size = { w: SEAT - 1, h: SEAT - 1 };

export type Box = { x: number; y: number; w: number; h: number };

/** Onto the lattice: the nearest whole unit, in both axes.
 *
 *  **The one rounding there is.** A card, a grid, a note and a hand-placed
 *  anything all land on the same lines, because there is only one set of lines. */
export function on_unit(at: Point): Point {
  return { x: Math.round(at.x / UNIT) * UNIT, y: Math.round(at.y / UNIT) * UNIT };
}

/** The grid a swept rectangle asks for: a corner where you drew it, and as
 *  many seats across and down as fit what you drew over. */
export function swept_cells(box: Box): { x: number; y: number; rows: number; cols: number } {
  const at = on_unit(box);
  return { ...at,
           rows: Math.max(1, Math.round(box.h / CELL.h)),
           cols: Math.max(1, Math.round(box.w / CELL.w)) };
}

/** A box grown out to whole units.
 *
 *  **A room is a whole number of units**, so its walls fall on lines the guides
 *  already draw. Grown outward on every side — a room is never made smaller to
 *  make it fit. */
export function roomed(box: Box): Box {
  const x = Math.floor(box.x / UNIT) * UNIT;
  const y = Math.floor(box.y / UNIT) * UNIT;
  return { x, y,
           w: Math.ceil((box.x + box.w - x) / UNIT) * UNIT,
           h: Math.ceil((box.y + box.h - y) / UNIT) * UNIT };
}

/** What a grid takes up: its extent in cells, and nothing besides. A boundary
 *  has no extent and takes its bounds from its members instead. */
export function grid_size(g: Block): Size {
  return { w: (g.cols ?? 1) * CELL.w, h: (g.rows ?? 1) * CELL.h };
}

/** Where one cell sits inside its grid, relative to the grid's own corner.
 *
 *  **A merge is a cell's extent**, so every address a span covers answers with
 *  the span's box — one cell, drawn once, wherever in it you point. */
export function cell_box(g: Block, r: number, c: number): Box {
  const span = g.merges?.find((s) => covers(s, r, c));
  const at = span ?? { r, c, rows: 1, cols: 1 };
  return { x: at.c * CELL.w, y: at.r * CELL.h,
           w: at.cols * CELL.w, h: at.rows * CELL.h };
}

/** How many rows and columns a region of this size is, in whole cells. **The
 *  one place a rectangle becomes an extent** — a sweep that draws a grid and a
 *  corner that resizes one are the same question asked twice. */
export function extent_of(w: number, h: number): { rows: number; cols: number } {
  return { rows: Math.max(1, Math.round(h / CELL.h)),
           cols: Math.max(1, Math.round(w / CELL.w)) };
}

/** A block of this size, centred in the cell it was given. **Blocks never
 *  resize**: one in a merged region larger than it sits in the middle of it.
 *
 *  A cell carries a gap on each side, so the surplus is two whole units and the
 *  middle of it is a line the guides draw. */
export function centred_in(box: Box, s: Size): Box {
  return { x: box.x + (box.w - s.w) / 2, y: box.y + (box.h - s.h) / 2, ...s };
}

/** A promoted block fills its cell with a gutter so the cell frame and the
 *  block frame read as two borders. */
export const PROMOTED_INSET = 5;

export function fills_cell(box: Box): Box {
  const i = PROMOTED_INSET;
  return { x: box.x + i, y: box.y + i, w: box.w - i * 2, h: box.h - i * 2 };
}

/** Onto the lattice. **One measure**: a hand drop lands where the layout would
 *  have put it, on a line the guides draw. */
export function snap(n: number): number {
  return Math.round(n / UNIT) * UNIT;
}

/** Whether a block is seated in a grid rather than placed beside one. */
export function gridded(graph: Graph, id: Id): boolean {
  const b = graph.blocks[id];
  return !!b?.cell && !!b.group && is_grid(graph.blocks[b.group]);
}

/** What this block needs. A note keeps whatever size it was asked for, and a
 *  grid is the extent it was drawn with.
 *
 *  **A gridded container minifies.** A cell is one block and a cell is fixed,
 *  so a container in one is drawn a block's size with no picture of what it
 *  holds — its icon is what still tells it apart. */
export function size_of(graph: Graph, id: Id): Size {
  const b = graph.blocks[id];
  if (!b) return BLOCK;
  if (is_interface(b)) return PORT;
  if (is_grid(b)) return grid_size(b);
  if (b.w !== undefined && b.h !== undefined) return { w: b.w, h: b.h };
  if (gridded(graph, id)) return { ...BLOCK };
  return pictured(graph, id) ? { ...CONTAINER } : { ...BLOCK };
}

/** Whether a card draws a picture of what it holds.
 *
 *  **The picture is the container's, not every holder's.** A folder holds
 *  things the way a drawer does — what is in it is filing, not composition —
 *  so it is drawn the plain size every other block is, and opened to be seen
 *  into. A reference shows its target's name and nothing of its insides, and a
 *  card in a cell has nowhere to put a picture. */
export function pictured(graph: Graph, id: Id): boolean {
  const b = graph.blocks[id];
  return !!b && is_container(graph, id) && !is_reference(b)
    && module_of(graph, id) !== "folder" && !gridded(graph, id);
}

/** How many seats an edge of this length offers. A small card offering few
 *  places is the card being small, not the grid being coarse. */
export function seats(length: number): number {
  return Math.max(1, Math.floor(length / SEAT) - 1);
}

/** Where seat `n` of `count` falls along an edge, as a fraction. */
export function seat_at(n: number, count: number): number {
  return (n + 1) / (count + 1);
}

/** Absolute positions along an edge, every half unit inset from the corners.
 *
 *  **Counted on the canvas lattice**, not as offsets from the card's corner —
 *  so a line and an interface on the same wall land on the same lines the
 *  guides draw. An edge only one row tall still has a single seat at its centre. */
export function seat_marks(origin: number, extent: number): number[] {
  const last = Math.max(1, Math.floor(extent / SEAT) - 1);
  if (last <= 2) return [origin + extent / 2];

  const lo = origin + SEAT;
  const hi = origin + extent - SEAT;
  const marks: number[] = [];
  let at = Math.ceil(lo / SEAT) * SEAT;
  for (; at <= hi + 1e-6; at += SEAT) marks.push(at);
  return marks;
}

/** A mark on an edge, as the fraction stored on a block. */
export function seat_frac(mark: number, origin: number, extent: number): number {
  return (mark - origin) / extent;
}
