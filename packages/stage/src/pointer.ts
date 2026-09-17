/** Reading what a pointer is over. */

import type { Gesture } from "./gestures";
import type { Point, Side } from "@mnd/core";
import { at_seat, holds, FRAME, type Scene } from "@mnd/views";

/** What was under a pointer, by the id React Flow reported. */
export function kind_of(scene: Scene, id: string | null,
                 target?: EventTarget | null): Gesture["kind"] {
  if (!id) return "empty";
  const el = target instanceof Element ? target : null;
  if (id === FRAME) return el?.closest(".mnd-frame-name") ? "title" : "frame";
  /** A name is renamed where it is read. */
  if (el?.closest(NAMES)) return "name";
  if (scene.edges.some((e) => e.id === id)) return "route";
  /** A card's border is a wall, not the card. */
  if (el?.closest(".mnd-brim")) return "brim";
  if (scene.frame?.ports.some((p) => p.id === id)) return "seat";
  /** A cell has no id, so its address is read off the DOM. */
  if (el?.closest(".mnd-grid-cell")) return "cell";
  const node = scene.nodes.find((n) => n.id === id);
  /** Boundaries and notes have no inside. */
  if (holds(node)) return "band";
  if (node?.type === "note") return "note";
  return node?.data.on ? "seat" : "box";
}

/** Everywhere a name is drawn on a card. */
export const NAMES = ".mnd-label, .mnd-group-name, .mnd-tag, .mnd-wire-text";

/** A line end's grip, drawn while the line is picked. */
export type Grip = { key: string; edge: string; end: "from" | "to"; on: string;
              side: Side; at: number; x: number; y: number };

/** The rectangle two points make, whichever way round they were drawn. */
export function spread(a: Point, b: Point): { x: number; y: number; w: number; h: number } {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y),
           w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}

/** The middle of a seat, in scene coordinates. */
export function middle(box: { x: number; y: number; w: number; h: number },
                seat: { side: Side; at: number }): Point {
  const r = at_seat(box, seat);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}
