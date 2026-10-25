/** Placement by ELK: every card of a layer placed automatically, each container — the layer, its
 *  regions, groups and folders — laid out on its own, inside out, toward the canvas's shape.
 *  Where lines join a container's cards it is **layered**, both directions tried and the one
 *  nearer the shape kept; where none do it is **packed** toward the shape. Reading order is file
 *  order. **A layer with regions is banded**: one layered run over everything it draws, each region
 *  a band in order — columns where the flow runs across, rows where it runs down, whichever fits
 *  the canvas — so lines run from band to band. */

import { children, drawn_in, edges_in, inline, is_grid, is_interface, is_region, owner_of,
         type Graph, type Id } from "@mnd/core";
import type { ELK, ElkNode } from "elkjs/lib/elk-api";
import { celled } from "./bands";
import { gridded, size_of, SHAPE, UNIT } from "./size";
import type { Placed } from "./arrange";

/** A room placed: every block it draws, from its own corner, and the extent they take. */
export type Placement = { w: number; h: number; spots: readonly Placed[] };

/** The layout engine, set by the host (a worker in the browser), else ELK on this thread. */
let engine: ELK | null = null;

/** What a container's padding is: room for a title on top, air elsewhere. */
const PADDING = `[top=${UNIT * 1.5},left=${UNIT},bottom=${UNIT},right=${UNIT}]`;

/** Placements already worked out, by everything they were worked out from. */
const made = new Map<string, Promise<Placement>>();

/** How many placements are kept before the oldest are dropped. */
const KEPT = 400;


/** Sets the layout engine: ELK in a worker, as the host loads it. */
export function set_elk(elk: ELK): void {
  engine = elk;
}

/** The engine, ELK on this thread where the host set none. */
async function elk(): Promise<ELK> {
  if (!engine) {
    const { default: Bundled } = await import("elkjs/lib/elk.bundled.js");
    engine = new Bundled() as ELK;
  }
  return engine;
}

/** Every block `layer` draws, placed: what it holds and what its regions, groups and folders hold,
 *  each container on its own. */
export function place(graph: Graph, layer: Id): Promise<Placement> {
  const spec = spec_of(graph, layer);
  const key = JSON.stringify([spec, SHAPE.aspect]);
  const was = made.get(key);
  if (was) return was;
  const out = laid_out(spec);
  made.set(key, out);
  if (made.size > KEPT) made.delete(made.keys().next().value!);
  return out.then((p) => ({ ...p, spots: [...p.spots, ...celled(graph, drawn_in(graph, layer),
                                                                   p.spots)] }));
}

/** One box to lay out: a leaf with its size, or a container with what it holds; a layer's region
 *  marked. */
type Box = { id: Id; w?: number; h?: number; kids?: Box[]; region?: true };

/** What ELK is given: the boxes, and the lines between them by their ends. */
type Spec = { root: Box; lines: [Id, Id][] };

/** The boxes a layer draws and the lines among them, every end lifted to a drawn box. */
function spec_of(graph: Graph, layer: Id): Spec {
  const drawn = new Set<Id>();
  const box = (id: Id): Box => {
    drawn.add(id);
    /** A grid drawn in place is a leaf: what it holds sits in its cells. */
    if (inline(graph, id) && !is_grid(graph, id)) {
      return { id, kids: units(graph, id).map(box) };
    }
    const s = size_of(graph, id);
    return { id, w: Math.round(s.w), h: Math.round(s.h) };
  };
  const root: Box = { id: layer, kids: units(graph, layer).map((id) => {
    const b = box(id);
    return is_region(graph, id) && b.kids ? { ...b, region: true as const } : b;
  }) };
  const lift = (id: Id): Id | null => {
    for (let at: Id | null = owner_of(graph, id); at; at = graph.blocks[at]?.parent ?? null) {
      if (drawn.has(at)) return at;
      if (at === layer) return null;
    }
    return null;
  };
  const lines: [Id, Id][] = [];
  for (const e of edges_in(graph, layer)) {
    const [a, b] = [lift(e.from), lift(e.to)];
    if (a && b && a !== b) lines.push([a, b]);
  }
  return { root, lines };
}

/** What a container places: its blocks, less interfaces and what sits in a grid's cells. */
function units(graph: Graph, id: Id): Id[] {
  return children(graph, id)
    .filter((b) => !is_interface(graph, b.id) && !gridded(graph, b.id)).map((b) => b.id);
}

/** Room for a region's name, across the top of its band. */
const RULE = UNIT * 1.25;

/** A laid-out container: its size, where each child sits, and how each container child was laid. */
type Done = { w: number; h: number; at: Map<Id, { x: number; y: number; w: number; h: number }>;
              inner: Map<Id, Done> };

