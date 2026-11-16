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

import { block_base, chain_of, flow_of, is_interface, layer_of, ports_on, type Block,
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
  for (const e of Object.values(graph.edges).sort((a, z) => (a.order ?? 0) - (z.order ?? 0))) {
    const inward = mine(e.to) && !mine(e.from);
    if (!inward && !(mine(e.from) && !mine(e.to))) continue;
    const [far, port] = inward ? [e.from, e.fromPort] : [e.to, e.toPort];
    if (layer_of(graph, far) !== home && far !== home) continue;
    const id = `${ACROSS}${far}${port && far === home ? `:${port}` : ""}`;
    blocks[id] ??= card(graph, far, port, home, layer, id);
    if (far === home) ports.add(id);
    const near = inward ? e.to : e.from;
    /** A port naming its wall keeps it, and what is across sits in that wall's zone. */
    const said = near !== layer ? blocks[near]!.side : undefined;
    const zone = said ? zone_at(wall, said) : zone_of(graph, e, far, near);
    if (!zones.has(id) || zone === "start") zones.set(id, zone);
    if (near !== layer && !said) sides.set(near, wall[zone]);
    const drawn: Relation = inward
      ? { ...e, id: `${ACROSS}${e.id}`, from: id, fromPort: undefined }
      : { ...e, id: `${ACROSS}${e.id}`, to: id, toPort: undefined };
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

/** **The zone of what is across**: an actor starts it; a dependency, or a port meeting both
 *  ways, is used; else the way the line runs, into the part or out of it. */
function zone_of(graph: Graph, e: Relation, far: Id, near: Id): Zone {
  if (block_base(graph, graph.blocks[far]?.type) === "actor") return "start";
  if (e.type && chain_of(graph, e.type).some((d) => d.id === "dependency")) return "uses";
  if (near !== far && is_interface(graph, near) && flow_of(graph, near) === "both") return "uses";
  return e.to === near ? "in" : "out";
}

/** The zone whose wall is `side`. */
function zone_at(wall: Record<Zone, Side>, side: Side): Zone {
  return (Object.keys(wall) as Zone[]).find((z) => wall[z] === side)!;
}
