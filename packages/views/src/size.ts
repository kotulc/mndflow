/** How big a thing is, before anything is placed.
 *
 *  Cards are as small as their contents allow. Nothing is held back for text
 *  that might arrive; a name too long for its card is clipped. */

import { covers, is_container, is_grid, is_interface,
         type Block, type Graph, type Id } from "@mnd/core";

/** Everything with a place of its own lands on this. The backdrop dots are it. */
export const GRID = 24;

/** Seats fall every half cell, never on a corner. */
export const SEAT = GRID / 2;

export type Size = { w: number; h: number };

/** **The cell is the unit, and a block is what fits in one.**
 *
 *  A cell is fixed — never sized to what lands in it, never auto-fit — and a
 *  block is a cell less a margin on every side, so a block seated in a cell
 *  sits centred with air all round it. Both are whole numbers of grid steps,
 *  which is what keeps everything on the backdrop dots. */
export const CELL: Size = { w: GRID * 8, h: GRID * 3 };

/** How much air a block leaves inside its cell, on every side. */
export const MARGIN = GRID / 2;

export const BLOCK: Size = { w: CELL.w - MARGIN * 2, h: CELL.h - MARGIN * 2 };

/** **Two cells' worth of height, less the same margin.** A container needs more
 *  room than a block and gets it by spanning rather than by shrinking to fit —
 *  so its edges keep their real length, and the seats along them stay
 *  proportional instead of crowding. */
export const CONTAINER: Size = { w: BLOCK.w, h: CELL.h * 2 - MARGIN * 2 };

/** The room a container's picture of itself gets: exactly how much taller a
 *  container is than a block, so the name above it keeps a block's worth. */
export const BAND: Size = { w: CONTAINER.w, h: CONTAINER.h - BLOCK.h };

/** An interface is smaller than a seat is wide, so two never touch. */
export const PORT: Size = { w: 11, h: 11 };

export type Box = { x: number; y: number; w: number; h: number };

/** What a grid takes up: its extent, in cells. A boundary has no extent and
 *  takes its bounds from its members instead. */
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

/** A block of this size, centred in the cell it was given. **Blocks never
 *  resize**: one in a merged region larger than it sits in the middle of it. */
export function centred_in(box: Box, s: Size): Box {
  return { x: box.x + (box.w - s.w) / 2, y: box.y + (box.h - s.h) / 2, ...s };
}

export function snap(n: number): number {
  return Math.round(n / GRID) * GRID;
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
  return is_container(graph, id) ? { ...CONTAINER } : { ...BLOCK };
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
