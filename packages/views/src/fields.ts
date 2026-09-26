/** A layer's fields, drawn as a class diagram.
 *
 *  A projection, never an edit: the same graph with one layer drawn another way, so it opens in the
 *  layer's own frame and navigates as the layer does. The schema is one class card standing for its
 *  definition, on top; its instances are cards in rows under it listing their values, each with a
 *  dashed *instance of* line up to the class. An instance is a block typed by the schema, which
 *  keeps its id, so a pick on one is a pick on the block it is — or a line of a grid the schema
 *  heads, drawn as a card for as long as the diagram is. */

import { children, holders_in, lattice_of, schema_def, schema_of, type Block, type Graph,
         type Id, type Relation } from "@mnd/core";
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


/** The graph with this layer drawn as its fields' diagram, or null where it holds no usages of a
 *  schema. Everything outside the layer is left as it was. */
export function fields_graph(graph: Graph, layer: Id): Graph | null {
  const def = schema_def(graph, layer);
  const uses = def ? [...children(graph, layer).filter((b) => b.type === def),
                      ...holders_in(graph, layer).filter((h) => lattice_of(graph, h.id)?.schema === def)
                        .flatMap((grid) => lines(graph, grid, def))] : [];
  if (!def || !uses.length) return null;
  const top = `${CLASS}${def}`;
  const blocks: Record<Id, Block> = { ...graph.blocks };
  /** Whatever else the layer held stands aside while the diagram is drawn. */
  for (const b of children(graph, layer)) delete blocks[b.id];
  blocks[layer] = { ...blocks[layer]!, arrangement: "free" };
  blocks[top] = { id: top, parent: layer, of: def, name: graph.defs[def]!.name, order: 0,
                  looks: CLASS_LOOK };
  /** And so do the lines meeting it. */
  const edges: Record<Id, Relation> = Object.fromEntries(Object.entries(graph.edges)
    .filter(([, e]) => blocks[e.from] && blocks[e.to]));
  uses.forEach((use, n) => {
    blocks[use.id] = { ...use, order: n + 1, looks: LISTED };
    const line = `instance:${use.id}`;
    edges[line] = { id: line, from: use.id, to: top, type: "line", dir: "forward",
                    looks: INSTANCE };
  });
  const drawn: Graph = { ...graph, blocks, edges };
  return { ...drawn, blocks: placed(drawn, top, uses.map((use) => use.id)) };
}

/** The definition a diagram's class card stands for, or null for any other id. */
export function class_def(id: Id): Id | null {
  return id.startsWith(CLASS) ? id.slice(CLASS.length) : null;
}

/** A grid's lines under its header, each as a block of the schema: named by its first cell, and
 *  carrying a value per field. */
function lines(graph: Graph, grid: Block, def: Id): Block[] {
  const fields = schema_of(graph, def);
  return (lattice_of(graph, grid.id)!.values ?? []).slice(1).map((row, n) => ({
    id: `${grid.id}:${n + 1}`, parent: grid.parent, type: def, name: bare(row[0] ?? ""),
    fields: fields.map(({ name, form }, c) => ({ name, form, value: row[c] ?? "" })),
  }));
}

/** A cell's words as a name: a link keeps its text, and emphasis and code marks go. */
function bare(cell: string): string {
  return cell.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*_~]+/g, "").trim();
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
