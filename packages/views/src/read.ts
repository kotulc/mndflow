/** How a behavior layer is read.
 *
 *  **One layer, three readings.** They are not three models and not three
 *  modules: `block` is any planar projection, and a view definition names the
 *  reading. What differs is what a block means and what a lane becomes — a band
 *  across the flow, a column with a lifeline down it, or nothing at all,
 *  because a machine is about one thing changing rather than several things
 *  taking part.
 *
 *  **The lane is the same derivation in all three**: one per referenced
 *  participant, known by construction because the action already holds the
 *  reference. That is why one module carries all three.
 *
 *  The rules in full are docs/monorepo/core/behaviors.md. */

import { children, edges_in, is_interface, is_reference, module_of, shown_name,
         type Graph, type Id, type Reading, type Relation } from "@mnd/core";
import { centred, size_of, snap, GAP, GRID, type Placed } from "@mnd/layout";

/** A lane: a band across an activity, a column in a sequence, and nothing at
 *  all in a state. One per participant, named through the reference. */
export type Band = Placed & { label: string; of: Id | null };

/** What a count of relationships draws. Nobody touches one — it is a rendering
 *  of a number rather than something somebody named. */
export type Control = Placed & { kind: "fork" | "join" | "decision" | "merge" };

export type Read = {
  spots: Placed[];
  bands: Band[];
  /** What a sequence hangs its occurrences on. Empty in the other two. */
  lines: Placed[];
  controls: Control[];
  /** The relations to route, re-pointed through whatever control they pass. */
  links: Relation[];
};

/** A bar is thin across and long along; a diamond is square. */
const BAR = GRID * 2;
const THIN = 4;
const DIAMOND = GRID;

/** Whether this layer is read as a behavior, and how.
 *
 *  A reading is how you look and never something inferred, so what is asked for
 *  wins — and a behavior layer nobody has asked about reads as an activity. */
export function reading_of(graph: Graph, layer: Id | null, want?: Reading): Reading | null {
  if (want) return want;
  return layer !== null && module_of(graph, layer) === "behavior" ? "activity" : null;
}

/** Read the layer: place its actions, derive its lanes, and count its
 *  controls. Everything here is derived and nothing is stored. */
export function read(graph: Graph, layer: Id | null, how: Reading, down: boolean): Read {
  const acts = children(graph, layer).filter((b) => !is_interface(b));
  const order = edges_in(graph, layer).filter((e) => e.module === "directed");
  const rank = ranked(acts.map((b) => b.id), order);

  /** A sequence always runs down: order is the whole of what it says, and a
   *  lifeline that ran sideways would not be one. */
  const along = how === "sequence" ? true : down;
  const lanes = how === "state" ? [] : laned(graph, acts.map((b) => b.id));
  const of = new Map(acts.map((b) => [b.id, participant(graph, b.id)]));
  const sizes = new Map(acts.map((b) => [b.id, size_of(graph, b.id)]));

  const stride = Math.max(GRID * 4,
    ...acts.map((b) => (along ? sizes.get(b.id)!.h : sizes.get(b.id)!.w))) + GAP.rank;
  const across = Math.max(GRID * 4,
    ...acts.map((b) => (along ? sizes.get(b.id)!.w : sizes.get(b.id)!.h))) + GAP.unit;

  /** Where a lane sits, across the flow. A state reading has none, so every
   *  action shares one track and spreads along the reading instead. */
  const track = (id: Id): number => {
    const lane = lanes.findIndex((l) => l.of === (of.get(id) ?? null));
    return Math.max(0, lane) * across;
  };
  /** **No two actions in one lane share a step.** Rank says how far along the
   *  reading something falls, and two things nothing orders share a rank — in
   *  one lane that would draw them on top of each other, so the second is taken
   *  one step further down. Distinct lanes keep the rank they were given. */
  const stops = new Map<Id, number>();
  const next = new Map<string, number>();
  for (const b of [...acts].sort((x, y) =>
      (rank.get(x.id) ?? 0) - (rank.get(y.id) ?? 0) || x.id.localeCompare(y.id))) {
    const lane = String(of.get(b.id) ?? "");
    const stop = Math.max(rank.get(b.id) ?? 0, next.get(lane) ?? 0);
    next.set(lane, stop + 1);
    stops.set(b.id, stop);
  }
  const step = (id: Id) => (stops.get(id) ?? 0) * stride;

  const spots: Placed[] = acts.map((b) => {
    const s = sizes.get(b.id)!;
    const middle = track(b.id) + (across - (along ? s.w : s.h)) / 2;
    return along
      ? { id: b.id, x: snap(middle), y: snap(step(b.id)), ...s }
      : { id: b.id, x: snap(step(b.id)), y: snap(middle), ...s };
  });

  const depth = (Math.max(0, ...stops.values()) + 1) * stride;
  const bands: Band[] = lanes.map((l, i) => ({
    id: `${l.of ?? "lane"}:lane`, label: l.label, of: l.of,
    ...(along
      ? { x: i * across, y: -GAP.unit, w: across, h: depth + GAP.unit }
      : { x: -GAP.unit, y: i * across, w: depth + GAP.unit, h: across }),
  }));

  /** A lifeline runs down the middle of its column for the whole reading. A
   *  sequence draws them and neither of the other two does. */
  const lines: Placed[] = how !== "sequence" ? [] : bands.map((b) => ({
    id: `${b.id}:line`, x: b.x + b.w / 2 - 1, y: b.y, w: 2, h: b.h,
  }));

  /** A sequence draws no controls: order runs down the page and a bar across
   *  it would be a second thing saying the same one. */
  const found = how === "sequence"
    ? { controls: [] as Control[], links: [...order] }
    : counted(spots, order, along, stride);
  const settled = new Map(
    centred([...spots, ...found.controls, ...bands, ...lines]).map((p) => [p.id, p]));
  const kept = <T extends Placed>(all: T[]): T[] => all.map((p) => ({ ...p, ...settled.get(p.id)! }));

  return {
    spots: kept(spots),
    bands: kept(bands),
    lines: kept(lines),
    controls: kept(found.controls),
    links: [...found.links, ...edges_in(graph, layer).filter((e) => e.module !== "directed")],
  };
}