/** How one container is laid: its padding, the shape it aims for, a width to pack toward. */
type How = { pad: string; aim: number; width?: number };

/** The spec laid out inside out: each container on its own, then composed back down. A room
 *  with regions is banded (`banded`). */
async function laid_out(spec: Spec): Promise<Placement> {
  const aim = SHAPE.aspect;
  const E = await elk();
  const up = new Map<Id, Id>();
  const index = (b: Box) => b.kids?.forEach((k) => { up.set(k.id, b.id); index(k); });
  index(spec.root);
  const chain = (id: Id) => {
    const out = [id];
    for (let at = up.get(id); at; at = up.get(at)) out.push(at);
    return out;
  };
  const nested: How = { pad: PADDING, aim: SHAPE.aspect };

  const lay = async (box: Box, how: How): Promise<Done> => {
    const inner = new Map<Id, Done>();
    const kids = await Promise.all((box.kids ?? []).map(async (k) => {
      if (!k.kids) return { id: k.id, width: k.w!, height: k.h! };
      const d = await lay(k, nested);
      inner.set(k.id, d);
      return { id: k.id, width: d.w, height: d.h };
    }));
    /** The lines among this container's children: each end lifted to the child holding it. */
    const here = new Set(kids.map((k) => k.id));
    const pairs = new Set<string>();
    for (const [a, b] of spec.lines) {
      const ca = chain(a), cb = chain(b);
      const ia = ca.indexOf(box.id), ib = cb.indexOf(box.id);
      if (ia < 1 || ib < 1) continue;
      const [ua, ub] = [ca[ia - 1]!, cb[ib - 1]!];
      if (ua !== ub && here.has(ua) && here.has(ub)) pairs.add(`${ua}\n${ub}`);
    }
    const edges = [...pairs].map((p, i) => {
      const [a, b] = p.split("\n");
      return { id: `e${i}`, sources: [a!], targets: [b!] };
    });
    const run = async (opts: Record<string, string>) => {
      const out: ElkNode = await E.layout({
        /** ELK writes into what it is given, and the tries run side by side: each its own copy. */
        id: box.id, children: kids.map((k) => ({ ...k })), edges: edges.map((e) => ({ ...e })),
        layoutOptions: { "elk.padding": how.pad, "elk.spacing.nodeNode": String(UNIT),
                         "elk.aspectRatio": String(how.aim), ...opts } });
      const w = out.width ?? 0, h = out.height ?? 0;
      const score = how.width ? Math.abs(Math.log(Math.max(1, w) / how.width))
        : Math.abs(Math.log(Math.max(1, w) / Math.max(1, h) / how.aim));
      return { out, score };
    };
    const tries = !kids.length ? [] : edges.length
      ? await Promise.all(["DOWN", "RIGHT"].map((dir) => run(layered(dir))))
      : await Promise.all(GOALS.flatMap((goal) => AIMS.map((f) => run(packed(goal, f, how)))));
    const best = tries.sort((a, b) => a.score - b.score)[0];
    const at = new Map((best?.out.children ?? []).map((c) =>
      [c.id, { x: c.x ?? 0, y: c.y ?? 0, w: c.width ?? 0, h: c.height ?? 0 }]));
    /** An empty container keeps room for a card. */
    const w = best?.out.width ?? UNIT * 6, h = best?.out.height ?? UNIT * 4;
    return { w, h, at, inner };
  };

  /** A room's own title sits on its wall: its first row keeps a unit clear of it. */
  const titled = `[top=${UNIT},left=0,bottom=0,right=0]`;
  const top = spec.root.kids?.some((k) => k.region)
    ? await banded(E, spec, chain, lay, aim)
    : await lay(spec.root, { pad: titled, aim });
  const spots: Placed[] = [];
  const put = (d: Done, dx: number, dy: number) => {
    for (const [id, a] of d.at) {
      spots.push({ id, x: dx + a.x, y: dy + a.y, w: a.w, h: a.h });
      const sub = d.inner.get(id);
      if (sub) put(sub, dx + a.x, dy + a.y);
    }
  };
  put(top, 0, 0);
  return { w: top.w, h: top.h, spots };
}

/** **A room banded by its regions**: one layered run over its loose blocks and its regions'
 *  members, each region an ELK partition in order, so the flow runs from band to band; across
 *  (regions as columns) and down (as rows) both tried, the one nearer `aim` kept. A region no line
 *  meets comes after those lines meet, packed whole as one unit toward its band: as tall as the
 *  room as a column, as wide as a row. A loose block sits in the band of what its lines reach.
 *  Each band then spans the room across the flow, its name above what it holds. */
