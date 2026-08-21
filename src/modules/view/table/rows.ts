/** Layer → row list. The table's composition half.
 *
 *  A layer's blocks and references become rows; how one draws is the module's,
 *  not a second kind of thing. Groups and notes stay off this list — they are
 *  drawn on a plane, not as entries in the structure. */

import { blocksOf, isReference, nameOf, typeName } from "../../../graph/fold";
import type { Element, Graph } from "../../../graph/types";

/** One line in the table: the member, and whether it stands in for another. */
export type Row = {
  id: string;
  name: string;
  /** Subtype chip text. Empty when the member is a reference or has none. */
  type: string;
  form: "block" | "proxy";
  /** The element as held — for hosts that need more than the drawn cells. */
  node: Element;
};

/** Every block and reference in the layer, as rows, in tree order. */
export function rowsOf(graph: Graph, layer: string | null): Row[] {
  return blocksOf(graph, layer).map((node) => {
    const reference = isReference(node);

    return {
      id: node.id,
      name: nameOf(graph, node),
      type: reference ? "" : typeName(graph, node.type),
      form: reference ? "proxy" : "block",
      node,
    };
  });
}
