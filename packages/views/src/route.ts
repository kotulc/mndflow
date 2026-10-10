/** Where a line runs between two borders: straight where it can, else one Z. Runs draw under
 *  cards, so nothing is routed round. */

import { Position } from "@xyflow/system";
import type { Fan } from "./seat";

type Point = { x: number; y: number };

/** How far a run goes straight out of a face before it may turn back on itself. */
export const STUB = 16;

/** How far apart two ends may be and still count as lined up: a seat drawn as a percentage of
 *  its wall lands a fraction of a pixel off. */
const LEVEL = 1.5;

/** Which way a run sets off from each face. */
const AWAY: Record<string, Point> = {
  [Position.Left]: { x: -1, y: 0 },
  [Position.Right]: { x: 1, y: 0 },
  [Position.Top]: { x: 0, y: -1 },
  [Position.Bottom]: { x: 0, y: 1 },
};

/** The corners of a run, in order. `fan` says where its cross leg sits; a tie runs straight. */
export function route(from: Point, out: Position, to: Point, into: Position,
                      fan?: Fan, straight = false): Point[] {
  if (straight) return [from, to];
  const a = AWAY[out] ?? AWAY[Position.Right]!;
  const b = AWAY[into] ?? AWAY[Position.Right]!;
  const across = a.x !== 0;

  /** Facing each other: straight where they line up, else a Z turning at the fan point. */
  if (a.x === -b.x && a.y === -b.y) {
    if (Math.abs(across ? from.y - to.y : from.x - to.x) < LEVEL) return [from, to];
    const hub = fan?.end === "to" ? { at: to, way: b } : { at: from, way: a };
    const by = fan?.by ?? half(from, to, across);
    const c = across ? hub.at.x + hub.way.x * by : hub.at.y + hub.way.y * by;
    return tidy(across ? [from, { x: c, y: from.y }, { x: c, y: to.y }, to]
                       : [from, { x: from.x, y: c }, { x: to.x, y: c }, to]);
  }

  /** Square to each other: one corner, where it lies ahead of both. */
  const corner = across ? { x: to.x, y: from.y } : { x: from.x, y: to.y };
  if (ahead(from, a, corner) && ahead(to, b, corner)) return [from, corner, to];

  /** Anything else steps out of both faces and joins the stubs. */
  const p = { x: from.x + a.x * STUB, y: from.y + a.y * STUB };
  const q = { x: to.x + b.x * STUB, y: to.y + b.y * STUB };
  if (a.x === b.x && a.y === b.y) {
    const c = across ? (a.x > 0 ? Math.max(p.x, q.x) : Math.min(p.x, q.x))
                     : (a.y > 0 ? Math.max(p.y, q.y) : Math.min(p.y, q.y));
    return tidy(across ? [from, { x: c, y: from.y }, { x: c, y: to.y }, to]
                       : [from, { x: from.x, y: c }, { x: to.x, y: c }, to]);
  }
  return tidy([from, p, across ? { x: p.x, y: q.y } : { x: q.x, y: p.y }, q, to]);
}

/** Half the way between two ends, along the way they face. */
function half(from: Point, to: Point, across: boolean): number {
  return Math.abs(across ? to.x - from.x : to.y - from.y) / 2;
}

/** Whether a point lies out of a face, not behind it. */
function ahead(at: Point, way: Point, p: Point): boolean {
  return (p.x - at.x) * way.x + (p.y - at.y) * way.y > 0;
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

const len = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

function toward(from: Point, to: Point, by: number): Point {
  const d = len(from, to) || 1;
  return { x: from.x + ((to.x - from.x) / d) * by,
           y: from.y + ((to.y - from.y) / d) * by };
}

/** Where a name sits: the middle of the longest leg past the fan point, so it lands on the line's
 *  own stretch rather than on a trunk it shares. */
export function middle_of(run: readonly Point[], fan?: Fan): Point {
  const own = fan ? past(fan.end === "to" ? [...run].reverse() : run, fan.by) : run;
  let best = { at: { x: own[0]!.x, y: own[0]!.y }, span: -1 };
  for (let i = 1; i < own.length; i++) {
    const p = own[i - 1]!;
    const q = own[i]!;
    const span = len(p, q);
    if (span > best.span) best = { at: { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }, span };
  }
  return best.at;
}

/** What is left of a run after its first `by` of length. */
function past(run: readonly Point[], by: number): Point[] {
  let left = by;
  for (let i = 1; i < run.length; i++) {
    const p = run[i - 1]!;
    const q = run[i]!;
    const span = len(p, q);
    if (span > left) return [toward(p, q, left), ...run.slice(i)];
    left -= span;
  }
  return [...run];
}
