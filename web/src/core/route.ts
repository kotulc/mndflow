/** Orthogonal routing for relationships: the run between two interfaces, and
 *  what dragging one of its segments does to it.
 *
 *  Pure geometry. A run is a list of points, ends included, every consecutive
 *  pair square to the last. The two end segments leave their interface along
 *  the edge it sits on, so dragging one moves the interface rather than
 *  detaching from it; where the interface cannot follow — it has reached the
 *  end of its edge, or the end is implied and has no interface to move — a jog
 *  appears to carry the rest of the drag.
 *
 *  The router itself is deliberately plain. Every segment it produces can be
 *  dragged, so it does not have to be clever about the cases a hand can fix in
 *  a second. */

import type { Spot } from "./types";

export type Axis = "x" | "y";
/** How far an end's interface may slide, in canvas units along the one axis
 *  its frame edge runs. Null where there is no interface of our own to move. */
export type Reach = { lo: number; hi: number } | null;
/** Where a drag has asked an end's interface to move to. */
export type Move = { end: "from" | "to"; at: number };

/** How far a run stands off a frame edge before turning. */
const STUB = 24;
/** Below this two coordinates are the same point, in canvas units. */
const NEAR = 1;
/** Below this they are in line as far as anyone can see. Enough to absorb what
 *  measuring a frame edge on screen rounds away, and not enough to swallow a
 *  turn somebody meant. Aiming for level is a separate matter — that is the
 *  drag's own `snap`, which is reckoned in screen pixels. */
const LEVEL = 2.5;

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
 *  already. A bend of a pixel or two is never what anyone meant, and it is far
 *  too small to take hold of and drag out again — so it is not made. */
function inline(last: Spot, p: Spot): Spot {
  const dx = Math.abs(last.x - p.x);
  const dy = Math.abs(last.y - p.y);
  if (dx < LEVEL && dx <= dy) return { x: last.x, y: p.y };
  if (dy < LEVEL) return { x: p.x, y: last.y };

  return p;
}

/** The axis a segment moves along — the one across it, since sliding a segment
 *  along its own length changes nothing. Null where it has no length. */
export function across(a: Spot, b: Spot): Axis | null {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  if (dx < NEAR && dy < NEAR) return null;

  return dx < NEAR ? "x" : "y";
}

/** The plain run between two ends: out along each one's own edge, then across.
 *  Corners only — the ends are added by {@link runOf}. */
function plain(from: Spot, out: Spot, to: Spot, back: Spot): Spot[] {
  const a = { x: from.x + out.x * STUB, y: from.y + out.y * STUB };
  const b = { x: to.x + back.x * STUB, y: to.y + back.y * STUB };
  const main: Axis = out.x ? "x" : "y";
  const side: Axis = main === "x" ? "y" : "x";

  // Facing each other: out from both, and across the middle.
  if (out[main] === -back[main]) {
    if (Math.abs(from[side] - to[side]) < NEAR) return [];
    const mid = (a[main] + b[main]) / 2;

    return [spot(main, mid, side, from[side]), spot(main, mid, side, to[side])];
  }

  // Facing the same way: out past the further of the two, then across.
  if (out[main] === back[main]) {
    const far = out[main] > 0 ? Math.max(a[main], b[main]) : Math.min(a[main], b[main]);

    return [spot(main, far, side, from[side]), spot(main, far, side, to[side])];
  }

  // At right angles: one corner, where the two runs meet.
  return [spot(main, b[main], side, from[side])];
}

/** Drop points that repeat their neighbour or sit in the middle of a straight
 *  stretch, so a run has one point per corner and no more. */
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

/** Force a run square, and square in the right places.
 *
 *  Every segment comes out along one axis only, the first leaving its interface
 *  the way that frame edge faces and the last arriving at the other the same
 *  way. Where two points in a row are off in both directions, a corner goes
 *  between them, continuing the way the run was already travelling.
 *
 *  Every run is put through this, whatever it came from: the plain route, one
 *  dragged into shape, or one saved before its cards and interfaces were moved
 *  about. Repairing each end on its own was not enough — a route down to a
 *  single corner has both ends laying claim to it, and the second undid what
 *  the first had just set, which is how straightening a line left it with an
 *  angle that was not a right angle. */