/** One lane per referenced participant, in the order they are first read.
 *
 *  **Not from a `performs` relationship and not from connectivity.** The action
 *  came from a block and already holds a reference to it, so the performer is
 *  known by construction — a lane fires every time and needs no field. */
function laned(graph: Graph, acts: readonly Id[]): { of: Id | null; label: string }[] {
  const out: { of: Id | null; label: string }[] = [];
  for (const id of acts) {
    const who = participant(graph, id);
    if (out.some((l) => l.of === who)) continue;
    out.push({ of: who, label: who ? shown_name(graph, who) : "" });
  }
  return out;
}

/** Who the action is about: what its reference stands for. Null where nobody
 *  drew one, which is what a hand-drawn action looks like. */
function participant(graph: Graph, id: Id): Id | null {
  const ref = children(graph, id).find((b) => is_reference(b));
  return ref?.of ?? null;
}

/** How far along the reading each action falls. The longest path from a
 *  source, so a chain comes out in order and a branch rejoins where it ends. */
function ranked(ids: readonly Id[], order: readonly Relation[]): Map<Id, number> {
  const here = new Set(ids);
  const into = new Map<Id, Id[]>(ids.map((id) => [id, []]));
  for (const e of order) {
    if (here.has(e.from) && here.has(e.to) && e.from !== e.to) into.get(e.to)!.push(e.from);
  }
  const rank = new Map<Id, number>();
  const depth = (id: Id, seen: Set<Id>): number => {
    if (rank.has(id)) return rank.get(id)!;
    if (seen.has(id)) return 0;
    seen.add(id);
    const ups = into.get(id) ?? [];
    const r = ups.length === 0 ? 0 : Math.max(...ups.map((u) => depth(u, seen) + 1));
    rank.set(id, r);
    return r;
  };
  for (const id of ids) depth(id, new Set());
  return rank;
}

/** Controls, from a count.
 *
 *  **A guard is what tells a fork from a decision**: branches that are all
 *  taken are a fork, and branches one of which is chosen are a decision. The
 *  same count read backwards is a join or a merge. The branch keeps the
 *  relationship's own id, so only the stub into the control is derived. */
function counted(spots: readonly Placed[], order: readonly Relation[], along: boolean,
                 stride: number): { controls: Control[]; links: Relation[] } {
  const at = new Map(spots.map((p) => [p.id, p]));
  const out: Control[] = [];
  const links: Relation[] = [];
  const made = new Set<string>();

  const control = (on: Id, kind: Control["kind"]): Id | null => {
    const p = at.get(on);
    if (!p) return null;
    const id = `${on}:${kind}`;
    if (made.has(id)) return id;
    made.add(id);
    const bar = kind === "fork" || kind === "join";
    const size = bar ? (along ? { w: BAR, h: THIN } : { w: THIN, h: BAR })
                     : { w: DIAMOND, h: DIAMOND };
    /** Half a rank before what joins, half a rank after what forks. */
    const away = (kind === "join" || kind === "merge" ? -1 : 1) * stride / 2;
    const mid = { x: p.x + p.w / 2 - size.w / 2, y: p.y + p.h / 2 - size.h / 2 };
    out.push({ id, kind, ...size,
      x: along ? mid.x : snap(mid.x + away),
      y: along ? snap(mid.y + away) : mid.y });
    return id;
  };

  const guarded = (e: Relation) => (e.fields ?? []).some((f) => f.name === "guard");
  const branches = (id: Id) => order.filter((e) => e.from === id);
  const arrivals = (id: Id) => order.filter((e) => e.to === id);

  for (const e of order) {
    const forks = branches(e.from);
    const joins = arrivals(e.to);
    const leaves = forks.length > 1
      ? control(e.from, forks.some(guarded) ? "decision" : "fork") : null;
    const lands = joins.length > 1
      ? control(e.to, joins.some(guarded) ? "merge" : "join") : null;
    links.push({ ...e, from: leaves ?? e.from, to: lands ?? e.to });
    if (leaves) links.push({ id: `${e.from}>${leaves}`, from: e.from, to: leaves,
                             module: "directed" });
    if (lands) links.push({ id: `${lands}>${e.to}`, from: lands, to: e.to, module: "directed" });
  }
  return { controls: out, links: once(links) };
}

/** A stub into a control is written once per branch, so the same one arrives
 *  several times. One line each. */
function once(links: readonly Relation[]): Relation[] {
  const seen = new Map<string, Relation>();
  for (const l of links) if (!seen.has(l.id)) seen.set(l.id, l);
  return [...seen.values()];
}
