/** **A placement read as a grid**: boxes laid out freely (by dagre, by ELK) turned into rows and
 *  columns, each box the cells its extent covers. Rows and columns are where the boxes' centres
 *  line up; a box reaching over several centres spans them, a merge. */

import type { Id, Span } from "@mnd/core";


/** A box as a layout placed it. */
export type Laid = { id: Id; x: number; y: number; w: number; h: number };

/** A grid read off a placement: how many rows and columns, and each box's span. */
export type Read = { rows: number; cols: number; at: Map<Id, Span> };

/** The grid a placement makes: centres within half the smallest box of each other share a line;
 *  each box spans every line whose centre it covers, its own at least. */
export function grid_from(boxes: readonly Laid[]): Read {
  if (!boxes.length) return { rows: 0, cols: 0, at: new Map() };
  const ys = lines(boxes.map((b) => b.y + b.h / 2), Math.min(...boxes.map((b) => b.h)) / 2);
  const xs = lines(boxes.map((b) => b.x + b.w / 2), Math.min(...boxes.map((b) => b.w)) / 2);
  const at = new Map<Id, Span>();
  for (const b of boxes) {
    const [r0, r1] = covered(ys, b.y, b.y + b.h, b.y + b.h / 2);
    const [c0, c1] = covered(xs, b.x, b.x + b.w, b.x + b.w / 2);
    at.set(b.id, { r: r0, c: c0, rows: r1 - r0 + 1, cols: c1 - c0 + 1 });
  }
  return { rows: ys.length, cols: xs.length, at };
}

/** Some centres gathered into lines, in order: a centre within `near` of the last joins it. */
function lines(centres: readonly number[], near: number): number[] {
  const out: number[][] = [];
  for (const v of [...centres].sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && v - last[last.length - 1]! <= near) last.push(v);
    else out.push([v]);
  }
  return out.map((l) => l.reduce((n, v) => n + v, 0) / l.length);
}

/** The first and last line a box covers from `lo` to `hi`; the line nearest its centre where it
 *  covers none. */
function covered(at: readonly number[], lo: number, hi: number, mid: number): [number, number] {
  const inside = at.map((v, i) => (v >= lo && v <= hi ? i : -1)).filter((i) => i >= 0);
  if (inside.length) return [inside[0]!, inside[inside.length - 1]!];
  const near = at.reduce((best, v, i) => (Math.abs(v - mid) < Math.abs(at[best]! - mid) ? i
    : best), 0);
  return [near, near];
}
