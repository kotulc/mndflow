/** Layer → row list. The table's composition half.
 *
 *  A layer's blocks and proxies become rows; how one draws is the module's,
 *  not a second kind of thing. Groups and notes stay off this list — they are
 *  drawn on a plane, not as entries in the structure. */

import { blocksOf, isProxy, nameOf, typeName } from "../../../graph/fold";
import type { Element, Graph } from "../../../graph/types";

/** One line in the table: the member, and whether it stands in for another. */
export type Row = {
  id: string;
  name: string;
  /** Subtype chip text. Empty when the member is a proxy or has none. */
  type: string;
  form: "block" | "proxy";
  /** The element as held — for hosts that need more than the drawn cells. */
  node: Element;
};

/** Every block and proxy in the layer, as rows, in tree order. */
export function rowsOf(graph: Graph, layer: string | null): Row[] {
  return blocksOf(graph, layer).map((node) => {
    const proxy = isProxy(node);

    return {
      id: node.id,
      name: nameOf(graph, node),
      type: proxy ? "" : typeName(graph, node.type),
      form: proxy ? "proxy" : "block",
      node,
    };
  });
}
