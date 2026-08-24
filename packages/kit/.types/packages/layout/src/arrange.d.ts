/** Where everything in a layer sits.
 *
 *  One setting, six values. Four carry a reading direction and two do not.
 *  `free` is the value where hand placement is what draws; every other value
 *  computes, and **nothing is discarded by arranging** — a block's stored
 *  position is always kept, so returning to `free` returns the layout. */
import { type Graph, type Id } from "@mnd/core";
export type Placed = {
    id: Id;
    x: number;
    y: number;
    w: number;
    h: number;
};
/** Tight inside a unit, open between them — what matters is the contrast. */
export declare const GAP: {
    unit: number;
    rank: number;
    member: number;
};
/** Every block drawn in this layer, placed. Interfaces are seated on their
 *  owner rather than laid out, so they are not here. */
export declare function laid(graph: Graph, layer: Id | null): Placed[];
/** Positions are relative to the layer's centre, so a layer stays centred as it
 *  grows in any direction. Exported because anything that places has to end
 *  the same way — a reading included. */
export declare function centred(spots: Placed[]): Placed[];
/** What the whole layer takes up, plus the room a new thing needs.
 *
 *  Positions are centred on the origin, so what is needed is twice the furthest
 *  **edge** from it. Twice the furthest corner plus its own width counts the
 *  same box twice and leaves a layer drawn at a third of the size it could be. */
export declare function bounds(spots: readonly Placed[]): {
    w: number;
    h: number;
};
/** A boundary is its members' bounds plus half a cell — its size is a fact
 *  about what it holds, never something stored. */
export declare function boundary(spots: Placed[], members: Id[]): Placed | null;
