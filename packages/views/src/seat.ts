/** Where an interface sits.
 *
 *  An interface is **seated** on its owner's edge rather than laid out beside
 *  it: a side and a fraction along it, so the seat survives the owner moving,
 *  growing or being arranged some other way.
 *
 *  **A slide is still ours to read.** The canvas says where a drag came to
 *  rest; which wall that is and how far along it are questions about this
 *  model, and no drawing library has an opinion on them.
 *
 *  A line's end is seated here too, and **that one is derived** — a perch is
 *  recomputed from where the two cards ended up, so only the wall it was pinned
 *  to is ever stored. Which card an end landed on is `onReconnect`'s, which
 *  names the card rather than a point to measure. */

import { children, is_interface, type Graph, type Id, type Relation,
         type Side } from "@mnd/core";
import type { Placed } from "./arrange";
import { PORT, seat_at, seats } from "./size";

export type Seat = { side: Side; at: number };

export type Rect = { x: number; y: number; w: number; h: number };

/** Every interface drawn in this layer, seated on the card it belongs to. */
export function seated(graph: Graph, spots: readonly Placed[]): Placed[] {
  const out: Placed[] = [];
  for (const p of spots) {
    for (const b of children(graph, p.id)) {
      if (!is_interface(b)) continue;
      out.push({ ...at_seat(p, { side: b.side!, at: b.at ?? 0.5 }), id: b.id });
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

/** The box an interface takes: straddling the edge, centred on its seat.
 *
 *  Any rectangle will do, not only a card's — **a layer's own interfaces are
 *  seated on the frame the same way**, and the frame is a rectangle somebody
 *  else worked out. */
export function at_seat(on: Rect, seat: Seat): Rect {
  const t = Math.min(1, Math.max(0, seat.at));
  const along = { x: on.x + on.w * t, y: on.y + on.h * t };
  const mid = seat.side === "top" ? { x: along.x, y: on.y }
            : seat.side === "bottom" ? { x: along.x, y: on.y + on.h }
            : seat.side === "left" ? { x: on.x, y: along.y }
            : { x: on.x + on.w, y: along.y };
  return { x: mid.x - PORT.w / 2, y: mid.y - PORT.h / 2, ...PORT };
}

/** Which seat a point asks for: the nearest edge, and the seat along it the
 *  point falls closest to. Seats are discrete, so a slide lands somewhere it
 *  can be landed on again. */
export function nearest_seat(on: Rect, at: { x: number; y: number }): Seat {
  /** How far out of the middle, in halves of the card. Measuring against the
   *  walls themselves would give a wide, short card a top wall that reaches
   *  further than its right one — every point outside would read *top*. */
  const out = { x: (at.x - (on.x + on.w / 2)) / (on.w / 2 || 1),
                y: (at.y - (on.y + on.h / 2)) / (on.h / 2 || 1) };
  const side: Side = Math.abs(out.x) >= Math.abs(out.y)
    ? (out.x >= 0 ? "right" : "left")
    : (out.y >= 0 ? "bottom" : "top");

  const down = side === "left" || side === "right";
  const length = down ? on.h : on.w;
  const along = down ? (at.y - on.y) / (on.h || 1) : (at.x - on.x) / (on.w || 1);
  const count = seats(length);
  const n = Math.min(count - 1, Math.max(0, Math.round(along * (count + 1) - 1)));
  return { side, at: seat_at(n, count) };
}

/** One end of a relationship, met on a border it has no interface for.
 *
 *  **Derived, and nowhere in the graph.** Where a line reaches a card is a fact
 *  about where the two cards ended up, so it is recomputed with the layout and
 *  never stored. Only the wall may be pinned by hand — that is `set_side`, and
 *  the seat along it is still worked out. */
export type Perch = { edge: Id; end: "from" | "to"; on: Id; side: Side; at: number };

/** The handle a perch offers. **Named here**, so whoever draws one and whoever
 *  points an edge at it cannot disagree about what it is called. */
export function perch_id(edge: Id, end: "from" | "to"): string {
  return `p-${end}-${edge}`;
}

/** Where each relationship end meets the box it lands on.
 *
 *  **Only the ends with no interface of their own.** An end seated on an
 *  interface already has a place on that wall; every other end just meets the
 *  border, and a square drawn there would claim a port the model does not have.
 *
 *  The wall is the one facing the box at the other end unless somebody walled
 *  it by hand. The seat along it is the free one nearest where the straight run
 *  between the two crosses that border — so a line stays short, and two of them
 *  never land on the same spot. */
export function perched(graph: Graph, links: readonly Relation[],
                        boxes: ReadonlyMap<Id, Rect>,
                        frame?: { id: Id; of: Id }): Perch[] {
  const used = new Map<string, Set<number>>();
  /** Whose interfaces sit on this border. **The frame is not a block**, so the
   *  walls you are inside are the layer's and the seats on them are the
   *  layer's own interfaces. */
  const holder = (on: Id) => (frame && on === frame.id ? frame.of : on);

  /** Seats already spoken for on this wall: the interfaces set into it, plus
   *  whatever earlier ends have taken. */
  const wall = (on: Id, side: Side): Set<number> => {
    const key = `${on}|${side}`;
    const held = used.get(key);
    if (held) return held;
    const taken = new Set<number>();
    for (const b of children(graph, holder(on))) {
      if (is_interface(b) && b.side === side) taken.add(b.at ?? 0.5);
    }
    used.set(key, taken);
    return taken;
  };

  const out: Perch[] = [];
  for (const e of links) {
    for (const end of ["from", "to"] as const) {
      const id = end === "from" ? e.from : e.to;
      const box = boxes.get(id);
      const other = boxes.get(end === "from" ? e.to : e.from);
      const b = graph.blocks[id];
      /** An end already seated on an interface has its wall; the frame has no
       *  block behind it and is a plain border like any other. */
      if (!box || !other || (b && is_interface(b))) continue;
      const side = (end === "from" ? e.fromSide : e.toSide) ?? facing(box, other);
      /** A fraction is only ever there because somebody dragged this end, and a
       *  seat somebody chose is not one to hand out again. */
      const pinned = end === "from" ? e.fromAt : e.toAt;
      const taken = wall(id, side);
      const at = pinned ?? free(taken, box, other, side);
      if (pinned !== undefined) taken.add(pinned);
      out.push({ edge: e.id, end, on: id, side, at });
    }
  }
  return out;
}

/** Which wall of `box` faces `other`.
 *
 *  **A straight line beats a short one.** Where the two boxes overlap along an
 *  axis there is a wall that lets the run cross without a bend, and taking it is
 *  what the eye reads as *these two are joined*; centre-to-centre alone picks
 *  the near wall and leaves a dog-leg on every pair that is not exactly level.
 *  Where they overlap on neither axis nothing is straight, and the nearer wall
 *  is the shorter run.
 *
 *  **A wall seen from inside is a different question.** The frame is the room
 *  the other box is standing in, so every wall is level with it and aligned
 *  with it, and the rule above falls through to a direction from the middle —
 *  which sends a line from a card near the top of a tall room out of the side.
 *  Held inside, the wall it faces is simply the nearest one. */
function facing(box: Rect, other: Rect): Side {
  if (holds(box, other)) return nearest(box, other);
  const dx = (other.x + other.w / 2) - (box.x + box.w / 2);
  const dy = (other.y + other.h / 2) - (box.y + box.h / 2);
  const level = other.y < box.y + box.h && box.y < other.y + other.h;
  const aligned = other.x < box.x + box.w && box.x < other.x + other.w;
  if (level && !aligned) return dx >= 0 ? "right" : "left";
  if (aligned && !level) return dy >= 0 ? "bottom" : "top";
  return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? "right" : "left")
                                      : (dy >= 0 ? "bottom" : "top");
}

/** Whether `other` sits wholly within `box`. */
function holds(box: Rect, other: Rect): boolean {
  return other.x >= box.x && other.y >= box.y
      && other.x + other.w <= box.x + box.w && other.y + other.h <= box.y + box.h;
}

/** The wall of `box` that `other` is closest to, from within. */
function nearest(box: Rect, other: Rect): Side {
  const gap: Record<Side, number> = {
    left: other.x - box.x,
    right: (box.x + box.w) - (other.x + other.w),
    top: other.y - box.y,
    bottom: (box.y + box.h) - (other.y + other.h),
  };
  return (["left", "right", "top", "bottom"] as const)
    .reduce((a, b) => (gap[b] < gap[a] ? b : a));
}

/** The free seat on this wall nearest where the run between the two crosses it.
 *  Claimed as it is handed out, so two ends never share one. */
function free(taken: Set<number>, box: Rect, other: Rect, side: Side): number {
  const down = side === "left" || side === "right";
  const want = down ? ((other.y + other.h / 2) - box.y) / (box.h || 1)
                    : ((other.x + other.w / 2) - box.x) / (box.w || 1);
  const count = seats(down ? box.h : box.w);
  let best = seat_at(0, count);
  let gap = Infinity;
  for (let n = 0; n < count; n++) {
    const spot = seat_at(n, count);
    if (taken.has(spot)) continue;
    const off = Math.abs(spot - want);
    if (off < gap) { gap = off; best = spot; }
  }
  taken.add(best);
  return best;
}
