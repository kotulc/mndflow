/** `mnd measure`: each diagram laid out and routed as the app does it (`layer_scene`, ELK, then
 *  libavoid), counted by views `measure`, at a landscape and a portrait canvas; one row per layer
 *  and shape, worst first. */

import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { diagram_kind, path, shown_name, type Graph, type Id } from "@mnd/core";
import { layer_scene, load_avoid, measure, routes_of, set_aspect, type Measure } from "@mnd/views";

/** The canvases measured: the app's default landscape, and a portrait one. */
const SHAPES = { landscape: 1.6, portrait: 0.6 } as const;

/** Diagrams drawn without a layout to measure. */
const UNLAID = new Set(["treemap"]);


/** Every diagram's counts, or one layer's with what each count found. */
export async function measured(graph: Graph, layer: Id | null): Promise<string[]> {
  const wasm = join(dirname(createRequire(import.meta.url).resolve("libavoid-js")), "libavoid.wasm");
  await load_avoid(wasm);
  const layers = layer ? [layer] : Object.keys(graph.blocks).filter((id) => {
    const kind = diagram_kind(graph, id);
    return !!kind && !UNLAID.has(kind);
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
  const worst = (m: Measure) => m.crossings + m.covered + m.shared + m.tight;
  rows.sort((a, z) => worst(z.m) - worst(a.m) || a.name.localeCompare(z.name));
  const total = (k: keyof Omit<Measure, "found">) => rows.reduce((n, r) => n + r.m[k], 0);
  const out = [`cross cover share tight lines  shape      layer`,
               ...rows.map(({ name, shape, m }) => [m.crossings, m.covered, m.shared, m.tight,
                 m.lines].map((n, i) => String(n).padStart(i ? 6 : 5)).join("")
                 + `  ${shape.padEnd(10)} ${name}`),
               `${[total("crossings"), total("covered"), total("shared"), total("tight"),
                   total("lines")].map((n, i) => String(n).padStart(i ? 6 : 5)).join("")}  total`];
  if (layer) for (const r of rows) out.push("", `${r.shape}:`, ...r.m.found.map((f) => `  ${f}`));
  return out;
}
