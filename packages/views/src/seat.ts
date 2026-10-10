/** Where line ends and interfaces meet a border: one anchor per face, interfaces beside it. */

import { children, edge_base, is_group, is_interface, type Flow, type Graph, type Id, type Relation,
         type Side } from "@mnd/core";
import { STUB } from "./route";
import { PORT, SEAT, seat_frac, seat_marks } from "./size";

export type Seat = { side: Side; at: number };

export type Rect = { x: number; y: number; w: number; h: number };

/** One end of a relationship, met on a border it has no interface for. */
export type Perch = { edge: Id; end: "from" | "to"; on: Id; side: Side; at: number };

/** Where a run's cross leg sits: this far out from the face of the end its lines fan from. */
export type Fan = { end: "from" | "to"; by: number };

/** Every line end and interface on a layer, seated. */
export type Seating = {
  perches: Perch[];
  /** Each interface's seat, stated or worked out. */
  ports: Map<Id, Seat>;
  fans: Map<Id, Fan>;
  /** Ties between boxes that overlap, which draw nothing. */
  hidden: Set<Id>;
};

/** Where an interface with no lines sits, by its flow: as the definition view lays them. */
const RESTS: Record<Flow, Side> = { in: "left", out: "right", both: "bottom" };

/** The handle a perch offers. */
export function perch_id(edge: Id, end: "from" | "to"): string {
  return `p-${end}-${edge}`;
}

/** The box an interface takes: straddling the edge, centred on its seat. */
export function at_seat(on: Rect, seat: Seat): Rect {
  const mid = point_at(on, seat);
  return { x: mid.x - PORT.w / 2, y: mid.y - PORT.h / 2, ...PORT };
}

/** The point on a border a seat names. */
function point_at(on: Rect, seat: Seat): { x: number; y: number } {
  const t = Math.min(1, Math.max(0, seat.at));
  const along = { x: on.x + on.w * t, y: on.y + on.h * t };
  return seat.side === "top" ? { x: along.x, y: on.y }
    : seat.side === "bottom" ? { x: along.x, y: on.y + on.h }
    : seat.side === "left" ? { x: on.x, y: along.y }
    : { x: on.x + on.w, y: along.y };
}

/** Which free seat a point asks for: the nearest edge, and the free mark along it nearest the
 *  point. A seat in `taken` is passed over while another is free. */
export function nearest_seat(on: Rect, at: { x: number; y: number },
                             taken: readonly Seat[] = []): Seat {
  const out = { x: (at.x - (on.x + on.w / 2)) / (on.w / 2 || 1),
                y: (at.y - (on.y + on.h / 2)) / (on.h / 2 || 1) };
  const side: Side = Math.abs(out.x) >= Math.abs(out.y)
    ? (out.x >= 0 ? "right" : "left")
    : (out.y >= 0 ? "bottom" : "top");
  const down = side === "left" || side === "right";
  const used = taken.filter((t) => t.side === side)
    .map((t) => origin(on, side) + t.at * extent(on, side));
  return { side, at: free_at(on, side, down ? at.y : at.x, used) };
}

/** Every line end and interface on a layer, seated. `boxes` holds every card drawn, and the room
 *  under `frame.id` where the layer is seen from inside. */
