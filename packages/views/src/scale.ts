/** **The scale check** (docs/scale-plan.md): every tree view of a graph — both maps, every
 *  treemap layer and every folder entered in either section — counted as a person reads it:
 *  nodes, chips against the budget, chips under the floor, names cut, cells unnamed, chips with a
 *  well that enter nothing, and how long it took to lay. */

import { filed_defs, is_filing, is_region, lens_of, on_side, placing_of, shown_name,
         type Graph } from "@mnd/core";
import { treemapped } from "./block";
import { budget, is_group_id, layer_map, library_map, model_map, FLOOR } from "./map";
import { CANVAS } from "./size";
import { box_of, type Scene } from "./scene";

/** One view's counts. */
export type Scale = { view: string; nodes: number; chips: number; budget: number; small: number;
                      cut: number; unnamed: number; stuck: number; ms: number };

/** A name's width per pixel of its size, and the chip's padding beside it (theme `.mnd-chip`). */
const CHAR = 0.6;
const SIDE = 26;


/** Every tree view of `graph`, counted at the canvas set now. */
export function scale_of(graph: Graph): Scale[] {
  const views: [string, () => Scene | null][] = [
    ["models", () => model_map(graph)],
    ["library", () => library_map(graph)],
    ...Object.keys(graph.blocks).flatMap((id) => {
      const models = placing_of(graph, id) === "treemap"
        || (treemapped(graph, id, "structure") && on_side(graph, id, "structure"));
      const library = is_filing(graph, id) && filed_defs(graph, id).length > 0;
      return [...(models ? [view(`layer ${shown_name(graph, id)}`, () => layer_map(graph, id))] : []),
              ...(library ? [view(`folder ${shown_name(graph, id)}`, () => library_map(graph, id))]
                : [])];
    }),
  ];
  return views.flatMap(([view, make]) => {
    const t0 = performance.now();
    const scene = make();
    const ms = performance.now() - t0;
    return scene ? [counted(graph, view, scene, ms)] : [];
  });
}

/** A view to count: its name, and how it is made. */
function view(name: string, make: () => Scene | null): [string, () => Scene | null] {
  return [name, make];
}

/** One scene's counts. */
function counted(graph: Graph, view: string, scene: Scene, ms: number): Scale {
  const chips = scene.nodes.filter((n) => n.type === "chip");
  const lists = scene.map === "library" ? "domain" : "structure";
  const boxes = chips.map((n) => ({ n, b: box_of(n) }));
  return { view, nodes: scene.nodes.length, chips: chips.length, budget: budget(CANVAS),
           small: boxes.filter(({ b }) => b.w < FLOOR.w || b.h < FLOOR.h).length,
           cut: boxes.filter(({ n, b }) => n.data.label.length * (n.data.size ?? 11) * CHAR
             > b.w - SIDE).length,
           unnamed: chips.reduce((k, n) => k + (n.data.tiles ?? []).filter((t) => !t.label).length,
                                 0),
           /** A region is a camera stop: it enters the room holding it (core `open_at`); a group
            *  enters as its view narrowed to it. */
           stuck: chips.filter((n) => n.data.tiles?.length && !n.data.toggle
             && !is_region(graph, n.id) && !is_group_id(n.id)
             && !lens_of(graph, n.id, lists)).length,
           ms: Math.round(ms) };
}
