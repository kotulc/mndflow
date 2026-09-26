/** A block's fields, drawn as a class diagram.
 *
 *  A projection, never an edit: a graph of its own, drawn instead of the layer. The schema is one
 *  class card standing for its definition, on top; the usages are cards in rows under it listing
 *  their values, each with a dashed *instance of* line up to the class. Usages keep their ids, so a
 *  pick on one is a pick on the block it is. */

import { children, schema_def, type Block, type Graph, type Id, type Relation } from "@mnd/core";
import { size_of, snap, GAP } from "./size";

/** What every card in the diagram asks of its look: its fields, listed. */
const LISTED = { card: { fields: "show" } };

/** The class card reads as a heading over its usages: solid, and named in bold at full contrast. */
const CLASS_LOOK = {
  ...LISTED, style: { fill: "solid", name_weight: "bold", name_contrast: "full" },
};

/** An instance's line: dashed, an open head at the class, and no name of its own. */
const INSTANCE = { line: { to_arrow: "open", name: "hide" }, style: { border_style: "dashed" } };

/** The class card's id is its definition's, under this prefix. */
const CLASS = "class:";

/** How many usages sit side by side before the next row starts. */
const ACROSS = 4;


/** The diagram for a block or a definition, or null where there is no schema to draw. A block
 *  that answers a schema draws with it; one that holds usages draws them; a definition draws all
 *  of its usages. */
export function fields_graph(graph: Graph, id: Id): Graph | null {
  const def = schema_def(graph, id);
  if (!def) return null;
  const root = graph.blocks[graph.root]!;
  const top = `${CLASS}${def}`;
  const blocks: Record<Id, Block> = {
    [root.id]: { ...root, name: `${graph.defs[def]!.name} · fields`, arrangement: "free" },
    [top]: { id: top, parent: root.id, of: def, name: graph.defs[def]!.name, order: 0,
             looks: CLASS_LOOK },
  };
  const edges: Record<Id, Relation> = {};
  const uses = usages(graph, id, def);
  uses.forEach((use, n) => {
    const { x: _x, y: _y, ...rest } = use;
    blocks[use.id] = { ...rest, parent: root.id, order: n + 1, looks: LISTED };
    const line = `instance:${use.id}`;
    edges[line] = { id: line, from: use.id, to: top, type: "line", dir: "forward",
                    looks: INSTANCE };
  });
  const drawn: Graph = { ...graph, blocks, edges, holders: {} };
  return { ...drawn, blocks: placed(drawn, top, uses.map((use) => use.id)) };
}

/** The definition a diagram's class card stands for, or null for any other id. */
export function class_def(id: Id): Id | null {
  return id.startsWith(CLASS) ? id.slice(CLASS.length) : null;
}

/** The class centred over its usages, and the usages in rows of `ACROSS` under it. */
function placed(graph: Graph, top: Id, uses: Id[]): Record<Id, Block> {
  const blocks = { ...graph.blocks };
  const size = (id: Id) => size_of(graph, id);
  const w = Math.max(0, ...uses.map((use) => size(use).w));
  const step = w + GAP * 2;
  const wide = Math.min(uses.length, ACROSS) * step - GAP * 2;

  /** Air enough between the class and its usages for the lines to read as lines. */
  let y = size(top).h + GAP * 3;
  for (let at = 0; at < uses.length; at += ACROSS) {
    const row = uses.slice(at, at + ACROSS);
    row.forEach((use, n) => { blocks[use] = { ...blocks[use]!, x: n * step, y }; });
    y += Math.max(...row.map((use) => size(use).h)) + GAP * 2;
  }
  blocks[top] = { ...blocks[top]!, x: snap((wide - size(top).w) / 2), y: 0 };
  return blocks;
}

/** What is drawn under the class: the block itself, what it holds, or everything typed by it. */
function usages(graph: Graph, id: Id, def: Id): Block[] {
  const b = graph.blocks[id];
  if (!b) return Object.values(graph.blocks).filter((x) => x.type === def);
  if (b.type === def) return [b];
  return children(graph, id).filter((x) => x.type === def);
}
