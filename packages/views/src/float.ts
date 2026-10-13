/** Where notes sit: untied notes in a column right of the blocks, and an aside card in the nearest
 *  free space beside what it is tied to. The one rule for a layer, a group and a page box. */

import { is_aside, is_note, type Graph, type Id } from "@mnd/core";
import type { Placed } from "./arrange";
import type { Sized } from "./bands";
import { pack_units, tie_targets } from "./pack";
import { snap, GAP, PAD, UNIT, type Size } from "./size";

type Rect = { x: number; y: number; w: number; h: number };
type Spot = { at: { x: number; y: number }; d: number; tilt: number };
type Crowd = { at: { x: number; y: number }; hit: number; d: number };

/** The nearest spot that keeps a unit of air from `taken`. Among equally near spots, one whose
 *  corner sits near 45 degrees off the target wins. `within` keeps the spot inside a room, so a
 *  note beside a frame interface does not push the wall it sits on. */
export function beside(taken: readonly Rect[], target: Rect, size: Size,
                       within?: Rect): { x: number; y: number } {
  const seen = new Set<string>();
  // Cast so TS does not narrow these to null: they are only assigned inside `consider`.
  let best = null as Spot | null;
  let crowded = null as Crowd | null;
  const consider = (x: number, y: number) => {
    const at = { x: snap(x), y: snap(y) };
    const key = `${at.x},${at.y}`;
    if (seen.has(key)) return;
    seen.add(key);
    const box = { ...at, ...size };
    if (within && !inside(within, box)) return;
    const hit = taken.reduce((n, t) => n + (meets(box, t, PAD) ? 1 : 0), 0);
    const { d, tilt } = pair(box, target);
    if (hit === 0) {
      if (!best || d < best.d - 0.5 || (d <= best.d + 0.5 && tilt < best.tilt))
        best = { at, d, tilt };
      return;
    }
    if (!crowded || hit < crowded.hit || (hit === crowded.hit && d < crowded.d))
      crowded = { at, hit, d };
  };

  for (let step = 1; step <= 16; step++) {
    if (best && step * UNIT > best.d + 1) break;
    const d = step * UNIT;
    for (let slide = -6; slide <= 6; slide++) {
      const shift = slide * UNIT;
      consider(target.x + shift, target.y - size.h - d);
      consider(target.x + target.w - size.w + shift, target.y - size.h - d);
      consider(target.x + shift, target.y + target.h + d);
      consider(target.x + target.w - size.w + shift, target.y + target.h + d);
      consider(target.x - size.w - d, target.y + shift);
      consider(target.x - size.w - d, target.y + target.h - size.h + shift);
      consider(target.x + target.w + d, target.y + shift);
      consider(target.x + target.w + d, target.y + target.h - size.h + shift);
    }
    for (const q of QUADS) {
      const slot = {
        x: q.sx > 0 ? target.x + target.w : target.x,
        y: q.sy > 0 ? target.y + target.h : target.y,
      };
      const corner = { x: slot.x + q.sx * d, y: slot.y + q.sy * d };
      consider(q.sx > 0 ? corner.x : corner.x - size.w, q.sy > 0 ? corner.y : corner.y - size.h);
    }
  }
  if (best) return best.at;
  if (crowded) return crowded.at;
  return { x: snap(target.x + target.w + PAD), y: snap(target.y - size.h - PAD) };
}

const QUADS = [
  { sx: 1, sy: -1 }, { sx: 1, sy: 1 }, { sx: -1, sy: -1 }, { sx: -1, sy: 1 },
];

/** Whether `box` sits within `outer`, give or take a pixel. */
function inside(outer: Rect, box: Rect): boolean {
  return box.x >= outer.x - 1 && box.y >= outer.y - 1
    && box.x + box.w <= outer.x + outer.w + 1 && box.y + box.h <= outer.y + outer.h + 1;
}

/** Whether two boxes meet, counting `air` of space between them as taken. */
function meets(a: Rect, b: Rect, air = 0): boolean {
  return a.x < b.x + b.w + air && b.x < a.x + a.w + air
      && a.y < b.y + b.h + air && b.y < a.y + a.h + air;
}

/** How far the nearest corners of two boxes are, and how far that run leans off 45 degrees. */
function pair(a: Rect, b: Rect): { d: number; tilt: number } {
  const corner = (r: Rect) => [
    { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y },
    { x: r.x, y: r.y + r.h }, { x: r.x + r.w, y: r.y + r.h },
  ];
  let best = { d: Infinity, dx: 0, dy: 0 };
  for (const p of corner(a)) for (const q of corner(b)) {
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < best.d) best = { d, dx, dy };
  }
  const tilt = Math.abs(Math.atan2(Math.abs(best.dy), Math.abs(best.dx) || 1) - Math.PI / 4);
  return { d: best.d, tilt };
}

/** Notes placed the one way every layout uses — a layer, a group and a page box alike: blocks
 *  flowed `across` to a row, untied notes in a column on the right, and a card carrying *is aside*
 *  in the nearest free space beside what it is tied to. Ties are read on `layer`; `holder` is the
 *  box being laid out, where it is not the layer, so a note tied to it floats beside its content. */
export function noted(graph: Graph, layer: Id | null, structural: Sized[], satellites: Sized[],
                      across?: number, holder?: Id): Placed[] {
  const floats = (it: Sized) => is_aside(graph, it.b.id)
    && tie_targets(graph, layer, it.b.id).length > 0;
  const aside = [...structural, ...satellites].filter(floats);
  const placed = column(graph, layer, structural.filter((it) => !floats(it)),
                        satellites.filter((it) => !floats(it)), across);
  return [...placed, ...floated(graph, layer, aside, placed, holder)];
}

