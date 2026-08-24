/** How big a thing is, before anything is placed.
 *
 *  Cards are as small as their contents allow. Nothing is held back for text
 *  that might arrive; a name too long for its card is clipped. */
import { type Graph, type Id } from "@mnd/core";
/** Everything with a place of its own lands on this. The backdrop dots are it. */
export declare const GRID = 24;
/** Seats fall every half cell, never on a corner. */
export declare const SEAT: number;
export type Size = {
    w: number;
    h: number;
};
/** One grid row plus half a row of margin. */
export declare const BLOCK: Size;
/** Three rows plus the same, so a block's middle and a container's middle are
 *  one cell apart and grid steps can bring them level. */
export declare const CONTAINER: Size;
/** An interface is smaller than a seat is wide, so two never touch. */
export declare const PORT: Size;
export declare function snap(n: number): number;
/** What this block needs. A note keeps whatever size it was asked for. */
export declare function size_of(graph: Graph, id: Id): Size;
/** How many seats an edge of this length offers. A small card offering few
 *  places is the card being small, not the grid being coarse. */
export declare function seats(length: number): number;
/** Where seat `n` of `count` falls along an edge, as a fraction. */
export declare function seat_at(n: number, count: number): number;
