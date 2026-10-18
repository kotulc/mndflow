/** The block view: any planar projection. */

import { alias_of, dir_of, layout_of, children, setting_of, covers, diagram_subject, on_side,
         edges_in, group_depth, heading, holders_in, inline, is_box, is_container, is_grid,
         is_aside, is_note, is_tie, label_of, lattice_of, members_of, shape_of, stamps_of, role_of,
         shown_name, type Cut, type Ends, type ViewKind, type Graph, type Id, type Relation,
         type Side, type Span } from "@mnd/core";
import { at_seat, beside, cell_box, laid, perch_id, roomed, seat_all, PAD, UNIT,
         type Perch, type Rect, type Seat, type Seating } from "@mnd/views";
import { carried, marks_of, trail_of } from "./derive";
import { look_of, wire_of } from "./look";
import { page_graph } from "./page";
import { survey_graph, FOREST } from "./survey";
import { sheet_graph, GRID_LAYER } from "./sheet";
import { read_through } from "./through";
import { registry_scene } from "./registry";
import { class_graph, DRAWN_BY } from "./classes";
import { sequence_scene } from "./sequence";
import { tie_targets } from "./pack";
import { box_of, cell as node, extent, EMPTY, FRAME, type BoxData, type BoxNode, type Frame,
         type GridCell, type LineEdge, type Port, type CardClass, type Scene,
         type Slot } from "./scene";

export type Config = {
  /** How the layer is looked at: from inside (`internal`, `allocation`); a package or folder read
   *  down the page (`folder`); a diagram the block names (`class`, `er`, `sequence`); the whole
   *  section it scopes, down to `cut`,
   *  each block there boxing its top level where `tops` says (`package`). Unsaid, inside — and
   *  with no layer, every package's domain as the package view. */
  look?: { kind: ViewKind; cut: Cut; tops?: boolean; lists?: "domain" | "structure" };
  /** The packages a forest draws, in order; every package where unsaid. */
  packages?: readonly Id[];
  /** How many cards a section's widest row holds, drawn whole. */
  across?: number;
  /** What to show, when it is not the layer's own contents. */
  holds?: readonly Id[];
  /** Whether interfaces draw. A display preference the shell hands down. */
  interfaces?: boolean;
  /** Whether a package root opened is drawn in a room, as a folder is. */
  room?: boolean;
  /** The diagram whose lines draw what their ends mean rather than their direction: a class
   *  diagram, or an entity one, multiplicities as crow's feet. */
  ends?: "class" | "er";
};

const SLOTS: readonly Slot[] = ["layer", "display", "relations"];

/** What a projection with no layer draws: every package's domain, as boxes down the page. */
const WHOLE = { kind: "package", cut: "tree" } as const;

/** The layer with only what this section lists still parented to it, waypoints included. The
 *  rest move aside, so a folder opened from one section draws that section's kind. */
function kept_side(graph: Graph, layer: Id, lists: "domain" | "structure"): Graph {
  const blocks = { ...graph.blocks };
  const sink = "\0aside";
  let moved = false;
  for (const c of children(graph, layer)) {
    if (on_side(graph, c.id, lists)) continue;
    moved = true;
    blocks[c.id] = { ...c, parent: sink };
  }
  if (!moved) return graph;
  blocks[sink] = { id: sink, parent: null, name: "" };
  return { ...graph, blocks };
}

/** A graph whose layer says how many cards its page holds across: the host's count, unless the
 *  layer says its own. */
function with_across(graph: Graph, layer: Id, across: number): Graph {
  const b = graph.blocks[layer]!;
  const said = setting_of(graph, layer, "layout");
  if (typeof said["across"] === "number") return graph;
  const layout = { ...said, across };
  return { ...graph, blocks: { ...graph.blocks, [layer]: { ...b, settings: { ...b.settings, layout } } } };
}

/** Every block a group carries when it moves, including nested groups. */
function group_carries(graph: Graph, group: Id): Id[] {
  const out: Id[] = [];
  const walk = (gid: Id) => {
    for (const m of members_of(graph, gid)) {
      out.push(m.id);
      if (is_box(graph, m.id)) walk(m.id);
    }
  };
  walk(group);
  return out;
}

