/** Mutation replay, and the derived readings of a graph.
 *
 *  The graph is thrown away and rebuilt rather than edited, so it can never
 *  drift from the log that produced it — and undo is a refold, so no mutation
 *  needs an inverse. */
import { type Arrangement, type Block, type BlockModule, type Definition, type Graph, type Id, type Log, type Mutation, type Relation, type Step } from "./types";
/** Rebuild the graph from empty by replaying every applied step in order. */
export declare function fold(log: Log): Graph;
/** Every block under this one, itself included. */
export declare function subtree(graph: Graph, id: Id): Id[];
/** **A null layer is the root layer.** One reading, everywhere: nothing else
 *  has `parent: null`, so taking it literally would hand back the root as its
 *  own child. */
export declare function layer_id(graph: Graph, layer: Id | null): Id;
/** The direct children of a layer, in a stable order.
 *
 *  By `num` then id: `num` is fixed at creation, so this reads as the order
 *  things were made, and the id is the tie-break that keeps it deterministic
 *  when two carry the same number. */
export declare function children(graph: Graph, layer: Id | null): Block[];
/** The chain from root down to this block, itself last. */
export declare function path(graph: Graph, id: Id): Block[];
export declare function is_interface(b: Block): boolean;
export declare function is_reference(b: Block): boolean;
/** A block holding blocks draws as a container. Derived, never declared. */
export declare function is_container(graph: Graph, id: Id): boolean;
/** A block no other block contains: the root of a tier's tree.
 *
 *  Read from position and stored nowhere. There is no project type — a
 *  top-level block is informally a *project*, the way a block with children is
 *  informally a container. */
export declare function is_tier_root(graph: Graph, id: Id): boolean;
/** What a reference stands for, followed to the end. */
export declare function stands_for(graph: Graph, id: Id): Block | null;
/** The name to show.
 *
 *  A reference reads its target and a gone target reads *missing*. **A note is
 *  its text**, so it reads its body — there is nothing else on it to name.
 *  **Blank is not a name**: an empty label falls back like an absent one. */
export declare function shown_name(graph: Graph, id: Id): string;
/** A block that says nothing itself and **stands for exactly one thing** is
 *  named after what it stands for, with its definition's verb in front.
 *
 *  This is what gives an inferred action `do Pump` without storing anything: a
 *  structure block is a noun and an action wants a verb, and no reliable
 *  transformation turns one into the other — so nothing is transformed. Typing
 *  over it stores a real name, and that is the only way one gets one.
 *
 *  Null where the block names itself, or stands for more than one thing. */
export declare function derived_name(graph: Graph, id: Id): string | null;
/** The verb a definition calls its usages by. Vocabulary, so a SysML reading
 *  and a plain one can differ without either being stored. */
export declare function word_of(graph: Graph, type: Id | undefined): string;
/** The lowest number not in use among siblings. */
export declare function next_num(graph: Graph, parent: Id | null): number;
/** What an end is **drawn on**. An interface is drawn on its owner, and
 *  everything else on itself — so promoting a relationship's seat to an
 *  interface moves where the line lands without moving which layer it is in. */
export declare function owner_of(graph: Graph, id: Id): Id;
/** Relations with both ends drawn in this layer, an end seated on a child
 *  counting as that child. */
export declare function edges_in(graph: Graph, layer: Id | null): Relation[];
/** The layer's arrangement. `free` is what a layer says nothing about. */
export declare function arrangement_of(graph: Graph, layer: Id | null): Arrangement;
/** Every definition this block may use: filed under any ancestor, nearest first. */
export declare function defs_in_scope(graph: Graph, id: Id): Definition[];
/** Resolve a definition by name from a block's ancestors — nearest wins. */
export declare function resolve_def(graph: Graph, from: Id, name: string): Definition | null;
/** A definition and the chain it extends, nearest first. */
export declare function isa(graph: Graph, type: Id | undefined): Definition[];
/** Which block module interprets this block.
 *
 *  `of` and `side` win because they are what the block *is* doing, whatever it
 *  names; otherwise the nearest definition in the chain that says. */
export declare function module_of(graph: Graph, id: Id): BlockModule;
/** One step, applied. */
export declare function step(id: Id, action: string, at: number, mutations: Mutation[]): Step;
