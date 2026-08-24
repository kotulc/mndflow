/** The `base` package: one definition per block module, shipped and locked.
 *
 *  The engine needs a floor — something to draw and place a block that names
 *  no type — and it gets one as definitions it knows by id rather than as a
 *  closed set of engine-side sorts. It is **open**: shipping one more is an
 *  additive change, not a closed set being widened.
 *
 *  The engine may key off one of these only for **how a block draws and where
 *  it sits**. Never for what it is, and never for what may contain what. */
import { type Definition } from "@mnd/core";
/** Nine, and every package or project subtype extends one of them. */
export declare const BASE: Definition[];
/** The behavior vocabulary: `action` and `state` extend the base behavior
 *  definition and carry the verb its usages are named by. **Definitions, never
 *  modules** — doing against being is the vocabulary, not the shape. */
export declare const BEHAVIOR: Definition[];
/** The six views, as definitions. **A reading is a view definition, never a
 *  module**: `block` is any planar projection and the reading says how to look
 *  at it, which is why three of these name the same module. */
export declare const VIEWS: Definition[];
/** The two relation definitions the base ships, so an untyped line still
 *  resolves to something with a name. */
export declare const RELATIONS: Definition[];
export declare const ALL: Definition[];
export declare function by_id(id: string): Definition | null;
/** The base package as mutations, so it arrives through the same door as
 *  everything else rather than being spliced into a graph. */
export declare function seed(): {
    op: "set_def";
    def: Definition;
}[];
