/** Where a line goes, and the lanes it shares.
 *
 *  There is no manual routing. Every line is worked out from the layer's
 *  arrangement, in one pass, every time it is drawn — so nothing about a line
 *  is stored, and a relationship the terminal added is drawn exactly as well as
 *  one somebody dragged.
 *
 *  One pass, so each line sees the seats the ones before it took: no two ends
 *  share a seat. */

import { READS, type Arrangement, type Relation, type Side } from "@mnd/core";
import { SEAT } from "./size";
import type { Placed } from "./arrange";

export type Point = { x: number; y: number };

export type Routed = {
  id: string;
  from: string;
  to: string;
  /** Where the line actually runs. Every elbow is a right angle. */
  points: Point[];
  fromSide: Side;
  toSide: Side;
  /** Which shared run this one was spread onto. Zero is the middle. */
  lane: number;
};

const OPPOSITE: Record<Side, Side> = { top: "bottom", bottom: "top", left: "right", right: "left" };

function centre(p: Placed): Point {
  return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
}

/** The side that faces the path, or the one the reading direction gives a
 *  directed relationship — out on the forward face, in on the one behind. */
function pick_side(a: Placed, b: Placed, directed: boolean, how: Arrangement): Side {
  if (directed) {
    const reads = READS[how];
    if (reads) return reads;
  }
  const ca = centre(a);
  const cb = centre(b);
  const dx = cb.x - ca.x;
  const dy = cb.y - ca.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "bottom" : "top";
}

/** Where on an edge a seat sits, given which one along it this is. */
function seat_point(p: Placed, side: Side, n: number): Point {
  const along = (n + 1) / 2;
  const off = (n % 2 === 0 ? 1 : -1) * Math.floor(along) * SEAT;
  switch (side) {
    case "top": return { x: p.x + p.w / 2 + off, y: p.y };
    case "bottom": return { x: p.x + p.w / 2 + off, y: p.y + p.h };
    case "left": return { x: p.x, y: p.y + p.h / 2 + off };
    case "right": return { x: p.x + p.w, y: p.y + p.h / 2 + off };
  }
}

/** A min-bend orthogonal path. Stubs leave along the side normal only — never
 *  into the attached card. */
function elbows(a: Point, b: Point, from: Side, to: Side): Point[] {
  const out = SEAT * 2;
  const stub = (p: Point, side: Side): Point =>
    side === "top" ? { x: p.x, y: p.y - out }
    : side === "bottom" ? { x: p.x, y: p.y + out }
    : side === "left" ? { x: p.x - out, y: p.y }
    : { x: p.x + out, y: p.y };

  const a1 = stub(a, from);
  const b1 = stub(b, to);
  const horizontal = from === "left" || from === "right";

  if (a1.x === b1.x || a1.y === b1.y) return [a, a1, b1, b];
  const mid: Point[] = horizontal
    ? [{ x: (a1.x + b1.x) / 2, y: a1.y }, { x: (a1.x + b1.x) / 2, y: b1.y }]
    : [{ x: a1.x, y: (a1.y + b1.y) / 2 }, { x: b1.x, y: (a1.y + b1.y) / 2 }];
  return [a, a1, ...mid, b1, b];
}

/** Runs that would share a line are spread half a cell apart, centred on where
 *  they would have gone.
 *
 *  **Only the middle run moves.** A seat is fixed and its stub leaves square,
 *  so shifting the point at the end of a stub sideways would bend it
 *  diagonally — which is the one thing a route may never do. A run with no
 *  middle is therefore not spread at all, and does not need to be: the seats it
 *  lands on were already spread apart before it was drawn. */
function spread(points: Point[], lane: number): Point[] {
  if (lane === 0 || points.length < 6) return points;
  const off = lane * SEAT;
  const first = 2;
  const last = points.length - 3;
  const down = points[first]!.x === points[last]!.x;
  return points.map((p, i) => {
    if (i < first || i > last) return p;
    return down ? { x: p.x + off, y: p.y } : { x: p.x, y: p.y + off };
  });
}

/** Route every relation in one pass. */
export function route(spots: Placed[], edges: Relation[], how: Arrangement = "free"): Routed[] {
  const by_id = new Map(spots.map((p) => [p.id, p]));
  /** How many ends this block's side has already taken. */
  const taken = new Map<string, number>();
  /** How many runs already join the same pair. */
  const pairs = new Map<string, number>();
  const out: Routed[] = [];

  for (const e of edges) {
    const a = by_id.get(e.from);
    const b = by_id.get(e.to);
    if (!a || !b) continue;

    const directed = e.module === "directed";
    const fromSide = e.fromSide ?? pick_side(a, b, directed, how);
    const toSide = e.toSide ?? (directed && READS[how] ? OPPOSITE[READS[how]!]
                                                       : pick_side(b, a, false, how));

    const fk = `${a.id}:${fromSide}`;
    const tk = `${b.id}:${toSide}`;
    const fn = taken.get(fk) ?? 0;
    const tn = taken.get(tk) ?? 0;
    taken.set(fk, fn + 1);
    taken.set(tk, tn + 1);

    const key = [a.id, b.id].sort().join("|");
    const lane = pairs.get(key) ?? 0;
    pairs.set(key, lane + 1);

    const points = spread(
      elbows(seat_point(a, fromSide, fn), seat_point(b, toSide, tn), fromSide, toSide),
      lane % 2 === 0 ? lane / 2 : -(lane + 1) / 2,
    );

    out.push({ id: e.id, from: e.from, to: e.to, points, fromSide, toSide, lane });
  }
  return out;
}
