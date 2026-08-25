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

import { children, is_interface, module_of, owner_of, shown_name, stands_for,
         type Graph, type Id } from "@mnd/core";
import { GRID } from "@mnd/layout";
import type { Config } from "./block";
import { link_of, trail_of } from "./derive";
import type { Box, Hit, Scene, Slot } from "./scene";

const CELL = GRID * 2;
const HEAD = GRID * 6;

/** `types` is the module's to fill: a matrix filters by relationship type. */
const SLOTS: readonly Slot[] = ["types", "relations"];

/** What a view shows: what each reference it holds stands for. **Everything a
 *  view shows is a reference**, so an axis is read the same way a projection of
 *  that view would read it. */
function shows(graph: Graph, view: Id): Id[] {
  return children(graph, view).map((b) => stands_for(graph, b.id)?.id ?? b.id);
}

/** The two axes. **A view holds views**, so a layer holding two of them is read
 *  one against the other; holding one is read against itself; holding none is
 *  read against its own contents, which is the common case.
 *
 *  A caller with a set and no block to hold it hands it through `holds`, the
 *  same seam a table takes — so a filtered axis costs nothing new. */
function axes(graph: Graph, layer: Id | null, config: Config): [Id[], Id[]] {
  if (config.holds) return [[...config.holds], [...config.holds]];

  const held = children(graph, layer).filter((b) => module_of(graph, b.id) === "view");
  if (held.length >= 2) return [shows(graph, held[0]!.id), shows(graph, held[1]!.id)];
  if (held.length === 1) {
    const one = shows(graph, held[0]!.id);
    return [one, one];
  }
  const own = children(graph, layer).filter((b) => !is_interface(b)).map((b) => b.id);
  return [own, own];
}

/** Project a layer through the matrix view. */
export function project(graph: Graph, layer: Id | null, config: Config = {}): Scene {
  const [rows, cols] = axes(graph, layer, config);
  const links = related(graph);

  const width = HEAD + cols.length * CELL;
  const height = HEAD + rows.length * CELL;
  const left = -width / 2;
  const top = -height / 2;

  /** The columns run along the top and the rows down the side, both naming the
   *  same axis — everything a view shows is a reference, an axis label alike.
   *  **A column label is turned**: a cell is as wide as a mark needs to be and
   *  a name is not, so the one that has to fit sideways is read sideways. */
  const heads: Box[] = [
    ...cols.map((id, n): Box => ({
      id: `column:${id}`, x: left + HEAD + n * CELL, y: top, w: CELL, h: HEAD,
      label: shown_name(graph, id), link: link_of(graph, id),
      marks: ["header", "turned"],
    })),
    ...rows.map((id, n): Box => ({
      id: `row:${id}`, x: left, y: top + HEAD + n * CELL, w: HEAD, h: CELL,
      label: shown_name(graph, id), link: link_of(graph, id), marks: ["header"],
    })),
  ];

  const cells: Box[] = [];
  rows.forEach((row, r) => {
    cols.forEach((col, c) => {
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
 *  Undirected, both ways: a matrix cell says *related*, not *which way*.
 *
 *  **Every relationship, not the layer's.** Two axes may name things living
 *  anywhere, and what fills a cell is whether the two are joined — never where
 *  somebody happens to be looking. */
function related(graph: Graph): Map<string, Id> {
  const out = new Map<string, Id>();
  for (const e of Object.values(graph.edges).sort((a, b) => a.id.localeCompare(b.id))) {
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
