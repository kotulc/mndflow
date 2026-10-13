/** Where an aside card sits: the nearest free spot beside what it is tied to. */

import { snap, PAD, UNIT, type Size } from "./size";

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
