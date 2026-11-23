/** **What is across a part's ports** (docs/diagrams/context.md *Layout*): an entered part is drawn
 *  as its frame, and what each of its lines in the layer above meets — a sibling, an actor, an
 *  external, a port of the parent — is drawn outside it, read only, in a zone by what it is.
 *  Placed by what each thing is; nothing chosen.
 *
 *  | Zone | Holds | Landscape | Portrait |
 *  |---|---|---|---|
 *  | start | actors | above | left |
 *  | in | what flows into the part | left | above |
 *  | out | what the part's lines reach | right | below |
 *  | uses | what it builds with or meets both ways | below | right |
 */

import { block_base, chain_of, flow_of, is_interface, layer_of, owner_of, ports_on, type Block,
         type Graph, type Id, type Relation, type Side } from "@mnd/core";
import { size_of, SHAPE, UNIT, type Rect, type Seating } from "@mnd/views";

export type Zone = "start" | "in" | "out" | "uses";

/** The prefix of everything drawn across: never picked, never stored. */
export const ACROSS = "@across:";

/** The outside of a layer: its cards, each by its zone, laid into the graph it is drawn from;
 *  which of them stand for a port of the parent. */
export type Outside = { graph: Graph; zones: Map<Id, Zone>; ports: Set<Id> };

/** How far out from the wall the outside sits: room for a two-line label on its line. */
const LANE = UNIT * 4;

/** The size of a card standing for a parent's port. */
const PORT_CARD = { w: UNIT * 6, h: UNIT * 2 };

/** Each zone's wall, by the canvas's shape. */
const WALLS: Record<"wide" | "tall", Record<Zone, Side>> = {
  wide: { start: "top", in: "left", out: "right", uses: "bottom" },
  tall: { start: "left", in: "top", out: "bottom", uses: "right" },
};


/** The wall a zone's cards stand beyond, by the canvas's shape. */
export function wall_of(zone: Zone): Side {
  return WALLS[SHAPE.aspect >= 1 ? "wide" : "tall"][zone];
}

/** **The outside of `layer`** laid into `graph` (a graph its usages are read through): a card for
 *  each end its lines in the layer above meet, under `ACROSS`, a child of the layer, and the
 *  line, its far end moved to that card. The layer's own ports are put on their zone's wall where
 *  they name none. Null where the layer sits in no other. */
