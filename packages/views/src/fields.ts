/** A block's fields, drawn as a class diagram.
 *
 *  A projection, never an edit: a graph of its own, drawn instead of the layer. The schema is one
 *  class card standing for its definition; the usages are cards beside it listing their values.
 *  Usages keep their ids, so a pick on one is a pick on the block it is. */

import { children, schema_def, type Block, type Graph, type Id } from "@mnd/core";

/** What every card in the diagram asks of its look: its fields, listed. */
const LISTED = { card: { fields: "show" } };

/** The class card's id is its definition's, under this prefix. */
const CLASS = "class:";


/** The diagram for a block or a definition, or null where there is no schema to draw. A block
 *  that answers a schema draws with it; one that holds usages draws them; a definition draws all
 *  of its usages. Nothing is placed: the layout rows the usages and seats the class beside them. */
export function fields_graph(graph: Graph, id: Id): Graph | null {
  const def = schema_def(graph, id);
  if (!def) return null;
  const root = graph.blocks[graph.root]!;
  const blocks: Record<Id, Block> = {
    [root.id]: { ...root, name: `${graph.defs[def]!.name} · fields` },
    [`${CLASS}${def}`]: { id: `${CLASS}${def}`, parent: root.id, of: def,
                          name: graph.defs[def]!.name, order: 0, looks: LISTED },
  };
  usages(graph, id, def).forEach((use, n) => {
    const { x: _x, y: _y, ...rest } = use;
    blocks[use.id] = { ...rest, parent: root.id, order: n + 1, looks: LISTED };
  });
  return { ...graph, blocks, edges: {}, holders: {} };
}

/** The definition a diagram's class card stands for, or null for any other id. */
export function class_def(id: Id): Id | null {
  return id.startsWith(CLASS) ? id.slice(CLASS.length) : null;
}

/** What is drawn under the class: the block itself, what it holds, or everything typed by it. */
function usages(graph: Graph, id: Id, def: Id): Block[] {
  const b = graph.blocks[id];
  if (!b) return Object.values(graph.blocks).filter((x) => x.type === def);
  if (b.type === def) return [b];
  return children(graph, id).filter((x) => x.type === def);
}
