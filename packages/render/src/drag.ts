/** What a left drag on the stage means.
 *
 *  A drag is one of four things, told apart by what it set off from: moving a
 *  card, sliding an interface along its edge, taking a picked line's end to
 *  another wall, or sweeping a selection box.
 *  Which it is, is decided at the press and never revised — a gesture that
 *  changes its mind halfway is the aim-and-hope this design is written against.
 *
 *  Nothing here writes: a drag ends as a name and a number, like every other
 *  gesture. */

import type { Point } from "@mnd/core";
import type { Hit, Scene } from "@mnd/views";

export type Drag =
  | { kind: "move"; on: string; from: Point; to: Point; over: string | null }
  | { kind: "seat"; on: string; to: Point }
  | { kind: "wall"; on: string; end: "from" | "to"; to: Point }
  | { kind: "sweep"; from: Point; to: Point; caught: string[] };

/** Under this, a drag is a click. A press that wanders by a pixel is still a
 *  press, which is what keeps a small target hittable. */
export const SLOP = 5;

export function far_enough(a: Point, b: Point): boolean {
  return Math.abs(b.x - a.x) >= SLOP || Math.abs(b.y - a.y) >= SLOP;
}

/** What the press landed on, and so what a drag from here would be. */
export function begins(hit: Hit | null): Drag["kind"] {
  if (!hit) return "sweep";
  if (hit.kind === "box") return "move";
  if (hit.kind === "seat") return "seat";
  return "sweep";
}

/** How near an end has to be grabbed. Half a card's height, so a handle is
 *  hittable without the press wandering onto the card behind it. */
export const REACH = 12;

/** Which end of a **picked** line the press took hold of.
 *
 *  Only a picked one: an end sits on the card's edge, so grabbing every line
 *  would make the card unmovable near its own walls. Picking first is the same
 *  two-step every other end-of-line handle asks for. */
export function grabbed(scene: Scene, picked: readonly string[],
                        at: Point): { on: string; end: "from" | "to" } | null {
  for (const r of scene.routes) {
    if (!picked.includes(r.id)) continue;
    const first = r.points[0];
    const last = r.points[r.points.length - 1];
    if (first && within(at, first)) return { on: r.id, end: "from" };
    if (last && within(at, last)) return { on: r.id, end: "to" };
  }
  return null;
}

function within(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) <= REACH && Math.abs(a.y - b.y) <= REACH;
}

/** Everything a swept rectangle encloses. **Wholly** enclosed: catching what a
 *  box merely brushes makes the gesture unpredictable. */
export function caught(scene: Scene, from: Point, to: Point): string[] {
  const x = Math.min(from.x, to.x);
  const y = Math.min(from.y, to.y);
  const w = Math.abs(to.x - from.x);
  const h = Math.abs(to.y - from.y);
  return scene.boxes
    .filter((b) => b.x >= x && b.y >= y && b.x + b.w <= x + w && b.y + b.h <= y + h)
    .map((b) => b.id);
}

/** The rectangle a sweep has covered so far, for drawing. */
export function swept(from: Point, to: Point) {
  return {
    x: Math.min(from.x, to.x),
    y: Math.min(from.y, to.y),
    w: Math.abs(to.x - from.x),
    h: Math.abs(to.y - from.y),
  };
}
