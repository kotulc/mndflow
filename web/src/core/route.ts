/** Orthogonal routing for relationships: choosing seats, leaving cards
 *  outward, and what dragging a middle segment does to a saved path.
 *
 *  Pure geometry. A run is a list of points, ends included, every consecutive
 *  pair square to the last. The router owns where each end sits: it picks a
 *  free lattice seat on a side that faces the path, then finds a min-bend
 *  orthogonal path that clears other cards. Stubs leave along the side normal
 *  only — never back into the attached card.
 *
 *  Middle segments may still be dragged to override corners. End segments do
 *  not slide ports; seats change when the route is recomputed. */

import { SEAT, seatMarks } from "./layout";
import type { Side, Spot } from "./types";

export type Axis = "x" | "y";
/** @deprecated Reach is unused for end-segment slides; kept for Wire typing. */
export type Reach = { lo: number; hi: number } | null;
/** @deprecated End moves are no longer produced by drag. */
export type Move = { end: "from" | "to"; at: number };

export type Box = { x: number; y: number; w: number; h: number };
export type Seat = { side: Side; at: number };

export type Planned = {
  from: Seat;
  to: Seat;
  /** Interior corners between the two outward stubs. */
  corners: Spot[];
  out: Spot;
  back: Spot;
};

/** How far a run stands off a frame edge before turning. */
const STUB = 24;
/** Clearance around obstacle boxes, in canvas units. */
const PAD = SEAT;
/** Below this two coordinates are the same point, in canvas units. */
const NEAR = 1;
/** Below this they are in line as far as anyone can see. */
const LEVEL = 2.5;
/** Cost added per bend so fewer turns beat a slightly shorter path. */
const BEND_COST = 10_000;
/** Nudge for an exit that faces the other end. A preference between paths of
 *  equal shape, never a rival to their length. */
const AIM_COST = 100;

const SIDES: Side[] = ["top", "right", "bottom", "left"];

const OUT: Record<Side, Spot> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
};

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** A point from its two coordinates named by axis. */
function spot(axis: Axis, at: number, other: Axis, off: number): Spot {
  return axis === "x" ? { x: at, y: off } : { x: off, y: at };
}

/** The axis a run travels along as it leaves a frame edge facing this way. */
function facing(away: Spot): Axis {
  return away.x ? "x" : "y";
}

/** Bring a point into line with the one before it where it is nearly in line
 *  already. */
function inline(last: Spot, p: Spot): Spot {
  const dx = Math.abs(last.x - p.x);
  const dy = Math.abs(last.y - p.y);
  if (dx < LEVEL && dx <= dy) return { x: last.x, y: p.y };
  if (dy < LEVEL) return { x: p.x, y: last.y };

  return p;
}

/** The axis a segment moves along — the one across it. Null where it has no
 *  length. */
export function across(a: Spot, b: Spot): Axis | null {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  if (dx < NEAR && dy < NEAR) return null;

  return dx < NEAR ? "x" : "y";
}

