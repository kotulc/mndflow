/** The block view: any planar projection. */

import { alias_of, block_members, children, covers, edge_base, edges_in, group_depth, holders_in,
         is_container, is_grid, is_group, is_header, is_holder, is_interface, is_note, label_of,
         layer_id,
         mark_of, members_of, role_of, shown_name,
         type Graph, type Holder, type Id, type Relation, type Side, type Span } from "@mnd/core";
import { at_seat, cell_box, laid, perch_id, roomed, seated,
         assign_seats, GAP, UNIT, type Perch } from "@mnd/views";
import { carried, marks_of, trail_of } from "./derive";
import { look_of, wire_of } from "./look";
import { box_of, cell as node, FRAME, type BoxData, type BoxNode, type Frame,
         type GridCell, type LineEdge, type Port, type Trait, type Scene,
         type Slot } from "./scene";

export type Config = {
  /** What to show, when it is not the layer's own contents. */
  holds?: readonly Id[];
  /** Whether interfaces draw. A display preference the shell hands down. */
  interfaces?: boolean;
};

const SLOTS: readonly Slot[] = ["layer", "display", "relations"];

/** Every block a group carries when it moves, including nested groups. */
function group_carries(graph: Graph, group: Id): Id[] {
  const out: Id[] = [];
  const walk = (gid: Id) => {
    for (const m of members_of(graph, gid)) {
      out.push(m.id);
      if (is_group(graph, m.id)) walk(m.id);
    }
  };
  walk(group);
  return out;
}

/** Project a layer through the block view. */
export function project(graph: Graph, layer: Id | null, config: Config = {}): Scene {
  const spots = laid(graph, layer);
  /** Interfaces are seated after the cards; hidden ones still hold their seat. */
  const hidden = config.interfaces === false;
  const linked = edges_in(graph, layer).map((e) => landed(graph, e, layer));
  const boxes_at = new Map(spots.map((p) => [p.id, p]));
  const { perches, port_at } = assign_seats(graph, linked, spots, boxes_at);
  const ports = seated(graph, spots, port_at);

  /** Which component draws each box. Every card is the one card height, so nothing minifies. */
  const boxes: BoxNode[] = spots
    .filter((p) => !is_holder(graph, p.id))
    .map((p) => node(p.id, p, { ...carried(graph, p.id), nest: group_depth(graph, p.id) },
                     is_note(graph, p.id) ? "note" : "card"));

  /** A grid draws its extent; a boundary its members' bounds. */
  const holders: BoxNode[] = [];
  for (const g of holders_in(graph, layer_id(graph, layer))) {
    const box = spots.find((p) => p.id === g.id);
    if (!box) continue;
    const said = carried(graph, g.id);
    const grid = is_grid(graph, g.id);
    const mark: Trait = grid ? "grid" : "group";
    const marks: Trait[] = [mark];
    holders.push(node(g.id, box,
                      { ...said, marks, nest: group_depth(graph, g.id),
                        holds: members_of(graph, g.id).map((b) => b.id),
                        ...(grid ? { grid: lattice(graph, g) }
                                 : { carries: group_carries(graph, g.id) }) },
                      mark));
  }
  /** Shallowest first, so a holder inside another draws over it. */
  holders.sort((a, b) => (a.data.nest ?? 0) - (b.data.nest ?? 0));

  /** A seated interface draws over the card it sits on, so it comes last. */
  const seats: BoxNode[] = ports.map((p) => {
    const b = graph.blocks[p.id]!;
    const nest = b.parent ? group_depth(graph, b.parent) : 0;
    const data: BoxData = { ...carried(graph, p.id), side: b.side!, nest,
                            ...(b.parent ? { on: b.parent } : {}) };
    if (hidden) {
      return { ...node(p.id, p, { ...data, marks: [...data.marks, "berth"] }, "seat"),
               selectable: false, draggable: false };
    }
    return node(p.id, p, data, "seat");
  });

  const drawn = [...holders, ...boxes, ...seats];

  /** The room, before anything is seated on it. */
  const room = frame_of(graph, layer, drawn, hidden);
  const boxes_full = new Map(drawn.map((n) => [n.id, box_of(n)]));
  if (room) {
    boxes_full.set(FRAME, room);
    for (const p of room.ports) boxes_full.set(p.id, at_seat(room, p));
  }
  const walls = room && layer ? { id: FRAME, of: layer } : undefined;
  const assigned = walls ? assign_seats(graph, linked, spots, boxes_full, walls)
                       : { perches, port_at };

  /** Runs route round cards and notes, not holders, the room or interfaces. */
  const held = new Set(holders.map((n) => n.id));
  const solid = drawn
    .filter((n) => !held.has(n.id) && !n.data.on)
    .map(box_of);

  const met = new Map(assigned.perches.map((p) => [`${p.edge}|${p.end}`, p]));
  const offered = new Map<Id, { id: string; side: Side; at: number }[]>();
  for (const p of assigned.perches) {
    const kept = offered.get(p.on) ?? [];
    kept.push({ id: perch_id(p.edge, p.end), side: p.side, at: p.at });
    offered.set(p.on, kept);
  }

  /** The seats each box offers, put onto the box that offers them. */
  const placed = drawn.map((n) => {
    const own = offered.get(n.id);
    return own ? { ...n, data: { ...n.data, seats: own } } : n;
  });

  const edges = line_edges(graph, linked, assigned.perches, solid, met);

  /** The walls' own seats, put on the frame that offers them. */
  const walled = offered.get(FRAME);
  const framed = room && walled ? { ...room, seats: walled } : room;

  return {
    layer,
    ...(framed ? { frame: framed } : {}),
    nodes: placed,
    edges,
    perches: assigned.perches,
    /** A slot says what this projection can offer, never what it is doing. */
    slots: SLOTS,
    trail: trail_of(graph, layer),
  };
}

