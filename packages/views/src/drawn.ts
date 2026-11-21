/** **Every line as the stage draws it**: its run — libavoid's where it still meets its ends, else
 *  `route`'s — and its name's box, placed in order, each **clear of the cards and of every name
 *  placed before it** (the user, 2026-11-21: no overlap). The one geometry the stage draws by and
 *  the measure counts. */

import type { Id } from "@mnd/core";
import { avoided_run } from "./avoid";
import { end_of } from "./ends";
import { line_shows } from "./line";
import { name_box, route, type NameBox } from "./route";
import type { Scene } from "./scene";

type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };

/** A line drawn: its ends, its run, and its name's box where the name shows. */
export type Drawn = { id: Id; from: Id; to: Id; label: string; run: Point[]; name?: NameBox };


/** Every drawn line — never a guide nobody picks, as a lifeline — among `boxes`, the cards. */
export function lines_drawn(scene: Scene, routes: ReadonlyMap<Id, readonly Point[]>,
                            boxes: readonly Rect[]): Drawn[] {
  const out: Drawn[] = [];
  const taken: Rect[] = [...boxes];
  for (const e of scene.edges.filter((x) => !x.hidden && x.selectable !== false)) {
    const a = end_of(e, "from", scene.nodes, scene.perches, scene.frame);
    const b = end_of(e, "to", scene.nodes, scene.perches, scene.frame);
    if (!a || !b) continue;
    const given = e.data?.points && e.data.points.length > 1 ? [...e.data.points] : null;
    const routed = given ? null : avoided_run(routes.get(e.id), a, b);
    const run = given ?? routed ?? route(a, a.face, b, b.face, e.data?.fan,
                                         e.data?.module === "tie", boxes);
    const fan = given || routed ? undefined : e.data?.fan;
    const label = [e.label ? String(e.label) : "", e.data?.alias ?? ""].filter(Boolean).join(" ");
    const chars = label.length + (e.data?.times ? `×${e.data.times}`.length : 0);
    const box = chars ? name_box(run, chars, fan, e.data?.level, taken) : undefined;
    /** Shown as the stage shows it, from the laid run; a shown name is kept clear of after. */
    const shown = box && line_shows(length_of(run), box.w).name;
    if (shown) taken.push(box);
    out.push({ id: e.id, from: e.source, to: e.target, label, run, ...(shown ? { name: box } : {}) });
  }
  return out;
}

/** How long a run is. */
function length_of(run: readonly Point[]): number {
  return run.slice(1).reduce((n, q, i) => n + Math.hypot(q.x - run[i]!.x, q.y - run[i]!.y), 0);
}
