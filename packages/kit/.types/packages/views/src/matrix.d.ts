/** The matrix view: two axes, and the relationships between them.
 *
 *  **A view holds views**, so a matrix's two axes are child views — which is
 *  what makes a filter or a third dimension cost nothing new. A layer that
 *  names none is read against itself, which is the common case: what here
 *  relates to what else here.
 *
 *  Nothing about a cell is stored. A cell is filled where a relationship
 *  already runs between the two things its row and column name, so drawing one
 *  is reading the graph rather than keeping a second copy of it. */
import { type Graph, type Id } from "@mnd/core";
import type { Config } from "./block";
import type { Scene } from "./scene";
/** Project a layer through the matrix view. */
export declare function project(graph: Graph, layer: Id | null, _config?: Config): Scene;
