/** Auto-layout: related clusters placed around their mates, and satellites seated beside theirs. */

import { edge_module, edges_in, is_holder, is_note, is_reference, type Arrangement, type Block,
         type Graph, type Id, type Point, type Relation } from "@mnd/core";
import type { Placed } from "./arrange";
import { loose_unit, member_in_holder, type Sized } from "./bands";
import { on_unit, size_of, snap, GAP, UNIT, type Size } from "./size";

type Rect = { x: number; y: number; w: number; h: number };
type Side = "left" | "right" | "above" | "below";


/** Auto-layout: related clusters first, leftovers on a square-ish shelf. */
export function pack_units(graph: Graph, layer: Id | null, sized: Sized[],
                    unit: (id: Id) => Id,
                    edges = edges_in(graph, layer)): Placed[] {
  if (!sized.length) return [];
  const by_id = new Map(sized.map((it) => [it.b.id, it]));
  const components = connected(graph, layer, sized.map((it) => it.b), unit, edges);
  const local = components.map((comp) => {
    const order = placement_order(graph, layer, comp, unit, edges);
    const items = order.map((b) => by_id.get(b.id)!);
    return place_cluster(graph, layer, items, unit, edges);
  });
  return shelf(local);
}

/** Connected components of the placement graph, largest first, then tree order. */
function connected(graph: Graph, layer: Id | null, units: Block[],
                   unit: (id: Id) => Id,
                   edges = edges_in(graph, layer)): Block[][] {
  const by_id = new Map(units.map((b) => [b.id, b]));
  const ids = new Set(units.map((b) => b.id));
  const adj = new Map<Id, Id[]>();
  for (const [a, b] of placement_links(graph, layer, ids, unit, edges)) {
    adj.set(a, [...new Set([...(adj.get(a) ?? []), b])]);
    adj.set(b, [...new Set([...(adj.get(b) ?? []), a])]);
  }
  const sorted = [...units].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  const seen = new Set<Id>();
  const out: Block[][] = [];
  for (const start of sorted) {
    if (seen.has(start.id)) continue;
    const comp: Block[] = [];
    const queue = [start.id];
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const b = by_id.get(id);
      if (b) comp.push(b);
      const next = [...(adj.get(id) ?? [])].sort((a, b) =>
        (by_id.get(a)?.order ?? 0) - (by_id.get(b)?.order ?? 0) || a.localeCompare(b));
      for (const n of next) if (!seen.has(n) && ids.has(n)) queue.push(n);
    }
    out.push(comp);
  }
  return out.sort((a, b) => b.length - a.length
    || (a[0]!.order ?? 0) - (b[0]!.order ?? 0)
    || a[0]!.id.localeCompare(b[0]!.id));
}

/** One related cluster, each unit in the nearest free cell around a mate. */
function place_cluster(graph: Graph, layer: Id | null, items: Sized[],
                       unit: (id: Id) => Id,
                       edges = edges_in(graph, layer)): Placed[] {
  const out: Placed[] = [];
  for (const it of items) {
    const hint = desired_at(graph, layer, it.b.id, out, unit, it.s, edges);
    const at = hint ?? { x: 0, y: 0 };
    out.push({ id: it.b.id, ...fit(out, at, it.s), ...it.s });
  }
  if (!out.length) return out;
  const ox = Math.min(...out.map((p) => p.x));
  const oy = Math.min(...out.map((p) => p.y));
  return out.map((p) => ({ ...p, x: p.x - ox, y: p.y - oy }));
}

/** Shelf component bounding boxes into a block about as wide as it is tall. */
function shelf(components: Placed[][]): Placed[] {
  const boxes = components.filter((spots) => spots.length);
  if (boxes.length === 0) return [];
  if (boxes.length === 1) return boxes[0]!;
  const framed = boxes.map((spots) => {
    const x = Math.min(...spots.map((p) => p.x));
    const y = Math.min(...spots.map((p) => p.y));
    return { spots, x, y,
             w: Math.max(...spots.map((p) => p.x + p.w)) - x,
             h: Math.max(...spots.map((p) => p.y + p.h)) - y };
  });
  const area = framed.reduce((n, b) => n + (b.w + GAP) * (b.h + GAP), 0);
  const want = Math.max(...framed.map((b) => b.w), Math.sqrt(area));
  const out: Placed[] = [];
  let x = 0;
  let y = 0;
  let tall = 0;
  for (const box of framed) {
    if (x > 0 && x + box.w > want) { x = 0; y += tall + GAP; tall = 0; }
    const dx = x - box.x;
    const dy = y - box.y;
    for (const p of box.spots) out.push({ ...p, x: p.x + dx, y: p.y + dy });
    x += box.w + GAP;
    tall = Math.max(tall, box.h);
  }
  return out;
}

