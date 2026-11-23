/** **Where a line runs between two borders, when libavoid has not routed it**: square, leaving
 *  each end along its face and never back into it. A few square runs are tried — the fan's Z,
 *  one corner, and runs through both ends' stubs along a shared line — and the one crossing the
 *  fewest `cards` wins, then the fewest bends, then the shortest; the first tried on a tie, so a
 *  fan's trunk holds. Where every run tried crosses a card, runs round the cards crossed are
 *  tried too. */

import { Position } from "@xyflow/system";
import type { Fan } from "./seat";

type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };

/** How far a run goes straight out of a face before it may turn back on itself. */
export const STUB = 16;

/** How far apart two ends may be and still count as lined up: a seat drawn as a percentage of
 *  its wall lands a fraction of a pixel off. */
const LEVEL = 1.5;

/** How far inside a card a leg must run to cross it: less is a pixel's rounding. */
const INSIDE = 2;

/** Which way a run sets off from each face. */
const AWAY: Record<string, Point> = {
  [Position.Left]: { x: -1, y: 0 },
  [Position.Right]: { x: 1, y: 0 },
  [Position.Top]: { x: 0, y: -1 },
  [Position.Bottom]: { x: 0, y: 1 },
};

/** The corners of a run, in order. `fan` says where its cross leg sits; a tie runs straight. */
export function route(from: Point, out: Position, to: Point, into: Position,
                      fan?: Fan, straight = false, cards: readonly Rect[] = []): Point[] {
  if (straight) return [from, to];
  const a = AWAY[out] ?? AWAY[Position.Right]!;
  const b = AWAY[into] ?? AWAY[Position.Right]!;
  const p = { x: from.x + a.x * STUB, y: from.y + a.y * STUB };
  const q = { x: to.x + b.x * STUB, y: to.y + b.y * STUB };
  const tried: Point[][] = [];

  /** Facing each other, each ahead of the other: straight where they line up, else a Z turning
   *  at the fan point. */
  const across = a.x !== 0;
  if (a.x === -b.x && a.y === -b.y && ahead(from, a, to) && ahead(to, b, from)) {
    if (Math.abs(across ? from.y - to.y : from.x - to.x) < LEVEL) tried.push([from, to]);
    const hub = fan?.end === "to" ? { at: to, way: b } : { at: from, way: a };
    const by = fan?.by ?? half(from, to, across);
    const c = across ? hub.at.x + hub.way.x * by : hub.at.y + hub.way.y * by;
    tried.push(across ? [from, { x: c, y: from.y }, { x: c, y: to.y }, to]
                      : [from, { x: from.x, y: c }, { x: to.x, y: c }, to]);
  }
  /** One corner, ahead of both. */
  for (const c of [{ x: to.x, y: from.y }, { x: from.x, y: to.y }]) tried.push([from, c, to]);
  /** Through both stubs, joined along one line. */
  const through = (xs: number[], ys: number[]) => [
    ...xs.map((x) => [from, p, { x, y: p.y }, { x, y: q.y }, q, to]),
    ...ys.map((y) => [from, p, { x: p.x, y }, { x: q.x, y }, q, to]),
  ];
  tried.push(...through([p.x, q.x, (p.x + q.x) / 2], [p.y, q.y, (p.y + q.y) / 2]));

  let best = pick(tried, a, b, cards);
  if (best && crossed(best, cards).length) {
    /** Round the cards it crosses, and the cards its ends sit on. */
    const near = [...crossed(best, cards), ...cards.filter((c) => touches(c, from)
      || touches(c, to))];
    const xs = near.flatMap((c) => [c.x - STUB, c.x + c.w + STUB]);
    const ys = near.flatMap((c) => [c.y - STUB, c.y + c.h + STUB]);
    best = pick([best, ...through(xs, ys)], a, b, cards) ?? best;
  }
  return best ?? tidy([from, p, q, to]);
}

/** The run tried that leaves along `a` and arrives along `b`, crossing fewest cards, then with
 *  fewest bends, then shortest; the first on a tie. */