async function banded(E: ELK, spec: Spec, chain: (id: Id) => Id[],
                      lay: (b: Box, how: How) => Promise<Done>, aim: number): Promise<Done> {
  const kids = spec.root.kids!;
  const ends = new Set(spec.lines.flat());
  const met = (b: Box): boolean => ends.has(b.id) || (b.kids ?? []).some(met);
  /** The bands in order: those lines meet first, then those none do, each in file order. */
  const regions = [...kids.filter((k) => k.region && met(k)),
                   ...kids.filter((k) => k.region && !met(k))];
  /** The units of the run, each with the band it sits in (0 before every region). */
  type Unit = { box: Box; part: number; region?: Id };
  const units: Unit[] = kids.flatMap((k): Unit[] => {
    const part = regions.indexOf(k) + 1;
    if (!k.region) return [{ box: k, part: 0 }];
    return met(k) ? (k.kids ?? []).map((box) => ({ box, part, region: k.id }))
      : [{ box: k, part, region: k.id }];
  });
  const wholes = units.filter((u) => u.box.id === u.region);
  const groups = new Map(await Promise.all(units.filter((u) => u.box.kids && u.box.id !== u.region)
    .map(async (u) => [u.box.id, await lay(u.box, { pad: PADDING, aim })] as const)));
  /** The lines among the units, each end lifted to the unit holding it. */
  const by = new Map(units.map((u) => [u.box.id, u]));
  const unit_of = (id: Id) => chain(id).find((x) => by.has(x));
  const pairs = new Map<string, [Id, Id]>();
  for (const [a, b] of spec.lines) {
    const [ua, ub] = [unit_of(a), unit_of(b)];
    if (ua && ub && ua !== ub) pairs.set(`${ua}|${ub}`, [ua, ub]);
  }
  for (const u of units.filter((x) => !x.region)) {
    const near = [...pairs.values()].flatMap(([a, b]) => (a === u.box.id ? [b]
      : b === u.box.id ? [a] : []));
    u.part = near.map((id) => by.get(id)!.part).find((p) => p > 0) ?? 0;
  }
  const run = async (dir: "RIGHT" | "DOWN", done: ReadonlyMap<Id, Done>): Promise<Done> => {
    const size = (u: Unit) => done.get(u.box.id) ?? { w: u.box.w!, h: u.box.h! };
    const out: ElkNode = await E.layout({
      id: "@bands",
      children: units.map((u) => ({ id: u.box.id, width: size(u).w, height: size(u).h,
                                    layoutOptions: { "elk.partitioning.partition":
                                                     String(u.part) } })),
      edges: [...pairs.values()].map(([a, b], i) => ({ id: `e${i}`, sources: [a],
                                                       targets: [b] })),
      /** Lines run the way they point: no reading order turns one back. */
      layoutOptions: { ...layered(dir), "elk.partitioning.activate": "true",
                       "elk.layered.cycleBreaking.strategy": "GREEDY",
                       "elk.separateConnectedComponents": "false",
                       "elk.layered.wrapping.strategy": "OFF",
                       "elk.padding": "[top=0,left=0,bottom=0,right=0]",
                       "elk.spacing.nodeNode": String(UNIT) } });
    const across = dir === "RIGHT";
    const pos = new Map((out.children ?? []).map((c) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }]));
    /** Each band's run along the flow. Across, the names take a row above them all; down, each
     *  band's name pushes it and those after it, with room for a unit between bands. */
    const parts = [...new Set(units.map((u) => u.part))].sort((a, b) => a - b);
    const shift = (p: number) => (across ? RULE
      : (RULE + UNIT / 4) * parts.filter((q) => q > 0 && q <= p).length);
    const placed = (u: Unit) => {
      const p = pos.get(u.box.id)!;
      return { x: p.x, y: p.y + shift(u.part), ...size(u) };
    };
    const runs = parts.map((p) => {
      const mine = units.filter((u) => u.part === p).map(placed)
        .map((a) => (across ? [a.x, a.x + a.w] : [a.y, a.y + a.h]));
      return { p, lo: Math.min(...mine.map((m) => m[0]!)), hi: Math.max(...mine.map((m) => m[1]!)) };
    });
    const [W, H] = [out.width ?? 0, (out.height ?? 0) + shift(parts.at(-1)!)];
    /** Bands part halfway between their runs, a unit apart; the first and last reach the room's
     *  edge. */
    const edge = (i: number) => (i <= 0 ? 0 : i >= runs.length ? (across ? W : H)
      : (runs[i - 1]!.hi + runs[i]!.lo) / 2);
    const at = new Map<Id, { x: number; y: number; w: number; h: number }>();
    const inner = new Map<Id, Done>();
    for (const u of units.filter((x) => !x.region)) {
      at.set(u.box.id, placed(u));
      if (done.has(u.box.id)) inner.set(u.box.id, done.get(u.box.id)!);
    }
    regions.forEach((r, n) => {
      const i = runs.findIndex((x) => x.p === n + 1);
      const lo = i <= 0 ? 0 : edge(i) + UNIT / 2;
      const hi = i + 1 >= runs.length ? (across ? W : H) : edge(i + 1) - UNIT / 2;
      const band = across ? { x: lo, y: 0, w: hi - lo, h: H } : { x: 0, y: lo, w: W, h: hi - lo };
      at.set(r.id, band);
      /** What the band holds, from its corner. */
      const mine = new Map<Id, { x: number; y: number; w: number; h: number }>();
      const sub = new Map<Id, Done>();
      for (const u of units.filter((x) => x.region === r.id)) {
        const p = placed(u);
        const whole = u.box.id === r.id ? done.get(r.id) : undefined;
        if (whole) {
          for (const [id, a] of whole.at) {
            mine.set(id, { ...a, x: a.x + p.x - band.x, y: a.y + p.y - band.y });
          }
          whole.inner.forEach((d, id) => sub.set(id, d));
          continue;
        }
        mine.set(u.box.id, { ...p, x: p.x - band.x, y: p.y - band.y });
        if (done.has(u.box.id)) sub.set(u.box.id, done.get(u.box.id)!);
      }
      inner.set(r.id, { w: band.w, h: band.h, at: mine, inner: sub });
    });
    return { w: W, h: H, at, inner };
  };
  /** One way: the whole regions packed toward a band's shape, then again toward the room the
   *  first run made — a column's height, a row's width. */
  const bare = "[top=0,left=0,bottom=0,right=0]";
  const way = async (dir: "RIGHT" | "DOWN") => {
    const across = dir === "RIGHT";
    const pack = async (width: (d: Done) => number | undefined, was?: ReadonlyMap<Id, Done>) =>
      new Map([...groups, ...await Promise.all(wholes.map(async (u) => {
        const w = was ? width(was.get(u.box.id)!) : undefined;
        return [u.box.id, await lay(u.box, { pad: bare, aim: aim * (across ? 0.4 : 2.5),
                                             ...(w ? { width: w } : {}) })] as const;
      }))]);
    const first = await pack(() => undefined);
    const once = await run(dir, first);
    if (!wholes.length) return once;
    const room = across ? Math.max(UNIT * 4, once.h - RULE) : once.w;
    return run(dir, await pack((d) => (across ? (d.w * d.h) / room : room), first));
  };
  const tries = await Promise.all((["RIGHT", "DOWN"] as const).map(way));
  const off = (d: Done) => Math.abs(Math.log(Math.max(1, d.w) / Math.max(1, d.h) / aim));
  const best = tries.sort((a, b) => off(a) - off(b))[0]!;
  /** Below the room's title. */
  const at = new Map([...best.at].map(([id, a]) => [id, { ...a, y: a.y + UNIT }]));
  return { w: best.w, h: best.h + UNIT, at, inner: best.inner };
}