/** The cells a grid draws, placed inside its own box. */
function lattice(graph: Graph, g: Holder): GridCell[] {
  const headed = new Set<string>();
  for (const b of block_members(graph, g.id)) {
    if (b.cell && is_header(b)) headed.add(`${b.cell.r},${b.cell.c}`);
  }
  const out: GridCell[] = [];
  for (let r = 0; r < (g.rows ?? 0); r++) {
    for (let c = 0; c < (g.cols ?? 0); c++) {
      const span = g.merges?.find((s: Span) => covers(s, r, c));
      if (span && (span.r !== r || span.c !== c)) continue;
      const marks: Trait[] = ["cell"];
      if (span) marks.push("merged");
      if (headed.has(`${r},${c}`)) marks.push("header");
      out.push({ r, c, ...cell_box(g, r, c), marks });
    }
  }
  return out;
}

/** The border a layer is seen from inside. */
function frame_of(graph: Graph, layer: Id | null, drawn: readonly BoxNode[],
                  hidden: boolean): Frame | null {
  if (layer === null || layer === graph.root) return null;
  const label = shown_name(graph, layer);
  const role = role_of(graph, layer);
  const mark = mark_of(graph, layer) ?? undefined;
  const holds_parts = is_container(graph, layer);
  const ports = wall_of(graph, layer, hidden);
  /** An interface opened from inside keeps the wall it is set into. */
  const side = graph.blocks[layer]?.side;
  const set_in = side ? { side } : {};
  const least = { w: UNIT * 14, h: UNIT * 9 };
  /** A room is a whole number of cells. */
  if (drawn.length === 0) {
    return { ...roomed({ x: -least.w / 2, y: -least.h / 2, ...least }),
             label, role, ...(mark ? { mark } : {}), holds_parts, ports, ...set_in };
  }
  const pad = GAP;
  const at = drawn.map(box_of);
  const x = Math.min(...at.map((b) => b.x)) - pad;
  const y = Math.min(...at.map((b) => b.y)) - pad;
  const w = Math.max(least.w, Math.max(...at.map((b) => b.x + b.w)) + pad - x);
  const h = Math.max(least.h, Math.max(...at.map((b) => b.y + b.h)) + pad - y);
  return { ...roomed({ x, y, w, h }), label, role, ...(mark ? { mark } : {}),
           holds_parts, ports, ...set_in };
}

/** The layer's own interfaces, set into its walls and seen from inside. */
function wall_of(graph: Graph, layer: Id, hidden: boolean): Port[] {
  return children(graph, layer)
    .filter(is_interface)
    .map((b) => ({
      id: b.id,
      label: shown_name(graph, b.id),
      side: b.side!,
      at: b.at ?? 0.5,
      marks: hidden ? [...marks_of(graph, b.id), "berth" as Trait] : marks_of(graph, b.id),
      look: look_of(graph, b.id),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Where a relationship's ends land. */
function landed(graph: Graph, e: Relation, layer: Id | null): Relation {
  const side = (id: Id): Side | undefined => {
    const b = graph.blocks[id];
    return b && is_interface(b) ? b.side : undefined;
  };
  /** The layer itself is the frame. */
  const here = (id: Id): Id => (layer !== null && id === layer ? FRAME : id);
  return { ...e, from: here(e.from), to: here(e.to),
           fromSide: e.fromSide ?? side(e.from), toSide: e.toSide ?? side(e.to) };
}

/** Every line as the canvas draws it: ends, seats and label. */
function line_edges(graph: Graph, linked: readonly Relation[], perches: readonly Perch[],
                    solid: readonly { x: number; y: number; w: number; h: number }[],
                    met = new Map(perches.map((p) => [`${p.edge}|${p.end}`, p]))): LineEdge[] {
  return linked.map((e): LineEdge => {
    const wire = wire_of(graph, e.id);
    const label = wire.name ? label_of(graph, e.id) : "";
    const alias = wire.alias ? alias_of(graph, e.id, true) : "";
    return {
      id: e.id,
      source: e.from,
      target: e.to,
      sourceHandle: handle(met, e.id, "from", "s"),
      targetHandle: handle(met, e.id, "to", "t"),
      ...(label ? { label } : {}),
      data: { module: edge_base(graph, e.id), dir: e.dir ?? "none", wire,
              ...(alias ? { alias } : {}),
              ...(solid.length ? { clear: solid } : {}) },
    };
  });
}

/** Which handle an end leaves by. */
function handle(met: ReadonlyMap<string, Perch>, edge: Id,
                end: "from" | "to", role: "s" | "t"): string {
  return met.has(`${edge}|${end}`) ? `${role}-${perch_id(edge, end)}` : role;
}