export function outside_of(graph: Graph, layer: Id): Outside | null {
  const home = layer_of(graph, layer);
  if (!home || !graph.blocks[layer]?.parent) return null;
  const mine = (id: Id) => id === layer || (graph.blocks[id]?.parent === layer
    && is_interface(graph, id));
  const blocks: Record<Id, Block> = { ...graph.blocks };
  const edges: Record<Id, Relation> = { ...graph.edges };
  const zones = new Map<Id, Zone>();
  const ports = new Set<Id>();
  const sides = new Map<Id, Side>();
  const wall = WALLS[SHAPE.aspect >= 1 ? "wide" : "tall"];
  const all = Object.values(graph.edges).sort((a, z) => (a.order ?? 0) - (z.order ?? 0));
  /** **A line crosses the wall from what is drawn inside** (2026-11-21): the part itself, or
   *  the child of it holding the end, at any depth. */
  const near_of = (id: Id): Id | null => {
    if (mine(id)) return id;
    for (let at: Id | null = id; at; at = graph.blocks[at]?.parent ?? null) {
      if (graph.blocks[at]?.parent === layer) return at;
    }
    return null;
  };
  /** **What is across, at the part's own scale** (2026-11-21): the sibling holding the end — a
   *  folder beside a definition stands for what it files — else what sits in the layer above. */
  const up = graph.blocks[layer]!.parent;
  const far_of = (id: Id): Id | null => {
    for (let at: Id | null = id; at; at = graph.blocks[at]?.parent ?? null) {
      if (graph.blocks[at]?.parent === up) return at;
    }
    for (let at: Id | null = id; at; at = graph.blocks[at]?.parent ?? null) {
      if (at === home || layer_of(graph, at) === home) return at;
    }
    return null;
  };
  /** Every line meeting the part or what it holds: which end is across, and which is near. */
  const met = all.flatMap((e) => {
    const [to, from] = [near_of(e.to), near_of(e.from)];
    const inward = !!to && !from;
    if (!inward && !(from && !to)) return [];
    const said = inward ? e.from : e.to;
    const far = far_of(said);
    if (!far || far === layer) return [];
    const port = far === said ? (inward ? e.fromPort : e.toPort) : undefined;
    return [{ e, inward, far, port, near: (inward ? to : from)!,
              kept: (inward ? to === e.to : from === e.from) }];
  });
  /** **One card per port** (context.md *Layout*): a port meeting several ends draws one card,
   *  its ends as name rows. */
  const fars = new Map<Id, Set<string>>();
  for (const m of met) {
    if (m.near === layer || !is_interface(graph, m.near)) continue;
    fars.set(m.near, new Set([...fars.get(m.near) ?? [], `${m.far}|${m.port ?? ""}`]));
  }
  const drawn_lines = new Set<string>();
  for (const { e, inward, far, port, near, kept } of met) {
    const shared = (fars.get(near)?.size ?? 0) > 1;
    const id = shared ? `${ACROSS}port:${near}`
      : `${ACROSS}${far}${port && far === home ? `:${port}` : ""}`;
    if (!blocks[id]) {
      blocks[id] = shared
        ? { id, parent: layer, type: "block", name: [...fars.get(near)!].map((k) => {
            const [f, p] = k.split("|");
            return named(card(graph, f!, p || undefined, home, layer, id));
          }).join(" · ") }
        : { ...card(graph, far, port, home, layer, id),
            ...(far === home ? {} : { name: ringed(graph, far, home, layer, all) }) };
    }
    if (far === home && !shared) ports.add(id);
    /** A port naming its wall keeps it, and what is across sits in that wall's zone. */
    const port_near = near !== layer && is_interface(graph, near);
    const said = port_near ? blocks[near]!.side : undefined;
    const zone = said ? zone_at(wall, said) : zone_of(graph, e, far, near);
    /** A card met both ways is used: a dependency into the part and one out of it. */
    const had = zones.get(id);
    zones.set(id, !had || zone === "start" ? zone : had !== zone && had !== "start" ? "uses" : had);
    if (port_near && !said) sides.set(near, wall[zone]);
    /** One line between a card and the port it stands across. */
    const pair = `${id}|${near}`;
    if (drawn_lines.has(pair)) continue;
    drawn_lines.add(pair);
    /** The near end lifted to what is drawn keeps its port only where it was not lifted. */
    const drawn: Relation = inward
      ? { ...e, id: `${ACROSS}${e.id}`, from: id, fromPort: undefined, to: near,
          ...(kept ? {} : { toPort: undefined }) }
      : { ...e, id: `${ACROSS}${e.id}`, to: id, toPort: undefined, from: near,
          ...(kept ? {} : { fromPort: undefined }) };
    edges[drawn.id] = drawn;
  }
  if (!zones.size) return null;
  for (const [id, side] of sides) blocks[id] = { ...blocks[id]!, side };
  return { graph: { ...graph, blocks, edges }, zones, ports };
}

/** **Where each outside card sits**: out from its zone's wall by a lane, along it beside the
 *  wall's seats its lines meet, in that order, never overlapping. */
