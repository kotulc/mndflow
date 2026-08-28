/** Where everything in a layer sits.
 *
 *  One setting, six values. Four carry a reading direction and two do not.
 *  `free` is the value where hand placement is what draws; every other value
 *  computes, and **nothing is discarded by arranging** — a block's stored
 *  position is always kept, so returning to `free` returns the layout. */

import { arrangement_of, children, edges_in, is_interface, owner_of,
         type Arrangement, type Block, type Graph, type Id } from "@mnd/core";
import { GRID, size_of, snap, type Size } from "./size";

export type Placed = { id: Id; x: number; y: number; w: number; h: number };

/** Tight inside a unit, open between them — what matters is the contrast. */
export const GAP = { unit: GRID * 2, rank: GRID * 3, member: GRID / 2 };

/** Every block drawn in this layer, placed. Interfaces are seated on their
 *  owner rather than laid out, so they are not here. */
export function laid(graph: Graph, layer: Id | null): Placed[] {
  const units = children(graph, layer).filter((b) => !is_interface(b));
  if (units.length === 0) return [];
  const how = arrangement_of(graph, layer);
  const sized = units.map((b) => ({ b, s: size_of(graph, b.id) }));
  const spots = how === "free" ? free(sized)
              : how === "grid" ? grid(sized)
              : ranked(graph, layer, sized, how);
  return centred(spots);
}

type Sized = { b: Block; s: Size };

/** Hand placement is what draws; anything unplaced fills the room around it. */
function free(all: Sized[]): Placed[] {
  const out: Placed[] = [];
  const loose: Sized[] = [];
  for (const it of all) {
    if (it.b.x !== undefined && it.b.y !== undefined) {
      out.push({ id: it.b.id, x: snap(it.b.x), y: snap(it.b.y), ...it.s });
    } else loose.push(it);
  }
  const below = out.length ? Math.max(...out.map((p) => p.y + p.h)) + GAP.unit : 0;
  let x = 0;
  for (const it of loose) {
    out.push({ id: it.b.id, x: snap(x), y: snap(below), ...it.s });
    x += it.s.w + GAP.unit;
  }
  return out;
}

/** Tiles outward from the middle, cells sized to their contents. */
function grid(all: Sized[]): Placed[] {
  const cols = Math.max(1, Math.ceil(Math.sqrt(all.length)));
  const cell_w = Math.max(...all.map((it) => it.s.w)) + GAP.unit;
  const cell_h = Math.max(...all.map((it) => it.s.h)) + GAP.unit;
  return all.map((it, i) => ({
    id: it.b.id,
    x: snap((i % cols) * cell_w),
    y: snap(Math.floor(i / cols) * cell_h),
    ...it.s,
  }));
}

type Link = { from: Id; to: Id };

/** Ranking wants a DAG, and a model is free to hold a cycle — a coolant loop
 *  is one on purpose. So an edge that would close one is set aside for the
 *  ranking and drawn like any other: a loop still reads left to right, with the
 *  return leg running back.
 *
 *  **The first relationship drawn wins.** Edges are taken in order and one is
 *  kept unless it closes a cycle over what is already kept, so the direction a
 *  layer reads follows the order somebody stated it in — and the same input
 *  always drops the same edge. */
function forward_only(order: Id[], links: Link[]): Link[] {
  const out = new Map<Id, Id[]>(order.map((id) => [id, []]));
  const reaches = (from: Id, to: Id): boolean => {
    const seen = new Set<Id>([from]);
    const queue = [from];
    while (queue.length) {
      const here = queue.shift()!;
      if (here === to) return true;
      for (const next of out.get(here) ?? []) {
        if (!seen.has(next)) { seen.add(next); queue.push(next); }
      }
    }
    return false;
  };

  const kept: Link[] = [];
  for (const l of links) {
    if (reaches(l.to, l.from)) continue;
    out.get(l.from)?.push(l.to);
    kept.push(l);
  }
  return kept;
}

/** Ranks by relationships: nothing pointing at it comes first, and each rank
 *  sits one step further along. Within a rank, things are ordered by where what
 *  they relate to sat in the rank before — so a chain comes out on one row and
 *  every line along it is straight. */
