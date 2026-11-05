/** **A block's hops traced across a map** (2026-11-04): what reaches it and what it reaches, a
 *  hop each way (core `hops_of`), each far end lifted to the nearest block the map draws, one leg
 *  a pair, straight where two blocks face each other, else one bend (`routed`), an arrow at its
 *  end.
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
  return routed({ blocks: with_inside(scene, ends), lines: [], legs }, scene);
}

/** **What picking lights on a map** (2026-11-04): the chips and boxes picked, each box with
 *  everything it holds; the rest dims, as round a block's hops. Null with nothing picked or off a
 *  map. */
export function picked_trace(scene: Scene, picked: readonly Id[]): Trace | null {
  const drawn = new Set(scene.nodes.map((n) => n.id));
  const ids = picked.filter((id) => drawn.has(id));
  return scene.areas && ids.length ? { blocks: with_inside(scene, ids), lines: [], legs: [] }
    : null;
}

/** Blocks on a map, each box with everything it holds: what it holds is part of it. */
function with_inside(scene: Scene, ids: readonly Id[]): Id[] {
  const up = new Map((scene.areas ?? []).map((a) => [a.id, a.parent]));
  const within = (a: Id) => {
    for (let p = up.get(a); p; p = up.get(p)) if (ids.includes(p)) return true;
    return false;
  };
  return [...ids, ...scene.nodes.map((n) => n.id).filter((n) => !ids.includes(n) && within(n))];
}

type Rect = { x: number; y: number; w: number; h: number };
type Side = "left" | "right" | "top" | "bottom";

/** **Hops routed, kept simple** (2026-11-04): two blocks facing each other across a gap — side by
 *  side, or one above the other — are joined by one straight leg across it, where their sides
 *  overlap; any other pair by one bend, out of the source's side facing the target and into the
 *  target's top or bottom. Never a loop, never doubling back. The ends sharing a side of a block
 *  spread evenly along it, ordered by where they go, so no two run as one. Proportional to the
 *  blocks, so it holds at every zoom. */
function routed(trace: Trace, scene: Scene): Trace {
  const nodes = new Map(scene.nodes.map((n) => [n.id, n]));
  const rect = (b: Id) => box_of(nodes.get(b)!);
  const plans = trace.legs.map((l) => plan(rect(l.from), rect(l.to)));
  /** Where an end sits along its side, 0 to 1, among the ends sharing that side. */
  const slots = new Map<string, { key: number; t: number }[]>();
  const end = (b: Id, side: Side, key: number) => {
    const e = { key, t: 0.5 };
    slots.set(`${b}:${side}`, [...(slots.get(`${b}:${side}`) ?? []), e]);
    return e;
  };
  const ends = trace.legs.map((l, k) => {
    const pl = plans[k]!;
    const toward = (r: Rect) => (pl.out === "left" || pl.out === "right" ? r.y + r.h / 2
      : r.x + r.w / 2);
    return [end(l.from, pl.out, toward(rect(l.to))), end(l.to, pl.into, toward(rect(l.from)))];
  });
  for (const list of slots.values()) {
    [...list].sort((a, z) => a.key - z.key).forEach((e, k) => (e.t = (k + 1) / (list.length + 1)));
  }
  return { ...trace, legs: trace.legs.map((l, k) => {
    const [a, b] = [rect(l.from), rect(l.to)];
    const [from, to] = ends[k]!;
    return { ...l, run: drawn(a, b, plans[k]!, from!.t, to!.t) };
  }) };
}

/** How a leg runs between two blocks: straight across a gap they face each other over, else one
 *  bend — out of the side of `a` facing `b`, into `b`'s top or bottom. */
type Plan = { out: Side; into: Side; straight: boolean };
function plan(a: Rect, b: Rect): Plan {
  const across = a.y < b.y + b.h && b.y < a.y + a.h;
  const down = a.x < b.x + b.w && b.x < a.x + a.w;
  if (across && !(down)) {
    const right = b.x >= a.x + a.w / 2;
    return { out: right ? "right" : "left", into: right ? "left" : "right", straight: true };
  }
  if (down) {
    const below = b.y >= a.y + a.h / 2;
    return { out: below ? "bottom" : "top", into: below ? "top" : "bottom", straight: true };
  }
  return { out: b.x > a.x ? "right" : "left", into: b.y > a.y ? "top" : "bottom",
           straight: false };
}

/** **A leg's points**: straight, at a point within the span the two sides share, spread by `t`;
 *  else out at `t_out` along `a`'s side and into `b` at `t_in` along its top or bottom, one
 *  turn. Its tip sits just inside `b`. */
function drawn(a: Rect, b: Rect, pl: Plan, t_out: number, t_in: number): Point[] {
  const flat = pl.out === "left" || pl.out === "right";
  if (pl.straight) {
    const [lo, hi] = flat ? [Math.max(a.y, b.y), Math.min(a.y + a.h, b.y + b.h)]
      : [Math.max(a.x, b.x), Math.min(a.x + a.w, b.x + b.w)];
    const at = lo + (hi - lo) * (t_out + t_in) / 2;
    const p = edge(a, pl.out, at, 0);
    const q = edge(b, pl.into, at, INSET);
    return [p, q];
  }
  const p = edge(a, pl.out, a.y + a.h * t_out, 0);
  const q = edge(b, pl.into, b.x + b.w * t_in, INSET);
  return [p, { x: q.x, y: p.y }, q];
}

/** The point on `side` of `r` at `at` along it (a y on the left or right, an x on the top or
 *  bottom), `inset` inside it. */
function edge(r: Rect, side: Side, at: number, inset: number): Point {
  if (side === "left") return { x: r.x + inset, y: at };
  if (side === "right") return { x: r.x + r.w - inset, y: at };
  if (side === "top") return { x: at, y: r.y + inset };
  return { x: at, y: r.y + r.h - inset };
}

/** How far inside its target a leg's tip sits, so the arrow lands on the chip, not in the gap. */
const INSET = 3;
