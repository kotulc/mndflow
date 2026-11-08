/** **What a person sees as broken, counted**: over a scene and its routed
 *  runs, the lines through cards they do not end on, the names over cards or each other, the runs
 *  two lines share, and the gaps too narrow for the lines they carry. Pure; drawn as the stage
 *  draws it — libavoid's run where there is one, else `route`'s — names placed by `name_box`. */

import type { Id } from "@mnd/core";
import { avoided_run } from "./avoid";
import { end_of } from "./ends";
import { line_level, TEXT_BAND } from "./level";
import { name_box, route } from "./route";
import { box_of, type Scene } from "./scene";
import { SEAT } from "./size";

type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };

/** The counts, and what each found, for reading one out. */
export type Measure = { crossings: number; covered: number; shared: number; tight: number;
                        lines: number; found: string[] };

/** What a line goes round and a name must not cover: cards and notes, never a holder. */
const SOLID = new Set(["card", "note"]);

/** How far inside a card a leg must run to cross it, and how long two legs must lie on one run to
 *  share it: less is a pixel's rounding. */
const INSIDE = 2;
const ALONG = SEAT;


/** A scene measured, its runs as routed (`routes_of`), at `zoom` for which names show. */
export function measure(scene: Scene, routes: ReadonlyMap<Id, readonly Point[]>,
                        zoom = 1): Measure {
  const cards = scene.nodes.filter((n) => SOLID.has(n.type ?? ""))
    .map((n) => ({ id: n.id, box: box_of(n), label: n.data.label }));
  const runs = runs_of(scene, routes, zoom, cards.map((c) => c.box));
  const found: string[] = [];
  const said = (n: Id) => cards.find((c) => c.id === n)?.label ?? n;

  /** A leg through a card it does not end on. */
  let crossings = 0;
  for (const r of runs) {
    for (const c of cards) {
      if (c.id === r.from || c.id === r.to) continue;
      if (legs(r.run).some(([p, q]) => through(p, q, shrunk(c.box, INSIDE)))) {
        crossings++;
        found.push(`crosses   ${r.label || r.id} over ${c.label}`);
      }
    }
  }

  /** A name over a card, or over another name. */
  const names = runs.filter((r) => r.name).map((r) => ({ r, box: r.name! }));
  let covered = 0;
  names.forEach(({ r, box }, i) => {
    const card = cards.find((c) => overlaps(box, c.box));
    const other = names.slice(i + 1).find((o) => overlaps(box, o.box));
    if (card || other) {
      covered++;
      found.push(`covers    ${r.label} over ${card ? card.label : other!.r.label}`);
    }
  });

  /** Two lines along one run, where they share no end. */
  let shared = 0;
  runs.forEach((a, i) => {
    for (const b of runs.slice(i + 1)) {
      const ends = [a.run[0]!, a.run.at(-1)!];
      if ([b.run[0]!, b.run.at(-1)!].some((p) => ends.some((q) => near(p, q)))) continue;
      if (legs(a.run).some(([p, q]) => legs(b.run).some(([s, t]) => along(p, q, s, t)))) {
        shared++;
        found.push(`shares    ${a.label || a.id} with ${b.label || b.id}`);
      }
    }
  });

  /** A gap between two facing cards narrower than the lines it carries need. */
  let tight = 0;
  cards.forEach((a, i) => {
    for (const b of cards.slice(i + 1)) {
      const gap = gap_of(a.box, b.box);
      if (!gap) continue;
      const carried = runs.filter((r) => legs(r.run).some(([p, q]) =>
        (p.x === q.x) === gap.upright && through(p, q, gap.box))).length;
      if (carried && gap.width < (carried + 1) * SEAT) {
        tight++;
        found.push(`tight     ${said(a.id)} | ${said(b.id)}: ${Math.round(gap.width)} for ${carried}`);
      }
    }
  });

  return { crossings, covered, shared, tight, lines: runs.length, found };
}

/** Every drawn line's run, ends and name box — never a guide nobody picks, as a lifeline —
 *  libavoid's where it still meets its ends, else `route`'s; its name where it shows at `zoom`,
 *  clear of the cards where it can be. */
