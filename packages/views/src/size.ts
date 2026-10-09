/** How big a thing is, before anything is placed. */

import { covers, inline, is_grid, is_interface, lattice_of, previewed, setting_of, shown_name, FACES,
         type Graph, type Grid, type Id, type Point } from "@mnd/core";
import { fit_of, face_text, handle_of } from "./face";
import { look_of } from "./look";

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

/** An interface is smaller than a seat is wide, so two never touch. */
export const PORT: Size = { w: SEAT - 1, h: SEAT - 1 };

/** What the default card — the small face — may be set to, in units. */
export const CARD = { min: { w: 4, h: 2 }, max: { w: 12, h: 6 } };

/** The large face, in units: what a definition asks for, or what its content fits, is held under
 *  `max`. */
export const LARGE = { max: { w: 20, h: 16 } };

/** Which face a card draws with. */
export type Face = (typeof FACES)[number];

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

/** One cell of a grid: a card with air round it. */
export function cell_size(_g: Grid): Size {
  return CELL;
}

/** Where line `i` starts along one axis: **the header line is one unit across**, every other a
 *  cell. */
function line_at(i: number, cell: number): number {
  return i === 0 ? 0 : UNIT + (i - 1) * cell;
}

/** What a grid takes up: its extent in cells, and nothing besides. */
export function grid_size(g: Grid): Size {
  const cell = cell_size(g);
  return { w: line_at(g.cols, cell.w), h: line_at(g.rows, cell.h) };
}

/** Where one cell sits inside its grid, relative to the grid's own corner. */
export function cell_box(g: Grid, r: number, c: number): Box {
  const span = g.merges?.find((s) => covers(s, r, c));
  const at = span ?? { r, c, rows: 1, cols: 1 };
  const cell = cell_size(g);
  const x = line_at(at.c, cell.w);
  const y = line_at(at.r, cell.h);
  return { x, y, w: line_at(at.c + at.cols, cell.w) - x, h: line_at(at.r + at.rows, cell.h) - y };
}

/** How many rows and columns a region of this size is, in whole cells. */
export function extent_of(w: number, h: number): { rows: number; cols: number } {
  return { rows: Math.max(1, Math.round(h / CELL.h)),
           cols: Math.max(1, Math.round(w / CELL.w)) };
}

/** How many rows and columns this grid's region of this size is, counting its header lines. */
export function extent_in(g: Grid, w: number, h: number): { rows: number; cols: number } {
  const cell = cell_size(g);
  const lines = (px: number, size: number) => 1 + Math.max(1, Math.round((px - UNIT) / size));
  return { rows: lines(h, cell.h), cols: lines(w, cell.w) };
}

/** A block of this size, centred in the cell it was given. */
export function centred_in(box: Box, s: Size): Box {
  return { x: box.x + (box.w - s.w) / 2, y: box.y + (box.h - s.h) / 2, ...s };
}

/** A header's inset in its cell, which is one unit across. */
export const HEADER_INSET = 2;

export function fills_cell(box: Box): Box {
  const i = HEADER_INSET;
  return { x: box.x + i, y: box.y + i, w: box.w - i * 2, h: box.h - i * 2 };
}

/** Onto the lattice: the nearest whole unit. */
export function snap(n: number): number {
  return Math.round(n / UNIT) * UNIT;
}

/** Sets the default card, in units, held inside `CARD`, and says what it took. Everything the
 *  layout measures derives from these two sizes, so they are rewritten in place, not rebound. */
export function set_card(w: number, h: number): Size {
  UNITS.block = { w: ranged(w, CARD.min.w, CARD.max.w), h: ranged(h, CARD.min.h, CARD.max.h) };
  BLOCK.w = UNITS.block.w * UNIT;
  BLOCK.h = UNITS.block.h * UNIT;
  CELL.w = BLOCK.w + GAP * 2;
  CELL.h = BLOCK.h + GAP * 2;
  return { ...UNITS.block };
}

/** A whole number, held between two others. */
function ranged(n: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, Math.round(n)));
}

/** Whether a block is seated in a grid rather than placed beside one. */
export function gridded(graph: Graph, id: Id): boolean {
  const b = graph.blocks[id];
  return !!b?.cell && is_grid(graph, b.parent ?? undefined);
}

/** What this block needs: the size of the face it draws with — the one card size small, its
 *  definition's large — or what it was given, where its card keeps that. A grid drawn open is the
 *  extent it was drawn with. */
export function size_of(graph: Graph, id: Id, face: Face = face_of(graph, id)): Size {
  /** An open grid is its extent, a closed one a card; a boundary is sized from what it holds, by
   *  the caller. */
  if (is_grid(graph, id) && inline(graph, id)) return grid_size(lattice_of(graph, id)!);
  const b = graph.blocks[id];
  if (!b) return BLOCK;
  if (is_interface(b)) return PORT;
  if (b.w !== undefined && b.h !== undefined && free_height(graph, id)) return { w: b.w, h: b.h };
  /** A reference to a block previews it, at its size, with the face where it sits. */
  const source = previewed(graph, id);
  if (source !== id && !is_grid(graph, source)) return size_of(graph, source, face);
  return face === "large" ? large_of(graph, id) : { ...BLOCK };
}

/** Which face a block draws with: what the nearest ancestor saying `layout.face` asks for, else
 *  the small one — always the small one in a grid's cell, which is a card's size. Never the
 *  zoom's. */
export function face_of(graph: Graph, id: Id): Face {
  if (gridded(graph, id)) return "small";
  const seen = new Set<Id>();
  for (let at = graph.blocks[id]?.parent; at && !seen.has(at); at = graph.blocks[at]?.parent) {
    seen.add(at);
    const said = setting_of(graph, at, "layout")["face"];
    if ((FACES as readonly unknown[]).includes(said)) return said as Face;
  }
  return "small";
}

/** The large face: its definition's `card.size`, else what its content fits — so one that shows
 *  nothing is the small face. */
function large_of(graph: Graph, id: Id): Size {
  const look = look_of(graph, id);
  if (look.size) return held_large(look.size);
  return fitted(shown_name(graph, id), face_text(graph, id, look), !!handle_of(graph, id, look));
}

/** The size a large face's name, handle and markdown fit, in whole units. */
export function fitted(name: string, text: string, handle: boolean): Size {
  const { w, h } = fit_of(name, text, handle, LARGE.max.w * UNIT);
  return held_large({ w: Math.ceil(w / UNIT), h: Math.ceil(h / UNIT) });
}

/** A large face's size in units, held between the small face and `LARGE.max`, in pixels. */
function held_large(units: Size): Size {
  return { w: ranged(units.w, UNITS.block.w, LARGE.max.w) * UNIT,
           h: ranged(units.h, UNITS.block.h, LARGE.max.h) * UNIT };
}

/** Whether this card keeps whatever size it was given, rather than the one card height. */
export function free_height(graph: Graph, id: Id): boolean {
  return look_of(graph, id).height === "free";
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
