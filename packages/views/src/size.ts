/** How big a thing is, before anything is placed.
 *
 *  Cards are as small as their contents allow. Nothing is held back for text
 *  that might arrive; a name too long for its card is clipped. */

import { covers, is_container, is_grid, is_interface, is_reference, module_of,
         type Block, type Graph, type Id, type Point } from "@mnd/core";

/** **The one place the drawing's proportions are set.**
 *
 *  Everything on the canvas is a whole number of *units* across, and the unit
 *  is what a square of the guides is. Change the unit and the whole drawing
 *  rescales; change an extent and one thing reshapes. Nothing below states a
 *  pixel of its own.
 *
 *  **A cell is a block plus the gap**, so it is derived rather than stated —
 *  two numbers that have to agree are two numbers that can disagree. That one
 *  fact is what makes a block the layout placed and a block seated in a grid
 *  the same distance from its neighbour.
 *
 *  Settings, when there are settings, drive this object and nothing else. */
export const UNITS = {
  /** One square of the guides, in pixels. */
  unit: 24,
  /** What a block is, in units. **Five by two rather than four**: a block four
   *  units wide leaves about eight characters before a name clips, which is
   *  most of them. */
  block: { w: 5, h: 2 },
  /** How much room the grid layout leaves between two of anything. */
  gap: 2,
};

/** One square of the guides. Everything is a whole number of these. */
export const UNIT = UNITS.unit;

/** The fine grid: what hand placement lands on, and what the backdrop dots
 *  mark. **Half a unit**, so a block centred in its cell has exactly one of
 *  these on each side of it and the two backdrops never disagree. */
export const STEP = UNIT / 2;

/** Seats fall every fine step, never on a corner. **A block is four steps
 *  tall, which is three seats down its side** — the middle one included, so a
 *  port can be dragged to the centre of an edge and not only near its ends. */
export const SEAT = STEP;

export type Size = { w: number; h: number };

export const BLOCK: Size = { w: UNITS.block.w * UNIT, h: UNITS.block.h * UNIT };

/** **The cell is the unit of arrangement, and a block is what sits in one.**
 *
 *  A cell is a block plus the gap — fixed, never sized to what lands in it —
 *  so a block seated in a cell sits centred with half a gap all round it, and
 *  two blocks in neighbouring cells stand a full gap apart. This is the same
 *  lattice the guides draw and the same one a grid's cells are cut from. */
export const CELL: Size = { w: (UNITS.block.w + UNITS.gap) * UNIT,
                            h: (UNITS.block.h + UNITS.gap) * UNIT };

/** How much air a block leaves inside its cell, on every side. */
export const MARGIN = (UNITS.gap * UNIT) / 2;

/** **Exactly two blocks tall**, which is the ratio you can read off the
 *  drawing — a container is a block with a block's worth of picture under it.
 *
 *  It is not two *cells* tall: two cells carry the gap between them as well,
 *  which made a container two and a half blocks and read as neither. It still
 *  claims two cells in a grid, and centres in them. */
export const CONTAINER: Size = { w: BLOCK.w, h: BLOCK.h * 2 };

/** The room a container's picture of itself gets: exactly how much taller a
 *  container is than a block, so the name above it keeps a block's worth. */
export const BAND: Size = { w: CONTAINER.w, h: CONTAINER.h - BLOCK.h };

/** An interface is smaller than a seat is wide, so two never touch. */
export const PORT: Size = { w: SEAT - 1, h: SEAT - 1 };

export type Box = { x: number; y: number; w: number; h: number };

/** **A grid is exactly its cells, and there is no rim.**
 *
 *  It used to keep a bare ring outside the lattice to be taken hold of by. Two
 *  grids in cells next to each other then overlapped by a ring each — a grid is
 *  a region of the layer's lattice, and a region that reaches past its own
 *  cells cannot sit beside another one. What takes its place as somewhere to
 *  grab is the grid's own border, which is inside its cells and so belongs to
 *  nobody else.
 *
 *  Where one cell of the **layer's** lattice sits.
 *
 *  **The lattice is the layer's, anchored at its origin**, and a group is a
 *  named region of it rather than a lattice of its own. Everything measured
 *  from one origin at one size is what lets a card the layer placed and a card
 *  seated in a group line up — and what lets the backdrop draw the lines once
 *  for both. Addresses are signed: the layer grows in every direction. */
export function lattice_box(r: number, c: number, rows = 1, cols = 1): Box {
  return { x: c * CELL.w, y: r * CELL.h, w: cols * CELL.w, h: rows * CELL.h };
}

/** Where a group's corner goes: **the nearest unit, not the nearest cell.**
 *
 *  It used to round to a whole cell, back when the guides were ruled at cell
 *  spacing and that was the only offset at which a grid's own cells fell on
 *  drawn lines. The guides are unit squares now, and a grid's cells are a whole
 *  number of units across — so its lines land on drawn lines at *every* unit
 *  offset, and rounding to a cell only meant a grid could not be nudged.
 *
 *  **Coarser than a card, and on purpose.** A card lands on the fine grid,
 *  which is half a unit; a grid is measured in units, so half of one would put
 *  every cell in it off the ruling. */
export function grid_snap(at: Point): Point {
  return { x: Math.round(at.x / UNIT) * UNIT, y: Math.round(at.y / UNIT) * UNIT };
}

/** The grid a swept rectangle asks for: **a corner where you started, and a
 *  whole number of cells to cover what you drew over.**
 *
 *  The corner rounds to a unit like any other grid's, so a sweep puts one where
 *  you drew it rather than at the nearest cell of a lattice nobody can see —
 *  the guides are unit squares, and cell boundaries are not drawn. The extent
 *  is still whole cells, because a cell is the thing a grid is made of. */
export function swept_cells(box: Box): { x: number; y: number; rows: number; cols: number } {
  const at = grid_snap(box);
  return { ...at,
           rows: Math.max(1, Math.round(box.h / CELL.h)),
           cols: Math.max(1, Math.round(box.w / CELL.w)) };
}

/** A box grown out to whole cells of the layer's lattice.
 *
 *  **A room is a whole number of cells.** Its walls fall on lines the lattice
 *  already draws rather than through the middle of a cell, so the ruling reads
 *  as the room's own measure and a wall never cuts a cell in half. Grown
 *  outward on every side — a room is never made smaller to make it fit. */
export function roomed(box: Box): Box {
  const x = Math.floor(box.x / CELL.w) * CELL.w;
  const y = Math.floor(box.y / CELL.h) * CELL.h;
  return { x, y,
           w: Math.ceil((box.x + box.w - x) / CELL.w) * CELL.w,
           h: Math.ceil((box.y + box.h - y) / CELL.h) * CELL.h };
}

/** How many cells a thing of this size needs. **A block is one**, and anything
 *  drawn bigger — a container, a note somebody resized, a grid — claims as
 *  many as it covers rather than being squeezed into one. */
export function span_of(s: Size): { rows: number; cols: number } {
  return { rows: Math.max(1, Math.ceil(s.h / CELL.h)),
           cols: Math.max(1, Math.ceil(s.w / CELL.w)) };
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
 *  resize**: one in a merged region larger than it sits in the middle of it. */
export function centred_in(box: Box, s: Size): Box {
  return { x: box.x + (box.w - s.w) / 2, y: box.y + (box.h - s.h) / 2, ...s };
}

/** Onto the fine grid — half a unit, which is what the backdrop dots mark and
 *  what a hand placement lands on. */
export function snap(n: number): number {
  return Math.round(n / STEP) * STEP;
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