function ranked(graph: Graph, layer: Id | null, all: Sized[], how: Arrangement): Placed[] {
  const order = all.map((it) => it.b.id);
  const here = new Set(order);
  /** Through the owner: an end seated on an interface ranks the card it sits
   *  on, so promoting a seat never changes where a chain lands. */
  const links = edges_in(graph, layer)
    .map((e) => ({ from: owner_of(graph, e.from), to: owner_of(graph, e.to) }))
    .filter((l) => here.has(l.from) && here.has(l.to) && l.from !== l.to);

  const forward = forward_only(order, links);
  const into = new Map<Id, Id[]>(order.map((id) => [id, []]));
  for (const l of forward) into.get(l.to)!.push(l.from);

  /** **Nothing relating them leaves order as the only structure**, so each
   *  takes its own rank and the arrangement says which way that order runs:
   *  `down` reads as a column, `right` as a row. Ranking them all together
   *  would lay a folder of unrelated documents out in one line across the
   *  screen, whichever direction was asked for. */
  if (forward.length === 0) {
    return laid_in_order(order, all, how);
  }

  /** Longest path from a source. The graph is acyclic here, so it settles. */
  const rank = new Map<Id, number>();
  const depth_of = (id: Id, seen: Set<Id>): number => {
    if (rank.has(id)) return rank.get(id)!;
    if (seen.has(id)) return 0;
    seen.add(id);
    const ups = into.get(id) ?? [];
    const r = ups.length === 0 ? 0 : Math.max(...ups.map((u) => depth_of(u, seen) + 1));
    rank.set(id, r);
    return r;
  };
  for (const id of order) depth_of(id, new Set());

  const rows = new Map<number, Id[]>();
  for (const id of order) {
    const r = rank.get(id) ?? 0;
    rows.set(r, [...(rows.get(r) ?? []), id]);
  }
  for (const [r, ids] of rows) {
    if (r === 0) continue;
    const before = rows.get(r - 1) ?? [];
    const seat = (id: Id) => {
      const ups = (into.get(id) ?? []).map((u) => before.indexOf(u)).filter((i) => i >= 0);
      return ups.length ? ups.reduce((a, b) => a + b, 0) / ups.length : Number.MAX_SAFE_INTEGER;
    };
    rows.set(r, [...ids].sort((a, b) => seat(a) - seat(b) || a.localeCompare(b)));
  }

  const by_id = new Map(all.map((it) => [it.b.id, it.s]));
  const down = how === "down" || how === "up";
  const back = how === "left" || how === "up";
  const stride = Math.max(...all.map((it) => (down ? it.s.h : it.s.w))) + GAP.rank;
  const depth = Math.max(...rank.values()) + 1;

  const out: Placed[] = [];
  for (const [r, ids] of [...rows].sort((a, b) => a[0] - b[0])) {
    const along = back ? (depth - 1 - r) * stride : r * stride;
    let across = 0;
    for (const id of ids) {
      const s = by_id.get(id)!;
      out.push({ id, ...s,
        x: snap(down ? across : along),
        y: snap(down ? along : across) });
      across += (down ? s.w : s.h) + GAP.unit;
    }
  }
  return out;
}

/** One per rank, in the order they were stated. */
function laid_in_order(order: Id[], all: Sized[], how: Arrangement): Placed[] {
  const by_id = new Map(all.map((it) => [it.b.id, it.s]));
  const down = how === "down" || how === "up";
  const back = how === "left" || how === "up";
  const stride = Math.max(...all.map((it) => (down ? it.s.h : it.s.w))) + GAP.rank;
  const steps = order.map((id, n) => ({ id, at: (back ? order.length - 1 - n : n) * stride }));
  return centred(steps.map(({ id, at }) => ({
    id, ...by_id.get(id)!,
    x: snap(down ? 0 : at),
    y: snap(down ? at : 0),
  })));
}

/** Positions are relative to the layer's centre, so a layer stays centred as it
 *  grows in any direction. Exported because anything that places has to end
 *  the same way — a reading included. */
export function centred(spots: Placed[]): Placed[] {
  if (spots.length === 0) return spots;
  const left = Math.min(...spots.map((p) => p.x));
  const top = Math.min(...spots.map((p) => p.y));
  const right = Math.max(...spots.map((p) => p.x + p.w));
  const bottom = Math.max(...spots.map((p) => p.y + p.h));
  const dx = snap(-(left + right) / 2);
  const dy = snap(-(top + bottom) / 2);
  return spots.map((p) => ({ ...p, x: p.x + dx || 0, y: p.y + dy || 0 }))
              .sort((a, b) => a.id.localeCompare(b.id));
}

/** What the whole layer takes up, plus the room a new thing needs.
 *
 *  Positions are centred on the origin, so what is needed is twice the furthest
 *  **edge** from it. Twice the furthest corner plus its own width counts the
 *  same box twice and leaves a layer drawn at a third of the size it could be. */
export function bounds(spots: readonly Placed[]): { w: number; h: number } {
  if (spots.length === 0) return { w: GRID * 16, h: GRID * 10 };
  const reach = (a: number, b: number) => Math.max(Math.abs(a), Math.abs(b));
  const w = Math.max(...spots.map((p) => reach(p.x, p.x + p.w))) * 2;
  const h = Math.max(...spots.map((p) => reach(p.y, p.y + p.h))) * 2;
  return { w: w + GAP.unit * 2, h: h + GAP.unit * 2 };
}

/** A boundary is its members' bounds plus half a cell — its size is a fact
 *  about what it holds, never something stored. */
export function boundary(spots: Placed[], members: Id[]): Placed | null {
  const inside = spots.filter((p) => members.includes(p.id));
  if (inside.length === 0) return null;
  const x = Math.min(...inside.map((p) => p.x)) - GAP.member;
  const y = Math.min(...inside.map((p) => p.y)) - GAP.member;
  const w = Math.max(...inside.map((p) => p.x + p.w)) + GAP.member - x;
  const h = Math.max(...inside.map((p) => p.y + p.h)) + GAP.member - y;
  return { id: "", x, y, w, h };
}
