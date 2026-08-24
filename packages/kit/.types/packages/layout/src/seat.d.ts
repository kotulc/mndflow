/** Where an interface sits, and where a drag would put it.
 *
 *  An interface is **seated** on its owner's edge rather than laid out beside
 *  it: a side and a fraction along it, so the seat survives the owner moving,
 *  growing or being arranged some other way. */
import { type Graph, type Side } from "@mnd/core";
import type { Placed } from "./arrange";
export type Spot = {
    x: number;
    y: number;
};
export type Seat = {
    side: Side;
    at: number;
};
export type Rect = {
    x: number;
    y: number;
    w: number;
    h: number;
};
/** Every interface drawn in this layer, seated on the card it belongs to. */
export declare function seated(graph: Graph, spots: readonly Placed[]): Placed[];
/** The box an interface takes: straddling the edge, centred on its seat. */
export declare function at_seat(on: Placed, seat: Seat): Rect;
/** Which seat a point asks for: the nearest edge, and the seat along it the
 *  point falls closest to. Seats are discrete, so a slide lands somewhere it
 *  can be landed on again. */
export declare function nearest_seat(on: Placed, at: Spot): Seat;
/** Which wall a point asks a relationship's end to leave by. The nearest edge
 *  of the card it lands on, and nothing else — an end has no fraction. */
export declare function nearest_wall(on: Placed, at: Spot): Side;
