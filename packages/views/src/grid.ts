/** The row/column grid every layout but `free` lays out on: each unit in a cell, a column as wide
 *  as its widest card and a row as tall as its tallest, each card centred in its cell. */

import type { Id } from "@mnd/core";
import type { Placed } from "./arrange";
import { snap, BLOCK, GAP, UNIT, type Size } from "./size";

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

/** Units placed in reading order across `wide` pixels, each in the highest free spot, leftmost
 *  first — so small cards fill in beside a tall one rather than waiting for the next row. */
export function filled(units: readonly ({ id: Id } & Size)[], wide: number): Placed[] {
  const cols = Math.max(1, Math.ceil(wide / UNIT));
  const tops = new Array<number>(cols).fill(0);
  const out: Placed[] = [];
  for (const u of units) {
    const span = Math.min(cols, Math.max(1, Math.ceil((u.w + GAP) / UNIT)));
    let best = { c: 0, y: Infinity };
    for (let c = 0; c + span <= cols; c++) {
      const y = Math.max(...tops.slice(c, c + span));
      if (y < best.y) best = { c, y };
    }
    out.push({ id: u.id, w: u.w, h: u.h, x: best.c * UNIT, y: best.y });
    const foot = whole(best.y + u.h) + GAP;
    for (let c = best.c; c < best.c + span; c++) tops[c] = foot;
  }
  return out;
}

/** How wide units fill to keep the room the canvas's shape: their area at that aspect, never
 *  narrower than the widest of them. */
export function wide_for(units: readonly Size[], aspect: number): number {
  if (!units.length) return BLOCK.w;
  const area = units.reduce((n, u) => n + (u.w + GAP) * (u.h + GAP), 0);
  return whole(Math.max(...units.map((u) => u.w + GAP), Math.sqrt(area * aspect)));
}

/** Up to whole units. */
export function whole(n: number): number {
  return Math.ceil(n / UNIT - 1e-6) * UNIT;
}
