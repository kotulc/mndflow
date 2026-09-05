/** Where an interface sits.
 *
 *  An interface is **seated** on its owner's edge rather than laid out beside
 *  it: a side and a fraction along it, so the seat survives the owner moving,
 *  growing or being arranged some other way.
 *
 *  **Routing works out every seat.** Where a line meets a border and where an
 *  interface sits along its wall are both derived from the layout each time
 *  the layer is projected — nothing is pinned and nothing is held back from
 *  reassignment when the layer is aligned. */

import { children, is_interface, type Graph, type Id, type Relation,
         type Side } from "@mnd/core";
import type { Placed } from "./arrange";
import { PORT, seat_frac, seat_marks } from "./size";

export type Seat = { side: Side; at: number };

export type Rect = { x: number; y: number; w: number; h: number };

/** Every interface drawn in this layer, seated on the card it belongs to. */
export function seated(graph: Graph, spots: readonly Placed[],
                       at?: ReadonlyMap<Id, number>): Placed[] {
  const out: Placed[] = [];
  for (const p of spots) {
    for (const b of children(graph, p.id)) {
      if (!is_interface(b)) continue;
      out.push({ ...at_seat(p, { side: b.side!, at: at?.get(b.id) ?? 0.5 }), id: b.id });
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
  const out = { x: (at.x - (on.x + on.w / 2)) / (on.w / 2 || 1),
                y: (at.y - (on.y + on.h / 2)) / (on.h / 2 || 1) };
  const side: Side = Math.abs(out.x) >= Math.abs(out.y)
    ? (out.x >= 0 ? "right" : "left")
    : (out.y >= 0 ? "bottom" : "top");

  const down = side === "left" || side === "right";
  const origin = down ? on.y : on.x;
  const extent = down ? on.h : on.w;
  const abs = down ? at.y : at.x;
  const marks = seat_marks(origin, extent);
  const mark = marks.reduce((best, m) =>
    Math.abs(m - abs) < Math.abs(best - abs) ? m : best, marks[0] ?? origin + extent / 2);
  return { side, at: seat_frac(mark, origin, extent) };
}

/** One end of a relationship, met on a border it has no interface for.
 *
 *  **Derived, and nowhere in the graph.** Where a line reaches a card is worked
 *  out from where the two cards ended up and recomputed with every projection. */
export type Perch = { edge: Id; end: "from" | "to"; on: Id; side: Side; at: number };

/** The handle a perch offers. **Named here**, so whoever draws one and whoever
 *  points an edge at it cannot disagree about what it is called. */
export function perch_id(edge: Id, end: "from" | "to"): string {
  return `p-${end}-${edge}`;
}

export type Assigned = { perches: Perch[]; port_at: ReadonlyMap<Id, number> };

/** Where every line end and every interface on a wall sits.
 *
 *  **Worked out wall by wall**, so several lines leaving the same side fan out
 *  from the centre on half-unit lanes and never share a spot. */
export function assign_seats(graph: Graph, links: readonly Relation[],
                             spots: readonly Placed[], boxes: ReadonlyMap<Id, Rect>,
                             frame?: { id: Id; of: Id }): Assigned {
  const walled = (id: Id): Side | undefined => {
    const b = graph.blocks[id];
    return frame && b && is_interface(b) && b.parent === frame.of ? b.side : undefined;
  };

  type Claim = { key: string; on: Id; side: Side; want: number };
  const claims: Claim[] = [];

  for (const p of spots) {
    for (const b of children(graph, p.id)) {
      if (!is_interface(b) || !b.side) continue;
      claims.push({ key: `port:${b.id}`, on: p.id, side: b.side, want: 0.5 });
    }
  }
  if (frame) {
    for (const b of children(graph, frame.of)) {
      if (!is_interface(b) || !b.side || b.parent !== frame.of) continue;
      if (!boxes.get(frame.id)) continue;
      claims.push({ key: `port:${b.id}`, on: frame.id, side: b.side, want: 0.5 });
    }
  }

  for (const e of links) {
    for (const end of ["from", "to"] as const) {
      const id = end === "from" ? e.from : e.to;
      const box = boxes.get(id);
      const other = boxes.get(end === "from" ? e.to : e.from);
      const b = graph.blocks[id];
      if (!box || !other || (b && is_interface(b))) continue;
      const far = end === "from" ? e.to : e.from;
      const side = walled(far) ?? side_for(id, far, box, other, frame);
      claims.push({ key: `${e.id}|${end}`, on: id, side,
                    want: rank_along(box, other, side) });
    }
  }

  const groups = new Map<string, Claim[]>();
  for (const c of claims) {
    const wall = `${c.on}|${c.side}`;
    groups.set(wall, [...(groups.get(wall) ?? []), c]);
  }

  const at = new Map<string, number>();
  for (const group of groups.values()) {
    const { on, side } = group[0]!;
    const box = boxes.get(on);
    if (!box) continue;
    const down = side === "left" || side === "right";
    const origin = down ? box.y : box.x;
    const extent = down ? box.h : box.w;
    for (const [key, spot] of fan_out(group, origin, extent)) at.set(key, spot);
  }

  const perches: Perch[] = [];
  for (const e of links) {
    for (const end of ["from", "to"] as const) {
      const id = end === "from" ? e.from : e.to;
      const b = graph.blocks[id];
      if (!boxes.get(id) || (b && is_interface(b))) continue;
      const key = `${e.id}|${end}`;
      const spot = at.get(key);
      if (spot === undefined) continue;
      const side = claims.find((c) => c.key === key)!.side;
      perches.push({ edge: e.id, end, on: id, side, at: spot });
    }
  }

  const port_at = new Map<Id, number>();
  for (const [key, spot] of at) {
    if (!key.startsWith("port:")) continue;
    port_at.set(key.slice(5), spot);
  }
  return { perches, port_at };
}

/** Where each relationship end meets the box it lands on. */
export function perched(graph: Graph, links: readonly Relation[],
                        boxes: ReadonlyMap<Id, Rect>,
                        frame?: { id: Id; of: Id }): Perch[] {
  const spots = [...boxes.entries()]
    .filter(([id]) => !frame || id !== frame.id)
    .map(([id, box]) => ({ id, ...box }));
  return assign_seats(graph, links, spots, boxes, frame).perches;
}

/** Which wall of `box` faces `other`. */
function side_for(id: Id, far: Id, box: Rect, other: Rect,
                  frame?: { id: Id; of: Id }): Side {
  if (frame && (id === frame.id || far === frame.id)) {
    const card = id === frame.id ? other : box;
    const room = id === frame.id ? box : other;
    return nearest(card, room);
  }
  return facing(box, other);
}

function facing(box: Rect, other: Rect): Side {
  if (holds(box, other)) return nearest(box, other);
  if (holds(other, box)) return nearest(other, box);
  const dx = (other.x + other.w / 2) - (box.x + box.w / 2);
  const dy = (other.y + other.h / 2) - (box.y + box.h / 2);
  const level = other.y < box.y + box.h && box.y < other.y + other.h;
  const aligned = other.x < box.x + box.w && box.x < other.x + other.w;
  if (level && !aligned) return dx >= 0 ? "right" : "left";
  if (aligned && !level) return dy >= 0 ? "bottom" : "top";
  const clear = { x: Math.max(other.x - (box.x + box.w), box.x - (other.x + other.w)),
                  y: Math.max(other.y - (box.y + box.h), box.y - (other.y + other.h)) };
  return clear.x >= clear.y ? (dx >= 0 ? "right" : "left")
                            : (dy >= 0 ? "bottom" : "top");
}

function holds(box: Rect, other: Rect): boolean {
  return other.x >= box.x && other.y >= box.y
      && other.x + other.w <= box.x + box.w && other.y + other.h <= box.y + box.h;
}

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

/** A stable ordering key for several claims on one wall — not where they land.
 *  Seats fan out from the centre; `want` only sorts claims so lanes never cross. */
function rank_along(box: Rect, other: Rect, side: Side): number {
  const down = side === "left" || side === "right";
  return down ? ((other.y + other.h / 2) - box.y) / (box.h || 1)
              : ((other.x + other.w / 2) - box.x) / (box.w || 1);
}

type WallClaim = { key: string; want: number };

/** Assign seats on one wall, fanning out from the centre on half-unit lanes. */
function fan_out(claims: readonly WallClaim[], origin: number,
                 extent: number): Map<string, number> {
  const slots = seat_marks(origin, extent)
    .map((m) => seat_frac(m, origin, extent))
    .sort((a, b) => a - b);
  if (!slots.length) return new Map(claims.map((c) => [c.key, 0.5]));
  const sorted = [...claims].sort((a, b) => a.want - b.want || a.key.localeCompare(b.key));
  const lanes = pick_centered(center_out(slots), sorted.length);
  const out = new Map<string, number>();
  for (let i = 0; i < sorted.length; i++) out.set(sorted[i]!.key, lanes[i]!);
  return out;
}

/** Slots nearest the middle of the wall first. */
function center_out(slots: readonly number[]): number[] {
  return [...slots].sort((a, b) => Math.abs(a - 0.5) - Math.abs(b - 0.5));
}

/** `n` lanes taken from the centre outward, still in left-to-right order. */
function pick_centered(lanes: readonly number[], n: number): number[] {
  if (n === 0) return [];
  if (n >= lanes.length) return [...lanes].sort((a, b) => a - b);
  const by_pos = [...lanes].sort((a, b) => a - b);
  const start = by_pos.indexOf(lanes[0]!);
  let lo = start;
  let hi = start;
  const picked = new Set<number>([lanes[0]!]);
  while (picked.size < n) {
    if (lo > 0) { lo--; picked.add(by_pos[lo]!); }
    if (picked.size < n && hi < by_pos.length - 1) { hi++; picked.add(by_pos[hi]!); }
  }
  return [...picked].sort((a, b) => a - b);
}
