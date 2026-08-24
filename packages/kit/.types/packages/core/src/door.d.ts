/** The one door a log comes in through.
 *
 *  Every log is checked before it is folded, from storage or from a file. What
 *  can be repaired is repaired; what cannot is dropped rather than folded into
 *  a broken graph. The user is told once, and a clean log says nothing.
 *
 *  **A repair is a step, not a patched graph.** The graph is derived, so
 *  mending one mends nothing — the next fold would undo it. Repairs come back
 *  as ordinary mutations and are appended like any other work, which also makes
 *  them visible and undoable.
 *
 *  A normalisation that carried nothing is not a repair — a false alarm is what
 *  teaches people to ignore the real ones. */
import { type Graph, type Id, type Log, type Mutation } from "./types";
export type Fault = {
    kind: "repaired" | "dropped";
    what: string;
};
export type Checked = {
    log: Log;
    faults: Fault[];
};
/** Read a log in, repairing what it can. */
export declare function check(input: unknown): Checked;
export type Inspection = {
    faults: Fault[];
    repairs: Mutation[];
};
/** What the door enforces. Reports what is wrong and how to mend it, and
 *  changes nothing itself. */
export declare function inspect(graph: Graph): Inspection;
/** What to say, once. Empty when the log was clean. */
export declare function say(faults: Fault[]): string;
/** Names are unique among siblings. Only stored labels compare — a fallback is
 *  a number nobody chose, and blank is not a name. */
export declare function name_taken(graph: Graph, parent: Id | null, label: string, except?: Id): boolean;