/** ELK's layered options: square lines, file order kept for loops, ranks and pieces. */

function layered(dir: string): Record<string, string> {
  return {
    "elk.algorithm": "layered", "elk.direction": dir, "elk.edgeRouting": "ORTHOGONAL",
    "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    "elk.layered.cycleBreaking.strategy": "MODEL_ORDER",
    "elk.layered.considerModelOrder.components": "MODEL_ORDER",
    "elk.layered.spacing.nodeNodeBetweenLayers": String(UNIT * 2),
    "elk.spacing.componentComponent": String(UNIT * 1.5),
    "elk.separateConnectedComponents": "true",
    /** A long chain wraps into rows toward the shape rather than one thin strip. */
    "elk.layered.wrapping.strategy": "MULTI_EDGE",

  };
}

/** ELK's packing options, aimed at `f` times the shape asked for, or toward a width. */
function packed(goal: string, f: number, how: How): Record<string, string> {
  return { "elk.algorithm": "rectpacking",
           "elk.rectpacking.widthApproximation.optimizationGoal": goal,
           "elk.aspectRatio": String(how.aim * f),
           ...(how.width
             ? { "elk.rectpacking.widthApproximation.targetWidth": String(Math.round(how.width * f)) }
             : {}) };
}

/** ELK's packing lands unevenly round its target: two goals, each aimed a little either side. */
const GOALS = ["MAX_SCALE_DRIVEN", "ASPECT_RATIO_DRIVEN"];
const AIMS = [0.8, 1, 1.25, 1.6];
