/** **A block's path traced across a map** (flow-plan stage 7): its behaviours' steps in order
 *  (core `path_of`), each end lifted to the nearest block the map draws, one leg a pair, square
 *  out of the source's top or bottom; the blocks on it numbered in the order the path first
 *  reaches them, at their lower right corner.
 *  A behaviour traces its owner's path. Worked out on hover or pick, never stored. */

import { is_behaviour, path, path_of, type Graph, type Id } from "@mnd/core";
import { box_of, type Scene } from "./scene";

type Point = { x: number; y: number };

/** One leg: from block to block, the order it is first taken in, the calls it carries, its run. */
export type Leg = { from: Id; to: Id; n: number; names: string[]; run: Point[] };

/** A path traced: what it lights, its legs, and each block's number where it sits. */
export type Trace = { blocks: Id[]; lines: Id[]; legs: Leg[];
                      marks: { id: Id; n: number; x: number; y: number }[] };


/** The path `id` travels, traced over a map; null off a map or where it travels nowhere drawn. */
export function trace_of(graph: Graph, scene: Scene, id: Id): Trace | null {
  if (!scene.areas || !graph.blocks[id]) return null;
  const owner = is_behaviour(graph, id) ? graph.blocks[id]!.parent ?? id : id;
  const nodes = new Map(scene.nodes.map((n) => [n.id, n]));
  /** What folded into a *+n more* stands at it. */
  const more = new Map(scene.nodes.flatMap((n) => (n.data.folded ?? []).map((f) => [f, n.id])));
  /** The nearest block up from `at` the map draws, or the *+n more* it folded into. */
  const lift = (at: Id) => [...path(graph, at)].reverse()
    .map((b) => (nodes.has(b.id) ? b.id : more.get(b.id))).find((x) => !!x);
  const legs: Leg[] = [];
  for (const s of path_of(graph, owner)) {
    const [from, to] = [lift(s.from), lift(s.to)];
    if (!from || !to || from === to) continue;
    const had = legs.find((l) => l.from === from && l.to === to);
    if (had) had.names.push(s.name);
    else legs.push({ from, to, n: legs.length + 1, names: [s.name], run: [] });
  }
  if (!legs.length) return null;

  /** Every block on it, numbered as first reached. */
  const order = [...new Set(legs.flatMap((l) => [l.from, l.to]))];
  const runs = legs.map((l) => squared(box_of(nodes.get(l.from)!), box_of(nodes.get(l.to)!)));
  /** A box on it lights with everything it holds: what it holds is part of it. */
  const up = new Map(scene.areas.map((a) => [a.id, a.parent]));
  const within = (a: Id) => {
    for (let p = up.get(a); p; p = up.get(p)) if (order.includes(p)) return true;
    return false;
  };
  const inside = scene.nodes.map((n) => n.id).filter((n) => !order.includes(n) && within(n));
  return {
    blocks: [...order, ...inside], lines: [],
    legs: legs.map((l, i) => ({ ...l, run: runs[i] ?? [] })),
    marks: order.map((b, i) => {
      const at = box_of(nodes.get(b)!);
      return { id: b, n: i + 1, x: at.x + at.w, y: at.y + at.h };
    }),
  };
}

type Rect = { x: number; y: number; w: number; h: number };

/** **A leg, square**: out of the middle of the source's top or bottom edge, toward the target,
 *  then as few bends as it needs — straight on where the target lies across its line, one elbow
 *  into the target's near side where it lies further along, and where the two sit side by side,
 *  down and round under both into the target's bottom. What it crosses is quiet while a path is
 *  traced. */
function squared(a: Rect, b: Rect): Point[] {
  const x = a.x + a.w / 2;
  const [top, mid] = [b.y + b.h / 2, b.x + b.w / 2];
  if (top > a.y + a.h || top < a.y) {
    const down = top > a.y + a.h;
    const from = { x, y: down ? a.y + a.h : a.y };
    if (x >= b.x && x <= b.x + b.w) return [from, { x, y: down ? b.y : b.y + b.h }];
    return [from, { x, y: top }, { x: x < b.x ? b.x : b.x + b.w, y: top }];
  }
  const under = Math.max(a.y + a.h, b.y + b.h) + ROUND;
  return [{ x, y: a.y + a.h }, { x, y: under }, { x: mid, y: under }, { x: mid, y: b.y + b.h }];
}

/** How far below two blocks side by side a leg runs round. */
const ROUND = 10;
