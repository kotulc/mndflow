/** A layer laid out by its relations: flows and states, ranked the way their lines point, with
 *  few crossings. Dagre's layered layout; worked out every draw, never stored. Asides float
 *  beside what they are tied to, as in `auto`. */

import { Graph as Ranks, layout } from "@dagrejs/dagre";
import { dir_of, edges_in, is_aside, is_tie, type Graph, type Id } from "@mnd/core";
import type { Placed } from "./arrange";
import { loose_unit, type Sized } from "./bands";
import { centred, floated } from "./float";
import { snap, GAP, SHAPE } from "./size";


/** Every unit placed by rank: a line runs from rank to rank down the page, a backward one read
 *  the way it points. A unit no line meets ranks first. */
export function layered(graph: Graph, layer: Id | null, units: readonly Sized[]): Placed[] {
  const aside = units.filter((it) => is_aside(graph, it.b.id));
  const ranked = units.filter((it) => !is_aside(graph, it.b.id));
  const ids = new Set(ranked.map((it) => it.b.id));
  /** Ranked down the page and across it, **keeping whichever fits the canvas's shape**. */
  const ways = (["TB", "LR"] as const).map((dir) => ranks(graph, layer, ranked, ids, dir));
  const off = (p: readonly Placed[]) => {
    const w = Math.max(...p.map((u) => u.x + u.w)) - Math.min(...p.map((u) => u.x));
    const h = Math.max(...p.map((u) => u.y + u.h)) - Math.min(...p.map((u) => u.y));
    return Math.abs(Math.log(Math.max(1, w) / Math.max(1, h) / SHAPE.aspect));
  };
  const placed = !ranked.length ? [] : off(ways[1]!) < off(ways[0]!) ? ways[1]! : ways[0]!;
  return [...placed, ...floated(graph, layer, aside, placed)];
}

/** The units ranked one way: a line runs from rank to rank, a backward one read the way it
 *  points. */
function ranks(graph: Graph, layer: Id | null, ranked: readonly Sized[], ids: ReadonlySet<Id>,
               rankdir: "TB" | "LR"): Placed[] {
  const g = new Ranks();
  g.setGraph({ rankdir, nodesep: GAP, ranksep: GAP * 2, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const it of ranked) g.setNode(it.b.id, { width: it.s.w, height: it.s.h });

  /** A line between two units ranks them; a tie, or a line inside one unit, does not. */
  for (const e of edges_in(graph, layer)) {
    if (is_tie(graph, e.id)) continue;
    const [from, to] = [loose_unit(graph, e.from), loose_unit(graph, e.to)];
    if (from === to || !ids.has(from) || !ids.has(to)) continue;
    if (dir_of(graph, e.id) === "back") g.setEdge(to, from);
    else g.setEdge(from, to);
  }
  layout(g);
  return centred(ranked.map((it) => {
    const at = g.node(it.b.id);
    return { id: it.b.id, x: snap(at.x - it.s.w / 2), y: snap(at.y - it.s.h / 2), ...it.s };
  }));
}
