/** **Where the app's camera looks** (2026-11-08): one shot, worked out from where the app is —
 *  the drawing, what is picked, what is entered or left. The canvas lands it (stage
 *  `useCamera`); nothing else moves the camera. */

import { reached, type Graph, type Id } from "@mnd/core";
import { box_of, extent, UNIT, type Area, type Scene } from "@mnd/views";
import type { Rect, Shot } from "@mnd/stage";
import { drawn_as } from "./present";

/** Which camera a drawing has: the map; a treemap diagram entered from it; a layer entered and
 *  fitted; read down the page; any other layer, fitted whole; or the last drawing, held while
 *  the next is laid. */
export type Camera = "map" | "treemap" | "fitted" | "page" | "layer" | "held";

/** Where the app is, as the camera reads it. */
export type Where = {
  graph: Graph;
  scene: Scene;
  as: Camera;
  /** Counted up by every open, entry and leaving: a new count lands again. */
  seq: number;
  /** The map, and the block it is gone to. */
  map: Scene | null;
  focus: Id | null;
  /** The one block picked. */
  one: Id | null;
  /** A block revealed inside a layer, or a page's focus. */
  reveal: Id | null;
  /** The chip just gone up out of, on a map or a treemap: the camera flies out from it. */
  left: Area | null;
  /** Entering a chip: the chip flown into, and the drawing entered once laid. */
  into: { area: Area; scene: Scene | null; as: Camera } | null;
  /** A presentation's stop: the blocks the camera fits, each where the drawing draws it. */
  fit?: readonly Id[] | null;
  /** The step just shown: the card it lands on first, then the one it leaves. */
  step?: readonly Id[] | null;
};

/** A page is never magnified past 100%. */
const PAGE = { most: 1 };

/** **The one shot**: entering, the chip flown into as far as the entered drawing will stand,
 *  held while it is laid; a tree view — the map, a treemap diagram — whole, flown out to from a
 *  chip gone up out of; an entered layer, the hops, else held where it last stopped; a page read from its focus; any other layer whole. */
export function shot_of(w: Where): Shot {
  const seq = w.seq;
  if (w.into) {
    const { area, scene, as } = w.into;
    if (!scene) return { box: null, wait: true, seq };
    const then = shot_of({ ...w, scene, as, one: null, reveal: null, left: null,
                           into: null });
    return { box: area, into: { scene, shot: then }, seq };
  }
  const stop = w.fit ? fit_of(w.graph, w.scene, w.fit) : null;
  const fitted = stop && w.step?.length ? follow(w.graph, w.scene, stop, w.step) : stop;
  const hop = fitted ?? hop_of(w.graph, w.scene, w.one);
  const reveal = box_in(w.scene, w.reveal);
  /** **A tree view is seen whole** (docs/design/chip.md): it is laid the canvas's size, and a
   *  pick is laid larger in place (focus by expanding), so the camera never zooms to one. */
  /** While the next drawing is laid, the last is held: a stop's fit waits for it. */
  if (w.as === "held") return { box: null, wait: true, seq };
  if (w.as === "map" || w.as === "treemap") {
    return { box: fitted ?? { ...w.scene.areas![0]!, scale: 1 }, from: w.left, seq,
             ...(w.step?.length ? { glide: true } : {}) };
  }
  /** **A stop fits its blocks on every drawing**, a page or a diagram too. */
  if (fitted) return { box: fitted, seq, ...(w.step?.length ? { glide: true } : {}) };
  if (w.as === "fitted") return hop ? { box: hop, seq } : { box: null, hold: true, reveal, seq };
  if (w.as === "page") return { box: null, page: PAGE, reveal, seq };
  return { box: null, reveal, seq };
}

/** **A stop's fit** (docs/presentations.md): the box round every block named — none, the whole
 *  drawing — each lifted to what
 *  the drawing draws it as, with a margin, never magnified past 1.5× — a calm camera, never a
 *  plunge. The player sits in the tray (2026-11-22), so nothing is kept clear below. */
