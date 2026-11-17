/** **A model's overview** (docs/diagrams/tree.md, the model root): what sits round its treemap.
 *  Context's zones — actors above, inputs left, outputs and dependencies right — then the About
 *  band below past a dashed divider, plain notes never lit or dimmed; and the model's lines,
 *  quiet under the chips until a pick or a presentation lights them. Laid once the middle is. */

import { base_of, model_entries, model_library, presentations_of, shown_name, subtree,
         about_groups, type Graph, type Hop, type Id } from "@mnd/core";
import { colour_of, kind_of } from "./about";
import { carried } from "./derive";
import { cell, type Area, type BoxNode, type Scene } from "./scene";
import { hop_trace } from "./trace";

/** One group of About as drawn: its name and its notes, each what it names and, for a
 *  presentation, its place in the model's list. */
export type AboutDrawn = { name: string;
                           items: { id: Id; label: string; play?: number }[] };

/** Which zone a part of the model stands in: above, left, right, or the middle. */
type Zone = "above" | "left" | "right";

/** A zone chip's size, the air between zone chips and between a zone and the middle, and About's
 *  rows: its heading's room and each note's line. */
const ZONE = { w: 168, h: 56, gap: 12, away: 48 };
const ABOUT = { head: 34, row: 18, pad: 10, least: 72 };


/** Which of a model's top blocks (`tops`, a use's read through) stand outside its system: actors
 *  above; an external left where more of its lines leave it than reach it, else right. */
export function zones_of(graph: Graph, tops: readonly Id[]): Map<Id, Zone> {
  const out = new Map<Id, Zone>();
  const lines = Object.values(graph.edges);
  for (const id of tops) {
    const base = base_of(graph, id);
    if (base === "actor") out.set(id, "above");
    else if (base === "external") {
      const leaves = lines.filter((e) => e.from === id).length;
      const reaches = lines.filter((e) => e.to === id).length;
      out.set(id, leaves > reaches ? "left" : "right");
    }
  }
  return out;
}

/** **The room round a model's middle**, in pixels: what its zones and About take of the canvas,
 *  so the middle is laid in what is left and the whole overview fits the canvas at 100%. */
export function zone_room(zones: ReadonlyMap<Id, Zone>): { w: number; h: number } {
  const has = (z: Zone) => [...zones.values()].includes(z);
  const side = ZONE.w + ZONE.away;
  return { w: (has("left") ? side : 0) + (has("right") ? side : 0),
           h: (has("above") ? ZONE.h + ZONE.away : 0) + ZONE.away + ABOUT.least + 2 * ABOUT.row };
}

/** **The middle laid, with what is round it**: each zone's chips beside the middle, About below,
 *  the map's root area grown to hold them all, and the model's lines quiet. */
export function around(graph: Graph, model: Id, layer: Id, middle: Scene,
                       zones: ReadonlyMap<Id, Zone>): Scene {
  const root = middle.areas?.[0];
  if (!root) return middle;
  const { w, h } = root;
  const nodes: BoxNode[] = [...middle.nodes];
  const areas: Area[] = [...middle.areas!];
  const by = (z: Zone) => [...zones].filter(([, at]) => at === z).map(([id]) => id);
  /** A zone's chips in a line, centred on the middle's side. */
  const line = (ids: readonly Id[], across: boolean, x0: number, y0: number) => {
    const span = ids.length * (across ? ZONE.w : ZONE.h) + (ids.length - 1) * ZONE.gap;
    const start = (across ? w : h) / 2 - span / 2;
    ids.forEach((id, i) => {
      const at = start + i * ((across ? ZONE.w : ZONE.h) + ZONE.gap);
      const box = across ? { x: at, y: y0, w: ZONE.w, h: ZONE.h }
        : { x: x0, y: at, w: ZONE.w, h: ZONE.h };
      nodes.push(zone_chip(graph, id, box));
      areas.push({ id, parent: root.id, ...box, label: shown_name(graph, id), depth: 1,
                   chip: true });
    });
  };
  line(by("above"), true, 0, -ZONE.away - ZONE.h);
  line(by("left"), false, -ZONE.away - ZONE.w, 0);
  line(by("right"), false, w + ZONE.away, 0);
  const about = about_band(`${layer}@about`, about_of(graph, model), w, h);
  const scene = grown({ ...middle, nodes: [...nodes, ...about], areas });
  return { ...scene, quiet: hop_trace(graph, scene, lines_of(graph, model)) ?? undefined };
}

