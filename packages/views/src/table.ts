/** The table view: rows and no frame.
 *
 *  A layer read as a list — one row per thing it holds, and **a column per
 *  field the rows carry**. Nothing about it is stored: the columns are what the
 *  rows actually say, so filling in a field on one block adds a column to every
 *  table that block appears in.
 *
 *  A table has rows, so of the three composition jobs it takes the grouping and
 *  the order and drops the spacing. */

import { children, is_interface, shown_name, type Graph, type Id } from "@mnd/core";
import { GRID } from "@mnd/views";
import type { Config } from "./block";
import { link_of, marks_of, trail_of } from "./derive";
import { cell, type BoxNode, type Scene, type Slot } from "./scene";

const ROW = GRID * 1.5;
const NAME = GRID * 8;
const CELL = GRID * 5;

/** `types` is the module's to fill: a table filters by definition name. */
const SLOTS: readonly Slot[] = ["columns", "types"];

/** Project a layer through the table view — or, where the caller said what to
 *  show, that set instead. **One seam**: a view block holds its rows, and a
 *  filter hands the same list without a block to hold it. */
export function project(graph: Graph, layer: Id | null, config: Config = {}): Scene {
  const shown = config.holds
    ? config.holds.map((id) => graph.blocks[id]).filter((b) => !!b)
    : children(graph, layer);
  const rows = shown.filter((b) => !is_interface(b));
  const cols = columns_of(graph, rows.map((b) => b.id));

  const width = NAME + (cols.length - 1) * CELL;
  const height = (rows.length + 1) * ROW;
  const left = -width / 2;
  const top = -height / 2;
  const at = (n: number) => left + (n === 0 ? 0 : NAME + (n - 1) * CELL);
  const wide = (n: number) => (n === 0 ? NAME : CELL);

  /** The head names the columns and answers a click on one, which is what a
   *  sort is asked for by. */
  const head: BoxNode[] = cols.map((name, n) =>
    cell(`column:${name}`, { x: at(n), y: top, w: wide(n), h: ROW },
         { label: name, marks: ["header"] }));

  const body: BoxNode[] = [];
  rows.forEach((b, r) => {
    const y = top + (r + 1) * ROW;
    body.push(cell(b.id, { x: at(0), y, w: NAME, h: ROW },
                   { label: shown_name(graph, b.id), def: b.type,
                     link: link_of(graph, b.id), marks: marks_of(graph, b.id) }));
    cols.slice(1).forEach((name, n) => {
      const said = (b.fields ?? []).find((f) => f.name === name);
      body.push(cell(`${b.id}:${name}`, { x: at(n + 1), y, w: CELL, h: ROW },
                     { label: said?.value ?? "", marks: ["cell"] }));
    });
  });

  return {
    layer,
    nodes: [...head, ...body],
    edges: [],
    slots: SLOTS,
    trail: trail_of(graph, layer),
  };
}

/** The columns: the name every row has, then every field any row carries, in
 *  the order they are first met. **What the rows say**, and nothing else. */
function columns_of(graph: Graph, rows: readonly Id[]): string[] {
  const out = ["name"];
  for (const id of rows) {
    for (const f of graph.blocks[id]?.fields ?? []) {
      if (!out.includes(f.name)) out.push(f.name);
    }
  }
  return out;
}