function runs_of(scene: Scene, routes: ReadonlyMap<Id, readonly Point[]>, zoom: number,
                 boxes: readonly Rect[]) {
  const out: { id: Id; from: Id; to: Id; label: string; run: Point[]; name?: Rect }[] = [];
  for (const e of scene.edges.filter((x) => !x.hidden && x.selectable !== false)) {
    const a = end_of(e, "from", scene.nodes, scene.perches, scene.frame);
    const b = end_of(e, "to", scene.nodes, scene.perches, scene.frame);
    if (!a || !b) continue;
    const given = e.data?.points && e.data.points.length > 1 ? [...e.data.points] : null;
    const routed = given ? null : avoided_run(routes.get(e.id), a, b);
    const run = given ?? routed ?? route(a, a.face, b, b.face, e.data?.fan, e.data?.module === "tie");
    const fan = given || routed ? undefined : e.data?.fan;
    const label = [e.label ? String(e.label) : "", e.data?.alias ?? ""].filter(Boolean).join(" ");
    const chars = label.length + (e.data?.times ? `×${e.data.times}`.length : 0);
    const box = chars ? name_box(run, chars, fan, e.data?.level, boxes)
      : undefined;
    /** Shown as the stage shows it: the name's width held inside the text band. */
    const shown = box && line_level(length_of(run), zoom, box.w
      * Math.min(TEXT_BAND.high, Math.max(TEXT_BAND.low, zoom))) >= 2;
    out.push({ id: e.id, from: e.source, to: e.target, label, run,
               ...(shown ? { name: box } : {}) });
  }
  return out;
}

/** The gap between two cards facing each other across it: its box, how wide, and whether the
 *  lines along it run upright. */
function gap_of(a: Rect, b: Rect): { box: Rect; width: number; upright: boolean } | null {
  const [l, r] = a.x <= b.x ? [a, b] : [b, a];
  const [t, d] = a.y <= b.y ? [a, b] : [b, a];
  const side = r.x - (l.x + l.w);
  const over_y = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (side > 0 && over_y > 0) {
    return { box: { x: l.x + l.w, y: Math.max(a.y, b.y), w: side, h: over_y }, width: side,
             upright: true };
  }
  const down = d.y - (t.y + t.h);
  const over_x = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  if (down > 0 && over_x > 0) {
    return { box: { x: Math.max(a.x, b.x), y: t.y + t.h, w: over_x, h: down }, width: down,
             upright: false };
  }
  return null;
}

/** A run's legs, in order. */
function legs(run: readonly Point[]): [Point, Point][] {
  return run.slice(1).map((q, i) => [run[i]!, q]);
}

/** Whether a square leg runs through a box's inside. */
function through(p: Point, q: Point, b: Rect): boolean {
  const [x0, x1] = [Math.min(p.x, q.x), Math.max(p.x, q.x)];
  const [y0, y1] = [Math.min(p.y, q.y), Math.max(p.y, q.y)];
  return x1 > b.x && x0 < b.x + b.w && y1 > b.y && y0 < b.y + b.h;
}

/** Whether two square legs lie on one run for longer than `ALONG`. */
function along(p: Point, q: Point, s: Point, t: Point): boolean {
  const level = p.y === q.y && s.y === t.y && Math.abs(p.y - s.y) < 1;
  const upright = p.x === q.x && s.x === t.x && Math.abs(p.x - s.x) < 1;
  if (!level && !upright) return false;
  const [k, m] = level ? ["x", "x"] as const : ["y", "y"] as const;
  const lo = Math.max(Math.min(p[k], q[k]), Math.min(s[m], t[m]));
  const hi = Math.min(Math.max(p[k], q[k]), Math.max(s[m], t[m]));
  return hi - lo > ALONG;
}

/** Whether two boxes overlap. */
function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** A box drawn in by `by` on every side. */
function shrunk(b: Rect, by: number): Rect {
  return { x: b.x + by, y: b.y + by, w: b.w - by * 2, h: b.h - by * 2 };
}

/** Whether two points are one end. */
function near(p: Point, q: Point): boolean {
  return Math.abs(p.x - q.x) < 1 && Math.abs(p.y - q.y) < 1;
}

/** A run's length. */
function length_of(run: readonly Point[]): number {
  return run.slice(1).reduce((n, q, i) => n + Math.hypot(q.x - run[i]!.x, q.y - run[i]!.y), 0);
}