function pick(tried: readonly Point[][], a: Point, b: Point,
              cards: readonly Rect[]): Point[] | null {
  let best: { run: Point[]; score: number[] } | null = null;
  for (const raw of tried) {
    const run = tidy(raw);
    if (run.length < 2 || !sets_off(run[0]!, run[1]!, a) || !sets_off(run.at(-1)!, run.at(-2)!, b)
        || !square(run)) continue;
    const score = [crossed(run, cards).length, run.length, Math.round(length(run))];
    if (!best || before(score, best.score)) best = { run, score };
  }
  return best?.run ?? null;
}

/** Whether one score comes strictly before another, read in order. */
function before(a: readonly number[], z: readonly number[]): boolean {
  const i = a.findIndex((n, k) => n !== z[k]);
  return i >= 0 && a[i]! < z[i]!;
}

/** Whether a leg from `at` to `next` sets off along `way`. */
function sets_off(at: Point, next: Point, way: Point): boolean {
  const dx = next.x - at.x;
  const dy = next.y - at.y;
  return dx * way.x + dy * way.y > 0 && Math.abs(dx * way.y) + Math.abs(dy * way.x) < LEVEL;
}

/** Whether every leg of a run is level or upright. */
function square(run: readonly Point[]): boolean {
  return run.slice(1).every((q, i) => Math.abs(q.x - run[i]!.x) < LEVEL
    || Math.abs(q.y - run[i]!.y) < LEVEL);
}

/** The cards a run's legs pass through. */
function crossed(run: readonly Point[], cards: readonly Rect[]): Rect[] {
  return cards.filter((c) => run.slice(1).some((q, i) => {
    const p = run[i]!;
    return Math.max(p.x, q.x) > c.x + INSIDE && Math.min(p.x, q.x) < c.x + c.w - INSIDE
      && Math.max(p.y, q.y) > c.y + INSIDE && Math.min(p.y, q.y) < c.y + c.h - INSIDE;
  }));
}

/** Whether a point lies on or in a card. */
function touches(c: Rect, at: Point): boolean {
  return at.x >= c.x - LEVEL && at.x <= c.x + c.w + LEVEL && at.y >= c.y - LEVEL
    && at.y <= c.y + c.h + LEVEL;
}