export function seat_all(graph: Graph, links: readonly Relation[], boxes: ReadonlyMap<Id, Rect>,
                         frame?: { id: Id; of: Id }): Seating {
  const room = frame ? boxes.get(frame.id) : undefined;
  /** Which interfaces sit on which box: the room's are the layer's own. */
  const owned = new Map<Id, Id>();
  for (const on of boxes.keys()) {
    const of = on === frame?.id ? frame.of : on;
    for (const b of children(graph, of)) if (is_interface(graph, b.id)) owned.set(b.id, on);
  }
  const owner = (id: Id): Id => owned.get(id) ?? id;
  const box_of = (id: Id): Rect | undefined => boxes.get(owner(id));
  const ties = links.filter((e) => edge_base(graph, e.id) === "tie");
  const lines = links.filter((e) => edge_base(graph, e.id) !== "tie"
                                 && box_of(e.from) && box_of(e.to));

  const perches: Perch[] = [];
  const ports = new Map<Id, Seat>();
  /** Absolute positions along each wall already spoken for, keyed `box|side`. */
  const taken = new Map<string, number[]>();
  const take = (on: Id, side: Side, at: number) => {
    const key = `${on}|${side}`;
    taken.set(key, [...(taken.get(key) ?? []), at]);
  };

  /** Which way a card end looks: at the room's nearest wall, else at the other end. */
  const face_of = (id: Id, far: Id): Side => {
    const box = boxes.get(id)!;
    if (room && owner(far) === frame!.id) return ports.get(far)?.side ?? nearest(room, box);
    const other = owned.has(far) && ports.has(far) ? at_seat(box_of(far)!, ports.get(far)!)
                                                    : box_of(far)!;
    return facing(box, other);
  };

  /** Placed interfaces keep their seat, and no line lands on one. */
  const held = new Map<string, number[]>();
  for (const [id, on] of owned) {
    const seat = stated(graph, id);
    if (!seat) continue;
    ports.set(id, seat);
    const box = boxes.get(on)!;
    const at = origin(box, seat.side) + seat.at * extent(box, seat.side);
    take(on, seat.side, at);
    held.set(`${on}|${seat.side}`, [...(held.get(`${on}|${seat.side}`) ?? []), at]);
  }

  /** Where a card face's lines meet it: its middle, else the free mark nearest it where a placed
   *  interface sits there. Every line on the face shares it. */
  const anchor_at = (on: Id, side: Side): number => {
    const box = boxes.get(on)!;
    const mid = origin(box, side) + extent(box, side) / 2;
    return free_at(box, side, mid, held.get(`${on}|${side}`) ?? []);
  };

  /** Where an end on a box — the room, or a box drawn round others — meets its wall: straight
   *  across from where the other end leaves, its anchor or its interface. On a box, only where
   *  that lies along the wall. */
  const across_box = (id: Id, far: Id): { side: Side; along: number } | null => {
    const card = boxes.get(far);
    const seat = owned.has(far) ? ports.get(far) : undefined;
    if (!card && !seat) return null;
    const box = boxes.get(id)!;
    const is_room = id === frame?.id;
    const leave = card ? face_of(far, id) : null;
    const side = leave ? (is_room ? leave : OPPOSITE[leave])
                       : is_room ? nearest(box, box_of(far)!) : facing(box, box_of(far)!);
    const mid = card ? point_at(card, { side: leave!, at: anchor_at(far, leave!) })
                     : point_at(box_of(far)!, seat!);
    const along = side === "left" || side === "right" ? mid.y : mid.x;
    const o = origin(box, side);
    const on = along >= o + SEAT && along <= o + extent(box, side) - SEAT;
    return is_room || on ? { side, along } : null;
  };

  /** A card end: the face looking at the other end, at its anchor. An end on a box meets it
   *  straight across from the other end, where it can. */
  const anchor = (e: Relation, end: "from" | "to") => {
    const id = e[end];
    const far = end === "from" ? e.to : e.from;
    if (owned.has(id)) return;
    const straight = id === frame?.id || is_group(graph, id) ? across_box(id, far) : null;
    if (straight) {
      const box = boxes.get(id)!;
      const at = seat_frac(straight.along, origin(box, straight.side), extent(box, straight.side));
      perches.push({ edge: e.id, end, on: id, side: straight.side, at });
      take(id, straight.side, straight.along);
      return;
    }
    if (id === frame?.id) return;
    const side = face_of(id, far);
    const at = anchor_at(id, side);
    perches.push({ edge: e.id, end, on: id, side, at });
    take(id, side, origin(boxes.get(id)!, side) + at * extent(boxes.get(id)!, side));
  };

  /** Ends meeting no interface come first: the faces they take are what interfaces sit beside. */
  const to_port = (e: Relation) => owned.has(e.from) || owned.has(e.to);
  for (const e of lines.filter((l) => !to_port(l))) for (const end of ENDS) anchor(e, end);
  /** A card end meeting an interface claims its face's anchor too, read off the interface's
   *  owner until the interface is seated. */
  for (const e of lines.filter(to_port)) {
    for (const end of ENDS) {
      const id = e[end];
      if (owned.has(id) || !boxes.has(id) || id === frame?.id) continue;
      const side = facing(boxes.get(id)!, box_of(end === "from" ? e.to : e.from)!);
      const box = boxes.get(id)!;
      take(id, side, origin(box, side) + anchor_at(id, side) * extent(box, side));
    }
  }

  /** The rest place themselves: on the face most of their lines look out of, at the free mark
   *  nearest where they are wanted — the middle, where no line has taken it. */
  for (const [id, on] of [...owned].sort(([a], [b]) => a.localeCompare(b))) {
    if (ports.has(id)) continue;
    const box = boxes.get(on)!;
    const fars = lines.filter((e) => e.from === id || e.to === id)
      .map((e) => (e.from === id ? e.to : e.from)).filter((f) => owner(f) !== on);
    /** On the room, straight across from the first card it links. */
    const toward = on === frame?.id && fars[0] ? box_of(fars[0]) : undefined;
    const side = on === frame?.id
      ? (toward ? nearest(box, toward) : rest(graph, id))
      : most(fars.map((f) => facing(box, box_of(f)!))) ?? rest(graph, id);
    const want = toward
      ? (side === "left" || side === "right" ? toward.y + toward.h / 2 : toward.x + toward.w / 2)
      : origin(box, side) + extent(box, side) / 2;
    const seat = { side, at: free_at(box, side, want, taken.get(`${on}|${side}`) ?? []) };
    ports.set(id, seat);
    take(on, side, origin(box, side) + seat.at * extent(box, side));
  }

  /** Ends meeting an interface look at where it now sits. */
  for (const e of lines.filter(to_port)) for (const end of ENDS) anchor(e, end);

  /** Two boxes facing each other squarely, met straight across the gap: at the middle of where
   *  their faces overlap, where no line or interface is there already. */
  const across = (ia: Id, a: Rect, ib: Id, b: Rect): [Seat, Seat] | null => {
    const sa = facing(a, b);
    const sb = facing(b, a);
    const down = sa === "left" || sa === "right";
    const lo = Math.max(down ? a.y : a.x, down ? b.y : b.x);
    const hi = Math.min(down ? a.y + a.h : a.x + a.w, down ? b.y + b.h : b.x + b.w);
    if (hi <= lo || (sa === "left" || sa === "right") !== (sb === "left" || sb === "right")) {
      return null;
    }
    const mid = (lo + hi) / 2;
    const free = (id: Id, side: Side) =>
      (taken.get(`${id}|${side}`) ?? []).every((t) => Math.abs(t - mid) >= SEAT / 2);
    if (!free(ia, sa) || !free(ib, sb)) return null;
    return [{ side: sa, at: seat_frac(mid, origin(a, sa), extent(a, sa)) },
            { side: sb, at: seat_frac(mid, origin(b, sb), extent(b, sb)) }];
  };

  /** A tie meets a card or the room straight across where they face each other, else at their
   *  nearest corners; an interface at its middle. */
  const hidden = new Set<Id>();
  const tie_box = (id: Id): Rect | undefined => {
    const seat = owned.has(id) ? ports.get(id) : undefined;
    return seat ? at_seat(box_of(id)!, seat) : boxes.get(id);
  };
  for (const e of ties) {
    const a = tie_box(e.from);
    const b = tie_box(e.to);
    if (!a || !b) continue;
    if (overlaps(a, b) && !holds(a, b) && !holds(b, a)) { hidden.add(e.id); continue; }
    const [p, q] = across(e.from, a, e.to, b) ?? corners(a, b);
    if (!owned.has(e.from)) perches.push({ edge: e.id, end: "from", on: e.from, ...p });
    if (!owned.has(e.to)) perches.push({ edge: e.id, end: "to", on: e.to, ...q });
  }

  return { perches, ports, fans: fans_of(lines, perches, ports, owned, boxes, frame?.id), hidden };
}

