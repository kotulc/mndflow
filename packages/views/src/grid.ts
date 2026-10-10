/** The row/column grid every layout but `free` lays out on: each unit in a cell, a column as wide
 *  as its widest card and a row as tall as its tallest, each card centred in its cell. */

import type { Id } from "@mnd/core";
import type { Placed } from "./arrange";
import { snap, BLOCK, GAP, UNIT, type Size } from "./size";

/** A unit at a cell: column `c`, row `r`, and the size it draws at. */
export type Celled = { id: Id; c: number; r: number } & Size;

/** Cells to places, from the corner of the grid. Empty columns and rows take no room; cell edges
 *  stay on the guides, `GAP` apart. */
export function on_grid(cells: readonly Celled[]): Placed[] {
  const cols = [...new Set(cells.map((u) => u.c))].sort((a, b) => a - b);
  const rows = [...new Set(cells.map((u) => u.r))].sort((a, b) => a - b);
  const wide = cols.map((c) => whole(Math.max(...cells.filter((u) => u.c === c).map((u) => u.w))));
  const tall = rows.map((r) => whole(Math.max(...cells.filter((u) => u.r === r).map((u) => u.h))));
  const lefts = starts(wide);
  const tops = starts(tall);
  return cells.map((u) => {
    const i = cols.indexOf(u.c);
    const j = rows.indexOf(u.r);
    return { id: u.id, w: u.w, h: u.h,
             x: lefts[i]! + (wide[i]! - u.w) / 2, y: tops[j]! + (tall[j]! - u.h) / 2 };
  });
}

/** Units in reading order, `across` to a row. */
export function in_rows(sized: readonly ({ id: Id } & Size)[], across: number): Celled[] {
  const n = Math.max(1, across);
  return sized.map((u, i) => ({ ...u, c: i % n, r: Math.floor(i / n) }));
}

/** Units flowed in reading order onto standard columns, a default card wide and `across` to a
 *  row: one wider spans as many columns as it needs, centred across them, overhanging into at
 *  most half a gap before it takes another. Each row is as tall as its tallest unit, every unit
 *  at its top. */
export function flow(units: readonly ({ id: Id } & Size)[], across: number): Placed[] {
  const pitch = BLOCK.w + GAP;
  const span = (u: Size) => Math.max(1, Math.ceil((u.w + GAP / 2) / pitch - 1e-6));
  const wide = Math.max(across, ...units.map(span));

  /** Rows in reading order, a new one when the next unit would pass `wide` columns. */
  const rows: { u: { id: Id } & Size; c: number; cs: number }[][] = [[]];
  let c = 0;
  for (const u of units) {
    const cs = span(u);
    if (c > 0 && c + cs > wide) { rows.push([]); c = 0; }
    rows[rows.length - 1]!.push({ u, c, cs });
    c += cs;
  }

  const out: Placed[] = [];
  let y = 0;
  for (const row of rows.filter((r) => r.length)) {
    for (const { u, c: at, cs } of row) {
      const x = at * pitch + snap((cs * pitch - GAP - u.w) / 2);
      out.push({ id: u.id, w: u.w, h: u.h, x, y });
    }
    y += whole(Math.max(...row.map(({ u }) => u.h))) + GAP;
  }
  return out;
}

/** Where each column or row starts, `GAP` apart. */
function starts(sizes: readonly number[]): number[] {
  const out: number[] = [];
  let at = 0;
  for (const s of sizes) { out.push(at); at += s + GAP; }
  return out;
}

/** Up to whole units. */
export function whole(n: number): number {
  return Math.ceil(n / UNIT - 1e-6) * UNIT;
}
