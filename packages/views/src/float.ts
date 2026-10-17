/** Where cards sit in an `auto` layout: each kind's arrangement in explorer order, and an aside
 *  card in the nearest free space beside what it is tied to. The one rule for a layer and a
 *  group. */

import { arrange_of, is_aside, is_region, type Graph, type Id } from "@mnd/core";
import type { Placed } from "./arrange";
import type { Sized } from "./bands";
import { pack_units, tie_targets } from "./pack";
import { whole } from "./grid";
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

/** A layer's or a group's units placed the one way every `auto` layout uses: each kind's
 *  arrangement in explorer order, then every aside card in the nearest free space beside what it
 *  is tied to — or, untied, beside the arrangement. Ties are read on `layer`; `holder` is the box
 *  being laid out, where it is not the layer, so a note tied to it floats beside its content. */
export function noted(graph: Graph, layer: Id | null, units: readonly Sized[], across?: number,
                      holder?: Id): Placed[] {
  const aside = units.filter((it) => is_aside(graph, it.b.id));
  const placed = centred(runs(graph, units.filter((it) => !is_aside(graph, it.b.id)), across));
  return [...placed, ...floated(graph, layer, aside, placed, holder)];
}

/** Units in explorer order, split into runs of one arrangement: a column stacks its cards, left
 *  edges aligned; rows flow `across` to a row. Runs stack top to bottom, a gap apart. */
export function runs(graph: Graph, units: readonly Sized[], across?: number): Placed[] {
  const read = [...units].sort((a, b) =>
    (a.b.order ?? 0) - (b.b.order ?? 0) || a.b.id.localeCompare(b.b.id));
  const out: Placed[] = [];
  let y = 0;
  for (let i = 0; i < read.length;) {
    const how = arrange_of(graph, read[i]!.b.id);
    let j = i;
    while (j < read.length && arrange_of(graph, read[j]!.b.id) === how) j++;
    const run = read.slice(i, j);

    /** A column takes a unit per row; rows flow from the run's top. */
    const laid = how === "rows"
      ? pack_units(run, across).map((p) => ({ ...p, y: p.y + y }))
      : stacked(run, y);
    out.push(...laid);
    y = Math.max(...laid.map((p) => p.y + p.h)) + GAP;
    i = j;
  }
  return out;
}

/** A column of units from `top`, each at the left edge, a gap below the last. */
function stacked(run: readonly Sized[], top: number): Placed[] {
  let y = top;
  return run.map((it) => {
    const spot = { id: it.b.id, x: 0, y, ...it.s };
    y += whole(it.s.h) + GAP;
    return spot;
  });
}

/** Aside cards, each in the nearest free space beside what it is tied to. One tied only to an
 *  interface is parked; it is moved beside that interface once the interface has a seat. */
export function floated(graph: Graph, layer: Id | null, held: readonly Sized[],
                 placed: readonly Placed[], holder?: Id): Placed[] {
  const out = [...placed];
  /** A region's heading runs the width of its layer once spanned, so an aside never lands on
   *  one: each heading's strip is taken, however far it reaches. */
  const headings = placed.filter((p) => is_region(graph, p.id))
    .map((p) => ({ id: "", x: -HEADING_REACH, y: p.y, w: HEADING_REACH * 2, h: PAD + UNIT }));
  const pending = [...held].sort((a, b) => a.b.id.localeCompare(b.b.id));
  for (let guard = pending.length; pending.length && guard >= 0; guard--) {
    const it = pending.shift()!;
    const ties = tie_targets(graph, layer, it.b.id);
    /** Tied to the box itself, or to nothing, it floats beside what the box holds. */
    const target = ties.map((id) => out.find((p) => p.id === id)).find((p) => !!p)
      ?? ((!ties.length || (holder && ties.includes(holder))) && placed.length
        ? extent(placed) : undefined);
    if (!target) { pending.push(it); continue; }
    out.push({ id: it.b.id, ...beside([...out, ...headings], target, it.s), ...it.s });
  }
  for (const it of pending) {
    const y = out.length ? Math.max(...out.map((p) => p.y + p.h)) + GAP : 0;
    out.push({ id: it.b.id, x: 0, y, ...it.s });
  }
  return out.filter((p) => !placed.some((was) => was.id === p.id));
}

/** How far a region's heading strip is taken either side, in pixels: past any layer. */
const HEADING_REACH = 100_000;

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