const ENDS = ["from", "to"] as const;

const OPPOSITE: Record<Side, Side> = { left: "right", right: "left", top: "bottom", bottom: "top" };

/** A card's corners, as seats at either end of its top and bottom. */
const CORNERS: readonly Seat[] = [{ side: "top", at: 0 }, { side: "top", at: 1 },
                                  { side: "bottom", at: 0 }, { side: "bottom", at: 1 }];

/** The nearest corners of two boxes, one on each. */
function corners(a: Rect, b: Rect): [Seat, Seat] {
  let best = { d: Infinity, from: CORNERS[0]!, to: CORNERS[0]! };
  for (const p of CORNERS) {
    for (const q of CORNERS) {
      const s = point_at(a, p);
      const t = point_at(b, q);
      const d = Math.hypot(t.x - s.x, t.y - s.y);
      if (d < best.d - 0.5) best = { d, from: p, to: q };
    }
  }
  return [best.from, best.to];
}

/** Where each line turns: out from the busier end, halfway to the nearest card its anchor reaches.
 *  The room's wall is never an end lines fan from. */
function fans_of(lines: readonly Relation[], perches: readonly Perch[],
                 ports: ReadonlyMap<Id, Seat>, owned: ReadonlyMap<Id, Id>,
                 boxes: ReadonlyMap<Id, Rect>, room?: Id): Map<Id, Fan> {
  const met = new Map(perches.map((p) => [`${p.edge}|${p.end}`, p]));
  /** Where an end meets its border: the card it leaves, or the point of the seat it meets. */
  const meets = (e: Relation, end: "from" | "to") => {
    const perch = met.get(`${e.id}|${end}`);
    const on = perch?.on ?? owned.get(e[end]);
    const seat = perch && perch.on !== room ? null : perch ?? ports.get(e[end]);
    const side = (perch ?? seat)?.side;
    if (!on || !side) return null;
    return { on, side, key: perch ? `${on}|${side}` : `port|${e[end]}`,
             box: seat ? { ...point_at(boxes.get(on)!, seat), w: 0, h: 0 } : boxes.get(on)! };
  };
  /** Each end's anchor, where its lines fan from it: never on the room's wall. */
  const anchor_of = (e: Relation, end: "from" | "to") => {
    const m = meets(e, end);
    return m && m.on !== room ? m : null;
  };

  /** How many lines share each anchor, and how far out they part. */
  const count = new Map<string, number>();
  const reach = new Map<string, number>();
  for (const e of lines) {
    for (const end of ENDS) {
      const a = anchor_of(e, end);
      const far = meets(e, end === "from" ? "to" : "from")?.box;
      if (!a || !far) continue;
      count.set(a.key, (count.get(a.key) ?? 0) + 1);
      const gap = clear_of(a.box, a.side, far);
      if (gap > 0) reach.set(a.key, Math.min(reach.get(a.key) ?? Infinity, gap));
    }
  }

  const out = new Map<Id, Fan>();
  for (const e of lines) {
    const a = anchor_of(e, "from");
    const b = anchor_of(e, "to");
    const busier = !b || (a && count.get(a.key)! >= count.get(b.key)!) ? "from" : "to";
    const hub = busier === "from" ? a : b;
    if (!hub) continue;
    const gap = reach.get(hub.key);
    out.set(e.id, { end: busier, by: gap === undefined ? STUB : Math.max(STUB / 2, gap / 2) });
  }
  return out;
}

