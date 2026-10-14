/** A layer laid out by its relations: flows and states, ranked the way their lines point, with
 *  few crossings. Dagre's layered layout; worked out every draw, never stored. Asides float
 *  beside what they are tied to, as in `auto`. */

import { Graph as Ranks, layout } from "@dagrejs/dagre";
import { dir_of, edges_in, is_aside, is_tie, type Graph, type Id } from "@mnd/core";
import type { Placed } from "./arrange";
import { loose_unit, type Sized } from "./bands";
import { centred, floated } from "./float";
import { snap, GAP } from "./size";


/** Every unit placed by rank: a line runs from rank to rank down the page, a backward one read
 *  the way it points. A unit no line meets ranks first. */
export function layered(graph: Graph, layer: Id | null, units: readonly Sized[]): Placed[] {
  const aside = units.filter((it) => is_aside(graph, it.b.id));
  const ranked = units.filter((it) => !is_aside(graph, it.b.id));
  const ids = new Set(ranked.map((it) => it.b.id));
  const g = new Ranks();
  g.setGraph({ rankdir: "TB", nodesep: GAP, ranksep: GAP * 2, marginx: 0, marginy: 0 });
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
  const placed = centred(ranked.map((it) => {
    const at = g.node(it.b.id);
    return { id: it.b.id, x: snap(at.x - it.s.w / 2), y: snap(at.y - it.s.h / 2), ...it.s };
  }));
  return [...placed, ...floated(graph, layer, aside, placed)];
}
