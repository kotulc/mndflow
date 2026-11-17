/** **The scale check** (docs/scale-plan.md): every tree view of a graph — both maps and every
 *  treemap layer — counted as a person reads it: nodes, chips against
 *  the budget, chips under the floor, names cut, cells unnamed, and how long it took to lay. */

import { placing_of, shown_name, type Graph } from "@mnd/core";
import { treemapped } from "./block";
import { budget, layer_map, library_map, model_map, FLOOR } from "./map";
import { CANVAS } from "./size";
import { box_of, type Scene } from "./scene";

/** One view's counts. */
export type Scale = { view: string; nodes: number; chips: number; budget: number; small: number;
                      cut: number; unnamed: number; ms: number };

/** A name's width per pixel of its size, and the chip's padding beside it (theme `.mnd-chip`). */
const CHAR = 0.6;
const SIDE = 26;


/** Every tree view of `graph`, counted at the canvas set now. */
export function scale_of(graph: Graph): Scale[] {
  const views: [string, () => Scene | null][] = [
    ["models", () => model_map(graph)],
    ["library", () => library_map(graph)],
    ...Object.keys(graph.blocks).filter((id) => placing_of(graph, id) === "treemap"
      || treemapped(graph, id, "structure"))
      .map((id): [string, () => Scene] => [`layer ${shown_name(graph, id)}`,
                                           () => layer_map(graph, id)]),
  ];
  return views.flatMap(([view, make]) => {
    const t0 = performance.now();
    const scene = make();
    const ms = performance.now() - t0;
    return scene ? [counted(view, scene, ms)] : [];
  });
}

/** One scene's counts. */
function counted(view: string, scene: Scene, ms: number): Scale {
  const chips = scene.nodes.filter((n) => n.type === "chip");
  const boxes = chips.map((n) => ({ n, b: box_of(n) }));
  return { view, nodes: scene.nodes.length, chips: chips.length, budget: budget(CANVAS),
           small: boxes.filter(({ b }) => b.w < FLOOR.w || b.h < FLOOR.h).length,
           cut: boxes.filter(({ n, b }) => n.data.label.length * (n.data.size ?? 11) * CHAR
             > b.w - SIDE).length,
           unnamed: chips.reduce((k, n) => k + (n.data.tiles ?? []).filter((t) => !t.label).length,
                                 0),
           ms: Math.round(ms) };
}
