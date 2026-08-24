/** How a behavior layer is read.
 *
 *  **One layer, three readings.** They are not three models and not three
 *  modules: `block` is any planar projection, and a view definition names the
 *  reading. What differs is what a block means and what a lane becomes — a band
 *  across the flow, a column with a lifeline down it, or nothing at all,
 *  because a machine is about one thing changing rather than several things
 *  taking part.
 *
 *  **The lane is the same derivation in all three**: one per referenced
 *  participant, known by construction because the action already holds the
 *  reference. That is why one module carries all three.
 *
 *  The rules in full are behaviors.md. */
import { type Graph, type Id, type Reading, type Relation } from "@mnd/core";
import { type Placed } from "@mnd/layout";
/** A lane: a band across an activity, a column in a sequence, and nothing at
 *  all in a state. One per participant, named through the reference. */
export type Band = Placed & {
    label: string;
    of: Id | null;
};
/** What a count of relationships draws. Nobody touches one — it is a rendering
 *  of a number rather than something somebody named. */
export type Control = Placed & {
    kind: "fork" | "join" | "decision" | "merge";
};
export type Read = {
    spots: Placed[];
    bands: Band[];
    /** What a sequence hangs its occurrences on. Empty in the other two. */
    lines: Placed[];
    controls: Control[];
    /** The relations to route, re-pointed through whatever control they pass. */
    links: Relation[];
};
/** Whether this layer is read as a behavior, and how.
 *
 *  A reading is how you look and never something inferred, so what is asked for
 *  wins — and a behavior layer nobody has asked about reads as an activity. */
export declare function reading_of(graph: Graph, layer: Id | null, want?: Reading): Reading | null;
/** Read the layer: place its actions, derive its lanes, and count its
 *  controls. Everything here is derived and nothing is stored. */
export declare function read(graph: Graph, layer: Id | null, how: Reading, down: boolean): Read;
