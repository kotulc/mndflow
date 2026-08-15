/** Orthogonal routing for relationships: choosing seats and leaving cards
 *  outward.
 *
 *  Pure geometry. A run is a list of points, ends included, every consecutive
 *  pair square to the last. The router owns where each end sits: it picks a
 *  free lattice seat on a side that faces the path, then finds a min-bend
 *  orthogonal path that clears other cards. Stubs leave along the side normal
 *  only — never back into the attached card.
 *
 *  A directed relationship's pinned sides also bias the path: matching
 *  conventions (right→left, bottom→top) prefer a run that progresses with the
 *  layer rather than doubling back. What in/out mean on a port stays outside
 *  this module.
 *
 *  Nothing here is dragged. A relationship has no route of its own to keep:
 *  every line on a layer is planned from that layer's arrangement, so moving a
 *  card is what moves a line. */

import { SEAT, seatMarks } from "./layout";
import type { Side, Spot } from "../graph/types";

export type Axis = "x" | "y";

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
/** Per canvas unit travelled against a directed relationship's reading. Small
 *  against length and tiny against a bend, so it only breaks ties — a flow on
 *  an across layer runs left to right rather than doubling back when both are
 *  otherwise equal. */
const ALONG_COST = 2;

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

/** Unit vector a directed relationship prefers to travel, from the sides its
 *  ends were given. Right→left means the run reads across; bottom→top, down.
 *  Anything else is not a flow convention and gets no bias — port in/out marks
 *  are not consulted here. */
function alongOf(from?: Side, to?: Side): Spot | null {
  if (from === "right" && to === "left") return { x: 1, y: 0 };
  if (from === "left" && to === "right") return { x: -1, y: 0 };
  if (from === "bottom" && to === "top") return { x: 0, y: 1 };
  if (from === "top" && to === "bottom") return { x: 0, y: -1 };

  return null;
}

/** How much of a segment fights the preferred direction. Zero when aligned or
 *  across it; the reverse length when it doubles back. */
function against(a: Spot, b: Spot, along: Spot): number {
  const fight = -((b.x - a.x) * along.x + (b.y - a.y) * along.y);

  return fight > 0 ? fight : 0;
}

/** How much of a stub-to-stub run travels against the flow. */
function againstOf(corners: Spot[], start: Spot, goal: Spot, along: Spot): number {
  const run = [start, ...corners, goal];
  let sum = 0;
  for (let i = 0; i < run.length - 1; i += 1) sum += against(run[i], run[i + 1], along);

  return sum;
}

