/** **A map's links, traced** (2026-11-18): every join under the map gathered once, to the
 *  blocks it draws (`links_of`), one leg a pair either way; a chip says its links in words, and
 *  hovering or picking a block lights **the same legs** — those crossing its edge (`trace_of`) —
 *  routed direct (`routed`). A walk lights one hop at a time (`hop_trace`). */

import { is_reference, joins_in, path, stands_for, type Graph, type Hop,
         type Id } from "@mnd/core";
import { box_of, type Scene } from "./scene";

type Point = { x: number; y: number };

/** One leg: from block to block, the names said across it, how many relations it gathers, its
 *  run; `both` where it goes back too. */
export type Leg = { from: Id; to: Id; names: string[]; n: number; run: Point[]; both?: boolean };

/** Hops traced: what they light, and their legs. */
export type Trace = { blocks: Id[]; lines: Id[]; legs: Leg[];
                      /** A presentation's steps with none drawing now: the last was a mark. */
                      still?: boolean };


/** **A map's links**: every join inside `scope` (every one where null) gathered to what the map
 *  draws, not yet routed. */
export function links_of(graph: Graph, scene: Scene, scope: Id | null): Leg[] {
  return gathered(graph, scene, joins_in(graph, scope));
}

/** **What lights for `id` on a map**: the map's links crossing its edge — itself and what is drawn
 *  inside it, or the nearest block drawn above it — routed. Null off a map or where none does. */
export function trace_of(graph: Graph, scene: Scene, id: Id): Trace | null {
  if (!scene.links) return null;
  const at = lifted(graph, scene)(is_reference(graph, id) ? stands_for(graph, id)?.id ?? id : id);
  if (!at) return null;
  const above = holders(scene);
  const inside = (b: Id) => b === at || above(b).includes(at);
  const legs = scene.links.filter((l) => inside(l.from) !== inside(l.to));
  if (!legs.length) return null;
  const ends = [...new Set(legs.flatMap((l) => [l.from, l.to]))];
  return routed({ blocks: with_inside(scene, ends, above), lines: [], legs }, scene);
}

/** **Hops traced over a map**, routed: a walk's step. Null off a map or where none is drawn. */
export function hop_trace(graph: Graph, scene: Scene, hops: readonly Hop[]): Trace | null {
  const legs = gathered(graph, scene, hops);
  if (!legs.length) return null;
  const ends = [...new Set(legs.flatMap((l) => [l.from, l.to]))];
  return routed({ blocks: with_inside(scene, ends), lines: [], legs }, scene);
}

/** **Hops gathered on a map**: each end lifted to the nearest block the map draws — itself, or a
 *  reference standing for it, as a treemap diagram draws; one leg a pair, either way,
 *  **gathering every relation between the two** (`n`), **never between a box and what it
 *  holds**, drawn round it already. None off a map. */
function gathered(graph: Graph, scene: Scene, hops: readonly Hop[]): Leg[] {
  if (!scene.areas) return [];
  const lift = lifted(graph, scene);
  const above = holders(scene);
  const legs: Leg[] = [];
  for (const h of hops) {
    const [from, to] = [lift(h.from), lift(h.to)];
    if (!from || !to || from === to) continue;
    if (above(to).includes(from) || above(from).includes(to)) continue;
    const had = legs.find((l) => (l.from === from && l.to === to)
      || (l.from === to && l.to === from));
    if (had) {
      had.n += h.n ?? 1;
      had.names.push(...h.names.filter((n) => !had.names.includes(n)));
      if (had.from === to) had.both = true;
    } else legs.push({ from, to, names: [...h.names], n: h.n ?? 1, run: [] });
  }
  return legs;
}

/** The nearest block a map draws for a block: itself, else up its path. */
function lifted(graph: Graph, scene: Scene): (id: Id) => Id | undefined {
  const at = standing(graph, scene);
  return (id) => [...path(graph, id)].reverse().map((b) => at(b.id)).find((x) => !!x);
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

/** **Picks as a map draws them** (2026-11-05): each where it stands (`standing`), so a block
 *  walked to in the explorer is lit even where the map draws it as a reference or had no room. */
export function on_map(graph: Graph, scene: Scene, ids: readonly Id[]): Id[] {
  const at = standing(graph, scene);
  return [...new Set(ids.map((id) => at(id) ?? id))];
}

/** **What stands for a block on a map**: its own node, or a reference drawn for it, as a treemap
 *  diagram draws. */
function standing(graph: Graph, scene: Scene): (id: Id) => Id | undefined {
  const nodes = new Set(scene.nodes.map((n) => n.id));
  const stood = new Map(scene.nodes.flatMap((n) => {
    const to = is_reference(graph, n.id) ? stands_for(graph, n.id)?.id : undefined;
    return to ? [[to, n.id] as const] : [];
  }));
  return (id) => (nodes.has(id) ? id : stood.get(id));
}

/** Blocks on a map, each box with everything it holds: what it holds is part of it. */
function with_inside(scene: Scene, ids: readonly Id[], above = holders(scene)): Id[] {
  return [...ids, ...scene.nodes.map((n) => n.id)
    .filter((n) => !ids.includes(n) && above(n).some((p) => ids.includes(p)))];
}

/** The boxes holding a block on a map, nearest first. */
function holders(scene: Scene): (id: Id) => Id[] {
  const up = new Map((scene.areas ?? []).map((a) => [a.id, a.parent]));
  return (id) => {
    const out: Id[] = [];
    for (let p = up.get(id); p; p = up.get(p)) out.push(p);
    return out;
  };
}

type Rect = { x: number; y: number; w: number; h: number };
type Side = "left" | "right" | "top" | "bottom";

/** **Legs routed, direct** (2026-11-04; round the chips tried 2026-11-18, bends too tight in
 *  the narrow gaps): two blocks facing each other across a gap — side by side, or one above
 *  the other — are joined straight across it, where their sides overlap; any other pair by one bend, out of the source's side facing the target and into the
 *  target's top or bottom. Never a loop, never doubling back. The ends sharing a side of a block
 *  spread evenly along it, ordered by where they go, so no two run as one. Drawn only while lit,
 *  over what it passes. */
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
    const [from, to] = ends[k]!;
    return { ...l, run: drawn(rect(l.from), rect(l.to), plans[k]!, from!.t, to!.t) };
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
