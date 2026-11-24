/** Placement by ELK: every card of a layer placed automatically, each container — the layer, its
 *  regions, groups and folders — laid out on its own, inside out, toward the canvas's shape.
 *  Where lines join a container's cards it is **layered**, both directions tried and the one
 *  nearer the shape kept; where none do it is **packed** toward the shape. Reading order is file
 *  order. **A layer with regions is banded**: one layered run over everything it draws, each region
 *  a band in order — columns where the flow runs across, rows where it runs down, whichever fits
 *  the canvas — so lines run from band to band. */

import { chain_of, children, drawn_in, edges_in, holders_in, inline, is_aside, is_grid, is_group,
         is_interface, is_region, is_tie, flow_of, members_of, owner_of, type Graph, type Id, type Side } from "@mnd/core";
import type { ELK, ElkNode } from "elkjs/lib/elk-api";
import { ACROSS, outside_of, wall_of } from "./across";
import { celled } from "./bands";
import { flow_wall } from "./seat";
import { beside } from "./float";
import { gridded, size_of, SEAT, SHAPE, UNIT } from "./size";
import type { Placed } from "./arrange";

/** A room placed: every block it draws, from its own corner, and the extent they take; banded,
 *  whether its bands run across, as columns, or down, as rows. */
export type Placement = { w: number; h: number; spots: readonly Placed[]; across?: boolean };

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
export function place(graph: Graph, layer: Id, structure = false): Promise<Placement> {
  const spec = { ...spec_of(graph, layer), ...(structure ? { structure } : {}) };
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

/** What ELK is given: the boxes, and the lines between them by their ends; for a behaviour,
 *  `main`, each step's first line (`from\nto`), kept straight along one axis; `walls`, each
 *  drawn box meeting what is across the frame, by the wall its line leaves through (`own`: a
 *  line to one of the room's own ports); `beside`,
 *  each note and the box it is tied to, which it sits next to in one rank; `structure`, a
 *  drawing of what there is rather than of what flows (class, entity), laid whichever way fits
 *  the canvas best. */
type Spec = { root: Box; lines: [Id, Id][]; main?: Set<string>; ranked?: boolean;
              walls?: Wall[]; beside?: [Id, Id][]; structure?: boolean };

/** A drawn box pulled toward a wall, and whether by one of the room's own ports. */
type Wall = [Id, Side, boolean];

/** **The kinds laid along an axis** (docs/diagrams/flow.md *Layout*): steps in one row along the
 *  canvas's long side, never wrapped, each step's first line straight on it. */
const ALONG = ["flow", "state", "dataflow"];

/** A group's compound: a box of its members. */
const compound = (id: Id, kids: Box[]): Box => ({ id, kids });

/** The boxes a layer draws and the lines among them, every end lifted to a drawn box. */
function spec_of(graph: Graph, layer: Id): Spec {
  const drawn = new Set<Id>();
  const box = (id: Id): Box => {
    drawn.add(id);
    /** A grid drawn in place is a leaf: what it holds sits in its cells. */
    if (inline(graph, id) && !is_grid(graph, id)) {
      return { id, kids: compounded(groups, units(graph, id).map(box), compound) };
    }
    const s = size_of(graph, id);
    return { id, w: Math.round(s.w), h: Math.round(s.h) };
  };
  const groups = tree_groups(graph, layer);
  const root: Box = { id: layer, kids: compounded(groups, units(graph, layer).map((id) => {
    const b = box(id);
    return is_region(graph, id) && b.kids ? { ...b, region: true as const } : b;
  }), compound) };
  const lift = (id: Id): Id | null => {
    for (let at: Id | null = owner_of(graph, id); at; at = graph.blocks[at]?.parent ?? null) {
      if (drawn.has(at)) return at;
      if (at === layer) return null;
    }
    return null;
  };
  const lines: [Id, Id][] = [];
  const beside: [Id, Id][] = [];
  for (const e of edges_in(graph, layer)) {
    const [a, b] = [lift(e.from), lift(e.to)];
    if (!a || !b || a === b) continue;
    /** **A note is no step**: its tie never ranks it; it sits beside what it is tied to. */
    const note = is_tie(graph, e.id) ? [a, b].find((x) => is_aside(graph, x)) : undefined;
    if (note) {
      if (!beside.some(([n]) => n === note)) beside.push([note, note === a ? b : a]);
    } else lines.push([a, b]);
  }
  const walls = walls_of(graph, layer, lift);
  const extra = { ...(walls.length ? { walls } : {}), ...(beside.length ? { beside } : {}) };
  const kind = graph.blocks[layer]?.def ? layer : graph.blocks[layer]?.type;
  if (!chain_of(graph, kind).some((d) => ALONG.includes(d.id))) return { root, lines, ...extra };
  /** A step's first line, in list order, is its main way on. */
  const firsts = new Map<Id, Id>();
  for (const [a, b] of lines) if (!firsts.has(a)) firsts.set(a, b);
  /** **A tree is ranked, not laned** (2026-11-21: a call tree drawn as a flow): where the main
   *  way from the first start passes fewer than half the steps, the flow branches more than it
   *  runs, and is laid as a hierarchy, inputs first. */
  const steps = [...new Set(lines.flat())];
  const start = steps.find((id) => !lines.some(([, b]) => b === id)) ?? steps[0];
  const way = new Set<Id>();
  for (let at = start; at && !way.has(at); at = firsts.get(at)) way.add(at);
  if (way.size * 2 < steps.length) return { root, lines, ...extra };
  /** **A dataflow ranks by role** (docs/diagrams/dataflow.md): its readers, the ends, last. */
  const ranked = chain_of(graph, kind).some((d) => d.id === "dataflow");
  return { root, lines, main: new Set([...firsts].map(([a, b]) => `${a}\n${b}`)),
           ...(ranked ? { ranked } : {}), ...extra };
}

/** **What is across pulls toward its wall** (2026-11-21: paths readable): each drawn box a line
 *  joins to what stands outside the frame, by the wall that line leaves through, once a pair. */
function walls_of(graph: Graph, layer: Id, lift: (id: Id) => Id | null): Wall[] {
  const pairs = new Map<string, Wall>();
  /** The room's own ports pull too: each toward the wall it names, else its flow's. */
  const port = (id: Id) => graph.blocks[id]?.parent === layer && is_interface(graph, id);
  for (const e of edges_in(graph, layer)) {
    const [wall, near] = port(e.from) ? [e.from, e.to] : port(e.to) ? [e.to, e.from] : [];
    const side = wall && (graph.blocks[wall]?.side ?? flow_wall(flow_of(graph, wall)));
    const at = near && lift(near);
    if (side && at) pairs.set(`${at}|${side}`, [at, side, true]);
  }
  const out = outside_of(graph, layer);
  if (!out) return [...pairs.values()];
  for (const e of Object.values(out.graph.edges).filter((x) => x.id.startsWith(ACROSS))) {
    const [far, near] = e.from.startsWith(ACROSS) ? [e.from, e.to] : [e.to, e.from];
    const zone = out.zones.get(far);
    const at = lift(near);
    if (zone && at && !pairs.has(`${at}|${wall_of(zone)}`)) {
      pairs.set(`${at}|${wall_of(zone)}`, [at, wall_of(zone), false]);
    }
  }
  return [...pairs.values()];
}

/** What a container places: its blocks, less interfaces, groups and what sits in a grid's cells. */
function units(graph: Graph, id: Id): Id[] {
  return children(graph, id).filter((b) => !is_interface(graph, b.id) && !is_group(graph, b.id)
    && !gridded(graph, b.id)).map((b) => b.id);
}

/** A group and its members. */
export type Members = { id: Id; of: ReadonlySet<Id> };

/** Whether `a`'s members are a proper superset of `b`'s. */
const holds = (a: Members, b: Members) =>
  a.of.size > b.of.size && [...b.of].every((x) => a.of.has(x));

/** **The groups that can be compounds**: those whose membership nests or stays apart from every
 *  other group's — a tree. One that partly overlaps another, or shares another's exact members,
 *  is no compound: its panel is drawn round wherever its members land (`block.ts` `panel`). */
export function tree_groups(graph: Graph, layer: Id | null): Members[] {
  const all = holders_in(graph, layer).filter((g) => is_group(graph, g.id))
    .map((g) => ({ id: g.id, of: new Set(members_of(graph, g.id).map((b) => b.id)) }))
    .filter((g) => g.of.size);
  const meets = (a: Members, b: Members) => [...a.of].some((x) => b.of.has(x));
  return all.filter((g) => all.every((o) => o === g || !meets(g, o) || holds(g, o) || holds(o, g)));
}

/** A container's boxes with each tree group whose members all sit here wrapped as a compound,
 *  nested as their groups nest, in the place of its first member. **A workaround**: ELK puts a
 *  node in one compound and a compound in one partition, so a group across containers is no
 *  compound and only its panel gathers it. */
export function compounded<T extends { id: Id }>(groups: readonly Members[], boxes: T[],
                                                 made: (id: Id, kids: T[]) => T): T[] {
  const here = new Set(boxes.map((b) => b.id));
  const mine = groups.filter((g) => [...g.of].every((id) => here.has(id)));
  const wrap = (items: T[], gs: readonly Members[]): T[] => {
    let out = items;
    for (const g of gs.filter((g) => !gs.some((o) => holds(o, g)))) {
      const at = out.findIndex((b) => g.of.has(b.id));
      const kids = wrap(out.filter((b) => g.of.has(b.id)), gs.filter((o) => holds(g, o)));
      out = [...out.slice(0, at), made(g.id, kids),
             ...out.slice(at).filter((b) => !g.of.has(b.id))];
    }
    return out;
  };
  return wrap(boxes, mine);
}

/** Room for a region's name, across the top of its band. */
const RULE = UNIT * 1.25;

/** A laid-out container: its size, where each child sits, and how each container child was laid. */
type Done = { w: number; h: number; at: Map<Id, { x: number; y: number; w: number; h: number }>;
              inner: Map<Id, Done>; across?: boolean };

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
    /** **A note is laid after the rest**, beside what it is tied to here (`float.ts`). */
    const notes = new Map((spec.beside ?? []).filter(([n, t]) => here.has(n) && here.has(t)));
    /** A behaviour keeps its file order; anything else is read inputs first (`upstream`). */
    const kept = kids.filter((k) => !notes.has(k.id));
    const ranked_kids = spec.main && box.id === spec.root.id ? kept
      : upstream(kept.map((k) => k.id), [...pairs].map((p) => p.split("\n") as [Id, Id]))
        .map((id) => kept.find((k) => k.id === id)!);
    const edges = [...pairs].map((p, i) => {
      const [a, b] = p.split("\n");
      return { id: `e${i}`, sources: [a!], targets: [b!],
               ...(spec.main?.has(p) ? { layoutOptions: STRAIGHT } : {}) };
    });
    /** The room's walls as ports, each joined to the children meeting what is across it. */
    const walled = box.id === spec.root.id ? (spec.walls ?? []).flatMap(([id, side, own]) => {
      const kid = chain(id).find((x) => here.has(x));
      return kid ? [[kid, side, own] as const] : [];
    }) : [];
    const ports = [...new Set(walled.map(([, side]) => side))]
      .map((side) => ({ id: `@wall:${side}`, layoutOptions: { "elk.port.side": SIDES[side] } }));
    const pulls = walled.map(([kid, side], i) => ({ id: `w${i}`, sources: [kid],
                                                    targets: [`@wall:${side}`] }));
    const run = async (opts: Record<string, string>) => {
      /** ELK writes into what it is given, and the tries run side by side: each its own copy. */
      const ends = ends_of(walled, opts["elk.direction"]);
      const room: ElkNode = {
        id: box.id, children: ranked_kids.map((k) => ({ ...k, ...(ends.has(k.id)
          ? { layoutOptions: { "elk.layered.layering.layerConstraint": ends.get(k.id)! } } : {}) })),
        edges: [...edges, ...pulls].map((e) => ({ ...e })),
        ...(ports.length ? { ports: ports.map((p) => ({ ...p })) } : {}),
        layoutOptions: { "elk.padding": how.pad, "elk.spacing.nodeNode": String(UNIT),
                         "elk.aspectRatio": String(how.aim),
                         ...(ports.length ? { "elk.portConstraints": "FIXED_SIDE" } : {}),
                         ...opts } };
      /** A room with wall ports is laid inside a holder: ELK reads a port only on a child. */
      const out: ElkNode = !ports.length ? await E.layout(room)
        : (await E.layout({ id: "@holder", children: [room],
                            layoutOptions: { "elk.algorithm": "layered" } })).children![0]!;
      const w = out.width ?? 0, h = out.height ?? 0;
      const score = how.width ? Math.abs(Math.log(Math.max(1, w) / how.width))
        : Math.abs(Math.log(Math.max(1, w) / Math.max(1, h) / how.aim));
      return { out, score };
    };
    /** A behaviour runs one way, along the canvas's long side, never wrapped. */
    const along = spec.main && box.id === spec.root.id;
    const tries = !ranked_kids.length ? [] : along
      ? [await run({ ...layered(SHAPE.aspect >= 1 ? "RIGHT" : "DOWN"),
                     "elk.layered.wrapping.strategy": "OFF",
                     ...(spec.ranked ? { "elk.layered.layering.strategy": "LONGEST_PATH" } : {}) })]
      : edges.length || pulls.length
      ? await Promise.all((spec.structure ? ["DOWN", "RIGHT"] : [flow_way()])
          .map((dir) => run({ ...layered(dir),
          ...(ports.length ? { "elk.layered.wrapping.strategy": "OFF",
                               "elk.separateConnectedComponents": "false" } : {}) })))
      : await Promise.all(GOALS.flatMap((goal) => AIMS.map((f) => run(packed(goal, f, how)))));
    const best = tries.sort((a, b) => a.score - b.score)[0];
    const at = new Map((best?.out.children ?? []).map((c) =>
      [c.id, { x: c.x ?? 0, y: c.y ?? 0, w: c.width ?? 0, h: c.height ?? 0 }]));
    /** An empty container keeps room for a card. */
    const w = best?.out.width ?? UNIT * 6, h = best?.out.height ?? UNIT * 4;
    const sizes = new Map(kids.map((k) => [k.id, { w: k.width, h: k.height }]));
    if (along && !spec.ranked && at.size) {
      const order = edges.map((e) => [e.sources[0]!, e.targets[0]!] as [Id, Id]);
      const wide = SHAPE.aspect >= 1;
      const laid = wrapped(laned(at, ranked_kids.map((k) => k.id), order, wide), wide);
      return { ...noted_in(laid, notes, sizes), inner };
    }
    return { ...noted_in({ w, h, at }, notes, sizes), inner };
  };

  /** A room's own title sits on its wall: its first row keeps a unit clear of it. */
  const titled = `[top=${UNIT},left=0,bottom=0,right=0]`;
  const top = spec.root.kids?.some((k) => k.region)
    ? await banded(E, spec, chain, lay, aim)
    : crossing(spec, chain) ? await joint(E, spec, titled)
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
  return { w: top.w, h: top.h, spots, ...(top.across === undefined ? {} : { across: top.across }) };
}

