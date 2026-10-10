/** A layer's attributes, drawn as a class diagram.
 *
 *  A projection, never an edit: the same graph with one layer drawn another way, so it opens in the
 *  layer's own frame and navigates as the layer does. The schema is one class card standing for its
 *  definition, on top; its instances are cards in rows under it listing their values, each with a
 *  dashed *instance of* line up to the class. An instance is a block typed by the definition,
 *  which keeps its id, so a pick on one is a pick on the block it is. Every card draws its large
 *  face, its attributes shown. */

import { children, schema_def, type Block, type Graph, type Id, type Relation } from "@mnd/core";
import { in_rows, on_grid } from "./grid";
import { size_of, GAP } from "./size";

/** What every card in the diagram asks of its look: its attributes, shown. */
const LISTED = { card: { shows: ["attributes"] } };

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


/** The graph with this layer drawn as its attributes' diagram, or null where it holds no usages
 *  of a definition with attributes. Everything outside the layer is left as it was. */
export function fields_graph(graph: Graph, layer: Id): Graph | null {
  const def = schema_def(graph, layer);
  const uses = def ? children(graph, layer).filter((b) => b.type === def) : [];
  if (!def || !uses.length) return null;
  const top = `${CLASS}${def}`;
  const blocks: Record<Id, Block> = { ...graph.blocks };
  /** Whatever else the layer held stands aside while the diagram is drawn. */
  for (const b of children(graph, layer)) delete blocks[b.id];
  const at = blocks[layer]!;
  blocks[layer] = { ...at, settings: { ...at.settings, layout: { kind: "free", face: "large" } } };
  blocks[top] = { id: top, parent: layer, of: def, name: graph.blocks[def]!.name, order: 0,
                  settings: CLASS_LOOK };
  /** And so do the lines meeting it. */
  const edges: Record<Id, Relation> = Object.fromEntries(Object.entries(graph.edges)
    .filter(([, e]) => blocks[e.from] && blocks[e.to]));
  uses.forEach((use, n) => {
    blocks[use.id] = { ...use, order: n + 1, settings: LISTED };
    const line = `instance:${use.id}`;
    edges[line] = { id: line, from: use.id, to: top, type: "line", dir: "forward",
                    settings: INSTANCE };
  });
  const drawn: Graph = { ...graph, blocks, edges };
  return { ...drawn, blocks: placed(drawn, top, uses.map((use) => use.id)) };
}

/** The definition a diagram's class card stands for, or null for any other id. */
export function class_def(id: Id): Id | null {
  return id.startsWith(CLASS) ? id.slice(CLASS.length) : null;
}

/** The class centred over its usages, and the usages on the grid under it, `ACROSS` to a row. */
function placed(graph: Graph, top: Id, uses: Id[]): Record<Id, Block> {
  const blocks = { ...graph.blocks };
  const size = (id: Id) => size_of(graph, id);
  const grid = on_grid(in_rows(uses.map((id) => ({ id, ...size(id) })), ACROSS));
  const wide = Math.max(...grid.map((p) => p.x + p.w));
  const below = size(top).h + GAP;
  for (const p of grid) blocks[p.id] = { ...blocks[p.id]!, x: p.x, y: p.y + below };
  blocks[top] = { ...blocks[top]!, x: (wide - size(top).w) / 2, y: 0 };
  return blocks;
}
