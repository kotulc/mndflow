/** Where a line runs between two borders.
 *
 *  **The library's step router knows the two ends and nothing else.** It draws
 *  a good corner between them and has no idea a card is in the way — so a run
 *  reaching an interface on the top of a card from below went straight up
 *  through the card, out of the top and back down into the port. A port is on a
 *  border, and a line meeting one comes at it from outside the thing it is a
 *  border of.
 *
 *  **What is kept clear is the two ends' own boxes, and no more.** The card a
 *  port sits on, and the card a perch is on — those are the boxes a run must
 *  never be inside, because a line that ends on a border has just left, or is
 *  about to enter, that border. Every other card on the layer is left alone:
 *  keeping out of all of them is a different problem, and one whose answers are
 *  long detours rather than short lines. */

import { Position } from "@xyflow/react";

export type Rect = { x: number; y: number; w: number; h: number };
type Point = { x: number; y: number };

/** How far a line runs straight out of a border before it may turn. Wider than
 *  the border band, so the first turn is always clear of the card. */
export const STUB = 16;

/** Clear space kept between a run and a box it goes round. */
const MARGIN = 12;

/** Which way a run sets off from each face. */
const AWAY: Record<string, Point> = {
  [Position.Left]: { x: -1, y: 0 },
  [Position.Right]: { x: 1, y: 0 },
  [Position.Top]: { x: 0, y: -1 },
  [Position.Bottom]: { x: 0, y: 1 },
};

/** The corners of a run, in order. Both ends leave square to their border. */
export function route(from: Point, out: Position, to: Point, into: Position,
                      clear: readonly Rect[]): Point[] {
  const a = step(from, out);
  const b = step(to, into);
  const best = shortest(a, b, clear);
  return tidy([from, ...best, to]);
}

function step(at: Point, face: Position): Point {
  const d = AWAY[face] ?? AWAY[Position.Right]!;
  return { x: at.x + d.x * STUB, y: at.y + d.y * STUB };
}

/** The plainest run between the two stubs that stays out of everything.
 *
 *  **A handful of shapes, tried in order** rather than a search: two elbows,
 *  and a dog-leg through every lane the boxes offer. Fewest corners wins, and
 *  the shorter of two equals — which is the run somebody would have drawn. */
function shortest(a: Point, b: Point, clear: readonly Rect[]): Point[] {
  const tried: Point[][] = [
    [a, { x: b.x, y: a.y }, b],
    [a, { x: a.x, y: b.y }, b],
  ];
  const lanes = { x: [(a.x + b.x) / 2], y: [(a.y + b.y) / 2] };
  for (const r of clear) {
    lanes.x.push(r.x - MARGIN, r.x + r.w + MARGIN);
    lanes.y.push(r.y - MARGIN, r.y + r.h + MARGIN);
  }
  for (const x of lanes.x) tried.push([a, { x, y: a.y }, { x, y: b.y }, b]);
  for (const y of lanes.y) tried.push([a, { x: a.x, y }, { x: b.x, y }, b]);

  let best: Point[] | null = null;
  let mark = [Infinity, Infinity];
  for (const run of tried) {
    if (crosses(run, clear)) continue;
    const score = [corners(run), length(run)];
    if (score[0]! < mark[0]! || (score[0] === mark[0] && score[1]! < mark[1]!)) {
      best = run;
      mark = score;
    }
  }
  return best ?? tried[0]!;
}

/** Whether any leg of this run passes through a box. The box is shrunk by a
 *  hair, so a run laid along a border is beside it rather than in it. */
function crosses(run: readonly Point[], clear: readonly Rect[]): boolean {
  for (let i = 1; i < run.length; i++) {
    const p = run[i - 1]!;
    const q = run[i]!;
    for (const r of clear) {
      const lo = { x: Math.min(p.x, q.x), y: Math.min(p.y, q.y) };
      const hi = { x: Math.max(p.x, q.x), y: Math.max(p.y, q.y) };
      if (lo.x < r.x + r.w - 0.5 && hi.x > r.x + 0.5
       && lo.y < r.y + r.h - 0.5 && hi.y > r.y + 0.5) return true;
    }
  }
  return false;
}

function corners(run: readonly Point[]): number {
  return tidy(run as Point[]).length - 2;
}

function length(run: readonly Point[]): number {
  let out = 0;
  for (let i = 1; i < run.length; i++) {
    out += Math.abs(run[i]!.x - run[i - 1]!.x) + Math.abs(run[i]!.y - run[i - 1]!.y);
  }
  return out;
}

/** The same run without the points that turn nothing. */
function tidy(run: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of run) {
    const last = out[out.length - 1];
    if (last && last.x === p.x && last.y === p.y) continue;
    const before = out[out.length - 2];
    if (before && last
        && ((before.x === last.x && last.x === p.x)
         || (before.y === last.y && last.y === p.y))) out.pop();
    out.push(p);
  }
  return out;
}

/** The run as a path, with its corners rounded. */
export function drawn(run: readonly Point[], bend: number): string {
  if (run.length < 2) return "";
  let d = `M${run[0]!.x},${run[0]!.y}`;
  for (let i = 1; i < run.length - 1; i++) {
    const p = run[i - 1]!;
    const c = run[i]!;
    const n = run[i + 1]!;
    const r = Math.min(bend, len(p, c) / 2, len(c, n) / 2);
    d += ` L${toward(c, p, r).x},${toward(c, p, r).y}`;
    d += ` Q${c.x},${c.y} ${toward(c, n, r).x},${toward(c, n, r).y}`;
  }
  const end = run[run.length - 1]!;
  return `${d} L${end.x},${end.y}`;
}

const len = (a: Point, b: Point) => Math.abs(b.x - a.x) + Math.abs(b.y - a.y);

function toward(from: Point, to: Point, by: number): Point {
  const d = len(from, to) || 1;
  return { x: from.x + ((to.x - from.x) / d) * by,
           y: from.y + ((to.y - from.y) / d) * by };
}

/** Where a name sits on a run: the middle of its longest leg, so a label lands
 *  on a stretch of line rather than on a corner. */
export function middle_of(run: readonly Point[]): Point {
  let best = { at: { x: run[0]!.x, y: run[0]!.y }, span: -1 };
  for (let i = 1; i < run.length; i++) {
    const p = run[i - 1]!;
    const q = run[i]!;
    const span = len(p, q);
    if (span > best.span) best = { at: { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }, span };
  }
  return best.at;
}
