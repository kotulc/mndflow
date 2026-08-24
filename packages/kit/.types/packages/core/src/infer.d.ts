/** How a behavior comes to exist, and what it writes back.
 *
 *  **Guess freely in the behavior. Never guess into the structure.** A wrong
 *  guess in a behavior costs an edit; a wrong guess written into a structure
 *  modifies the truth, invisibly. So the inference is deliberately loose, and
 *  only a fact the structure actually stated is written home.
 *
 *  The rules in full are behaviors.md. */
import { type Graph, type Id, type Mutation } from "./types";
/** Beyond this many actions the inference cuts higher in the tree. A view
 *  definition option rather than an engine constant; this is its default.
 *
 *  Named for what it caps: the log has a cap too, and one word for both would
 *  be the sort of collision the vocabulary rework was about. */
export declare const ABSTRACTION = 5;
/** Which tier the order was read from. Only tier 1 writes home. */
export type Tier = 1 | 2 | 3 | 4;
export type Inference = {
    mutations: Mutation[];
    /** The behavior block that was made. */
    block: Id;
    /** Which tier spoke, so a caller can say what it guessed from. */
    tier: Tier;
    /** The participants, in the order they were read. */
    order: Id[];
};
/** What the selection becomes. **Count is not the discriminator — shape is.** */
export declare function shape(graph: Graph, of: readonly Id[]): Id[];
/** Past the cap, cut higher: a container becomes one action and its children
 *  fold in as detail. Deterministic — the shallowest level whose count is ≤ N. */
export declare function capped(graph: Graph, ids: readonly Id[], n?: number): Id[];
/** Order, read down four tiers. The first that speaks, wins. */
export declare function ordered(graph: Graph, ids: readonly Id[]): {
    order: Id[];
    tier: Tier;
};
/** Turn a selection into **one new top-level behavior block**.
 *
 *  One-way, one-time and deterministic. Nothing appends to an existing
 *  behavior, so an inference can never disturb one somebody has worked on. */
export declare function infer(graph: Graph, of: readonly Id[], n?: number): Inference | null;
/** Which behaviors a block takes part in. **Derived, never stored** — a stored
 *  back-reference would duplicate a fact that already exists and leave an
 *  exported structure pointing at behaviors that did not travel with it. */
export declare function participates(graph: Graph, id: Id): Id[];