function mid(box: Box): Spot {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

function attach(box: Box, side: Side, at: number): Spot {
  const t = clamp(at, 0, 1);
  if (side === "top") return { x: box.x + t * box.w, y: box.y };
  if (side === "bottom") return { x: box.x + t * box.w, y: box.y + box.h };
  if (side === "left") return { x: box.x, y: box.y + t * box.h };

  return { x: box.x + box.w, y: box.y + t * box.h };
}

function stubOf(box: Box, side: Side, at: number, inward = false): Spot {
  const p = attach(box, side, at);
  const o = OUT[side];
  const d = inward ? -1 : 1;

  return { x: p.x + o.x * STUB * d, y: p.y + o.y * STUB * d };
}

function exitOf(side: Side, inward = false): Spot {
  const o = OUT[side];

  return inward ? { x: -o.x, y: -o.y } : o;
}

/** Whether a point lies inside a box, optionally inset. */
function contained(bounds: Box, p: Spot, pad = 0): boolean {
  return p.x >= bounds.x + pad && p.x <= bounds.x + bounds.w - pad
      && p.y >= bounds.y + pad && p.y <= bounds.y + bounds.h - pad;
}

/** Axis-aligned segment stays inside bounds when both ends do (AABB). */
function inBounds(a: Spot, b: Spot, bounds: Box | undefined, pad = 0): boolean {
  if (!bounds) return true;

  return contained(bounds, a, pad) && contained(bounds, b, pad);
}

/** How well a side's exit normal points toward a target. Higher is better.
 *
 *  An inward exit is measured from its own edge, not from the middle. Every
 *  wall of a frame faces the interior, so the middle cannot say which wall a
 *  target is nearest — measured from there, the near wall scores worst. */
function sideScore(box: Box, side: Side, toward: Spot, inward = false): number {
  const a = inward ? attach(box, side, 0.5) : mid(box);
  const o = exitOf(side, inward);

  return o.x * (toward.x - a.x) + o.y * (toward.y - a.y);
}

/** Absolute seat marks already taken on one side of a box. */
function takenKeys(box: Box, side: Side, seats: Seat[]): Set<number> {
  const flat = side === "top" || side === "bottom";
  const origin = flat ? box.x : box.y;
  const extent = flat ? box.w : box.h;
  const keys = new Set<number>();

  for (const seat of seats) {
    if (seat.side !== side) continue;
    keys.add(Math.round((origin + seat.at * extent) / SEAT));
  }

  return keys;
}

/** Free seat fractions on a side, nearest the preferred absolute first. */
function seatChoices(box: Box, side: Side, preferAbs: number, taken: Seat[]): number[] {
  const flat = side === "top" || side === "bottom";
  const origin = flat ? box.x : box.y;
  const extent = flat ? box.w : box.h;
  const marks = seatMarks(origin, extent);
  if (!marks.length) return [0.5];

  const blocked = takenKeys(box, side, taken);
  const free = marks.filter((m) => !blocked.has(Math.round(m / SEAT)));
  const pool = free.length ? free : marks;

  return [...pool]
    .sort((a, b) => Math.abs(a - preferAbs) - Math.abs(b - preferAbs))
    .map((m) => (m - origin) / extent);
}

/** Preferred absolute along an edge: the target projected on it. */
function preferAlong(box: Box, side: Side, toward: Spot): number {
  if (side === "top" || side === "bottom") return clamp(toward.x, box.x + SEAT, box.x + box.w - SEAT);

  return clamp(toward.y, box.y + SEAT, box.y + box.h - SEAT);
}

/** Whether an axis-aligned segment crosses any inflated obstacle interior. */
function blocked(a: Spot, b: Spot, obstacles: Box[], pad: number,
                 bounds?: Box): boolean {
  if (!inBounds(a, b, bounds)) return true;

  const horiz = Math.abs(a.y - b.y) < NEAR;
  const vert = Math.abs(a.x - b.x) < NEAR;
  if (!horiz && !vert) return true;

  for (const o of obstacles) {
    const x0 = o.x - pad;
    const y0 = o.y - pad;
    const x1 = o.x + o.w + pad;
    const y1 = o.y + o.h + pad;

    if (horiz) {
      const y = a.y;
      if (y <= y0 || y >= y1) continue;
      const lo = Math.min(a.x, b.x);
      const hi = Math.max(a.x, b.x);
      if (hi > x0 && lo < x1) return true;
    } else {
      const x = a.x;
      if (x <= x0 || x >= x1) continue;
      const lo = Math.min(a.y, b.y);
      const hi = Math.max(a.y, b.y);
      if (hi > y0 && lo < y1) return true;
    }
  }

  return false;
}

function lengthOf(a: Spot, b: Spot): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Zero or one bend between two stubs, if clear of obstacles. */
function orthCorners(a: Spot, b: Spot, obstacles: Box[], pad: number,
                     bounds?: Box): Spot[] | null {
  if (Math.abs(a.x - b.x) < NEAR || Math.abs(a.y - b.y) < NEAR) {
    return blocked(a, b, obstacles, pad, bounds) ? null : [];
  }

  const hv = { x: b.x, y: a.y };
  const vh = { x: a.x, y: b.y };
  const okHV = !blocked(a, hv, obstacles, pad, bounds) && !blocked(hv, b, obstacles, pad, bounds);
  const okVH = !blocked(a, vh, obstacles, pad, bounds) && !blocked(vh, b, obstacles, pad, bounds);

  if (okHV && okVH) {
    return lengthOf(a, hv) + lengthOf(hv, b) <= lengthOf(a, vh) + lengthOf(vh, b)
      ? [hv]
      : [vh];
  }
  if (okHV) return [hv];
  if (okVH) return [vh];

  return null;
}

function keyOf(p: Spot): string {
  return `${Math.round(p.x)},${Math.round(p.y)}`;
}

function uniqSpots(points: Spot[]): Spot[] {
  const seen = new Set<string>();
  const out: Spot[] = [];
  for (const p of points) {
    const k = keyOf(p);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }

  return out;
}

/** Min-bend orthogonal path between stubs; returns interior corners only.
 *  When `bounds` is set (open frame), every waypoint and segment must stay
 *  inside it — skirts go around cards *within* the frame, never outside. */
function pathCorners(start: Spot, goal: Spot, obstacles: Box[], pad: number,
                     bounds?: Box): Spot[] | null {
  const simple = orthCorners(start, goal, obstacles, pad, bounds);
  if (simple) return simple;

  const nodes: Spot[] = [start, goal];
  for (const o of obstacles) {
    const x0 = o.x - pad;
    const y0 = o.y - pad;
    const x1 = o.x + o.w + pad;
    const y1 = o.y + o.h + pad;
    for (const p of [
      { x: x0, y: y0 }, { x: x1, y: y0 },
      { x: x0, y: y1 }, { x: x1, y: y1 },
    ]) {
      if (!bounds || contained(bounds, p)) nodes.push(p);
    }
  }

  // Channels: inside the frame when we have one; otherwise around the cluster.
  if (bounds) {
    const loX = bounds.x + pad;
    const hiX = bounds.x + bounds.w - pad;
    const loY = bounds.y + pad;
    const hiY = bounds.y + bounds.h - pad;
    for (const x of [loX, hiX]) {
      nodes.push({ x, y: start.y }, { x, y: goal.y }, { x, y: loY }, { x, y: hiY });
    }
    for (const y of [loY, hiY]) {
      nodes.push({ x: start.x, y }, { x: goal.x, y }, { x: loX, y }, { x: hiX, y });
    }
  } else if (obstacles.length) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const o of obstacles) {
      minX = Math.min(minX, o.x - pad);
      minY = Math.min(minY, o.y - pad);
      maxX = Math.max(maxX, o.x + o.w + pad);
      maxY = Math.max(maxY, o.y + o.h + pad);
    }
    for (const x of [minX, maxX]) {
      nodes.push({ x, y: start.y }, { x, y: goal.y }, { x, y: minY }, { x, y: maxY });
    }
    for (const y of [minY, maxY]) {
      nodes.push({ x: start.x, y }, { x: goal.x, y }, { x: minX, y }, { x: maxX, y });
    }
  }

  // Alignments of start/goal with obstacle corners (enough for 2–3 bends).
  const base = nodes.slice();
  for (let i = 2; i < base.length; i += 1) {
    const c = base[i];
    for (const p of [
      { x: start.x, y: c.y }, { x: c.x, y: start.y },
      { x: goal.x, y: c.y }, { x: c.x, y: goal.y },
    ]) {
      if (!bounds || contained(bounds, p)) nodes.push(p);
    }
  }

  const pts = uniqSpots(nodes).filter((p) => !bounds || contained(bounds, p));
  const n = pts.length;
  const adj: { j: number; len: number }[][] = Array.from({ length: n }, () => []);

  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const a = pts[i];
      const b = pts[j];
      if (Math.abs(a.x - b.x) >= NEAR && Math.abs(a.y - b.y) >= NEAR) continue;
      if (blocked(a, b, obstacles, pad, bounds)) continue;
      const len = lengthOf(a, b);
      if (len < NEAR) continue;
      adj[i].push({ j, len });
      adj[j].push({ j: i, len });
    }
  }

  // Dijkstra with direction in the state so bends are charged.
  // dir: 0 = none yet, 1 = horiz, 2 = vert
  const INF = Number.POSITIVE_INFINITY;
  const dist = Array.from({ length: n * 3 }, () => INF);
  const prev = Array.from({ length: n * 3 }, () => -1);
  const stateAt = (i: number, dir: number) => i * 3 + dir;

  const startAt = pts.findIndex((p) => keyOf(p) === keyOf(start));
  const goalAt = pts.findIndex((p) => keyOf(p) === keyOf(goal));
  if (startAt < 0 || goalAt < 0) return null;

  dist[stateAt(startAt, 0)] = 0;
  const heap: { s: number; cost: number }[] = [{ s: stateAt(startAt, 0), cost: 0 }];

  const push = (s: number, cost: number) => {
    if (cost >= dist[s]) return;
    dist[s] = cost;
    heap.push({ s, cost });
  };

  while (heap.length) {
    let best = 0;
    for (let i = 1; i < heap.length; i += 1) {
      if (heap[i].cost < heap[best].cost) best = i;
    }
    const { s, cost } = heap[best];
    heap[best] = heap[heap.length - 1];
    heap.pop();
    if (cost !== dist[s]) continue;

    const i = Math.floor(s / 3);
    const dir = s % 3;
    if (i === goalAt) {
      const path: Spot[] = [];
      let cur = s;
      while (cur >= 0) {
        const node = Math.floor(cur / 3);
        path.push(pts[node]);
        cur = prev[cur];
      }
      path.reverse();
      return path.slice(1, -1);
    }

    for (const { j, len } of adj[i]) {
      const a = pts[i];
      const b = pts[j];
      const nextDir = Math.abs(a.y - b.y) < NEAR ? 1 : 2;
      const bend = dir !== 0 && dir !== nextDir ? BEND_COST : 0;
      const next = stateAt(j, nextDir);
      const nextCost = cost + len + bend;
      if (nextCost < dist[next]) {
        prev[next] = s;
        push(next, nextCost);
      }
    }
  }

  return null;
}

