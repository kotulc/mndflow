/** **A model's overview** (docs/diagrams/tree.md, the model root): what sits round its treemap —
 *  the About band below past a dashed divider, plain notes never lit or dimmed. Laid once the
 *  middle is. Its actors and externals are tiles of the treemap (the user, 2026-11-22). */

import { model_entries, model_library, presentations_of, shown_name,
         about_groups, type Graph, type Id } from "@mnd/core";
import { cell, type BoxNode, type Scene } from "./scene";

/** One group of About as drawn: its name and its notes, each what it names and, for a
 *  presentation, its place in the model's list. */
export type AboutDrawn = { name: string;
                           items: { id: Id; label: string; play?: number }[] };

/** About's rows — its heading's room and each note's line — and the air above it. */
const ABOUT = { head: 34, row: 18, pad: 10, least: 72, away: 48 };


/** **The room About takes** below a model's middle, in pixels, so the middle is laid in what is
 *  left and the whole overview fits the canvas at 100%. */
export function about_room(): number {
  return ABOUT.away + ABOUT.least + 2 * ABOUT.row;
}

/** **The middle laid, with About below**, the map's root area grown to hold it. */
export function around(graph: Graph, model: Id, layer: Id, middle: Scene): Scene {
  const root = middle.areas?.[0];
  if (!root) return middle;
  const about = about_band(`${layer}@about`, about_of(graph, model), root.w, root.h);
  return grown({ ...middle, nodes: [...middle.nodes, ...about] });
}

/** About's band below a middle `w` by `h`, as tall as its longest group; none with nothing to
 *  say. */
function about_band(id: Id, groups: readonly AboutDrawn[], w: number, h: number): BoxNode[] {
  if (!groups.some((g) => g.items.length)) return [];
  const rows = Math.max(1, ...groups.map((g) => g.items.length));
  const band = { x: 0, y: h + ABOUT.away, w,
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