/** About's band below a middle `w` by `h`, as tall as its longest group; none with nothing to
 *  say. */
function about_band(id: Id, groups: readonly AboutDrawn[], w: number, h: number): BoxNode[] {
  if (!groups.some((g) => g.items.length)) return [];
  const rows = Math.max(1, ...groups.map((g) => g.items.length));
  const band = { x: 0, y: h + ZONE.away, w,
                 h: Math.max(ABOUT.least, ABOUT.head + rows * ABOUT.row + ABOUT.pad) };
  return [{ ...cell(id, band, { label: "About", marks: [], about: groups }, "about"),
            draggable: false, selectable: false, focusable: false }];
}

/** A scene whose root area is grown to hold every node, so the camera fits it whole. */
function grown(scene: Scene): Scene {
  const [root, ...rest] = scene.areas ?? [];
  if (!root) return scene;
  const all = scene.nodes.map((n) => ({ x: n.position.x, y: n.position.y, w: n.width ?? 0,
                                        h: n.height ?? 0 }));
  const x0 = Math.min(0, ...all.map((b) => b.x));
  const y0 = Math.min(0, ...all.map((b) => b.y));
  return { ...scene, areas: [{ ...root, x: x0, y: y0,
                               w: Math.max(...all.map((b) => b.x + b.w)) - x0,
                               h: Math.max(...all.map((b) => b.y + b.h)) - y0 }, ...rest] };
}

/** An actor's or an external's chip: its name and its kind, in its colour. */
function zone_chip(graph: Graph, id: Id, box: { x: number; y: number; w: number; h: number })
    : BoxNode {
  const own = carried(graph, id, "small");
  return { ...cell(id, box, { label: shown_name(graph, id), marks: ["zone" as const],
                              kind: kind_of(graph, id), size: 13,
                              cell: base_of(graph, id) === "actor" ? "actor" : "external",
                              ...(own.role ? { role: own.role } : {}),
                              ...(own.description ? { description: own.description } : {}),
                              look: colour_of(graph, id) }, "chip"), draggable: false };
}

/** **About's groups as drawn**: each its own items, or a built-in's — the model's presentations,
 *  its entries, its library. A group with nothing to say is left out. */
export function about_of(graph: Graph, model: Id): AboutDrawn[] {
  const shown = presentations_of(graph, model);
  const block = (id: Id) => ({ id, label: shown_name(graph, id) });
  return about_groups(graph, model).map((g): AboutDrawn => {
    const named = (word: Id) => {
      const play = shown.findIndex((p) => p.name === word);
      return play >= 0 ? { id: `${model}@play.${play}`, label: word, play }
        : block(word);
    };
    const items = g.items ? g.items.map(named)
      : g.name === "Presentations"
        ? shown.map((p, play) => ({ id: `${model}@play.${play}`, label: p.name, play }))
      : g.name === "Entries" ? model_entries(graph, model).map(block)
      : g.name === "Library" ? model_library(graph, model).map(block) : [];
    return { name: g.name, items };
  }).filter((g) => g.items.length);
}

/** Every line inside a model, as a hop: its ends and its name. Ties draw nothing here. */
export function lines_of(graph: Graph, model: Id): Hop[] {
  const inside = new Set(subtree(graph, model));
  return Object.values(graph.edges)
    .filter((e) => inside.has(e.from) && inside.has(e.to) && e.type !== "tie")
    .map((e) => ({ from: e.from, to: e.to, names: e.name ? [e.name] : [] }));
}