/** Whether a stub-to-stub corner list stays inside bounds. */
function pathInside(corners: Spot[], start: Spot, goal: Spot, bounds?: Box): boolean {
  if (!bounds) return true;
  const run = [start, ...corners, goal];
  for (let i = 0; i < run.length - 1; i += 1) {
    if (!inBounds(run[i], run[i + 1], bounds)) return false;
  }

  return true;
}

/** Whether any segment of a run hits inflated solids. */
function pathHits(corners: Spot[], start: Spot, goal: Spot,
                  solids: Box[], pad: number, bounds?: Box): boolean {
  const run = [start, ...corners, goal];
  for (let i = 0; i < run.length - 1; i += 1) {
    if (blocked(run[i], run[i + 1], solids, pad, bounds)) return true;
  }

  return false;
}

/** Fallback when obstacles block everything: the old facing-based plain path. */
function plain(from: Spot, out: Spot, to: Spot, back: Spot): Spot[] {
  const a = { x: from.x + out.x * STUB, y: from.y + out.y * STUB };
  const b = { x: to.x + back.x * STUB, y: to.y + back.y * STUB };
  const main: Axis = out.x ? "x" : "y";
  const side: Axis = main === "x" ? "y" : "x";

  if (out[main] === -back[main]) {
    if (Math.abs(from[side] - to[side]) < NEAR) return [];
    const midAt = (a[main] + b[main]) / 2;

    return [spot(main, midAt, side, from[side]), spot(main, midAt, side, to[side])];
  }

  if (out[main] === back[main]) {
    const far = out[main] > 0 ? Math.max(a[main], b[main]) : Math.min(a[main], b[main]);

    return [spot(main, far, side, from[side]), spot(main, far, side, to[side])];
  }

  return [spot(main, b[main], side, from[side])];
}

