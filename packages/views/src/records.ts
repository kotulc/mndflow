/** **One generic records table** (docs/diagrams/mapping.md): any block with records draws it, a
 *  mapping being one use. A row each record — reads → writes, then what to know — its left accent
 *  the colour of the definition its first column names; rows grouped by that source under a
 *  plain heading; a qualified name opens its definition. Worked out when drawn, never stored. */

import { def_hits, package_of, steps_of, type Graph, type Id } from "@mnd/core";
import { look_of, tint_attrs, type Tint } from "./look";
import { trail_of } from "./derive";
import { cell, type Scene } from "./scene";

/** One cell: its text and, where its first step names a definition, that definition. */
type Said = { text: string; def?: Id };

/** A records table as drawn: its columns, then its groups of rows by source. */
export type RecordsDrawn = { columns: string[];
                             groups: { source: string; rows: { cells: Said[]; tint?: Tint }[] }[];
                             /** Each column's width, from what it holds. */
                             widths?: number[] };

/** How wide a column reads at least and at most — past it, its text wraps — and each row's and
 *  heading's depth, a wrapped line's, and a glyph's width at the table's type. */
const COL = 160;
const MOST = 380;
const ROW = 26;
const HEAD = 24;
const LINE = 16;
const GLYPH = 7.3;
const AIR = 20;


/** A block's records as its table, in a scene of one node: **each column as wide as its longest
 *  text**, held between `COL` and `MOST`, a longer text wrapping, so nothing is cut. */
export function records_scene(graph: Graph, layer: Id): Scene {
  const table = records_of(graph, layer);
  const all = table.groups.flatMap((g) => g.rows);
  const widths = table.columns.map((c, i) => Math.min(MOST, Math.max(COL,
    ...[c, ...all.map((r) => r.cells[i]?.text ?? "")].map((t) => t.length * GLYPH + AIR))));
  const lines = (r: { cells: Said[] }) => Math.max(1, ...r.cells.map((c, i) =>
    Math.ceil((c.text.length * GLYPH) / (widths[i]! - AIR))));
  const box = { x: 0, y: 0, w: widths.reduce((n, w) => n + w, 0) + AIR,
                h: ROW * (all.length + 1) + all.reduce((n, r) => n + (lines(r) - 1) * LINE, 0)
                  + HEAD * table.groups.filter(headed).length };
  const node = { ...cell(`${layer}@records`, box, { label: "records", marks: [],
                                                    records: { ...table, widths } }, "records"),
                 draggable: false, selectable: false };
  return { layer, nodes: [node], edges: [], perches: [], slots: ["display"],
           trail: trail_of(graph, layer) };
}

/** Whether a group wears its heading: never where it only repeats its one row's first cell. */
export function headed(g: RecordsDrawn["groups"][number]): boolean {
  return g.rows.length > 1 || g.rows[0]?.cells[0]?.text !== g.source;
}

/** **The rows, grouped by the source each reads from**, in the order sources first appear. */
export function records_of(graph: Graph, id: Id): RecordsDrawn {
  const records = graph.blocks[id]?.records ?? [];
  const columns = [...new Set(records.flatMap((r) => Object.keys(r)))];
  const groups: RecordsDrawn["groups"] = [];
  for (const r of records) {
    const cells = columns.map((c) => said(graph, id, r[c] ?? ""));
    const source = steps_of(r[columns[0]!] ?? "")[0] ?? "";
    const def = cells[0]?.def;
    const row = { cells, ...(def ? { tint: tint_attrs(look_of(graph, def)) } : {}) };
    const at = groups.find((g) => g.source === source);
    if (at) at.rows.push(row);
    else groups.push({ source, rows: [row] });
  }
  return { columns, groups };
}

/** A cell's text, with the definition its first step names where it names one in reach. */
function said(graph: Graph, at: Id, text: string): Said {
  const first = steps_of(text)[0];
  const hits = first ? def_hits(graph, first, { within: [package_of(graph, at)] }) : [];
  return { text, ...(hits.length === 1 ? { def: hits[0] } : {}) };
}