function fit_of(graph: Graph, scene: Scene, ids: readonly Id[]): Rect | null {
  const drawn = new Map(scene.nodes.map((n) => [n.id, n]));
  /** None named: the whole drawing, as a stop showing a diagram fits it. */
  const boxes = !ids.length ? scene.nodes.map(box_of) : ids.flatMap((id) => {
    const at = drawn_as(graph, drawn, id);
    return at ? [box_of(drawn.get(at)!)] : [];
  });
  if (!boxes.length) return null;
  const [x, y] = [Math.min(...boxes.map((b) => b.x)), Math.min(...boxes.map((b) => b.y))];
  const [w, h] = [Math.max(...boxes.map((b) => b.x + b.w)) - x,
                  Math.max(...boxes.map((b) => b.y + b.h)) - y];
  /** A little air round it. */
  const pad = Math.max(w, h) * 0.04;
  return { x: x - pad, y: y - pad, w: w + 2 * pad, h: h + 2 * pad, scale: 1 / 1.5 };
}

/** **The camera follows the step, as little as it can** (the user, 2026-11-21): the stop's view
 *  holds while the cards the step joins are in it; else it pans only as far as brings them in,
 *  a margin round them, never past the drawing's own edges, so its frame stays in sight; it
 *  grows only where they cannot fit. */
function follow(graph: Graph, scene: Scene, stop: Rect, step: readonly Id[]): Rect {
  const drawn = new Map(scene.nodes.map((n) => [n.id, n]));
  const boxes = step.flatMap((id) => {
    const at = drawn_as(graph, drawn, id);
    return at ? [box_of(drawn.get(at)!)] : [];
  });
  if (!boxes.length) return stop;
  const pad = UNIT * 2;
  const [x0, y0] = [Math.min(...boxes.map((b) => b.x)) - pad, Math.min(...boxes.map((b) => b.y)) - pad];
  const [x1, y1] = [Math.max(...boxes.map((b) => b.x + b.w)) + pad,
                    Math.max(...boxes.map((b) => b.y + b.h)) + pad];
  /** Untouched where the step is already in the stop's box. */
  const inside = (b: { x: number; y: number; w: number; h: number }) => b.x >= stop.x
    && b.x + b.w <= stop.x + stop.w && b.y >= stop.y && b.y + b.h <= stop.y + stop.h;
  if (boxes.every(inside)) return stop;
  const [w, h] = [Math.max(stop.w, x1 - x0), Math.max(stop.h, y1 - y0)];
  const all = extent(scene);
  /** Along one axis: as it was where the span is in sight, else moved just enough, then held
   *  inside the drawing (centred on it where the view is wider). */
  const along = (at: number, size: number, lo: number, hi: number, min: number, max: number) => {
    const moved = lo < at ? lo : hi > at + size ? hi - size : at;
    return size >= max - min ? min - (size - (max - min)) / 2
      : Math.min(Math.max(moved, min), max - size);
  };
  return { x: along(stop.x, w, x0, x1, all.x, all.x + all.w),
           y: along(stop.y, h, y0, y1, all.y, all.y + all.h),
           w, h, scale: stop.scale };
}

/** A block's box where the drawing draws it. */
function box_in(scene: Scene, id: Id | null): Rect | null {
  const n = id ? scene.nodes.find((x) => x.id === id) : undefined;
  return n ? box_of(n) : null;
}

/** **What the camera fits on a pick** on a layer: the block picked and everything a hop each way
 *  (core `reached`, lifted to the cards drawn), fitted only where it joins something, never
 *  above 100%. A map never fits a pick (the user, 2026-11-22: a treemap draws no hops). */
function hop_of(graph: Graph, scene: Scene, one: Id | null): Rect | null {
  if (scene.areas || !one || !graph.blocks[one]) return null;
  const fit = new Set(reached(graph, one, scene.layer).blocks);
  const boxes = scene.nodes.filter((n) => fit.has(n.id)).map(box_of);
  if (!boxes.length) return null;
  const [x, y] = [Math.min(...boxes.map((b) => b.x)), Math.min(...boxes.map((b) => b.y))];
  return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x,
           h: Math.max(...boxes.map((b) => b.y + b.h)) - y, scale: 1 };
}