/** Drop points that repeat their neighbour or sit in the middle of a straight
 *  stretch. */
function tidy(run: Spot[]): Spot[] {
  const kept: Spot[] = [];
  for (const p of run) {
    const last = kept[kept.length - 1];
    if (last && Math.abs(last.x - p.x) < NEAR && Math.abs(last.y - p.y) < NEAR) continue;
    kept.push(p);
  }

  return kept.filter((p, at) => {
    const before = kept[at - 1];
    const after = kept[at + 1];
    if (!before || !after) return true;

    return !((Math.abs(before.x - p.x) < NEAR && Math.abs(p.x - after.x) < NEAR) ||
             (Math.abs(before.y - p.y) < NEAR && Math.abs(p.y - after.y) < NEAR));
  });
}

/** Force a run square, and square in the right places. */
function squared(from: Spot, out: Spot, corners: Spot[], to: Spot, back: Spot): Spot[] {
  const run: Spot[] = [{ ...from }];

  const add = (p: Spot) => {
    const last = run[run.length - 1];
    if (Math.abs(last.x - p.x) >= NEAR || Math.abs(last.y - p.y) >= NEAR) run.push({ ...p });
  };

  const going = (): Axis => {
    const [before, last] = run.slice(-2);
    if (!before) return facing(out);

    return Math.abs(before.x - last.x) < NEAR ? "y" : "x";
  };

  const reach = (p: Spot, tied?: Axis) => {
    const last = run[run.length - 1];
    const near = inline(last, p);
    const at = tied && Math.abs(near[tied] - p[tied]) >= NEAR ? p : near;
    if (Math.abs(last.x - at.x) >= NEAR && Math.abs(last.y - at.y) >= NEAR) {
      add(going() === "x" ? { x: at.x, y: last.y } : { x: last.x, y: at.y });
    }
    add(at);
  };

  add({ x: from.x + out.x * STUB, y: from.y + out.y * STUB });
  for (const corner of corners) reach(corner);

  const hold: Axis = facing(back) === "x" ? "y" : "x";
  const [behind, end] = run.slice(-2);
  if (behind && Math.abs(end[hold] - to[hold]) < LEVEL &&
      Math.abs(behind[hold] - end[hold]) >= NEAR) {
    end[hold] = to[hold];
  }

  reach({ x: to.x + back.x * STUB, y: to.y + back.y * STUB }, hold);
  add(to);

  return tidy(run);
}