function open_at(taken: readonly Rect[], x: number, y: number, s: Size): boolean {
  return !taken.some((t) =>
    x < t.x + t.w + GAP && t.x < x + s.w + GAP
    && y < t.y + t.h + GAP && t.y < y + s.h + GAP);
}

function inner_of(graph: Graph, layer: Id | null, id: Id, holder: Placed,
                  taken: Placed[]): Placed | null {
  if (!is_holder(graph, holder.id)) return null;
  return member_spot(graph, layer, id, holder.id, taken, "grid");
}

/** One cell away from a mate on `side`. */
function beside_at(p: Placed, side: Side, size: Size, inner: Placed | null, n: number): Point {
  const y = inner?.y ?? p.y;
  const x_align = inner?.x ?? p.x;
  const step_x = size.w + GAP;
  const step_y = size.h + GAP;
  const k = Math.max(1, n) - 1;
  switch (side) {
    case "right": return { x: p.x + p.w + GAP + k * step_x, y };
    case "left": return { x: p.x - size.w - GAP - k * step_x, y };
    case "below": return { x: x_align, y: p.y + p.h + GAP + k * step_y };
    case "above": return { x: x_align, y: p.y - size.h - GAP - k * step_y };
  }
}

/** Diagonal cells around a mate, nearest the related member first. */
function corners_at(p: Placed, size: Size, toward: Placed): Point[] {
  const dx = size.w + GAP;
  const dy = size.h + GAP;
  const x = toward.x;
  return [
    { x: x + toward.w + GAP, y: p.y - dy },
    { x: x - dx, y: p.y - dy },
    { x: p.x + p.w + GAP, y: p.y - dy },
    { x: p.x - dx, y: p.y - dy },
    { x: x + toward.w + GAP, y: p.y + p.h + GAP },
    { x: x - dx, y: p.y + p.h + GAP },
    { x: p.x + p.w + GAP, y: p.y + p.h + GAP },
    { x: p.x - dx, y: p.y + p.h + GAP },
  ];
}

/** How far a candidate box is from the block the relationship actually names. */
function separation(at: Point, size: Size, toward: Placed): number {
  const dx = Math.max(0, at.x - (toward.x + toward.w), toward.x - (at.x + size.w));
  const dy = Math.max(0, at.y - (toward.y + toward.h), toward.y - (at.y + size.h));
  return dx + dy;
}

/** Preferred cell: the free neighbour nearest the related member. */
function desired_at(graph: Graph, layer: Id | null, id: Id, taken: Placed[],
                    unit: (id: Id) => Id, size: Size,
                    edges = edges_in(graph, layer)): Point | null {
  const mates = placement_mates(graph, layer, id, taken, unit, edges);
  if (!mates.length) return null;
  const sides = anchor_sides(graph, layer, id, mates.map((p) => p.id), unit);
  const cands: { at: Point; dist: number; rank: number }[] = [];
  for (const p of mates) {
    const inner = inner_of(graph, layer, id, p, taken);
    const toward = inner ?? p;
    let rank = 0;
    const add = (pt: Point, r: number) => {
      const at = on_unit(pt);
      cands.push({ at, dist: separation(at, size, toward), rank: r });
    };
    for (const side of sides) add(beside_at(p, side, size, inner, 1), rank++);
    for (const c of corners_at(p, size, toward)) add(c, 8);
    for (const n of [2, 3]) {
      for (const side of sides) add(beside_at(p, side, size, inner, n), 12);
    }
  }
  const open = cands.filter((c) => open_at(taken, c.at.x, c.at.y, size));
  const pool = open.length ? open : cands;
  pool.sort((a, b) => a.dist - b.dist || a.rank - b.rank || a.at.y - b.at.y || a.at.x - b.at.x);
  return pool[0]!.at;
}