function mid(box: Box): Spot {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

/** Where a seat sits on a box, in canvas units. */
export function attach(box: Box, side: Side, at: number): Spot {
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
                     bounds?: Box, along: Spot | null = null): Spot[] | null {
  if (Math.abs(a.x - b.x) < NEAR || Math.abs(a.y - b.y) < NEAR) {
    return blocked(a, b, obstacles, pad, bounds) ? null : [];
  }

  const hv = { x: b.x, y: a.y };
  const vh = { x: a.x, y: b.y };
  const okHV = !blocked(a, hv, obstacles, pad, bounds) && !blocked(hv, b, obstacles, pad, bounds);
  const okVH = !blocked(a, vh, obstacles, pad, bounds) && !blocked(vh, b, obstacles, pad, bounds);

  if (okHV && okVH) {
    const lenHV = lengthOf(a, hv) + lengthOf(hv, b);
    const lenVH = lengthOf(a, vh) + lengthOf(vh, b);
    if (along && Math.abs(lenHV - lenVH) < NEAR) {
      return against(a, hv, along) + against(hv, b, along)
          <= against(a, vh, along) + against(vh, b, along)
        ? [hv]
        : [vh];
    }

    return lenHV <= lenVH ? [hv] : [vh];
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

type Skirt = {
  obstacles: Box[];
  pad: number;
  bounds?: Box;
  /** Obstacle corners and frame/cluster rails — independent of stubs. */
  base: Spot[];
  /** Clear length base[i]→base[j], or 0 when they do not link. */
  link: number[][];
};

/** Axis-aligned clear length, or 0 when the segment is not a link. */
function clearLen(a: Spot, b: Spot, obstacles: Box[], pad: number,
                  bounds?: Box): number {
  if (Math.abs(a.x - b.x) >= NEAR && Math.abs(a.y - b.y) >= NEAR) return 0;
  if (blocked(a, b, obstacles, pad, bounds)) return 0;
  const len = lengthOf(a, b);

  return len < NEAR ? 0 : len;
}

/** Obstacle corners and channel rails that do not depend on a stub. */
function skirtBase(obstacles: Box[], pad: number, bounds?: Box): Spot[] {
  const nodes: Spot[] = [];
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

  if (bounds) {
    const loX = bounds.x + pad;
    const hiX = bounds.x + bounds.w - pad;
    const loY = bounds.y + pad;
    const hiY = bounds.y + bounds.h - pad;
    for (const x of [loX, hiX]) nodes.push({ x, y: loY }, { x, y: hiY });
    for (const y of [loY, hiY]) nodes.push({ x: loX, y }, { x: hiX, y });
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
    for (const x of [minX, maxX]) nodes.push({ x, y: minY }, { x, y: maxY });
    for (const y of [minY, maxY]) nodes.push({ x: minX, y }, { x: maxX, y });
  }

  return uniqSpots(nodes).filter((p) => !bounds || contained(bounds, p));
}

/** Stub-independent half of the visibility graph — built once per search. */
function prepareSkirt(obstacles: Box[], pad: number, bounds?: Box): Skirt {
  const base = skirtBase(obstacles, pad, bounds);
  const n = base.length;
  const link: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const len = clearLen(base[i], base[j], obstacles, pad, bounds);
      if (!len) continue;
      link[i][j] = len;
      link[j][i] = len;
    }
  }

  return { obstacles, pad, bounds, base, link };
}

/** Min-bend skirt between stubs on a prepared visibility graph. */
function skirtCorners(start: Spot, goal: Spot, skirt: Skirt,
                      along: Spot | null = null): Spot[] | null {
  const { obstacles, pad, bounds, base, link } = skirt;
  const nodes: Spot[] = [start, goal, ...base];

  if (bounds) {
    const loX = bounds.x + pad;
    const hiX = bounds.x + bounds.w - pad;
    const loY = bounds.y + pad;
    const hiY = bounds.y + bounds.h - pad;
    for (const x of [loX, hiX]) {
      nodes.push({ x, y: start.y }, { x, y: goal.y });
    }
    for (const y of [loY, hiY]) {
      nodes.push({ x: start.x, y }, { x: goal.x, y });
    }
  } else if (base.length) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of base) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    for (const x of [minX, maxX]) {
      nodes.push({ x, y: start.y }, { x, y: goal.y });
    }
    for (const y of [minY, maxY]) {
      nodes.push({ x: start.x, y }, { x: goal.x, y });
    }
  }

  for (const c of base) {
    for (const p of [
      { x: start.x, y: c.y }, { x: c.x, y: start.y },
      { x: goal.x, y: c.y }, { x: c.x, y: goal.y },
    ]) {
      if (!bounds || contained(bounds, p)) nodes.push(p);
    }
  }

  const pts = uniqSpots(nodes).filter((p) => !bounds || contained(bounds, p));
  const n = pts.length;
  const index = new Map<string, number>();
  for (let i = 0; i < n; i += 1) index.set(keyOf(pts[i]), i);

  const startAt = index.get(keyOf(start));
  const goalAt = index.get(keyOf(goal));
  if (startAt === undefined || goalAt === undefined) return null;

  const baseAt = base.map((p) => index.get(keyOf(p)) ?? -1);
  const isBase = new Uint8Array(n);
  for (const i of baseAt) if (i >= 0) isBase[i] = 1;

  const adj: { j: number; len: number }[][] = Array.from({ length: n }, () => []);
  const join = (i: number, j: number, len: number) => {
    adj[i].push({ j, len });
    adj[j].push({ j: i, len });
  };

  for (let i = 0; i < base.length; i += 1) {
    if (baseAt[i] < 0) continue;
    for (let j = i + 1; j < base.length; j += 1) {
      if (baseAt[j] < 0 || !link[i][j]) continue;
      join(baseAt[i], baseAt[j], link[i][j]);
    }
  }

  // Stubs, alignments and stub channels: link to every point once.
  for (let i = 0; i < n; i += 1) {
    if (isBase[i]) continue;
    for (let j = 0; j < n; j += 1) {
      if (j === i) continue;
      if (isBase[j] || i < j) {
        const len = clearLen(pts[i], pts[j], obstacles, pad, bounds);
        if (len) join(i, j, len);
      }
    }
  }

  // Dijkstra with direction in the state so bends are charged.
  // dir: 0 = none yet, 1 = horiz, 2 = vert. Binary heap; stale pops skipped.
  const INF = Number.POSITIVE_INFINITY;
  const dist = Array.from({ length: n * 3 }, () => INF);
  const prev = Array.from({ length: n * 3 }, () => -1);
  const stateAt = (i: number, dir: number) => i * 3 + dir;
  const heap: { s: number; cost: number }[] = [];

  const siftUp = (at: number) => {
    let i = at;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p].cost <= heap[i].cost) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const siftDown = (at: number) => {
    let i = at;
    for (;;) {
      let m = i;
      const l = i * 2 + 1;
      const r = l + 1;
      if (l < heap.length && heap[l].cost < heap[m].cost) m = l;
      if (r < heap.length && heap[r].cost < heap[m].cost) m = r;
      if (m === i) break;
      [heap[m], heap[i]] = [heap[i], heap[m]];
      i = m;
    }
  };
  const push = (s: number, cost: number) => {
    if (cost >= dist[s]) return;
    dist[s] = cost;
    heap.push({ s, cost });
    siftUp(heap.length - 1);
  };
  const pop = () => {
    if (!heap.length) return null;
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      siftDown(0);
    }

    return top;
  };

  push(stateAt(startAt, 0), 0);

  while (heap.length) {
    const item = pop();
    if (!item) break;
    const { s, cost } = item;
    if (cost !== dist[s]) continue;

    const i = Math.floor(s / 3);
    const dir = s % 3;
    if (i === goalAt) {
      const path: Spot[] = [];
      let cur = s;
      while (cur >= 0) {
        path.push(pts[Math.floor(cur / 3)]);
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
      const reverse = along ? against(a, b, along) * ALONG_COST : 0;
      const state = stateAt(j, nextDir);
      const nextCost = cost + len + bend + reverse;
      if (nextCost < dist[state]) {
        prev[state] = s;
        push(state, nextCost);
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
  /** Keep this *side*, but let the seat along it float. What a flow
   *  relationship asks for: its ends read as in and out, so which wall they
   *  leave by is the layer's convention rather than the path's preference.
   *  Matching sides (right→left, bottom→top) also bias the run to progress
   *  with the layer rather than doubling back. */
  sideFrom?: Side;
  sideTo?: Side;
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
  const along = alongOf(opts.sideFrom, opts.sideTo);

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
    : opts.sideFrom
      ? [opts.sideFrom]
      : [...SIDES].sort((a, b) =>
          sideScore(fromBox, b, toAim, inwardFrom) - sideScore(fromBox, a, toAim, inwardFrom));
  const toSides = opts.pinTo
    ? [opts.pinTo.side]
    : opts.sideTo
      ? [opts.sideTo]
      : [...SIDES].sort((a, b) =>
          sideScore(toBox, b, fromAim, inwardTo) - sideScore(toBox, a, fromAim, inwardTo));

  // Cards at the ends stay solid; the frame (inward ends) does not fill the
  // layer as an obstacle.
  const ends = [
    ...(inwardFrom ? [] : [fromBox]),
    ...(inwardTo ? [] : [toBox]),
  ];
  const solids = [...obstacles, ...ends];

  /** Score a stub-to-stub corner list the same way every phase does. */
  const scoreOf = (corners: Spot[], start: Spot, goal: Spot,
                   fs: Side, fa: number, ts: Side, ta: number) =>
    bendsOf(corners, start, goal) * BEND_COST
    + pathLen(corners, start, goal)
    + (along ? againstOf(corners, start, goal, along) * ALONG_COST : 0)
    - AIM_COST * Math.sign(sideScore(fromBox, fs, attach(toBox, ts, ta), inwardFrom))
    - AIM_COST * Math.sign(sideScore(toBox, ts, attach(fromBox, fs, fa), inwardTo));

  /** The best legal path under a given set of constraints, or nothing if there
   *  is none. `budget` is how many sides each end may try — two that face the
   *  other end, or all four when the easy answer has already failed.
   *
   *  Two phases: every seat pair gets the cheap zero/one-bend try first.
   *  Dijkstra only runs when no pair has a simple path — otherwise the first
   *  blocked pair rebuilt a visibility graph over every card before a later
   *  pair that was free to go straight ever got a look. Same answer: a one-bend
   *  run always beats a skirt, and orthCorners is complete for zero and one. */
  const search = (within: Box | undefined, avoid: Box[], budget: number): Planned | null => {
    const fromTry = fromSides.slice(0, opts.pinFrom || opts.sideFrom ? 1 : budget);
    const toTry = toSides.slice(0, opts.pinTo || opts.sideTo ? 1 : budget);

    type Cand = {
      fs: Side; fa: number; ts: Side; ta: number;
      out: Spot; back: Spot; start: Spot; goal: Spot;
    };
    const cands: Cand[] = [];

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
            const start = stubOf(fromBox, fs, fa, inwardFrom);
            const goal = stubOf(toBox, ts, ta, inwardTo);
            if (within && (!contained(within, start) || !contained(within, goal))) continue;
            cands.push({
              fs, fa, ts, ta, start, goal,
              out: exitOf(fs, inwardFrom),
              back: exitOf(ts, inwardTo),
            });
          }
        }
      }
    }

    let best: Planned | null = null;
    let bestCost = Number.POSITIVE_INFINITY;

    const consider = (c: Cand, corners: Spot[]) => {
      if (pathHits(corners, c.start, c.goal, avoid, PAD, within)) return;
      const cost = scoreOf(corners, c.start, c.goal, c.fs, c.fa, c.ts, c.ta);
      if (cost >= bestCost) return;
      bestCost = cost;
      best = {
        from: { side: c.fs, at: c.fa }, to: { side: c.ts, at: c.ta },
        corners, out: c.out, back: c.back,
      };
    };

    // Phase 1 — orthCorners only. Stop on a straight run; seat drift among
    // them is not worth another pass.
    for (const c of cands) {
      const simple = orthCorners(c.start, c.goal, avoid, PAD, within, along);
      if (!simple) continue;
      consider(c, simple);
      if (bestCost < BEND_COST) return best;
    }
    if (best) return best;

    // Phase 2 — skirts. Only reached when every pair needs bends past one.
    // One visibility graph for the layer; seat pairs only add their stubs.
    // Preferred seat only: three-per-end rebuilt stub alignments nine times
    // for a bend the aimed seat already found, and seat drift among skirts is
    // not worth it once the cheap orth pass has already failed.
    const skirt = prepareSkirt(avoid, PAD, within);
    const seenSide = new Set<string>();
    for (const c of cands) {
      const key = `${c.fs}:${c.ts}`;
      if (seenSide.has(key)) continue;
      seenSide.add(key);
      const found = skirtCorners(c.start, c.goal, skirt, along);
      if (found) consider(c, found);
    }
    if (best) return best;

    // Phase 3 — facing plain path when the graph finds nothing legal.
    for (const c of cands) {
      const fallback = plain(
        attach(fromBox, c.fs, c.fa), c.out,
        attach(toBox, c.ts, c.ta), c.back,
      );
      if (!pathInside(fallback, c.start, c.goal, within)) continue;
      if (pathHits(fallback, c.start, c.goal, avoid, PAD, within)) continue;
      consider(c, fallback);
    }

    return best;
  };

  // **A relationship that exists must be drawn.** Each constraint is given up
  // in turn rather than the line, because every one of them is about tidiness
  // and none is worth making a relationship invisible for.
  //
  // Both failures were real and neither was visible as an error: a frame
  // reshaped by the contents tray could leave no way round a card between the
  // two ends, and a card hemmed in by its neighbours on a busy layer could
  // leave no legal path at all. In both cases the search returned nothing and
  // the canvas simply dropped the line.
  //
  // Bounded search starts at budget 2 (facing sides). Escalating to four sides
  // inside the frame before giving the frame up was the resize cost: each extra
  // side×seat pair re-ran the visibility graph over every other card. Skirts
  // also share one prepared graph per search, and only the preferred seat runs
  // Dijkstra — the orth pass already tried every seat for free.
  return search(bounds, solids, 2)                 // tidy: facing sides, inside the frame
    ?? search(undefined, solids, 4)                // give up the frame
    ?? search(undefined, ends, 4);                 // give up the cards, but never its own ends
}