/** How far `other` lies out of `box`'s face, square to it. */
function clear_of(box: Rect, side: Side, other: Rect): number {
  return side === "right" ? other.x - (box.x + box.w)
    : side === "left" ? box.x - (other.x + other.w)
    : side === "bottom" ? other.y - (box.y + box.h)
    : box.y - (other.y + other.h);
}

/** An interface's own seat, where it was placed. */
function stated(graph: Graph, id: Id): Seat | null {
  const b = graph.blocks[id];
  return b?.side && typeof b.at === "number" ? { side: b.side, at: b.at } : null;
}

/** Where an interface with no lines rests. */
function rest(graph: Graph, id: Id): Side {
  return RESTS[graph.blocks[id]?.flow ?? "both"];
}

/** The side said most often, the first said winning a tie. */
function most(sides: readonly Side[]): Side | undefined {
  let best: Side | undefined;
  let n = 0;
  for (const s of sides) {
    const k = sides.filter((x) => x === s).length;
    if (k > n) { best = s; n = k; }
  }
  return best;
}

/** The free mark on a wall nearest `want`, as a fraction; the nearest of all where none is free. */
function free_at(on: Rect, side: Side, want: number, used: readonly number[]): number {
  const o = origin(on, side);
  const n = extent(on, side);
  const marks = seat_marks(o, n).sort((a, b) => Math.abs(a - want) - Math.abs(b - want) || a - b);
  const free = marks.find((m) => used.every((u) => Math.abs(u - m) >= SEAT / 2));
  return seat_frac(free ?? marks[0] ?? o + n / 2, o, n);
}

function origin(on: Rect, side: Side): number {
  return side === "left" || side === "right" ? on.y : on.x;
}

function extent(on: Rect, side: Side): number {
  return side === "left" || side === "right" ? on.h : on.w;
}

/** Which face of `box` looks at `other`. */
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

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Which wall of `box` lies nearest `other`, inside it. */
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
