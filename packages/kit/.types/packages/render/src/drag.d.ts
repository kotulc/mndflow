/** What a left drag on the stage means.
 *
 *  A drag is one of four things, told apart by what it set off from: moving a
 *  card, sliding an interface along its edge, taking a picked line's end to
 *  another wall, or sweeping a selection box.
 *  Which it is, is decided at the press and never revised — a gesture that
 *  changes its mind halfway is the aim-and-hope this design is written against.
 *
 *  Nothing here writes: a drag ends as a name and a number, like every other
 *  gesture. */
import type { Hit, Scene } from "@mnd/views";
export type Point = {
    x: number;
    y: number;
};
export type Drag = {
    kind: "move";
    on: string;
    from: Point;
    to: Point;
    over: string | null;
} | {
    kind: "seat";
    on: string;
    to: Point;
} | {
    kind: "wall";
    on: string;
    end: "from" | "to";
    to: Point;
} | {
    kind: "sweep";
    from: Point;
    to: Point;
    caught: string[];
};
/** Under this, a drag is a click. A press that wanders by a pixel is still a
 *  press, which is what keeps a small target hittable. */
export declare const SLOP = 5;
export declare function far_enough(a: Point, b: Point): boolean;
/** What the press landed on, and so what a drag from here would be. */
export declare function begins(hit: Hit | null): Drag["kind"];
/** How near an end has to be grabbed. Half a card's height, so a handle is
 *  hittable without the press wandering onto the card behind it. */
export declare const REACH = 12;
/** Which end of a **picked** line the press took hold of.
 *
 *  Only a picked one: an end sits on the card's edge, so grabbing every line
 *  would make the card unmovable near its own walls. Picking first is the same
 *  two-step every other end-of-line handle asks for. */
export declare function grabbed(scene: Scene, picked: readonly string[], at: Point): {
    on: string;
    end: "from" | "to";
} | null;
/** Everything a swept rectangle encloses. **Wholly** enclosed: catching what a
 *  box merely brushes makes the gesture unpredictable. */
export declare function caught(scene: Scene, from: Point, to: Point): string[];
/** The rectangle a sweep has covered so far, for drawing. */
export declare function swept(from: Point, to: Point): {
    x: number;
    y: number;
    w: number;
    h: number;
};