/** How far apart runs sharing a line are pushed. Half a cell: enough to read as
 *  two lines, little enough that a bundle still reads as one bundle. */
const LANE = SEAT;

type Leg = { id: string; at: number; axis: Axis; lo: number; hi: number };

/** Spread runs that share a line, so relationships going the same way stay
 *  distinct instead of drawing on top of each other.
 *
 *  Only the interior segments move. The two at the ends are tied to their
 *  seats, and every corner is a right angle, so shifting a segment across
 *  itself just lengthens the perpendicular ones either side — the run stays
 *  square with nothing else touched. Segments that do not actually overlap are
 *  left exactly where they were. */
export function lanes(runs: Record<string, Spot[]>): Record<string, Spot[]> {
  const out: Record<string, Spot[]> = {};
  for (const [id, pts] of Object.entries(runs)) out[id] = pts.map((p) => ({ ...p }));

  const shared = new Map<string, Leg[]>();

  for (const [id, pts] of Object.entries(out)) {
    for (let at = 1; at <= pts.length - 3; at += 1) {
      const axis = across(pts[at], pts[at + 1]);
      if (!axis) continue;

      const fixed = axis === "x" ? pts[at].x : pts[at].y;
      const ends = axis === "x"
        ? [pts[at].y, pts[at + 1].y]
        : [pts[at].x, pts[at + 1].x];
      const key = `${axis}:${Math.round(fixed / LANE)}`;

      shared.set(key, [...(shared.get(key) ?? []), {
        id, at, axis, lo: Math.min(...ends), hi: Math.max(...ends),
      }]);
    }
  }

  for (const legs of shared.values()) {
    if (legs.length < 2) continue;

    // Greedy interval colouring: a leg takes the lowest lane none of the legs
    // it actually overlaps is already using.
    const order = [...legs].sort((a, b) => a.lo - b.lo);
    const lane = new Map<Leg, number>();

    for (const leg of order) {
      const clash = new Set(
        order
          .filter((o) => o !== leg && lane.has(o) && o.hi > leg.lo && leg.hi > o.lo)
          .map((o) => lane.get(o)!),
      );

      let free = 0;
      while (clash.has(free)) free += 1;
      lane.set(leg, free);
    }

    // Centred on where the run was, so a bundle spreads either side of the line
    // it would have drawn on rather than drifting off it.
    const widest = Math.max(...lane.values());
    if (!widest) continue;

    for (const leg of order) {
      const off = (lane.get(leg)! - widest / 2) * LANE;
      const pts = out[leg.id];
      for (const at of [leg.at, leg.at + 1]) {
        if (leg.axis === "x") pts[at].x += off;
        else pts[at].y += off;
      }
    }
  }

  return out;
}
