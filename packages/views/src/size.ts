/** How big a thing is, before anything is placed. */

import { covers, is_container, is_grid, is_interface, is_reference, module_of,
         type Block, type Graph, type Id, type Point } from "@mnd/core";

/** The one place the drawing's proportions are set, and the unit is the only measure there is. */
export const UNITS = {
  /** One square of the guides, in pixels. */
  unit: 24,
  /** A block in units: five by two. */
  block: { w: 5, h: 2 },
  /** How far apart the layout sets any two things, in units. */
  gap: 1,
};

/** One square of the guides. Everything lands on this: what the layout places, what a hand drops,
 *  what a grid seats. */
export const UNIT = UNITS.unit;

/** How far apart the layout sets any two things. */
export const GAP = UNITS.gap * UNIT;

/** Seats fall every half unit, never on a corner. */
export const SEAT = UNIT / 2;

export type Size = { w: number; h: number };

export const BLOCK: Size = { w: UNITS.block.w * UNIT, h: UNITS.block.h * UNIT };

/** A group's cell, and the one thing a cell is: a block with a gap of air on every side of it. */
export const CELL: Size = { w: BLOCK.w + GAP * 2, h: BLOCK.h + GAP * 2 };

/** A container: two blocks tall. */
export const CONTAINER: Size = { w: BLOCK.w, h: BLOCK.h * 2 };

/** The room for a container's picture. */
export const BAND: Size = { w: CONTAINER.w, h: CONTAINER.h - BLOCK.h };

/** An interface is smaller than a seat is wide, so two never touch. */
export const PORT: Size = { w: SEAT - 1, h: SEAT - 1 };

export type Box = { x: number; y: number; w: number; h: number };

/** Onto the lattice: the nearest whole unit, in both axes. */
export function on_unit(at: Point): Point {
  return { x: Math.round(at.x / UNIT) * UNIT, y: Math.round(at.y / UNIT) * UNIT };
}

/** The grid a swept rectangle asks for: a corner where you drew it, and the extent that fits what
 *  you drew over. */
export function swept_cells(box: Box): { x: number; y: number; rows: number; cols: number } {
  return { ...on_unit(box), ...extent_of(box.w, box.h) };
}

/** A box grown out to whole units. */
export function roomed(box: Box): Box {
  const x = Math.floor(box.x / UNIT) * UNIT;
  const y = Math.floor(box.y / UNIT) * UNIT;
  return { x, y,
           w: Math.ceil((box.x + box.w - x) / UNIT) * UNIT,
           h: Math.ceil((box.y + box.h - y) / UNIT) * UNIT };
}

/** What a grid takes up: its extent in cells, and nothing besides. */
export function grid_size(g: Block): Size {
  return { w: (g.cols ?? 1) * CELL.w, h: (g.rows ?? 1) * CELL.h };
}

/** Where one cell sits inside its grid, relative to the grid's own corner. */
export function cell_box(g: Block, r: number, c: number): Box {
  const span = g.merges?.find((s) => covers(s, r, c));
  const at = span ?? { r, c, rows: 1, cols: 1 };
  return { x: at.c * CELL.w, y: at.r * CELL.h,
           w: at.cols * CELL.w, h: at.rows * CELL.h };
}

/** How many rows and columns a region of this size is, in whole cells. */
export function extent_of(w: number, h: number): { rows: number; cols: number } {
  return { rows: Math.max(1, Math.round(h / CELL.h)),
           cols: Math.max(1, Math.round(w / CELL.w)) };
}

/** A block of this size, centred in the cell it was given. */
export function centred_in(box: Box, s: Size): Box {
  return { x: box.x + (box.w - s.w) / 2, y: box.y + (box.h - s.h) / 2, ...s };
}

/** A header's inset in its cell. */
export const HEADER_INSET = 5;

export function fills_cell(box: Box): Box {
  const i = HEADER_INSET;
  return { x: box.x + i, y: box.y + i, w: box.w - i * 2, h: box.h - i * 2 };
}

/** Onto the lattice: the nearest whole unit. */
export function snap(n: number): number {
  return Math.round(n / UNIT) * UNIT;
}

/** Whether a block is seated in a grid rather than placed beside one. */
export function gridded(graph: Graph, id: Id): boolean {
  const b = graph.blocks[id];
  return !!b?.cell && !!b.group && is_grid(graph, b.group);
}

/** What this block needs. A note keeps whatever size it was asked for, and a grid is the extent it
 *  was drawn with. */
export function size_of(graph: Graph, id: Id): Size {
  const b = graph.blocks[id];
  if (!b) return BLOCK;
  if (is_interface(b)) return PORT;
  if (is_grid(graph, id)) return grid_size(b);
  if (b.w !== undefined && b.h !== undefined) return { w: b.w, h: b.h };
  if (gridded(graph, id)) return { ...BLOCK };
  return pictured(graph, id) ? { ...CONTAINER } : { ...BLOCK };
}

/** Whether a card draws a picture of what it holds. */
export function pictured(graph: Graph, id: Id): boolean {
  const b = graph.blocks[id];
  return !!b && is_container(graph, id) && !is_reference(b)
    && module_of(graph, id) !== "folder" && !gridded(graph, id);
}

/** How many seats an edge of this length offers. */
export function seats(length: number): number {
  return Math.max(1, Math.floor(length / SEAT) - 1);
}

/** Where seat `n` of `count` falls along an edge, as a fraction. */
export function seat_at(n: number, count: number): number {
  return (n + 1) / (count + 1);
}

/** Absolute positions along an edge, every half unit inset from the corners. */
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
