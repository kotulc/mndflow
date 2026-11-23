/** **What a pick lights on a map** (2026-11-04): the chips and boxes picked, each box with what it
 *  holds; the rest dims. **A map draws containment alone** (the user, 2026-11-22): no lines, no
 *  hops, no links between chips — relations are other diagrams'. */

import { is_reference, stands_for, type Graph, type Id } from "@mnd/core";
import type { Scene } from "./scene";

/** What a map pick lights: its blocks, and no lines. */
export type MapLit = { blocks: Id[]; lines: Id[] };

/** **The picked on a map**, each box with everything it holds. Null with nothing picked or off a
 *  map. */
export function picked_trace(scene: Scene, picked: readonly Id[]): MapLit | null {
  const drawn = new Set(scene.nodes.map((n) => n.id));
  const ids = picked.filter((id) => drawn.has(id));
  return scene.areas && ids.length ? { blocks: with_inside(scene, ids), lines: [] } : null;
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
function with_inside(scene: Scene, ids: readonly Id[]): Id[] {
  const above = holders(scene);
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
