/** The view modules. Three, and closed: `block` is any planar projection,
 *  `table` and `matrix` are the two that are not a plane.
 *
 *  **What a consumer needs, and not everything there is.** `read` is how the
 *  block module reads a behavior layer — its own working, reached by nothing
 *  outside this package, and a name `core` already uses for reading a file. */
export * from "./adjust";
export * from "./derive";
export * from "./scene";
export * from "./svg";
export * from "./text";
import { type Config } from "./block";
export type View = {
    name: import("@mnd/core").ViewModule;
    /** What it calls its elementary block — the chip fallback, derived. */
    word: string;
    /** One glyph that means this module and no other. */
    icon: string;
    project: (graph: import("@mnd/core").Graph, layer: import("@mnd/core").Id | null, config?: Config) => import("./scene").Scene;
};
export declare const block: View;
export declare const table: View;
export declare const matrix: View;
export declare function view(name: string): View | null;
export declare function views(): View[];
export type { Config };