function squared(from: Spot, out: Spot, corners: Spot[], to: Spot, back: Spot): Spot[] {
  const run: Spot[] = [{ ...from }];

  // Copied in, so that bringing the run into line with an interface below
  // never reaches back into the corners the caller handed us.
  const add = (p: Spot) => {
    const last = run[run.length - 1];
    if (Math.abs(last.x - p.x) >= NEAR || Math.abs(last.y - p.y) >= NEAR) run.push({ ...p });
  };

  /** The axis the run is travelling along as it stands. */
  const going = (): Axis => {
    const [before, last] = run.slice(-2);
    if (!before) return facing(out);

    return Math.abs(before.x - last.x) < NEAR ? "y" : "x";
  };

  /** Reach a point, turning once on the way where it is off in both — and
   *  coming into line with where the run stands where it is nearly there.
   *
   *  `tied` names a coordinate that may not be given up. The stand-off in front
   *  of an interface holds that interface's own coordinate, and coming into
   *  line with the run behind it would take the line off the port it has to
   *  meet — which is a diagonal at the last segment, not a tidier route. */
  const reach = (p: Spot, tied?: Axis) => {
    const last = run[run.length - 1];
    const near = inline(last, p);
    const at = tied && Math.abs(near[tied] - p[tied]) >= NEAR ? p : near;
    if (Math.abs(last.x - at.x) >= NEAR && Math.abs(last.y - at.y) >= NEAR) {
      add(going() === "x" ? { x: at.x, y: last.y } : { x: last.x, y: at.y });
    }
    add(at);
  };

  // Out along the edge it sits on, whatever the corners beyond it now say...
  add({ x: from.x + out.x * STUB, y: from.y + out.y * STUB });
  for (const corner of corners) reach(corner);

  // ...and in along the other's. The interface at that end cannot come to the
  // run, so the run comes to it: its last corner is brought into line where it
  // is nearly there, rather than a bend of a pixel or two being left sitting
  // in front of the port. Only where the segment behind that corner runs the
  // same way, so moving it lengthens that segment rather than bending it.
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

/** The whole run, end to end: the two interfaces and the corners between them.
 *  Saved corners are followed where there are any, and the plain route stands
 *  in where there are none. Square either way, and straight wherever the
 *  corners have nothing left to say. */
export function runOf(from: Spot, out: Spot, to: Spot, back: Spot,
                      corners: Spot[]): Spot[] {
  return squared(from, out, corners.length ? corners : plain(from, out, to, back), to, back);
}

/** The run after one of its segments has been dragged to `at` along the axis
 *  across it.
 *
 *  The corners the segment owns simply follow. An end it touches is an
 *  interface, which slides as far along its own edge as it can reach; where
 *  that is not far enough the interface stops and a jog carries the rest, so
 *  the line still meets it square. */
export function drag(run: Spot[], seg: number, to: number, out: Spot, back: Spot,
                     reach: { from: Reach; to: Reach },
                     snap = LEVEL): { corners: Spot[]; moves: Move[] } {
  const axis = across(run[seg], run[seg + 1]);
  if (!axis) return { corners: run.slice(1, -1), moves: [] };

  // Nearly in line with one of the ends is taken to mean in line with it, so a
  // segment dragged towards straight arrives there rather than stopping a
  // pixel short and leaving a jog too small to have been meant. `snap` comes
  // from the caller in canvas units, worked out from a fixed distance on
  // screen, so aiming feels the same however far the layer is zoomed out.
  const ends = [run[0][axis], run[run.length - 1][axis]];
  const level = ends.find((end) => Math.abs(end - to) < snap);
  const at = level ?? to;

  const corners = run.slice(1, -1).map((p) => ({ ...p }));
  const head = seg === 0;
  const tail = seg === run.length - 2;
  const moves: Move[] = [];

  // Corners of its own move with it; ends are the interfaces, handled below.
  if (!head) corners[seg - 1][axis] = at;
  if (!tail) corners[seg][axis] = at;

  /** One end: slide its interface, and jog from wherever it came to rest.
   *  An arrow rather than a declaration, so the axis stays narrowed in here. */
  const settle = (end: "from" | "to", point: Spot, away: Spot, span: Reach) => {
    const landed = span ? clamp(at, span.lo, span.hi) : point[axis];
    if (span) moves.push({ end, at: landed });
    if (Math.abs(landed - at) < NEAR) return;

    // Out of reach: the run leaves the interface where it is, stands off the
    // edge, and crosses to where the drag asked for.
    const stand = { x: point.x + away.x * STUB, y: point.y + away.y * STUB };
    stand[axis] = landed;
    const jog = [{ ...stand }, { ...stand, [axis]: at }];

    end === "from" ? corners.unshift(...jog) : corners.push(...jog.reverse());
  };

  if (head) settle("from", run[0], out, reach.from);
  if (tail) settle("to", run[run.length - 1], back, reach.to);

  return { corners: tidy(corners), moves };
}
