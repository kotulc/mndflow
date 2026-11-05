/** **A block's hops traced across a map** (2026-11-04): what reaches it and what it reaches, a
 *  hop each way (core `hops_of`), each far end lifted to the nearest block the map draws, one leg
 *  a pair, square, fanned out of the side of its source facing where it goes, an arrow at its end.
 *  No numbers: a walk along a path says its step in words (stage `Walk.tsx`), lighting one hop at
 *  a time (`hop_trace`). Worked out on hover or pick, never stored. */

import { hops_of, path, type Graph, type Hop, type Id } from "@mnd/core";
import { box_of, type Scene } from "./scene";

type Point = { x: number; y: number };

/** One leg: from block to block, the names said across it, its run; `both` where it goes back
 *  too. */
export type Leg = { from: Id; to: Id; names: string[]; run: Point[]; both?: boolean };

/** Hops traced: what they light, and their legs. */
export type Trace = { blocks: Id[]; lines: Id[]; legs: Leg[] };


/** `id`'s hops, traced over a map; null off a map or where nothing drawn joins it. */
export function trace_of(graph: Graph, scene: Scene, id: Id): Trace | null {
  return graph.blocks[id] ? hop_trace(graph, scene, hops_of(graph, id)) : null;
}

/** **Hops traced over a map**: each end lifted to the nearest block the map draws, or the *+n
 *  more* it folded into; one leg a pair, either way. Null off a map or where none is drawn. */
export function hop_trace(graph: Graph, scene: Scene, hops: readonly Hop[]): Trace | null {
  if (!scene.areas) return null;
  const nodes = new Map(scene.nodes.map((n) => [n.id, n]));
  /** What folded into a *+n more* stands at it. */
  const more = new Map(scene.nodes.flatMap((n) => (n.data.folded ?? []).map((f) => [f, n.id])));
  const lift = (at: Id) => [...path(graph, at)].reverse()
    .map((b) => (nodes.has(b.id) ? b.id : more.get(b.id))).find((x) => !!x);
  const legs: Leg[] = [];
  for (const h of hops) {
    const [from, to] = [lift(h.from), lift(h.to)];
    if (!from || !to || from === to) continue;
    const had = legs.find((l) => (l.from === from && l.to === to)
      || (l.from === to && l.to === from));
    if (had) {
      had.names.push(...h.names.filter((n) => !had.names.includes(n)));
      if (had.from === to) had.both = true;
    } else legs.push({ from, to, names: [...h.names], run: [] });
  }
  if (!legs.length) return null;
  const ends = [...new Set(legs.flatMap((l) => [l.from, l.to]))];
  /** A box at an end lights with everything it holds: what it holds is part of it. */
  const up = new Map(scene.areas.map((a) => [a.id, a.parent]));
  const within = (a: Id) => {
    for (let p = up.get(a); p; p = up.get(p)) if (ends.includes(p)) return true;
    return false;
  };
  const inside = scene.nodes.map((n) => n.id).filter((n) => !ends.includes(n) && within(n));
  return routed({ blocks: [...ends, ...inside], lines: [], legs }, scene);
}

type Rect = { x: number; y: number; w: number; h: number };
type Side = "left" | "right" | "top" | "bottom";

/** **The side of `a` facing `b`**: across the wider gap between them; the bottom where one holds
 *  or overlaps the other. */
function facing(a: Rect, b: Rect): Side {
  const gx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const gy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  if (gx <= 0 && gy <= 0) return "bottom";
  if (gx > gy) return b.x > a.x ? "right" : "left";
  return b.y > a.y ? "bottom" : "top";
}

/** **A trace's legs routed, fanned out**: each leaves its source by the side facing its target
 *  and reaches the target by the side facing back; the ends on one side of a block spread
 *  evenly along it, ordered by where they go, and each leg turns at its own point across the gap,
 *  so no two run as one. Proportional to the blocks, so it holds at every zoom. */
function routed(trace: Trace, scene: Scene): Trace {
  const nodes = new Map(scene.nodes.map((n) => [n.id, n]));
  const rect = (b: Id) => box_of(nodes.get(b)!);
  /** Each leg's two ends: the block, its side, and the block at the other end. */
  const ends = trace.legs.map((l) => {
    const [a, b] = [rect(l.from), rect(l.to)];
    return [{ r: a, side: facing(a, b), other: b }, { r: b, side: facing(b, a), other: a }] as const;
  });
  /** Where an end sits along its side, 0 to 1, among the ends sharing that side. */
  const slots = new Map<string, { other: Rect }[]>();
  const key = (e: { r: Rect; side: Side }) => `${e.r.x},${e.r.y},${e.side}`;
  for (const e of ends.flat()) slots.set(key(e), [...(slots.get(key(e)) ?? []), e]);
  const t = (e: { r: Rect; side: Side; other: Rect }) => {
    const flat = e.side === "left" || e.side === "right";
    const mid = (r: Rect) => (flat ? r.y + r.h / 2 : r.x + r.w / 2);
    const mine = [...slots.get(key(e))!].sort((p, q) => mid(p.other) - mid(q.other));
    return (mine.indexOf(e) + 1) / (mine.length + 1);
  };
  return { ...trace, legs: trace.legs.map((l, i) => {
    const [from, to] = ends[i]!;
    return { ...l, run: squared(from.r, to.r, from.side, to.side, t(from), t(to)) };
  }) };
}

/** A point `t` (0 to 1) along a side of `r`. */
function on_side(r: Rect, side: Side, t: number): Point {
  if (side === "left" || side === "right") return { x: side === "left" ? r.x : r.x + r.w,
                                                    y: r.y + r.h * t };
  return { x: r.x + r.w * t, y: side === "top" ? r.y : r.y + r.h };
}

/** **A leg, square**: out of `a` at `t_out` along its side `out`, into `b` at `t_in` along its
 *  side `into`. Across a gap it turns once, `t_out` of the way over, so legs leaving one side
 *  turn apart; where one block holds the other, both ends on their bottoms, it runs round under
 *  both. What it crosses is quiet while a path is traced. */
function squared(a: Rect, b: Rect, out: Side, into: Side, t_out: number, t_in: number): Point[] {
  const [p, q] = [on_side(a, out, t_out), on_side(b, into, t_in)];
  if (out === into) {
    const y = Math.max(p.y, q.y) + ROUND;
    return [p, { x: p.x, y }, { x: q.x, y }, q];
  }
  if (out === "left" || out === "right") {
    const x = p.x + (q.x - p.x) * t_out;
    return p.y === q.y ? [p, q] : [p, { x, y: p.y }, { x, y: q.y }, q];
  }
  const y = p.y + (q.y - p.y) * t_out;
  return p.x === q.x ? [p, q] : [p, { x: p.x, y }, { x: q.x, y }, q];
}

/** How far below two blocks, one holding the other, a leg runs round. */
const ROUND = 10;