export function zone_spots(graph: Graph, out: Outside, room: Rect,
                           seating: Seating): Map<Id, Rect> {
  const wall = WALLS[SHAPE.aspect >= 1 ? "wide" : "tall"];
  const at = new Map<Id, Rect>();
  for (const zone of ["start", "in", "out", "uses"] as const) {
    const side = wall[zone];
    const across = side === "left" || side === "right";
    const cards = [...out.zones].filter(([, z]) => z === zone).map(([id]) => {
      const s = out.ports.has(id) ? PORT_CARD : size_of(graph, id);
      return { id, ...s, want: wanted(graph, id, room, seating, across) };
    }).sort((a, z) => a.want - z.want);
    /** Swept along the wall: each card centred on what it wants, pushed past the last. */
    let next = -Infinity;
    for (const c of cards) {
      const len = across ? c.h : c.w;
      const lo = Math.max(c.want - len / 2, next);
      next = lo + len + UNIT;
      const x = side === "left" ? room.x - LANE - c.w : side === "right" ? room.x + room.w + LANE
        : lo;
      const y = side === "top" ? room.y - LANE - c.h : side === "bottom" ? room.y + room.h + LANE
        : lo;
      at.set(c.id, { x, y, w: c.w, h: c.h });
    }
  }
  return at;
}

/** Where along its wall a card wants to sit: the mean of the wall seats its lines meet, else the
 *  wall's middle. */
function wanted(graph: Graph, id: Id, room: Rect, seating: Seating, across: boolean): number {
  const at = Object.values(graph.edges).filter((e) => e.from === id || e.to === id)
    .map((e) => (e.from === id ? e.to : e.from)).flatMap((near) => {
      const s = seating.ports.get(near);
      return s ? [across ? room.y + room.h * s.at : room.x + room.w * s.at] : [];
    });
  return at.length ? at.reduce((a, b) => a + b, 0) / at.length
    : across ? room.y + room.h / 2 : room.x + room.w / 2;
}

/** A card for what is across: the block itself, read only; a parent's port by its name. */
function card(graph: Graph, far: Id, port: Id | undefined, home: Id, layer: Id, id: Id): Block {
  if (far === home) {
    const p = ports_on(graph, home).find((x) => x.id === port);
    const owner = graph.blocks[home]?.name ?? home;
    return { id, parent: layer, name: p?.name ?? port ?? owner, type: "block",
             description: `A port of ${owner}: the way out of it.` };
  }
  const { ports: _ports, ...b } = graph.blocks[far]!;
  return { ...b, id, parent: layer };
}

/** **The zone of what is across**: an actor starts it; what the part depends on, or a port
 *  meeting both ways, is used; what depends on the part comes in; else the way the line runs,
 *  into the part or out of it. */
function zone_of(graph: Graph, e: Relation, far: Id, near: Id): Zone {
  if (block_base(graph, graph.blocks[far]?.type) === "actor") return "start";
  const dependency = e.type && chain_of(graph, e.type).some((d) => d.id === "dependency");
  if (dependency) return e.to === near ? "in" : "uses";
  if (near !== far && is_interface(graph, near) && flow_of(graph, near) === "both") return "uses";
  return e.to === near ? "in" : "out";
}

/** The zone whose wall is `side`. */
function zone_at(wall: Record<Zone, Side>, side: Side): Zone {
  return (Object.keys(wall) as Zone[]).find((z) => wall[z] === side)!;
}

/** A card's name as it reads in a row. */
function named(b: Block): string {
  return b.name ?? b.id;
}

/** **What is across, with its outer ring** (context.md, agreed 3): an external joined to nothing
 *  but the one across is folded into its card as a row (`content folder ← mndmap`). */
function ringed(graph: Graph, far: Id, home: Id, layer: Id, all: readonly Relation[]): string {
  const name = graph.blocks[far]?.name ?? far;
  const touching = (id: Id) => all.filter((e) => owner_of(graph, e.from) === id
    || owner_of(graph, e.to) === id);
  const rows = touching(far).flatMap((e) => {
    const [a, z] = [owner_of(graph, e.from), owner_of(graph, e.to)];
    const other = a === far ? z : a;
    if (other === far || other === layer || other === home || layer_of(graph, other) !== home) {
      return [];
    }
    const only = touching(other).every((x) => [owner_of(graph, x.from), owner_of(graph, x.to)]
      .every((end) => end === other || end === far));
    const kind = block_base(graph, graph.blocks[other]?.type);
    if (!only || kind === "actor") return [];
    return [`${a === far ? "→" : "←"} ${graph.blocks[other]?.name ?? other}`];
  });
  return [name, ...rows].join(" ");
}