/** Project a layer through the block view, with what its usages read through laid in. A part of
 *  a definition seen through a usage wears the `part` mark. */
export function project(given: Graph, layer: Id | null, config: Config = {}): Scene {
  /** A whole section is drawn from its scope, down to its cut, and read only: it offers what the
   *  drawing shows, and nothing to lay out. */
  const look: Config["look"] = config.look ?? (layer === null ? WHOLE : undefined);
  /** A registry, or an entry of one, draws as a treemap. */
  if (layer && look?.kind === "registry") return registry_scene(given, layer) ?? EMPTY;
  /** A package or folder nobody arranged reads as a page, as wide as the canvas; its places are
   *  the page's, so nothing is dragged. One somebody arranged draws as it was left. Either way
   *  its room hugs what it holds. */
  if (look?.kind === "folder" && layer && given.blocks[layer]) {
    const given_side = look.lists ? kept_side(given, layer, look.lists) : given;
    const b = given_side.blocks[layer]!;
    const said = setting_of(given, layer, "layout")["kind"];
    const arranged = (said !== undefined && said !== "free")
      || children(given_side, layer).some((c) => c.x !== undefined);
    const layout = { ...(config.across ? { across: config.across } : {}),
                     ...setting_of(given_side, layer, "layout"), kind: "page" };
    const paged = arranged ? given_side : { ...given_side, blocks: { ...given_side.blocks,
      [layer]: { ...b, settings: { ...b.settings, layout } } } };
    const scene = project(paged, layer, { ...config, look: undefined, room: true });
    const nodes = arranged ? scene.nodes : scene.nodes.map((n) => ({ ...n, draggable: false }));
    const held = extent({ ...scene, frame: undefined });
    const frame = scene.frame && nodes.length
      ? { ...scene.frame, ...roomed({ x: held.x - PAD, y: held.y - PAD, w: held.w + PAD * 2,
                                      h: held.h + PAD * 2 }) } : scene.frame;
    return { ...scene, nodes, ...(frame ? { frame } : {}),
             slots: arranged ? scene.slots : scene.slots.filter((x) => x !== "layer") };
  }
  if (look?.kind === "package") {
    const drawn = survey_graph(given, layer, look.cut,
                               { ...(config.packages ? { only: config.packages } : {}),
                                 ...(look.tops ? { tops: true } : {}),
                                 ...(look.lists ? { lists: look.lists } : {}),
                                 ...(config.across ? { across: config.across } : {}) });
    const scene = project(drawn, FOREST, { ...config, look: { kind: "internal", cut: null } });
    /** A part's copy wears the part mark, as it does inside its usage, and is only looked at:
     *  it is picked and edited where it is a block — its definition, or inside its usage. */
    const nodes = scene.nodes.map((n) => (given.blocks[n.id] ? n : { ...n, selectable: false,
      draggable: false, data: { ...n.data, marks: [...n.data.marks, "part" as const] } }));
    /** A whole section has no layer of its own to trail to. */
    return { ...scene, nodes, slots: ["display"], trail: [] };
  }
  if (layer === null) return project(given, null, { ...config, look: WHOLE });
  /** A diagram is a projection: it draws what the block holds, and the canvas does not edit it.
   *  A grid would otherwise open as its lattice, so this comes first. */
  if (layer && (look?.kind === "class" || look?.kind === "er" || look?.kind === "sequence")) {
    return quiet(given, layer, diagram_scene(given, layer, look.kind));
  }
  /** A stand-in naming the allocation view draws its grid's cells, read only. */
  if (layer && look?.kind === "allocation" && diagram_subject(given, layer) !== layer) {
    return quiet(given, layer, diagram_scene(given, layer, look.kind));
  }
  /** An opened grid draws its grid view: its frame of cells is the room, which the hand sizes
   *  but never moves, under the grid's own crumbs. */
  if (layer !== GRID_LAYER && is_grid(given, layer)) {
    const { frame: _room, ...scene } = project(sheet_graph(given, layer), GRID_LAYER, config);
    const nodes = scene.nodes.map((n) => (n.id !== layer ? n : {
      ...n, draggable: false, data: { ...n.data, marks: [...n.data.marks, "room" as const] } }));
    return { ...scene, layer, nodes, trail: trail_of(given, layer) };
  }
  /** What its usages read through. **No line is derived**: only stored relations draw. */
  const through = read_through(given, layer);
  /** A page places its layer as it reads; anything else places itself — `auto` shelving down a
   *  page as wide as the canvas, as a page does. */
  const how = layout_of(through, layer);
  const across = config.across && how !== "free" && through.blocks[layer]
    ? with_across(through, layer, config.across) : through;
  const graph = how === "page" ? page_graph(across, layer) : across;
  const parts = new Set(Object.keys(graph.blocks).filter((id) =>
    !given.blocks[id] || given.blocks[id]!.parent !== graph.blocks[id]!.parent));
  const carried_as = (id: Id): BoxData => {
    const said = carried(graph, id);
    return parts.has(id) ? { ...said, marks: [...said.marks, "part"] } : said;
  };
  const spots = laid(graph, layer);
  /** Interfaces are seated after the cards; hidden ones still hold their seat. */
  const hidden = config.interfaces === false;
  const linked = edges_in(graph, layer).map((e) => landed(e, layer));

  /** Which component draws each box. Every card is the one card height, so nothing minifies. */
  const boxes: BoxNode[] = spots
    .filter((p) => !inline(graph, p.id))
    .map((p) => node(p.id, p, { ...carried_as(p.id), nest: group_depth(graph, p.id) },
                     is_note(graph, p.id) ? "note" : "card"));

  /** A grid draws its extent; a boundary its members' bounds. */
  const holders: BoxNode[] = [];
  for (const g of holders_in(graph, layer)) {
    const box = spots.find((p) => p.id === g.id);
    if (!box) continue;
    const said = carried(graph, g.id);
    /** A folder and a region are boxes as a group is, told apart by their marks. */
    const mark: CardClass = shape_of(graph, g.id) === "grid" ? "grid" : "group";
    holders.push(node(g.id, box,
                      { ...said, nest: group_depth(graph, g.id),
                        holds: members_of(graph, g.id).map((b) => b.id),
                        ...(mark === "grid" ? { grid: lattice(graph, g.id) }
                                            : { carries: group_carries(graph, g.id) }) },
                      mark));
  }
  /** Shallowest first, so a holder inside another draws over it. */
  holders.sort((a, b) => (a.data.nest ?? 0) - (b.data.nest ?? 0));

  /** Layer-level aside cards are placed once interfaces are seated. A tie to an interface goes
   *  first, so the port keeps the nearest spot and a card's note takes the next. */
  const floating = new Set(spots.filter((p) => graph.blocks[p.id]?.parent === layer
    && is_aside(graph, p.id) && tie_targets(graph, layer, p.id).length > 0).map((p) => p.id));
  const drawn = (nodes: readonly BoxNode[]) =>
    [...holders, ...nodes].filter((n) => !floating.has(n.id));

  /** The room round what the layer holds, then every end and interface seated on it all. */
  let room = frame_of(graph, layer, drawn(boxes), config.room);
  let at = new Map<Id, Rect>(spots.filter((p) => !floating.has(p.id)).map((p) => [p.id, p]));
  if (room) at.set(FRAME, room);
  let seating = seat_all(graph, linked, at, room && layer ? { id: FRAME, of: layer } : undefined);
  let cards = boxes;
  if (floating.size && layer) {
    const on_wall = (id: Id) => {
      const target = tie_targets(graph, layer, id).find((t) => seating.ports.has(t));
      return !!target && graph.blocks[target]!.parent === layer;
    };
    const walls = [...floating].filter(on_wall).sort();
    if (room && walls.length) {
      let next = room;
      for (const id of walls) {
        const target = tie_targets(graph, layer, id).find((t) => seating.ports.has(t));
        const seat = target ? seating.ports.get(target) : undefined;
        const spot = spots.find((p) => p.id === id);
        if (!seat || !spot) continue;
        const across = seat.side === "left" || seat.side === "right";
        next = open_wall(next, seat.side, (across ? spot.w : spot.h) + PAD);
      }
      room = next;
      at.set(FRAME, room);
      seating = seat_all(graph, linked, at, { id: FRAME, of: layer });
    }
    /** Place, and if a note opens the room, seat again and place once more against that room.
     *  The last place is aimed at these ports; seating again must not leave them elsewhere. */
    let aimed = seating;
    for (let pass = 0; pass < 3; pass++) {
      const moved = sit_beside(graph, layer, spots, floating, at, seating, room);
      cards = cards.map((n) => {
        const m = moved.get(n.id);
        return m ? { ...n, position: { x: m.x, y: m.y } } : n;
      });
      aimed = seating;
      const fitted = frame_of(graph, layer, [...holders, ...cards], config.room);
      const fits = !fitted || (room && holds_rect(room, fitted));
      if (fits || pass === 2) {
        if (fits && fitted && room) room = { ...fitted, ...box_of_rect(room) };
        break;
      }
      room = fitted!;
      at = new Map([...holders, ...cards].filter((n) => !floating.has(n.id))
        .map((n) => [n.id, box_of(n)]));
      at.set(FRAME, room);
      seating = seat_all(graph, linked, at, { id: FRAME, of: layer });
    }
    at = new Map<Id, Rect>([...holders, ...cards].map((n) => [n.id, box_of(n)]));
    if (room) at.set(FRAME, room);
    seating = seat_all(graph, linked, at, room ? { id: FRAME, of: layer } : undefined);
    if (ports_moved(aimed, seating)) {
      const moved = sit_beside(graph, layer, spots, floating, at, seating, room);
      cards = cards.map((n) => {
        const m = moved.get(n.id);
        return m ? { ...n, position: { x: m.x, y: m.y } } : n;
      });
      at = new Map<Id, Rect>([...holders, ...cards].map((n) => [n.id, box_of(n)]));
      if (room) at.set(FRAME, room);
      seating = seat_all(graph, linked, at, room ? { id: FRAME, of: layer } : undefined);
    }
  }

  /** A seated interface draws over the card it sits on, so it comes last. */
  const seats: BoxNode[] = [...seating.ports]
    .filter(([id]) => graph.blocks[id]?.parent !== layer)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, seat]) => {
      const b = graph.blocks[id]!;
      const box = at_seat(at.get(b.parent!)!, seat);
      const nest = b.parent ? group_depth(graph, b.parent) : 0;
      const data: BoxData = { ...carried(graph, id), side: seat.side, nest,
                              ...(b.parent ? { on: b.parent } : {}) };
      if (hidden) {
        return { ...node(id, box, { ...data, marks: [...data.marks, "berth"] }, "seat"),
                 selectable: false, draggable: false };
      }
      return node(id, box, data, "seat");
    });

  const offered = new Map<Id, { id: string; side: Side; at: number }[]>();
  for (const p of seating.perches) {
    const kept = offered.get(p.on) ?? [];
    kept.push({ id: perch_id(p.edge, p.end), side: p.side, at: p.at });
    offered.set(p.on, kept);
  }

  /** A region on the layer is a band across the whole room. */
  const spanning = (n: BoxNode): BoxNode => (room && n.data.marks.includes("region")
    && graph.blocks[n.id]?.parent === layer
    ? { ...n, position: { ...n.position, x: room.x + PAD }, width: room.w - PAD * 2 } : n);

  /** The seats each box offers, put onto the box that offers them. */
  const placed = [...holders.map(spanning), ...cards, ...seats].map((n) => {
    const own = offered.get(n.id);
    return own ? { ...n, data: { ...n.data, seats: own } } : n;
  });

  /** The room's own interfaces and seats, set into its walls. */
  const walled = offered.get(FRAME);
  const framed: Frame | null = room && layer
    ? { ...room, ports: wall_of(graph, layer, hidden, seating.ports),
        ...(walled ? { seats: walled } : {}) }
    : null;

  return {
    layer,
    ...(framed ? { frame: framed } : {}),
    nodes: placed,
    edges: line_edges(graph, linked, seating, config.ends),
    perches: seating.perches,
    /** A slot says what this projection can offer, never what it is doing. */
    slots: SLOTS,
    trail: trail_of(graph, layer),
  };
}

