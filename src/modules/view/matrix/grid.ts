/** Layer → matrix axes and cells. The matrix's composition half.
 *
 *  Both axes are the layer's blocks and references — the same objects a table
 *  would list as rows, read against each other. A cell holds the relationships
 *  that run from the row member to the column member; how one draws is the
 *  module's, not a second kind of thing. */

import { blocksOf, edgesIn, isReference, nameOf, typeName } from "../../../graph/fold";
import type { Edge, Element, Graph } from "../../../graph/types";

/** One label on an axis: a block or a reference in the open layer. */
export type AxisItem = {
  id: string;
  name: string;
  form: "block" | "proxy";
  node: Element;
};

/** What a cell shows: every edge from the row member to the column member. */
export type Cell = {
  row: string;
  col: string;
  /** Relationship type names (or a mark when the type is unnamed). */
  marks: string[];
  edges: Edge[];
};

/** The whole grid for one layer. */
export type Grid = {
  rows: AxisItem[];
  cols: AxisItem[];
  cells: Cell[][];
};

/** One axis item from a layer member. */
function itemOf(graph: Graph, node: Element): AxisItem {
  const reference = isReference(node);

  return {
    id: node.id,
    name: nameOf(graph, node),
    form: reference ? "proxy" : "block",
    node,
  };
}

/** Type chip for a relationship, or a dash when it has none. */
function markOf(graph: Graph, edge: Edge): string {
  return edge.type ? typeName(graph, edge.type) || edge.type : "·";
}

/** Both axes and every cell — N×N over the layer's blocks and references. */
export function gridOf(graph: Graph, layer: string | null): Grid {
  const members = blocksOf(graph, layer);
  const rows = members.map((n) => itemOf(graph, n));
  const cols = [...rows];
  const edges = edgesIn(graph, layer);

  const cells = rows.map((row) =>
    cols.map((col) => {
      const held = edges.filter((e) => e.source === row.id && e.target === col.id);

      return {
        row: row.id,
        col: col.id,
        marks: held.map((e) => markOf(graph, e)),
        edges: held,
      };
    }),
  );

  return { rows, cols, cells };
}