/** The nearest lattice point where a box keeps a unit of air from everything placed. */
export function fit(taken: readonly Rect[], at: Point, s: Size): { x: number; y: number } {
  const x0 = snap(at.x);
  const y0 = snap(at.y);
  if (open_at(taken, x0, y0, s)) return { x: x0, y: y0 };
  for (let ring = 1; ring <= REACH; ring++) {
    const cardinal: Point[] = [
      { x: x0 + ring * UNIT, y: y0 },
      { x: x0 - ring * UNIT, y: y0 },
      { x: x0, y: y0 + ring * UNIT },
      { x: x0, y: y0 - ring * UNIT },
    ];
    for (const c of cardinal) if (open_at(taken, c.x, c.y, s)) return c;
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        if (dx === 0 || dy === 0) continue;
        const x = x0 + dx * UNIT;
        const y = y0 + dy * UNIT;
        if (open_at(taken, x, y, s)) return { x, y };
      }
    }
  }
  return { x: x0, y: y0 };
}

/** How far a box may hunt for a clear slot, in units. */
const REACH = 64;

function tie_targets(graph: Graph, layer: Id | null, id: Id): Id[] {
  const out: Id[] = [];
  for (const e of edges_in(graph, layer)) {
    if (edge_module(graph, e.id) !== "tie") continue;
    if (e.from === id) out.push(e.to);
    else if (e.to === id) out.push(e.from);
  }
  return out;
}

/** Notes and references seat beside what they name, outside the packing. */
export function is_satellite(graph: Graph, layer: Id | null, b: Block): boolean {
  if (is_reference(b) && b.of) return true;
  return is_note(graph, b.id) && tie_targets(graph, layer, b.id).length > 0;
}

function layer_targets(graph: Graph, layer: Id | null, id: Id): Id[] {
  const out: Id[] = [];
  for (const e of edges_in(graph, layer)) {
    if (e.from === id) out.push(e.to);
    else if (e.to === id) out.push(e.from);
  }
  return out;
}

/** The card a satellite should sit beside — the block itself, not the grid that holds it. */
function satellite_anchor(graph: Graph, layer: Id | null, b: Block,
                          placed: readonly Placed[]): Placed | null {
  if (is_reference(b)) {
    for (const t of layer_targets(graph, layer, b.id)) {
      const anchor = placed.find((p) => p.id === t);
      if (anchor) return anchor;
    }
    return null;
  }
  if (is_note(graph, b.id)) {
    for (const t of tie_targets(graph, layer, b.id)) {
      const anchor = placed.find((p) => p.id === t);
      if (anchor) return anchor;
    }
  }
  return null;
}

/** Seat a note or reference in the same nearest cell the packer would pick. */
function seat_satellite(id: Id, anchor: Placed, size: Size, taken: readonly Placed[],
                        graph: Graph, layer: Id | null, unit: (id: Id) => Id,
                        edges?: Relation[]): Placed {
  const hint = desired_at(graph, layer, id, [...taken], unit, size, edges)
    ?? { x: anchor.x, y: anchor.y - size.h - GAP };
  return { id, ...fit(taken, hint, size), ...size };
}

/** Seat every satellite, in whatever coordinates `placed` is written in. */
export function seat_satellites(graph: Graph, layer: Id | null, satellites: readonly Block[],
                         placed: readonly Placed[], unit: (id: Id) => Id,
                         edges?: Relation[]): Placed[] {
  const out: Placed[] = [];
  for (const b of satellites) {
    const s = size_of(graph, b.id);
    const taken = [...placed, ...out];
    const anchor = satellite_anchor(graph, layer, b, placed);
    out.push(anchor ? seat_satellite(b.id, anchor, s, taken, graph, layer, unit, edges)
                    : { id: b.id, ...fit(taken, { x: 0, y: 0 }, s), ...s });
  }
  return out;
}

function placement_links(graph: Graph, layer: Id | null, ids: Set<Id>,
                         unit: (id: Id) => Id,
                         edges = edges_in(graph, layer)): [Id, Id][] {
  const links: [Id, Id][] = [];
  const seen = new Set<string>();
  const add = (a: Id, b: Id) => {
    if (!ids.has(a) || !ids.has(b) || a === b) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    links.push([a, b]);
  };
  for (const e of edges) add(unit(e.from), unit(e.to));
  return links;
}

