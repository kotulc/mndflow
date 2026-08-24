/** The block view: any planar projection.
 *
 *  A layer is what is looked at; this is the looking. It reads the graph and
 *  hands back a Scene — it never writes a mutation and never touches the DOM. */
import { type Graph, type Id, type Reading } from "@mnd/core";
import type { Scene } from "./scene";
export type Config = {
    /** Which reading of a behavior layer, where one applies. */
    reading?: Reading;
    /** Beyond this many, inference cuts higher in the tree. */
    n?: number;
    /** Whether interfaces draw. A display preference the shell hands down. */
    interfaces?: boolean;
};
/** Project a layer through the block view. */
export declare function project(graph: Graph, layer: Id | null, config?: Config): Scene;