/** The whole run, end to end. Saved or planned corners are followed where
 *  there are any; otherwise a plain facing path stands in. */
export function runOf(from: Spot, out: Spot, to: Spot, back: Spot,
                      corners: Spot[]): Spot[] {
  return squared(from, out, corners.length ? corners : plain(from, out, to, back), to, back);
}

/** Count bends in a stub-to-stub corner list. */
function bendsOf(corners: Spot[], start: Spot, goal: Spot): number {
  const run = [start, ...corners, goal];
  let bends = 0;
  for (let i = 1; i < run.length - 1; i += 1) {
    const a = run[i - 1];
    const b = run[i];
    const c = run[i + 1];
    const d1 = Math.abs(a.y - b.y) < NEAR ? 1 : 2;
    const d2 = Math.abs(b.y - c.y) < NEAR ? 1 : 2;
    if (d1 !== d2) bends += 1;
  }

  return bends;
}

function pathLen(corners: Spot[], start: Spot, goal: Spot): number {
  const run = [start, ...corners, goal];
  let len = 0;
  for (let i = 0; i < run.length - 1; i += 1) len += lengthOf(run[i], run[i + 1]);

  return len;
}

export type RouteOpts = {
  /** Other ports already seated on the from card. */
  fromTaken?: Seat[];
  /** Other ports already seated on the to card. */
  toTaken?: Seat[];
  /** Keep this seat on the from card (e.g. user started on an interface). */
  pinFrom?: Seat;
  pinTo?: Seat;
  /** Open-frame interior: keep the whole path inside. */
  bounds?: Box;
  /** Frame ends leave into the interior (matches inward handles). */
  inwardFrom?: boolean;
  inwardTo?: boolean;
};

/** Choose outward sides and lattice seats, then a min-bend path that clears
 *  other cards. Endpoint *cards* are also solids after the stub, so a line
 *  cannot leave the wrong face and cut back through its own block. The open
 *  frame is not a solid — it is only `bounds`. */
