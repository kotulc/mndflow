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

import { children, edges_in, is_interface, owner_of, shown_name,
         type Graph, type Id } from "@mnd/core";
import { GRID } from "@mnd/layout";
import type { Config } from "./block";
import { link_of, trail_of } from "./derive";
import type { Box, Hit, Scene, Slot } from "./scene";

const CELL = GRID * 2;
const HEAD = GRID * 6;

/** `types` is the module's to fill: a matrix filters by relationship type. */
const SLOTS: readonly Slot[] = ["types", "relations"];

/** Project a layer through the matrix view. */
export function project(graph: Graph, layer: Id | null, _config: Config = {}): Scene {
  const axis = children(graph, layer).filter((b) => !is_interface(b)).map((b) => b.id);
  const links = related(graph, layer);

  const width = HEAD + axis.length * CELL;
  const height = HEAD + axis.length * CELL;
  const left = -width / 2;
  const top = -height / 2;

  /** The columns run along the top and the rows down the side, both naming the
   *  same axis — everything a view shows is a reference, an axis label alike.
   *  **A column label is turned**: a cell is as wide as a mark needs to be and
   *  a name is not, so the one that has to fit sideways is read sideways. */
  const heads: Box[] = [
    ...axis.map((id, n): Box => ({
      id: `column:${id}`, x: left + HEAD + n * CELL, y: top, w: CELL, h: HEAD,
      label: shown_name(graph, id), link: link_of(graph, id),
      marks: ["header", "turned"],
    })),
    ...axis.map((id, n): Box => ({
      id: `row:${id}`, x: left, y: top + HEAD + n * CELL, w: HEAD, h: CELL,
      label: shown_name(graph, id), link: link_of(graph, id), marks: ["header"],
    })),
  ];

  const cells: Box[] = [];
  axis.forEach((row, r) => {
    axis.forEach((col, c) => {
      const link = links.get(`${row}|${col}`);
      cells.push({
        id: `${row}:${col}`,
        x: left + HEAD + c * CELL, y: top + HEAD + r * CELL, w: CELL, h: CELL,
        label: link ? name_of(graph, link) : "",
        marks: link ? ["cell", "filled"] : ["cell"],
      });
    });
  });

  const drawn = [...heads, ...cells];
  return {
    layer,
    boxes: drawn,
    routes: [],
    slots: SLOTS,
    /** An axis label answers as the block it names; a cell answers as itself,
     *  because relating two things is what a click on one is asking for. */
    hits: drawn.map((b): Hit => ({
      on: b.id,
      kind: b.marks.includes("cell") ? "field" : "box",
      region: { x: b.x, y: b.y, w: b.w, h: b.h },
    })),
    bounds: { w: width + GRID * 2, h: height + GRID * 2 },
    trail: trail_of(graph, layer),
  };
}

/** Which pairs a relationship runs between, by the ends as drawn — so a
 *  relationship seated on an interface marks the cell of the card it sits on.
 *  Undirected, both ways: a matrix cell says *related*, not *which way*. */
function related(graph: Graph, layer: Id | null): Map<string, Id> {
  const out = new Map<string, Id>();
  for (const e of edges_in(graph, layer)) {
    const from = owner_of(graph, e.from);
    const to = owner_of(graph, e.to);
    if (!out.has(`${from}|${to}`)) out.set(`${from}|${to}`, e.id);
    if (!out.has(`${to}|${from}`)) out.set(`${to}|${from}`, e.id);
  }
  return out;
}

/** What a filled cell says: the relationship's type where it names one, and a
 *  mark where it does not. */
function name_of(graph: Graph, edge: Id): string {
  const type = graph.edges[edge]?.type;
  return (type ? graph.defs[type]?.name : undefined) ?? "×";
}
