/** How big a thing is, before anything is placed.
 *
 *  Cards are as small as their contents allow. Nothing is held back for text
 *  that might arrive; a name too long for its card is clipped. */

import { is_container, is_interface, type Graph, type Id } from "@mnd/core";

/** Everything with a place of its own lands on this. The backdrop dots are it. */
export const GRID = 24;

/** Seats fall every half cell, never on a corner. */
export const SEAT = GRID / 2;

export type Size = { w: number; h: number };

/** **Whole units, both ways.** A block is the size of one grid cell, which is
 *  what lets a cell hold exactly one and lets everything land on the backdrop
 *  dots. Two units tall also gives a side three seats rather than two. */
export const BLOCK: Size = { w: GRID * 7, h: GRID * 2 };

/** **Exactly two cells.** A container needs more room than a block and gets it
 *  by spanning rather than by shrinking to fit — so its edges keep their real
 *  length, and the seats along them stay proportional instead of crowding. */
export const CONTAINER: Size = { w: GRID * 7, h: GRID * 4 };

/** The room a container's picture of itself gets: exactly how much taller a
 *  container is than a block, so the name above it keeps a block's worth. */
export const BAND: Size = { w: CONTAINER.w, h: CONTAINER.h - BLOCK.h };

/** An interface is smaller than a seat is wide, so two never touch. */
export const PORT: Size = { w: 11, h: 11 };

export function snap(n: number): number {
  return Math.round(n / GRID) * GRID;
}

/** What this block needs. A note keeps whatever size it was asked for. */
export function size_of(graph: Graph, id: Id): Size {
  const b = graph.blocks[id];
  if (!b) return BLOCK;
  if (is_interface(b)) return PORT;
  if (b.w !== undefined && b.h !== undefined) return { w: b.w, h: b.h };
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