export function route(fromBox: Box, toBox: Box, obstacles: Box[],
                      opts: RouteOpts = {}): Planned | null {
  const fromTaken = opts.fromTaken ?? [];
  const toTaken = opts.toTaken ?? [];
  const bounds = opts.bounds;
  const inwardFrom = opts.inwardFrom ?? false;
  const inwardTo = opts.inwardTo ?? false;

  // Aim at the other end's port when pinned, else its centre — never the
  // centre of a huge frame when the interface sits on one wall.
  const toAim = opts.pinTo
    ? attach(toBox, opts.pinTo.side, opts.pinTo.at)
    : mid(toBox);
  const fromAim = opts.pinFrom
    ? attach(fromBox, opts.pinFrom.side, opts.pinFrom.at)
    : mid(fromBox);

  const fromSides = opts.pinFrom
    ? [opts.pinFrom.side]
    : [...SIDES].sort((a, b) =>
        sideScore(fromBox, b, toAim, inwardFrom) - sideScore(fromBox, a, toAim, inwardFrom));
  const toSides = opts.pinTo
    ? [opts.pinTo.side]
    : [...SIDES].sort((a, b) =>
        sideScore(toBox, b, fromAim, inwardTo) - sideScore(toBox, a, fromAim, inwardTo));

  // Prefer the two best-facing sides each; with a frame try all four so an
  // inward-safe exit toward a wall port is not skipped.
  const sideBudget = bounds ? 4 : 2;
  const fromTry = fromSides.slice(0, opts.pinFrom ? 1 : sideBudget);
  const toTry = toSides.slice(0, opts.pinTo ? 1 : sideBudget);

  // Cards at the ends stay solid; the frame (inward ends) does not fill the
  // layer as an obstacle.
  const solids = [
    ...obstacles,
    ...(inwardFrom ? [] : [fromBox]),
    ...(inwardTo ? [] : [toBox]),
  ];

  let best: Planned | null = null;
  let bestCost = Number.POSITIVE_INFINITY;

  for (const fs of fromTry) {
    const fromAts = opts.pinFrom
      ? [opts.pinFrom.at]
      : seatChoices(fromBox, fs, preferAlong(fromBox, fs, toAim), fromTaken).slice(0, 3);

    for (const ts of toTry) {
      const toAts = opts.pinTo
        ? [opts.pinTo.at]
        : seatChoices(toBox, ts, preferAlong(toBox, ts, fromAim), toTaken).slice(0, 3);

      for (const fa of fromAts) {
        for (const ta of toAts) {
          const out = exitOf(fs, inwardFrom);
          const back = exitOf(ts, inwardTo);
          const start = stubOf(fromBox, fs, fa, inwardFrom);
          const goal = stubOf(toBox, ts, ta, inwardTo);
          // Stub must leave into the open layer, never through the frame wall.
          if (bounds && (!contained(bounds, start) || !contained(bounds, goal))) continue;

          const found = pathCorners(start, goal, solids, PAD, bounds);
          const fallback = plain(attach(fromBox, fs, fa), out, attach(toBox, ts, ta), back);
          const corners = found ?? (
            pathInside(fallback, start, goal, bounds)
            && !pathHits(fallback, start, goal, solids, PAD, bounds)
              ? fallback
              : null
          );
          if (!corners || pathHits(corners, start, goal, solids, PAD, bounds)) continue;

          // Prefer exits aimed at the other end's actual seat — by their sign
          // only. A side score is a distance, so charging it whole cancelled
          // the length it was meant to break ties within, and the run that
          // crossed the layer to the far wall won every time.
          const cost = bendsOf(corners, start, goal) * BEND_COST
            + pathLen(corners, start, goal)
            - AIM_COST * Math.sign(sideScore(fromBox, fs, attach(toBox, ts, ta), inwardFrom))
            - AIM_COST * Math.sign(sideScore(toBox, ts, attach(fromBox, fs, fa), inwardTo));

          if (cost < bestCost) {
            bestCost = cost;
            best = { from: { side: fs, at: fa }, to: { side: ts, at: ta },
                     corners, out, back };
          }
        }
      }
    }
  }

  return best;
}

/** Whether two seat picks are the same for sync purposes. */
export function sameSeat(a: Seat, b: Seat): boolean {
  return a.side === b.side && Math.abs(a.at - b.at) < 1e-4;
}

/** The run after one of its *middle* segments has been dragged to `at` along
 *  the axis across it. End segments do not move ports; callers should not
 *  offer them. */
export function drag(run: Spot[], seg: number, to: number, _out: Spot, _back: Spot,
                     _reach: { from: Reach; to: Reach },
                     snap = LEVEL): { corners: Spot[]; moves: Move[] } {
  const axis = across(run[seg], run[seg + 1]);
  if (!axis) return { corners: run.slice(1, -1), moves: [] };

  const ends = [run[0][axis], run[run.length - 1][axis]];
  const level = ends.find((end) => Math.abs(end - to) < snap);
  const at = level ?? to;

  const corners = run.slice(1, -1).map((p) => ({ ...p }));
  const head = seg === 0;
  const tail = seg === run.length - 2;

  // End stubs are not editable via port slides — ignore head/tail grabs.
  if (head || tail) return { corners: tidy(corners), moves: [] };

  if (!head) corners[seg - 1][axis] = at;
  if (!tail) corners[seg][axis] = at;

  return { corners: tidy(corners), moves: [] };
}
