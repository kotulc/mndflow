/** Where everything in a layer sits.
 *
 *  One setting, six values. Four carry a reading direction and two do not.
 *  `free` is the value where hand placement is what draws; every other value
 *  computes, and **nothing is discarded by arranging** — a block's stored
 *  position is always kept, so returning to `free` returns the layout.
 *
 *  **The four directional values are dagre's.** Breaking cycles, ranking,
 *  ordering within a rank and packing the ranks are a solved problem with a
 *  maintained library behind it, and the hand-rolled version did the first
 *  three badly and the fourth not at all — nothing here ever minimised a
 *  crossing. `free` and `grid` stay local because dagre has no answer for
 *  them: one is hand placement and the other is tiling. */

import dagre from "@dagrejs/dagre";
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

/** The one thing about ranking that stays ours: **which edge a cycle is broken
 *  at**.
 *
 *  A model is free to hold a cycle — a coolant loop is one on purpose — and
 *  dagre will happily break it, but it breaks it by a feedback-arc heuristic
 *  that knows nothing about the order somebody drew the relationships in. Ours
 *  is **first drawn wins**: edges are taken in order and one is kept unless it
 *  closes a cycle over what is already kept, so a loop reads the way it was
 *  stated with the return leg running back. Handing dagre a graph that is
 *  already acyclic leaves it nothing to guess at, and the ranking, the ordering
 *  and the packing are still entirely its work. */
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

/** Which way dagre reads a rank. Ours is where the *first* rank sits, which
 *  is what `rankdir` says, so the two line up without a translation table
 *  beyond this one. */
const RANKDIR: Partial<Record<Arrangement, string>> = {
  right: "LR", left: "RL", down: "TB", up: "BT",
};

/** Ranks by relationships, through dagre.
 *
 *  Three things are ours rather than dagre's, and each is a statement about
 *  *this* model rather than about graph drawing. **An end seated on an
 *  interface ranks the card it sits on**, so promoting a seat never moves a
 *  chain — that is `owner_of`, and dagre cannot know it. **A cycle breaks at
 *  the edge drawn last**, above. And **a layer with no relationships in it is
 *  not one rank**: dagre would lay a folder of unrelated documents out in a
 *  single line across the screen, whichever direction was asked for, so order
 *  becomes the only structure and each takes a rank of its own. */
function ranked(graph: Graph, layer: Id | null, all: Sized[], how: Arrangement): Placed[] {
  const order = all.map((it) => it.b.id);
  const here = new Set(order);
  const links = edges_in(graph, layer)
    .map((e) => ({ from: owner_of(graph, e.from), to: owner_of(graph, e.to) }))
    .filter((l) => here.has(l.from) && here.has(l.to) && l.from !== l.to);

  if (links.length === 0) return laid_in_order(order, all, how);
  const forward = forward_only(order, links);

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: RANKDIR[how] ?? "LR", nodesep: GAP.unit, ranksep: GAP.rank });
  g.setDefaultEdgeLabel(() => ({}));
  /** Nodes in the order the layer states them, so the same input always draws
   *  the same picture — dagre is deterministic, but only per insertion order. */
  for (const it of all) g.setNode(it.b.id, { width: it.s.w, height: it.s.h });
  for (const l of forward) g.setEdge(l.from, l.to);
  dagre.layout(g);

  /** dagre centres a node on its position; everything here is a top-left. */
  return all.map((it) => {
    const n = g.node(it.b.id);
    return { id: it.b.id, ...it.s,
             x: snap(n.x - it.s.w / 2), y: snap(n.y - it.s.h / 2) };
  });
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