/** The cells a grid draws, placed inside its own box. A header line's cells are marked so, and
 *  the left column's read upright; what sits in a cell is a block, drawn as one. */
function lattice(graph: Graph, id: Id): GridCell[] {
  const g = lattice_of(graph, id)!;
  const seated = new Set<string>();
  for (const b of members_of(graph, id)) if (b.cell) seated.add(`${b.cell.r},${b.cell.c}`);
  const out: GridCell[] = [];
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const span = g.merges?.find((s: Span) => covers(s, r, c));
      if (span && (span.r !== r || span.c !== c)) continue;
      const marks: CardClass[] = ["cell"];
      if (span) marks.push("merged");
      if (seated.has(`${r},${c}`)) marks.push("seated");
      const role = heading(r, c);
      if (role) marks.push("header");
      if (role === "row") marks.push("upright");
      /** A header heading one line is that line's tab; the corner heads none. */
      const line = role === "row" ? { way: "row" as const, i: r }
        : role === "col" ? { way: "col" as const, i: c } : null;
      const index = line ? line_name(line.way, line.i) : "";
      out.push({ r, c, ...cell_box(g, r, c), marks,
                 ...(line ? { line } : {}), ...(index ? { index } : {}) });
    }
  }
  return out;
}

/** What a row or column of a grid is called: rows count from one and columns letter from A, past
 *  the header line, which is nameless. */
