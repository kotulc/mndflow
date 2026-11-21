/** `mnd measure`: each diagram laid out and routed as the app does it (`layer_scene`, ELK, then
 *  libavoid), counted by views `measure`, at a landscape and a portrait canvas; one row per layer
 *  and shape, worst first. With `--views`, the scale check of every tree view instead. */

import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { children, diagram_kind, is_model, package_of, path, placing_of, shown_name, type Graph,
         type Id } from "@mnd/core";
import { extent, layer_scene, load_avoid, measure, routes_of, scale_of, set_aspect, set_canvas,
         type Measure, type Scale, type Scene } from "@mnd/views";

/** The canvases measured: the app's default landscape, and a portrait one. */
const SHAPES = { landscape: 1.6, portrait: 0.6 } as const;

/** The least share of its size a diagram may be drawn at to fit: below it, text is too small. */
const SMALL = 60;

/** The canvases a tree view is checked at, in pixels: the app's default, turned, and a small
 *  one, whose budget is low enough that wide boxes group. */
const CANVASES = { landscape: [1200, 750], portrait: [750, 1200], small: [520, 400] } as const;


/** Every diagram's counts, or one layer's with what each count found. */
export async function measured(graph: Graph, layer: Id | null): Promise<string[]> {
  const wasm = join(dirname(createRequire(import.meta.url).resolve("libavoid-js")), "libavoid.wasm");
  await load_avoid(wasm);
  /** Every diagram, and every library definition of the workspace holding parts, whose view
   *  draws what is across its frame. A treemap is drawn without a layout to measure. */
  const library = (id: Id) => !!graph.blocks[id]?.def && !is_model(graph, id)
    && package_of(graph, id) === graph.root && children(graph, id).length > 0;
  const layers = layer ? [layer] : Object.keys(graph.blocks).filter((id) =>
    (!!diagram_kind(graph, id) || library(id)) && placing_of(graph, id) !== "treemap");
  const rows: { name: string; shape: string; m: Measure; fit: number }[] = [];
  for (const id of layers) {
    for (const [shape, aspect] of Object.entries(SHAPES)) {
      set_aspect(aspect);
      const scene = await layer_scene(graph, id, "internal");
      if (scene.edges.length) rows.push({ name: path(graph, id).map((b) => shown_name(graph, b.id)).join(" › "), shape,
                  m: measure(scene, routes_of(scene)), fit: fit_of(scene, shape) });
    }
  }
  const worst = (m: Measure) => m.crossings + m.covered + m.shared + m.tight
    + (m.wrong + m.loose) * 10;
  rows.sort((a, z) => worst(z.m) - worst(a.m) || a.name.localeCompare(z.name));
  const total = (k: keyof Omit<Measure, "found">) => rows.reduce((n, r) => n + r.m[k], 0);
  const out = [`cross cover share tight wrong loose lines   fit  shape      layer`,
               ...rows.map(({ name, shape, m, fit }) => [m.crossings, m.covered, m.shared, m.tight,
                 m.wrong, m.loose, m.lines].map((n, i) => String(n).padStart(i ? 6 : 5)).join("")
                 + `${`${fit}%`.padStart(6)}${fit < SMALL ? "!" : " "} ${shape.padEnd(10)} ${name}`),
               `${[total("crossings"), total("covered"), total("shared"), total("tight"),
                   total("wrong"), total("loose"), total("lines")]
                 .map((n, i) => String(n).padStart(i ? 6 : 5)).join("")}  total`];
  const small = rows.filter((r) => r.fit < SMALL).length;
  if (small) out.push(`${small} drawn below ${SMALL}% to fit the canvas (!): text too small to read`);
  if (layer) for (const r of rows) out.push("", `${r.shape}:`, ...r.m.found.map((f) => `  ${f}`));
  /** **A loose block fails the measure** (2026-11-21): a view must say why what is across is. */
  if (total("loose")) {
    out.push(`fails: ${total("loose")} loose — a block across a frame no line reaches`);
    process.exitCode = 1;
  }
  return out;
}

/** **How large a diagram is drawn to fit its canvas** (2026-11-21: every diagram respects the
 *  canvas's aspect), in percent of its own size, capped at 100. */
function fit_of(scene: Scene, shape: string): number {
  const [w, h] = CANVASES[shape as keyof typeof CANVASES];
  const e = extent(scene);
  return Math.round(Math.min(1, w / Math.max(1, e.w), h / Math.max(1, e.h)) * 100);
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
