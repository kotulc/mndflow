/** The table view: rows and no frame.
 *
 *  A layer read as a list — one row per thing it holds, and **a column per
 *  field the rows carry**. Nothing about it is stored: the columns are what the
 *  rows actually say, so filling in a field on one block adds a column to every
 *  table that block appears in.
 *
 *  A table has rows, so of the three composition jobs it takes the grouping and
 *  the order and drops the spacing. */
import { type Graph, type Id } from "@mnd/core";
import type { Config } from "./block";
import type { Scene } from "./scene";
/** Project a layer through the table view. */
export declare function project(graph: Graph, layer: Id | null, _config?: Config): Scene;