/** Untied notes in one column a gap to the right of the blocks. */
function column(graph: Graph, layer: Id | null, structural: Sized[], satellites: Sized[],
                across?: number): Placed[] {
  const note = (it: Sized) => is_note(graph, it.b.id);
  const flowing = [...structural.filter((it) => !note(it)),
                   ...satellites.filter((it) => !note(it))];
  const notes = [...structural, ...satellites].filter(note).sort((a, b) =>
    (a.b.order ?? 0) - (b.b.order ?? 0) || a.b.id.localeCompare(b.b.id));
  const placed = centred(pack_units(flowing, across));
  if (!notes.length) return placed;
  const at = new Map(placed.map((p) => [p.id, p]));
  const hits = (it: Sized) => tie_targets(graph, layer, it.b.id)
    .map((id) => at.get(id)).filter((p): p is Placed => !!p);
  const untied = notes.filter((it) => hits(it).length === 0);
  const right = placed.length ? Math.max(...placed.map((p) => p.x + p.w)) : 0;
  const x = snap(right + GAP);
  const top = placed.length ? Math.min(...placed.map((p) => p.y)) : 0;
  const column: Placed[] = [];
  let y = top;
  for (const it of untied) {
    column.push({ id: it.b.id, x, y, ...it.s });
    y += it.s.h + GAP;
  }
  const after_untied = y;
  const by_row = new Map<number, Placed[]>();
  const row_of = new Map<number, Sized[]>();
  for (const it of notes) {
    if (untied.includes(it)) continue;
    const row = Math.min(...hits(it).map((p) => p.y));
    const list = row_of.get(row) ?? [];
    list.push(it);
    row_of.set(row, list);
  }
  for (const row of [...row_of.keys()].sort((a, b) => a - b)) {
    let ny = row < after_untied ? Math.max(row, after_untied) : row;
    const list: Placed[] = [];
    for (const it of row_of.get(row)!) {
      const spot = { id: it.b.id, x, y: ny, ...it.s };
      list.push(spot);
      column.push(spot);
      ny += it.s.h + GAP;
    }
    by_row.set(row, list);
  }
  const rows = [...new Set(placed.map((p) => p.y))].sort((a, b) => a - b);
  let push = 0;
  for (const row of rows) {
    for (const p of placed) if (p.y === row) p.y += push;
    for (const n of by_row.get(row) ?? []) n.y += push;
    const blocks = placed.filter((p) => p.y === row + push);
    const block_bottom = blocks.length ? Math.max(...blocks.map((p) => p.y + p.h)) : row + push;
    const ns = [
      ...(row === rows[0] ? column.filter((n) => untied.some((u) => u.b.id === n.id)) : []),
      ...(by_row.get(row) ?? []),
    ];
    const note_bottom = ns.length ? Math.max(...ns.map((n) => n.y + n.h)) : block_bottom;
    push += Math.max(0, note_bottom - block_bottom);
  }
  return [...placed, ...column];
}

/** Aside cards, each in the nearest free space beside what it is tied to. One tied only to an
 *  interface is parked; it is moved beside that interface once the interface has a seat. */
export function floated(graph: Graph, layer: Id | null, held: readonly Sized[],
                 placed: readonly Placed[], holder?: Id): Placed[] {
  const out = [...placed];
  const pending = [...held].sort((a, b) => a.b.id.localeCompare(b.b.id));
  for (let guard = pending.length; pending.length && guard >= 0; guard--) {
    const it = pending.shift()!;
    const ties = tie_targets(graph, layer, it.b.id);
    /** Tied to the box itself, it floats beside what the box holds. */
    const target = ties.map((id) => out.find((p) => p.id === id)).find((p) => !!p)
      ?? (holder && ties.includes(holder) && placed.length ? extent(placed) : undefined);
    if (!target) { pending.push(it); continue; }
    out.push({ id: it.b.id, ...beside(out, target, it.s), ...it.s });
  }
  for (const it of pending) {
    const y = out.length ? Math.max(...out.map((p) => p.y + p.h)) + GAP : 0;
    out.push({ id: it.b.id, x: 0, y, ...it.s });
  }
  return out.filter((p) => !placed.some((was) => was.id === p.id));
}

/** Positions relative to the layer's centre. */
export function centred(spots: Placed[]): Placed[] {
  if (spots.length === 0) return spots;
  const left = Math.min(...spots.map((p) => p.x));
  const top = Math.min(...spots.map((p) => p.y));
  const right = Math.max(...spots.map((p) => p.x + p.w));
  const bottom = Math.max(...spots.map((p) => p.y + p.h));
  const dx = snap(-(left + right) / 2);
  const dy = snap(-(top + bottom) / 2);
  return spots.map((p) => ({ ...p, x: p.x + dx || 0, y: p.y + dy || 0 }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** The box round some spots. */
function extent(spots: readonly Placed[]): Placed {
  const x = Math.min(...spots.map((p) => p.x));
  const y = Math.min(...spots.map((p) => p.y));
  const w = Math.max(...spots.map((p) => p.x + p.w)) - x;
  const h = Math.max(...spots.map((p) => p.y + p.h)) - y;
  return { id: "", x, y, w, h };
}
