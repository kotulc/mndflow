/** Where a line goes, and the lanes it shares.
 *
 *  There is no manual routing. Every line is worked out from the layer's
 *  arrangement, in one pass, every time it is drawn — so nothing about a line
 *  is stored, and a relationship the terminal added is drawn exactly as well as
 *  one somebody dragged.
 *
 *  One pass, so each line sees the seats the ones before it took: no two ends
 *  share a seat. */
import { type Arrangement, type Relation, type Side } from "@mnd/core";
import type { Placed } from "./arrange";
export type Point = {
    x: number;
    y: number;
};
export type Routed = {
    id: string;
    from: string;
    to: string;
    /** Where the line actually runs. Every elbow is a right angle. */
    points: Point[];
    fromSide: Side;
    toSide: Side;
    /** Which shared run this one was spread onto. Zero is the middle. */
    lane: number;
};
/** Route every relation in one pass. */
export declare function route(spots: Placed[], edges: Relation[], how?: Arrangement): Routed[];
