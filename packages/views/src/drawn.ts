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
export type Drawn = { id: Id; from: Id; to: Id; label: string; run: Point[]; name?: NameBox;
                      hops: Point[] };


/** Every drawn line — never a guide nobody picks, as a lifeline — among `boxes`, the cards. */
export function lines_drawn(scene: Scene, routes: ReadonlyMap<Id, readonly Point[]>,
                            boxes: readonly Rect[]): Drawn[] {
  const out: Drawn[] = [];
  const taken: Rect[] = [...boxes];
  /** Every run first, so each name can keep off the others' lines. */
  const laid = scene.edges.filter((x) => !x.hidden && x.selectable !== false).flatMap((e) => {
    const a = end_of(e, "from", scene.nodes, scene.perches, scene.frame);
    const b = end_of(e, "to", scene.nodes, scene.perches, scene.frame);
    if (!a || !b) return [];
    const given = e.data?.points && e.data.points.length > 1 ? [...e.data.points] : null;
    const routed = given ? null : avoided_run(routes.get(e.id), a, b);
    const run = given ?? routed ?? route(a, a.face, b, b.face, e.data?.fan,
                                         e.data?.module === "tie", boxes);
    return [{ e, run, fan: given || routed ? undefined : e.data?.fan }];
  });
  for (const { e, run, fan } of laid) {
    const label = [e.label ? String(e.label) : "", e.data?.alias ?? ""].filter(Boolean).join(" ");
    const chars = label.length + (e.data?.times ? `×${e.data.times}`.length : 0);
    const others = laid.filter((x) => x.e !== e).map((x) => x.run);
    const box = chars ? name_box(run, chars, fan, e.data?.level, taken, others) : undefined;
    /** Shown as the stage shows it, from the laid run; a shown name is kept clear of after. */
    const shown = box && line_shows(length_of(run), box.w).name;
    if (shown) taken.push(box);
    out.push({ id: e.id, from: e.source, to: e.target, label, run, hops: hops_of(run, others),
               ...(shown ? { name: box } : {}) });
  }
  return out;
}

/** **Where a line hops** (2026-11-21: a crossing never reads as a join): each point a level leg
 *  of it crosses an upright leg of another line, clear of either's ends. */
function hops_of(run: readonly Point[], others: readonly (readonly Point[])[]): Point[] {
  const legs = (r: readonly Point[]) => r.slice(1).map((q, i) => [r[i]!, q] as const);
  const upright = others.flatMap((o) => legs(o).filter(([p, q]) => p.x === q.x && p.y !== q.y));
  return legs(run).filter(([p, q]) => p.y === q.y && p.x !== q.x).flatMap(([p, q]) =>
    upright.flatMap(([s, t]) => {
      const [x0, x1] = [Math.min(p.x, q.x), Math.max(p.x, q.x)];
      const [y0, y1] = [Math.min(s.y, t.y), Math.max(s.y, t.y)];
      return s.x > x0 + 1 && s.x < x1 - 1 && p.y > y0 + 1 && p.y < y1 - 1
        ? [{ x: s.x, y: p.y }] : [];
    }));
}

/** How long a run is. */
function length_of(run: readonly Point[]): number {
  return run.slice(1).reduce((n, q, i) => n + Math.hypot(q.x - run[i]!.x, q.y - run[i]!.y), 0);
}
