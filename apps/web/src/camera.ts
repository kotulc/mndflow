/** **Where the app's camera looks** (2026-11-08): one shot, worked out from where the app is —
 *  the drawing, what is picked or walked, what is entered or left. The canvas lands it (stage
 *  `useCamera`); nothing else moves the camera. */

import { path, reached, type Graph, type Hop, type Id } from "@mnd/core";
import { box_of, hop_trace, trace_of, type Area, type Scene, type Trace } from "@mnd/views";
import type { Rect, Shot } from "@mnd/stage";

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
  /** The one block picked, and the step walked. */
  one: Id | null;
  walked: Hop | null;
  /** A block revealed inside a layer, or a page's focus. */
  reveal: Id | null;
  /** The chip just gone up out of, on a map or a treemap: the camera flies out from it. */
  left: Area | null;
  /** Entering a chip: the chip flown into, and the drawing entered once laid. */
  into: { area: Area; scene: Scene | null; as: Camera } | null;
  /** A presentation's stop: the blocks the camera fits, each where the drawing draws it. */
  fit?: readonly Id[] | null;
};

/** A page is never magnified past 100%. */
const PAGE = { most: 1 };

/** **The one shot**: entering, the chip flown into as far as the entered drawing will stand,
 *  held while it is laid; a tree view — the map, a treemap diagram — whole, or the step walked,
 *  either flown out to from a chip gone up out of; an entered layer,
 *  the hops, else held where it last stopped; a page read from its focus; any other layer whole. */
export function shot_of(w: Where): Shot {
  const seq = w.seq;
  if (w.into) {
    const { area, scene, as } = w.into;
    if (!scene) return { box: null, wait: true, seq };
    const then = shot_of({ ...w, scene, as, one: null, walked: null, reveal: null, left: null,
                           into: null });
    return { box: area, into: { scene, shot: then }, seq };
  }
  const hop = (w.fit?.length ? fit_of(w.graph, w.scene, w.fit) : null)
    ?? hop_of(w.graph, w.scene, w.walked, w.one);
  const reveal = box_in(w.scene, w.reveal);
  /** **A tree view is seen whole** (docs/design/chip.md): it is laid the canvas's size, and a
   *  pick is laid larger in place (focus by expanding), so the camera never zooms to one; a walk
   *  still fits its step. */
  if (w.as === "map" || w.as === "treemap") {
    const walk = w.walked ? hop_of(w.graph, w.scene, w.walked, null) : null;
    const fit = w.fit?.length ? fit_of(w.graph, w.scene, w.fit) : null;
    return { box: fit ?? walk ?? { ...w.scene.areas![0]!, scale: 1 }, from: w.left, seq };
  }
  if (w.as === "fitted") return hop ? { box: hop, seq } : { box: null, hold: true, reveal, seq };
  if (w.as === "page") return { box: null, page: PAGE, reveal, seq };
  if (w.as === "held") return { box: null, wait: true, seq };
  return { box: null, reveal, seq };
}

/** **A stop's fit** (docs/presentations.md): the box round every block named, each lifted to what
 *  the drawing draws it as, with a margin, never magnified past 4×. */
function fit_of(graph: Graph, scene: Scene, ids: readonly Id[]): Rect | null {
  const drawn = new Map(scene.nodes.map((n) => [n.id, n]));
  const boxes = ids.flatMap((id) => {
    const at = [...path(graph, id)].reverse().find((b) => drawn.has(b.id));
    return at ? [box_of(drawn.get(at.id)!)] : [];
  });
  if (!boxes.length) return null;
  const [x, y] = [Math.min(...boxes.map((b) => b.x)), Math.min(...boxes.map((b) => b.y))];
  const [w, h] = [Math.max(...boxes.map((b) => b.x + b.w)) - x,
                  Math.max(...boxes.map((b) => b.y + b.h)) - y];
  const pad = Math.max(w, h) * 0.08;
  return { x: x - pad, y: y - pad, w: w + 2 * pad, h: h + 2 * pad, scale: 1 / 4 };
}

/** A block's box where the drawing draws it. */
function box_in(scene: Scene, id: Id | null): Rect | null {
  const n = id ? scene.nodes.find((x) => x.id === id) : undefined;
  return n ? box_of(n) : null;
}

/** **What the camera fits on a pick**, on a map or a layer entered from it: the step walked,
 *  both its ends; else the block picked and everything a hop each way, so no leg runs out of
 *  view. A map's legs run chip to chip; a layer's hops are its cards (core `reached`), fitted
 *  only where it joins something, never above 100%. */
function hop_of(graph: Graph, scene: Scene, walked: Hop | null, one: Id | null): Rect | null {
  const here = new Set(scene.nodes.map((n) => n.id));
  const ends = (): readonly Id[] => {
    if (!scene.areas) {
      /** A step's ends lifted to the cards drawing them, as `reached` lifts a pick's hops. */
      const lift = (id: Id) => [...path(graph, id)].reverse().find((b) => here.has(b.id))?.id;
      if (walked) return [lift(walked.from), lift(walked.to)].filter((x): x is Id => !!x);
      return one && graph.blocks[one] ? reached(graph, one, scene.layer).blocks : [];
    }
    const t: Trace | null = walked ? hop_trace(graph, scene, [walked])
      : one ? trace_of(graph, scene, one) : null;
    return t ? [...t.legs.flatMap((l) => [l.from, l.to]), ...(walked ? [] : [one!])] : [];
  };
  const fit = new Set(ends());
  const boxes = scene.nodes.filter((n) => fit.has(n.id)).map(box_of);
  if (!boxes.length) return null;
  const [x, y] = [Math.min(...boxes.map((b) => b.x)), Math.min(...boxes.map((b) => b.y))];
  return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x,
           h: Math.max(...boxes.map((b) => b.y + b.h)) - y, scale: scene.areas ? 1 / 2 : 1 };
}
