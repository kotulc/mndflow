/** How a matrix cell paints: hue from the relationship kind, opacity from the
 *  count.
 *
 *  **The hue is never the matrix's own.** It reads the same `styleOf` /
 *  `lookOf` path a route draws from (`modules/style`, `diagram/compose.ts`
 *  mirrors this exact call) — a kind's slot on the ramp, wrapped as a bare
 *  element the way an edge already is for the diagram. So the matrix and the
 *  diagram read one definition and cannot disagree, and there is no second
 *  colour vocabulary to keep in step.
 *
 *  Opacity is not: grading a cell by how many edges of a kind it holds is
 *  presentation local to this view, computed here rather than read off the
 *  style component. */

import { element } from "../../../graph/types";
import type { Edge, Graph } from "../../../graph/types";
import { typeName } from "../../../graph/fold";
import { lookOf, ramp } from "../../style";
import type { Cell } from "./grid";

/** One kind's share of a cell: its hue and how many edges of it are held. */
export type Band = {
  type: string;
  name: string;
  fill: string;
  count: number;
  /** Zero at no edges, climbing toward (never reaching) solid as they add up. */
  opacity: number;
};

/** How opaque a band reads for its count. Asymptotic rather than capped: a
 *  cell with one relationship and a cell with a hundred are both legible,
 *  and neither needs a scale set for the busiest layer in the project. */
function opacityOf(count: number): number {
  return count > 0 ? 1 - 1 / (count + 1) : 0;
}

/** A cell's edges grouped by relationship kind — **`P.9`'s seam**: every kind
 *  present counts today; a chosen subset would filter `cell.edges` before
 *  this groups them, rather than this function growing a second argument. */
function group(edges: Edge[]): Map<string, Edge[]> {
  const groups = new Map<string, Edge[]>();

  for (const edge of edges) {
    const held = groups.get(edge.type);
    if (held) held.push(edge);
    else groups.set(edge.type, [edge]);
  }

  return groups;
}

/** The bands a cell draws, one per relationship kind it holds. */
export function bandsOf(graph: Graph, cell: Cell): Band[] {
  return [...group(cell.edges)].map(([type, edges]) => ({
    type,
    name: typeName(graph, type),
    fill: ramp(lookOf(graph, element("", { type })), "fill"),
    count: edges.length,
    opacity: opacityOf(edges.length),
  }));
}
