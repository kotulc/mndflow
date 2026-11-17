/** `mnd measure`: each diagram laid out and routed as the app does it (`layer_scene`, ELK, then
 *  libavoid), counted by views `measure`, at a landscape and a portrait canvas; one row per layer
 *  and shape, worst first. With `--views`, the scale check of every tree view instead. */

import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { diagram_kind, path, placing_of, shown_name, type Graph, type Id } from "@mnd/core";
import { layer_scene, load_avoid, measure, routes_of, scale_of, set_aspect, set_canvas, type Measure,
         type Scale } from "@mnd/views";

/** The canvases measured: the app's default landscape, and a portrait one. */
const SHAPES = { landscape: 1.6, portrait: 0.6 } as const;

/** The canvases a tree view is checked at, in pixels: the app's default, and turned. */
const CANVASES = { landscape: [1200, 750], portrait: [750, 1200] } as const;


/** Every diagram's counts, or one layer's with what each count found. */
export async function measured(graph: Graph, layer: Id | null): Promise<string[]> {
  const wasm = join(dirname(createRequire(import.meta.url).resolve("libavoid-js")), "libavoid.wasm");
  await load_avoid(wasm);
  const layers = layer ? [layer] : Object.keys(graph.blocks).filter((id) => {
    /** A treemap is drawn without a layout to measure. */
    return !!diagram_kind(graph, id) && placing_of(graph, id) !== "treemap";
  });
  const rows: { name: string; shape: string; m: Measure }[] = [];
  for (const id of layers) {
    for (const [shape, aspect] of Object.entries(SHAPES)) {
      set_aspect(aspect);
      const scene = await layer_scene(graph, id, "internal");
      if (scene.edges.length) rows.push({ name: path(graph, id).map((b) => shown_name(graph, b.id)).join(" › "), shape,
                  m: measure(scene, routes_of(scene)) });
    }
  }
  const worst = (m: Measure) => m.crossings + m.covered + m.shared + m.tight + m.wrong * 10;
  rows.sort((a, z) => worst(z.m) - worst(a.m) || a.name.localeCompare(z.name));
  const total = (k: keyof Omit<Measure, "found">) => rows.reduce((n, r) => n + r.m[k], 0);
  const out = [`cross cover share tight wrong lines  shape      layer`,
               ...rows.map(({ name, shape, m }) => [m.crossings, m.covered, m.shared, m.tight,
                 m.wrong, m.lines].map((n, i) => String(n).padStart(i ? 6 : 5)).join("")
                 + `  ${shape.padEnd(10)} ${name}`),
               `${[total("crossings"), total("covered"), total("shared"), total("tight"),
                   total("wrong"), total("lines")].map((n, i) => String(n).padStart(i ? 6 : 5)).join("")}  total`];
  if (layer) for (const r of rows) out.push("", `${r.shape}:`, ...r.m.found.map((f) => `  ${f}`));
  return out;
}

/** **The scale check**: every tree view counted (views `scale_of`) at a landscape and a portrait
 *  canvas; one row per view and shape, worst first, then the totals. */
export function scaled(graph: Graph): string[] {
  const rows = Object.entries(CANVASES).flatMap(([shape, [w, h]]) => {
    set_canvas(w, h);
    return scale_of(graph).map((s) => ({ shape, s }));
  });
  const worst = (s: Scale) => s.small + s.cut + s.unnamed + s.stuck
    + Math.max(0, s.chips - s.budget);
  rows.sort((a, z) => worst(z.s) - worst(a.s) || z.s.ms - a.s.ms);
  const cols = (s: Omit<Scale, "view">) => [s.nodes, s.chips, s.budget, s.small, s.cut, s.unnamed,
                                            s.stuck, s.ms].map((n) => String(n).padStart(7))
    .join("");
  const sum = (k: keyof Omit<Scale, "view">) => rows.reduce((n, r) => n + r.s[k], 0);
  return ["  nodes  chips budget  small    cut unnamed  stuck     ms  shape      view",
          ...rows.map(({ shape, s }) => `${cols(s)}  ${shape.padEnd(10)} ${s.view}`),
          `${cols({ nodes: sum("nodes"), chips: sum("chips"), budget: sum("budget"),
                    small: sum("small"), cut: sum("cut"), unnamed: sum("unnamed"),
                    stuck: sum("stuck"), ms: sum("ms") })}  total`];
}