/** **A room banded by its regions**: one layered run over its loose blocks and its regions'
 *  members, **each band an ELK partition in list order** — a region, or a run of loose blocks
 *  between regions, unnamed — so the flow runs from band to band; across (bands as columns) and
 *  down (as rows) both tried, the one nearer `aim` kept. A region no line meets is packed whole as
 *  one unit toward its band, in its list place: as tall as the room as a column, as wide as a
 *  row. Each band then spans the room across the flow, a region's name above what it holds. */
async function banded(E: ELK, spec: Spec, chain: (id: Id) => Id[],
                      lay: (b: Box, how: How) => Promise<Done>, aim: number): Promise<Done> {
  const kids = spec.root.kids!;
  const ends = new Set(spec.lines.flat());
  const met = (b: Box): boolean => ends.has(b.id) || (b.kids ?? []).some(met);
  const regions = kids.filter((k) => k.region);
  /** The units of the run, each with its band: the list walked, a new band at each region and at
   *  each run of loose blocks. */
  type Unit = { box: Box; part: number; region?: Id };
  let part = -1;
  const units: Unit[] = kids.flatMap((k, i): Unit[] => {
    if (!k.region) {
      if (i === 0 || kids[i - 1]!.region) part++;
      return [{ box: k, part }];
    }
    part++;
    return met(k) && k.kids?.length ? k.kids.map((box) => ({ box, part, region: k.id }))
      : [{ box: k, part, region: k.id }];
  });
  /** The bands that wear a name: a region's. */
  const named = new Set(units.filter((u) => u.region).map((u) => u.part));
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
      : (RULE + UNIT / 4) * parts.filter((q) => named.has(q) && q <= p).length);
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
    regions.forEach((r) => {
      const i = runs.findIndex((x) => x.p === units.find((u) => u.region === r.id)!.part);
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
    return { w: W, h: H, at, inner, across };
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
  /** **Bands run whichever way fits the canvas** (regions are ordered bands, columns or rows
   *  by its shape): both tried, the nearer kept. */
  const tries = await Promise.all((["RIGHT", "DOWN"] as const).map(way));
  const off = (d: Done) => Math.abs(Math.log(Math.max(1, d.w) / Math.max(1, d.h) / aim));
  const best = tries.sort((a, b) => off(a) - off(b))[0]!;
  /** Below the room's title. */
  const at = new Map([...best.at].map(([id, a]) => [id, { ...a, y: a.y + UNIT }]));
  return { w: best.w, h: best.h + UNIT, at, inner: best.inner, across: !!best.across };
}

/** Whether a room holds groups some line runs between: what is laid jointly (`joint`). */
function crossing(spec: Spec, chain: (id: Id) => Id[]): boolean {
  if (spec.main || !spec.root.kids?.some((k) => k.kids)) return false;
  const top = (id: Id) => chain(id).at(-2);
  return spec.lines.some(([a, b]) => top(a) !== top(b)
    && [a, b].some((x) => chain(x).length > 2));
}

/** **A room with groups laid as one hierarchy** (the user, 2026-11-21: hierarchical, ordered
 *  flows): ELK ranks every card across the groups at once, each group a compound kept whole,
 *  rather than each group laid alone and the room ranked by lines lifted to them. Every
 *  container's cards are given inputs first (`upstream`). */
async function joint(E: ELK, spec: Spec, pad: string): Promise<Done> {
  const leaves = (b: Box): Id[] => (b.kids ? b.kids.flatMap(leaves) : [b.id]);
  const order = upstream(leaves(spec.root), spec.lines);
  const rank = (b: Box) => Math.min(...leaves(b).map((id) => order.indexOf(id)));
  const node = (b: Box): ElkNode => (b.kids
    ? { id: b.id, layoutOptions: { "elk.padding": PADDING },
        children: [...b.kids].sort((a, z) => rank(a) - rank(z)).map(node) }
    : { id: b.id, width: b.w!, height: b.h! });
  const pairs = new Set(spec.lines.filter(([a, b]) => a !== b).map(([a, b]) => `${a}\n${b}`));
  const out = await E.layout({ ...node(spec.root),
    edges: [...pairs].map((p, i) => {
      const [a, b] = p.split("\n");
      return { id: `j${i}`, sources: [a!], targets: [b!] };
    }),
    layoutOptions: { ...layered(flow_way()), "elk.padding": pad,
                     "elk.hierarchyHandling": "INCLUDE_CHILDREN",
                     "elk.layered.wrapping.strategy": "OFF" } });
  const done = (n: ElkNode): Done => {
    const at = new Map<Id, Spot>();
    const inner = new Map<Id, Done>();
    for (const c of n.children ?? []) {
      at.set(c.id, { x: c.x ?? 0, y: c.y ?? 0, w: c.width ?? 0, h: c.height ?? 0 });
      if (c.children?.length) inner.set(c.id, done(c));
    }
    return { w: n.width ?? 0, h: n.height ?? 0, at, inner };
  };
  return done(out);
}

/** **Inputs first, outputs last** (the user, 2026-11-21: ordered, hierarchical flows): ids
 *  in a cycle-tolerant topological order — Eades' greedy order: sinks peeled to the end, sources
 *  to the front, else the one sending most more than it takes — ties in the order given. ELK
 *  reads it as its model order, so a cycle is broken against the flow, never against the
 *  alphabet a fact answer was listed in. */
export function upstream(ids: readonly Id[], lines: readonly [Id, Id][]): Id[] {
  const left = new Set(ids);
  const live = () => lines.filter(([a, b]) => a !== b && left.has(a) && left.has(b));
  const head: Id[] = [], tail: Id[] = [];
  while (left.size) {
    const now = live();
    const ins = (id: Id) => now.filter(([, b]) => b === id).length;
    const outs = (id: Id) => now.filter(([a]) => a === id).length;
    const order = ids.filter((id) => left.has(id));
    const sink = order.find((id) => !outs(id) && ins(id));
    const source = order.find((id) => !ins(id));
    const pick = sink ?? source ?? order.reduce((b, id) =>
      (outs(id) - ins(id) > outs(b) - ins(b) ? id : b));
    left.delete(pick);
    if (pick === sink) tail.unshift(pick);
    else head.push(pick);
  }
  return [...head, ...tail];
}

/** **Notes beside what they are tied to** (2026-11-21: a tie never crosses the drawing): each
 *  in the nearest free spot by its target, the container grown, and moved, to hold it. */
function noted_in(laid: { w: number; h: number; at: Map<Id, Spot> },
                  notes: ReadonlyMap<Id, Id>, sizes: ReadonlyMap<Id, { w: number; h: number }>)
    : { w: number; h: number; at: Map<Id, Spot> } {
  if (!notes.size) return laid;
  const at = new Map(laid.at);
  for (const [note, target] of notes) {
    const t = at.get(target);
    if (!t) continue;
    const size = sizes.get(note)!;
    at.set(note, { ...beside([...at.values()], t, size), ...size });
  }
  /** What moved left of or above the corner shifts everything back in by as much. */
  const spots = [...at.values()];
  const [dx, dy] = [Math.max(0, -Math.min(...spots.map((s) => s.x)) + UNIT),
                    Math.max(0, -Math.min(...spots.map((s) => s.y)) + UNIT)];
  for (const [id, s] of at) at.set(id, { ...s, x: s.x + dx, y: s.y + dy });
  return { at, w: Math.max(laid.w + dx, ...spots.map((s) => s.x + dx + s.w + UNIT)),
           h: Math.max(laid.h + dy, ...spots.map((s) => s.y + dy + s.h + UNIT)) };
}

/** **Inputs to outputs along the canvas** (the user, 2026-11-21): left to right on a landscape
 *  canvas, top to bottom on a portrait one; never the other way to fit the shape better. */
export function flow_way(): "RIGHT" | "DOWN" {
  return SHAPE.aspect >= 1 ? "RIGHT" : "DOWN";
}

/** ELK's layered options: square lines, file order kept for loops, ranks and pieces. **Room for
 *  lines**: each line a seat apart from the next and from the cards, so a gap between ranks widens
 *  by the lines it carries; libavoid then routes in the room made. */

function layered(dir: string): Record<string, string> {
  return {
    "elk.algorithm": "layered", "elk.direction": dir, "elk.edgeRouting": "ORTHOGONAL",
    "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    "elk.layered.cycleBreaking.strategy": "MODEL_ORDER",
    "elk.layered.considerModelOrder.components": "MODEL_ORDER",
    "elk.layered.spacing.nodeNodeBetweenLayers": String(UNIT * 3),
    "elk.spacing.nodeNode": String(UNIT * 2),
    "elk.spacing.edgeEdge": String(SEAT), "elk.spacing.edgeNode": String(SEAT),
    "elk.layered.spacing.edgeEdgeBetweenLayers": String(SEAT),
    "elk.layered.spacing.edgeNodeBetweenLayers": String(SEAT),
    /** **Space says apart** (2026-11-21): pieces no line joins stand further apart than the
     *  cards of one piece, so a gap reads as a separation. */
    "elk.spacing.componentComponent": String(UNIT * 3),
    "elk.separateConnectedComponents": "true",
    /** A long chain wraps into rows toward the shape rather than one thin strip. */
    "elk.layered.wrapping.strategy": "OFF",

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

/** ELK's name for each wall. */
const SIDES: Record<Side, string> = { top: "NORTH", bottom: "SOUTH", left: "WEST",
                                      right: "EAST" };

/** **A card meeting the room's own port ranks at that end** (the outbox's Relay detoured round
 *  Outbox to reach its out-port): on the output wall, last; on the input wall, first. Only the
 *  room's own ports, and a card pulled to one end only. */
function ends_of(walled: readonly (readonly [Id, Side, boolean])[],
                 dir: string | undefined): Map<Id, string> {
  const [first, last]: [Side, Side] | [] = dir === "RIGHT" ? ["left", "right"]
    : dir === "DOWN" ? ["top", "bottom"] : [];
  const out = new Map<Id, string>();
  if (!first) return out;
  for (const [kid, side] of walled.filter((w) => w[2])) {
    const end = side === first ? "FIRST" : side === last ? "LAST" : undefined;
    if (!end) continue;
    out.set(kid, out.has(kid) && out.get(kid) !== end ? "" : end);
  }
  return new Map([...out].filter(([, end]) => end));
}

/** What keeps a main line straight: ELK's priorities for it. */
const STRAIGHT = { "elk.layered.priority.straightness": "10",
                   "elk.layered.priority.direction": "10" };

/** ELK's packing lands unevenly round its target: two goals, each aimed a little either side. */
const GOALS = ["MAX_SCALE_DRIVEN", "ASPECT_RATIO_DRIVEN"];
const AIMS = [0.8, 1, 1.25, 1.6];

/** A box laid in a container, from its corner. */
type Spot = { x: number; y: number; w: number; h: number };

/** **A long behaviour wraps** (the user, 2026-11-21: every diagram respects the canvas's
 *  aspect): its lanes cut across the axis between steps into rows (columns where the axis runs
 *  down), each read the same way, as many as bring the whole nearest the canvas's shape. */
function wrapped(laid: { w: number; h: number; at: Map<Id, Spot> }, wide: boolean)
    : { w: number; h: number; at: Map<Id, Spot> } {
  const spots = [...laid.at.values()];
  const lo = (s: Spot) => (wide ? s.x : s.y), hi = (s: Spot) => lo(s) + (wide ? s.w : s.h);
  /** The gaps no step spans: the only places a cut may fall. */
  const runs = spots.map((s) => [lo(s), hi(s)] as const).sort((a, z) => a[0] - z[0]);
  const cuts: number[] = [];
  let end = runs[0]?.[1] ?? 0;
  for (const [a, z] of runs.slice(1)) {
    if (a > end) cuts.push((a + end) / 2);
    end = Math.max(end, z);
  }
  const start = runs[0]?.[0] ?? 0;
  const [length, thick] = wide ? [laid.w - start, laid.h] : [laid.h - start, laid.w];
  const pitch = thick + UNIT * 2;
  /** The rows that bring the whole nearest the shape, each cut at the gap nearest its share. */
  const shape = (k: number) => {
    const [a, b] = [length / k, k * pitch];
    return Math.abs(Math.log((wide ? a / b : b / a) / SHAPE.aspect));
  };
  let rows = 1;
  for (let k = 2; k <= cuts.length + 1; k++) if (shape(k) < shape(rows)) rows = k;
  if (rows === 1) return laid;
  const chosen = [...new Set(Array.from({ length: rows - 1 }, (_, i) => {
    const aim = start + (length * (i + 1)) / rows;
    return cuts.reduce((b, c) => (Math.abs(c - aim) < Math.abs(b - aim) ? c : b));
  }))].sort((a, z) => a - z);
  /** Each row starts where the first did, a pitch further across. */
  const row_of = (s: Spot) => chosen.filter((c) => lo(s) > c).length;
  const first = new Map<number, number>();
  for (const s of spots) first.set(row_of(s), Math.min(first.get(row_of(s)) ?? Infinity, lo(s)));
  const out = new Map<Id, Spot>();
  for (const [id, s] of laid.at) {
    const r = row_of(s);
    const along = lo(s) - first.get(r)! + start;
    out.set(id, wide ? { ...s, x: along, y: s.y + r * pitch } : { ...s, y: along, x: s.x + r * pitch });
  }
  const moved = [...out.values()];
  return { at: out, w: Math.max(...moved.map((s) => s.x + s.w)) + UNIT,
           h: Math.max(...moved.map((s) => s.y + s.h)) + UNIT };
}

/** **A behaviour's lanes** (docs/diagrams/flow.md *Branching*): the main way — from the first
 *  start, each step's first line — on the axis; each other answer opens a lane, below first, then
 *  above, alternating, what it leads to staying in its lane; a step whose lane is taken along its
 *  run moves one lane further out. Positions along the axis are ELK's. `wide`: the axis runs
 *  across. */
function laned(at: Map<Id, Spot>, ids: readonly Id[], lines: readonly [Id, Id][],
               wide: boolean): { w: number; h: number; at: Map<Id, Spot> } {
  const outs = (id: Id) => lines.filter(([a]) => a === id).map(([, z]) => z);
  const lane = new Map<Id, number>();
  /** **A branch opens the free lane nearest the lane it leaves** (2026-11-21: a path stays
   *  short), below before above, outward before inward. */
  const opened = new Set<number>([0]);
  const next = (from: number) => {
    for (let k = 1; ; k++) {
      const out = from + (from < 0 ? -k : k), back = from - (from < 0 ? -k : k);
      for (const l of [out, back]) if (!opened.has(l)) { opened.add(l); return l; }
    }
  };
  /** Each lane walked from its first step, its other answers queued with the lane they leave. */
  const queue: [Id, number][] = [];
  const walk = (start: Id, l: number) => {
    for (let at_id: Id | undefined = start; at_id && !lane.has(at_id);) {
      lane.set(at_id, l);
      const [first, ...rest]: Id[] = outs(at_id).filter((z) => !lane.has(z));
      for (const r of rest) queue.push([r, l]);
      at_id = first;
    }
  };
  const starts = ids.filter((id) => !lines.some(([, z]) => z === id));
  walk(starts[0] ?? ids[0]!, 0);
  for (const id of [...starts.slice(1), ...ids]) queue.push([id, 0]);
  for (let q = queue.shift(); q; q = queue.shift()) if (!lane.has(q[0])) walk(q[0], next(q[1]));
  /** Along and across the axis, by the canvas. */
  const along = (s: Spot): [number, number] => (wide ? [s.x, s.x + s.w] : [s.y, s.y + s.h]);
  const thick = Math.max(...ids.map((id) => (wide ? at.get(id)!.h : at.get(id)!.w)));
  const taken = new Map<number, [number, number][]>();
  const final = new Map<Id, number>();
  for (const id of ids) {
    const [lo, hi] = along(at.get(id)!);
    let l = lane.get(id)!;
    const clash = () => (taken.get(l) ?? []).some(([a, b]) => lo < b + UNIT && hi > a - UNIT);
    while (clash()) l += l < 0 ? -1 : 1;
    taken.set(l, [...taken.get(l) ?? [], [lo, hi]]);
    final.set(id, l);
  }
  /** **Room for the lines between lanes** (the user, 2026-11-21: space for lines to run): the
   *  gap below lane `k` widens a seat for each line crossing it. */
  const crossing = (k: number) => lines.filter(([a, b]) => {
    const [la, lb] = [final.get(a), final.get(b)];
    return la !== undefined && lb !== undefined && Math.min(la, lb) <= k && Math.max(la, lb) > k;
  }).length;
  const gap = (k: number) => thick + UNIT * 2 + crossing(k) * SEAT;
  const offset = (l: number) => {
    let o = 0;
    for (let k = 0; k < l; k++) o += gap(k);
    for (let k = -1; k >= l; k--) o -= gap(k);
    return o;
  };
  const out = new Map<Id, Spot>();
  for (const id of ids) {
    const s = at.get(id)!;
    const mid = offset(final.get(id)!) - (wide ? s.h : s.w) / 2;
    out.set(id, wide ? { ...s, y: mid } : { ...s, x: mid });
  }
  /** Moved clear of the title, a unit of air round the rest. */
  const spots = [...out.values()];
  const [dx, dy] = [UNIT - Math.min(...spots.map((s) => s.x)),
                    UNIT * 1.5 - Math.min(...spots.map((s) => s.y))];
  for (const [id, s] of out) out.set(id, { ...s, x: s.x + (wide ? 0 : dx), y: s.y + (wide ? dy : 0) });
  const moved = [...out.values()];
  return { at: out, w: Math.max(...moved.map((s) => s.x + s.w)) + UNIT,
           h: Math.max(...moved.map((s) => s.y + s.h)) + UNIT };
}