function line_name(way: "row" | "col", i: number): string {
  let n = i - 1;
  if (n < 0) return "";
  if (way === "row") return String(n + 1);
  let out = "";
  do { out = String.fromCharCode(65 + (n % 26)) + out; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return out;
}

/** The room grown on `side` by `by`, so a note tied to that wall has somewhere clear to sit. */
function open_wall<T extends Rect>(room: T, side: Side, by: number): T {
  const next = side === "bottom" ? { ...room, h: room.h + by }
    : side === "top" ? { ...room, y: room.y - by, h: room.h + by }
    : side === "right" ? { ...room, w: room.w + by }
    : { ...room, x: room.x - by, w: room.w + by };
  return { ...room, ...roomed(next) };
}

function box_of_rect(r: Rect): Rect {
  return { x: r.x, y: r.y, w: r.w, h: r.h };
}

/** Whether seating the notes moved an interface off the seat the note was aimed at. */
function ports_moved(aimed: Seating, next: Seating): boolean {
  if (aimed.ports.size !== next.ports.size) return true;
  for (const [id, seat] of aimed.ports) {
    const other = next.ports.get(id);
    if (!other || other.side !== seat.side || Math.abs(other.at - seat.at) > 1e-6) return true;
  }
  return false;
}

function holds_rect(outer: Rect, inner: Rect): boolean {
  return inner.x >= outer.x - 1 && inner.y >= outer.y - 1
    && inner.x + inner.w <= outer.x + outer.w + 1
    && inner.y + inner.h <= outer.y + outer.h + 1;
}

/** Aside cards on the layer, each in the nearest free space beside what it is tied to. A tie to
 *  an interface is placed first. One on the room's wall stays inside the room, so seating again
 *  does not move the wall it sits on. */
function sit_beside(graph: Graph, layer: Id | null,
                    spots: readonly { id: Id; w: number; h: number }[],
                    floating: ReadonlySet<Id>, at: ReadonlyMap<Id, Rect>, seating: Seating,
                    room: { x: number; y: number; w: number; h: number } | null)
    : Map<Id, { x: number; y: number }> {
  const taken: Rect[] = [...at.entries()]
    .filter(([id]) => id !== FRAME && !floating.has(id)).map(([, r]) => r);
  for (const [id, seat] of seating.ports) {
    const parent = graph.blocks[id]?.parent;
    const owner = parent === layer ? FRAME : parent;
    const host = owner ? at.get(owner) : undefined;
    if (host) taken.push(at_seat(host, seat));
  }
  const within = room && room.w > PAD * 2 && room.h > PAD * 2
    ? { x: room.x + PAD, y: room.y + PAD, w: room.w - PAD * 2, h: room.h - PAD * 2 } : undefined;
  const port_of = (id: Id) => tie_targets(graph, layer, id).find((t) => seating.ports.has(t));
  const order = [...floating].sort((a, b) =>
    (port_of(a) ? 0 : 1) - (port_of(b) ? 0 : 1) || a.localeCompare(b));
  const out = new Map<Id, { x: number; y: number }>();
  for (const id of order) {
    const spot = spots.find((p) => p.id === id);
    if (!spot) continue;
    const port = port_of(id);
    const seat = port ? seating.ports.get(port) : undefined;
    const parent = port ? graph.blocks[port]?.parent : undefined;
    const owner = parent === layer ? FRAME : parent ?? undefined;
    const host = owner ? at.get(owner) : undefined;
    const card = tie_targets(graph, layer, id).map((t) => at.get(t)).find((r) => !!r);
    const target = seat && host ? at_seat(host, seat) : card;
    if (!target) continue;
    const place = beside(taken, target, { w: spot.w, h: spot.h },
                         owner === FRAME ? within : undefined);
    out.set(id, place);
    taken.push({ ...place, w: spot.w, h: spot.h });
  }
  return out;
}

/** The border a layer is seen from inside, before its interfaces are seated on it. */
function frame_of(graph: Graph, layer: Id | null, drawn: readonly BoxNode[],
                  pkg = false): Omit<Frame, "ports"> | null {
  /** The forest is seen from no block's inside, nor a package root unless it is asked for. */
  if (layer === null || !graph.blocks[layer]) return null;
  if (graph.blocks[layer]!.parent === null && !pkg) return null;
  const label = shown_name(graph, layer);
  /** A package's room reads as the folder it is opened as. */
  const role = graph.blocks[layer]!.parent === null ? "folder" : role_of(graph, layer);
  const stamps = stamps_of(graph, layer);
  const holds_parts = is_container(graph, layer);
  const least = { w: UNIT * 14, h: UNIT * 9 };
  /** A room is a whole number of cells. */
  if (drawn.length === 0) {
    return { ...roomed({ x: -least.w / 2, y: -least.h / 2, ...least }),
             label, role, ...(stamps.length ? { stamps } : {}), holds_parts };
  }
  const pad = PAD;
  const at = drawn.map(box_of);
  const x = Math.min(...at.map((b) => b.x)) - pad;
  const y = Math.min(...at.map((b) => b.y)) - pad;
  const w = Math.max(least.w, Math.max(...at.map((b) => b.x + b.w)) + pad - x);
  const h = Math.max(least.h, Math.max(...at.map((b) => b.y + b.h)) + pad - y);
  return { ...roomed({ x, y, w, h }), label, role, ...(stamps.length ? { stamps } : {}),
           holds_parts };
}

/** The layer's own interfaces, set into its walls where they were seated, seen from inside. */
function wall_of(graph: Graph, layer: Id, hidden: boolean,
                 seats: ReadonlyMap<Id, Seat>): Port[] {
  return children(graph, layer)
    .filter((b) => seats.has(b.id))
    .map((b) => ({
      id: b.id,
      label: shown_name(graph, b.id),
      ...seats.get(b.id)!,
      marks: hidden ? [...marks_of(graph, b.id), "berth" as CardClass] : marks_of(graph, b.id),
      look: look_of(graph, b.id),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Where a relationship's ends land: the layer itself is the frame. */
function landed(e: Relation, layer: Id | null): Relation {
  const here = (id: Id): Id => (layer !== null && id === layer ? FRAME : id);
  return { ...e, from: here(e.from), to: here(e.to) };
}

/** Every line as the canvas draws it: ends, seats, label, and where it turns. A tie between
 *  cards that overlap draws nothing. Where `ends`, a line draws what its ends mean. */
function line_edges(graph: Graph, linked: readonly Relation[], seating: Seating,
                    ends?: "class" | "er"): LineEdge[] {
  const met = new Map(seating.perches.map((p) => [`${p.edge}|${p.end}`, p]));
  return linked.map((e): LineEdge => {
    const wire = wire_of(graph, e.id);
    const label = wire.name ? label_of(graph, e.id) : "";
    const alias = wire.alias ? alias_of(graph, e.id, true) : "";
    /** A line a diagram drew is read and never picked. */
    const link = e.id.startsWith(DRAWN_BY);
    const meant: Ends | undefined = ends ? e.ends : undefined;
    /** A tie by its trait: drawn straight and never routed. */
    const module = is_tie(graph, e.id) ? "tie" : "line";
    const fan = seating.fans.get(e.id);
    return {
      id: e.id,
      ...(link ? { selectable: false, focusable: false } : {}),
      ...(seating.hidden.has(e.id) ? { hidden: true } : {}),
      source: e.from,
      target: e.to,
      sourceHandle: handle(met, e.id, "from", "s"),
      targetHandle: handle(met, e.id, "to", "t"),
      ...(label ? { label } : {}),
      data: { module, dir: meant ? "none" : dir_of(graph, e.id), wire,
              ...(meant ? { ends: meant } : {}), ...(ends === "er" ? { crows: true } : {}),
              ...(alias ? { alias } : {}),
              ...(fan ? { fan } : {}) },
    };
  });
}

/** Which handle an end leaves by. */
function handle(met: ReadonlyMap<string, Perch>, edge: Id,
                end: "from" | "to", role: "s" | "t"): string {
  return met.has(`${edge}|${end}`) ? `${role}-${perch_id(edge, end)}` : role;
}

/** The scene a diagram kind draws. The subject is the block that feeds it: a stand-in's target
 *  when the stand-in names the view. A kind the block cannot fill falls back to the capability
 *  view, still read only. */
function diagram_scene(graph: Graph, layer: Id,
                       kind: "class" | "er" | "allocation" | "sequence"): Scene {
  const subject = diagram_subject(graph, layer);
  const scene = kind === "sequence" ? sequence_of(graph, subject)
    : kind === "allocation" ? project(graph, subject) : classes_of(graph, subject, kind);
  if (layer === subject || !scene.frame) return scene;
  return { ...scene, frame: { ...scene.frame, label: shown_name(graph, layer) } };
}

/** A class or entity diagram, or the block's own view where it holds no definition reference.
 *  The diagram's graph no longer calls its host a grid, so it is drawn from inside; its lines draw
 *  what their ends mean. */
function classes_of(graph: Graph, subject: Id, kind: "class" | "er"): Scene {
  const drawn = class_graph(graph, subject, kind);
  return drawn ? project(drawn, subject, { ends: kind }) : project(graph, subject);
}

/** A sequence, or the grid itself where it has no step. */
function sequence_of(graph: Graph, subject: Id): Scene {
  return sequence_scene(graph, subject) ?? project(graph, subject);
}

/** A diagram offers nothing to drag or to build. Marks a view drew (`@`, `class:`) are not
 *  picked. The trail names the block that was opened, which may be a stand-in for the subject. */
function quiet(graph: Graph, layer: Id, scene: Scene): Scene {
  const drawn = (id: string) => id.startsWith("@") || id.startsWith(DRAWN_BY);
  const nodes = scene.nodes.map((n) => ({ ...n, draggable: false,
    ...(drawn(n.id) ? { selectable: false, focusable: false } : {}) }));
  const edges = scene.edges.map((e) =>
    drawn(e.id) ? { ...e, selectable: false, focusable: false } : e);
  return { ...scene, layer, nodes, edges, slots: ["display"], trail: trail_of(graph, layer) };
}
