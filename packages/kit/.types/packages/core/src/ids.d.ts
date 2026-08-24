/** Ids are wide enough that a collision means identity, and say what they point at.
 *
 *  A name is never part of an id: it would go stale on a rename, or force the
 *  id to be rewritten everywhere, which is the whole point of having one. */
export declare function new_id(kind: "block" | "edge" | "def" | "step"): string;
/** A definition minted from a name somebody typed, so it settles rather than
 *  churning on every fold. */
export declare function def_id(name: string): string;