function placement_order(graph: Graph, layer: Id | null, units: Block[],
                         unit: (id: Id) => Id,
                         edges = edges_in(graph, layer)): Block[] {
  const by_id = new Map(units.map((b) => [b.id, b]));
  const ids = new Set(units.map((b) => b.id));
  const adj = new Map<Id, Id[]>();
  for (const [a, b] of placement_links(graph, layer, ids, unit, edges)) {
    adj.set(a, [...new Set([...(adj.get(a) ?? []), b])]);
    adj.set(b, [...new Set([...(adj.get(b) ?? []), a])]);
  }
  const sorted = [...units].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  const start = [...sorted].sort((a, b) =>
    (adj.get(b.id)?.length ?? 0) - (adj.get(a.id)?.length ?? 0)
    || (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id))[0]!.id;
  const seen = new Set<Id>();
  const out: Block[] = [];
  const queue: Id[] = [start];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const b = by_id.get(id);
    if (b) out.push(b);
    const next = [...(adj.get(id) ?? [])].sort((a, b) =>
      (by_id.get(a)?.order ?? 0) - (by_id.get(b)?.order ?? 0) || a.localeCompare(b));
    for (const n of next) if (!seen.has(n)) queue.push(n);
  }
  for (const b of sorted) if (!seen.has(b.id)) out.push(b);
  return out;
}

function placement_mates(graph: Graph, layer: Id | null, id: Id, taken: Placed[],
                         unit: (id: Id) => Id,
                         edges = edges_in(graph, layer)): Placed[] {
  const uid = unit(id);
  const ids = new Set(taken.map((p) => p.id));
  const mates = new Set<Id>();
  for (const [a, b] of placement_links(graph, layer, new Set([uid, ...ids]), unit, edges)) {
    if (a === uid && ids.has(b)) mates.add(b);
    if (b === uid && ids.has(a)) mates.add(a);
  }
  return [...mates].map((mid) => taken.find((p) => p.id === mid)).filter(Boolean) as Placed[];
}

function link_flow_between(graph: Graph, layer: Id | null, a: Id, b: Id,
                           unit: (id: Id) => Id): { from: Id; to: Id } | null {
  for (const e of edges_in(graph, layer)) {
    /** A run that points, whichever way it points. */
    const dir = e.dir ?? "none";
    if (dir === "none") continue;
    const ends = dir === "back" ? [e.to, e.from] : [e.from, e.to];
    const from = unit(ends[0]!);
    const to = unit(ends[1]!);
    if (from === a && to === b) return { from, to };
    if (from === b && to === a) return { from: b, to: a };
  }
  return null;
}

/** Sides to try first beside a mate: upstream left, downstream right. */
function anchor_sides(graph: Graph, layer: Id | null, id: Id, mates: readonly Id[],
                      unit: (id: Id) => Id): Side[] {
  const uid = unit(id);
  let upstream = false;
  let downstream = false;
  for (const mate of mates) {
    const flow = link_flow_between(graph, layer, uid, mate, unit);
    if (!flow) continue;
    if (flow.from === uid) upstream = true;
    if (flow.to === uid) downstream = true;
  }
  if (upstream && !downstream) return ["left", "above", "below", "right"];
  if (downstream && !upstream) return ["right", "above", "below", "left"];
  return ["right", "left", "above", "below"];
}

function linked_member(graph: Graph, layer: Id | null, id: Id, holder_id: Id): Id | null {
  for (const e of edges_in(graph, layer)) {
    if (e.from !== id && e.to !== id) continue;
    const other = e.from === id ? e.to : e.from;
    if (loose_unit(graph, other) === holder_id) return other;
  }
  return null;
}

function member_spot(graph: Graph, layer: Id | null, id: Id, holder_id: Id,
                     taken: readonly Placed[], how: Arrangement): Placed | null {
  const member = linked_member(graph, layer, id, holder_id);
  if (!member) return null;
  const at = taken.find((p) => p.id === member);
  if (at) return at;
  const holder = taken.find((p) => p.id === holder_id);
  if (!holder) return null;
  return member_in_holder(graph, layer, holder_id, member, holder, how);
}