/** A run's length. */
function length(run: readonly Point[]): number {
  return run.slice(1).reduce((n, q, i) => n + len(run[i]!, q), 0);
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

/** How far a hop rises over the line it crosses. */
export const HOP = 8;

/** **The run as a path**, its corners rounded, and **a hop at each of `hops`** (2026-11-21: a
 *  crossing never reads as a join): a half circle over the line crossed, on a level leg. */
export function drawn(run: readonly Point[], bend: number, hops: readonly Point[] = []): string {
  if (run.length < 2) return "";
  let at = run[0]!;
  let d = `M${at.x},${at.y}`;
  /** A straight stretch to `to`, hopping where a hop lies on it. */
  const line = (to: Point) => {
    if (at.y === to.y) {
      const way = Math.sign(to.x - at.x);
      for (const h of hops.filter((h) => h.y === at.y && (h.x - at.x) * way > HOP
                                    && (to.x - h.x) * way > HOP)
                          .sort((a, z) => (a.x - z.x) * way)) {
        d += ` L${h.x - HOP * way},${h.y} A${HOP},${HOP} 0 0 ${way > 0 ? 1 : 0} ${h.x + HOP * way},${h.y}`;
      }
    }
    d += ` L${to.x},${to.y}`;
    at = to;
  };
  for (let i = 1; i < run.length - 1; i++) {
    const p = run[i - 1]!;
    const c = run[i]!;
    const n = run[i + 1]!;
    const r = Math.min(bend, len(p, c) / 2, len(c, n) / 2);
    line(toward(c, p, r));
    const to = toward(c, n, r);
    d += ` Q${c.x},${c.y} ${to.x},${to.y}`;
    at = to;
  }
  line(run[run.length - 1]!);
  return d;
}

const len = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

function toward(from: Point, to: Point, by: number): Point {
  const d = len(from, to) || 1;
  return { x: from.x + ((to.x - from.x) / d) * by,
           y: from.y + ((to.y - from.y) / d) * by };
}

/** Where a name sits: the middle of the longest leg past the fan point, so it lands on the line's
 *  own stretch rather than on a trunk it shares, and whether that leg is `level`, so the name sits
 *  beside the stroke: above a level leg, right of an upright one. */
export function middle_of(run: readonly Point[], fan?: Fan): Point & { level: boolean } {
  const own = fan ? past(fan.end === "to" ? [...run].reverse() : run, fan.by) : run;
  let best = { at: { x: own[0]!.x, y: own[0]!.y }, span: -1, level: false };
  for (let i = 1; i < own.length; i++) {
    const p = own[i - 1]!;
    const q = own[i]!;
    const span = len(p, q);
    if (span > best.span) {
      best = { at: { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }, span, level: p.y === q.y };
    }
  }
  return { ...best.at, level: best.level };
}

/** How far beside its run a name sits: above a level leg, right of an upright one; a name's glyph
 *  and its line's height at the layout's size, in pixels. */
export const NAMED = { lift: 8, aside: 6, glyph: 6.2, line: 16 };

/** Which side of its leg a name sits on, and the point it is set from: the leg's middle. */
export type NameBox = { x: number; y: number; w: number; h: number;
                        side: "above" | "below" | "right" | "left"; at: Point };

/** **The box a line's name takes**, at the layout's size: beside one of its own legs (past the
 *  fan point), the longest first — above or below a level leg (a `level` name always reads level,
 *  set on the leg's middle), right or left of an upright one — **the first clear of every card**
 *  (`cards`); where none is, above or right of the longest. The one geometry the stage draws by
 *  and the measure counts. */
export function name_box(run: readonly Point[], chars: number, fan?: Fan, level = false,
                         cards: readonly { x: number; y: number; w: number; h: number }[] = [],
                         others: readonly (readonly Point[])[] = []): NameBox {
  const own = fan ? past(fan.end === "to" ? [...run].reverse() : run, fan.by) : run;
  const [w, h] = [chars * NAMED.glyph, NAMED.line];
  /** **A name sits by a leg its line has alone** (2026-11-21: a trunk several lines share
   *  names none of them), the longest first. */
  const shared = (p: Point, q: Point) => {
    const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    return others.some((o) => o.slice(1).some((b, i) => on_leg(m, o[i]!, b)));
  };
  const legs = own.slice(1).map((q, i) => [own[i]!, q] as const)
    .sort((a, z) => Number(shared(...a)) - Number(shared(...z))
      || len(z[0], z[1]) - len(a[0], a[1]));
  const boxes = (legs.length ? legs : [[own[0]!, own[0]!] as const]).flatMap(([p, q]): NameBox[] => {
    const at = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    const flat = p.y === q.y || level;
    return flat
      ? [{ x: at.x - w / 2, y: at.y - NAMED.lift - h / 2, w, h, side: "above" as const, at },
         { x: at.x - w / 2, y: at.y + NAMED.lift - h / 2, w, h, side: "below" as const, at }]
      : [{ x: at.x + NAMED.aside, y: at.y - h / 2, w, h, side: "right" as const, at },
         { x: at.x - NAMED.aside - w, y: at.y - h / 2, w, h, side: "left" as const, at }];
  });
  const apart = (b: NameBox, c: { x: number; y: number; w: number; h: number }) =>
    b.x >= c.x + c.w || c.x >= b.x + b.w || b.y >= c.y + c.h || c.y >= b.y + b.h;
  /** Clear of every card, and of every other line's legs where it can be. */
  const clear = (b: NameBox) => cards.every((c) => apart(b, c));
  const alone = (b: NameBox) => others.every((o) => o.slice(1).every((q, i) =>
    apart(b, { x: Math.min(o[i]!.x, q.x), y: Math.min(o[i]!.y, q.y),
               w: Math.abs(q.x - o[i]!.x), h: Math.abs(q.y - o[i]!.y) })));
  return boxes.find((b) => clear(b) && alone(b)) ?? boxes.find(clear) ?? boxes[0]!;
}

/** Whether a point lies on a square leg. */
function on_leg(m: Point, p: Point, q: Point): boolean {
  return (Math.abs(p.x - q.x) < 1 && Math.abs(m.x - p.x) < 1
          && m.y >= Math.min(p.y, q.y) && m.y <= Math.max(p.y, q.y))
    || (Math.abs(p.y - q.y) < 1 && Math.abs(m.y - p.y) < 1
        && m.x >= Math.min(p.x, q.x) && m.x <= Math.max(p.x, q.x));
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
