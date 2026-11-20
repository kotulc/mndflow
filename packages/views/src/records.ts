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
                             groups: { source: string; rows: { cells: Said[]; tint?: Tint }[] }[] };

/** How wide a column reads at least, and each row's and heading's depth. */
const COL = 220;
const ROW = 26;
const HEAD = 24;


/** A block's records as its table, in a scene of one node. */
export function records_scene(graph: Graph, layer: Id): Scene {
  const table = records_of(graph, layer);
  const rows = table.groups.reduce((n, g) => n + g.rows.length, 0);
  const box = { x: 0, y: 0, w: COL * table.columns.length,
                h: ROW * (rows + 1) + HEAD * table.groups.length };
  const node = { ...cell(`${layer}@records`, box, { label: "records", marks: [],
                                                    records: table }, "records"),
                 draggable: false, selectable: false };
  return { layer, nodes: [node], edges: [], perches: [], slots: ["display"],
           trail: trail_of(graph, layer) };
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
