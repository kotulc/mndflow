/** The block view: any planar projection. */

import { alias_of, layout_of, children, setting_of, ABOUT, covers, edge_base, edges_in, group_depth, heading, holders_in,
         inline, is_container, is_grid, is_group, is_note, label_of, lattice_of,
         members_of, shape_of, stamps_of, role_of, shown_name, path, type Cut,
         type ViewKind, type Graph, type Id, type Relation, type Side, type Span } from "@mnd/core";
import { at_seat, cell_box, laid, perch_id, roomed, seat_all, PAD, UNIT, type Perch,
         type Rect, type Seat, type Seating } from "@mnd/views";
import { carried, marks_of, trail_of } from "./derive";
import { look_of, wire_of } from "./look";
import { page_graph } from "./page";
import { profile_graph, ROW } from "./profile";
import { survey_graph, FOREST } from "./survey";
import { sheet_graph, GRID_LAYER } from "./sheet";
import { read_through } from "./through";
import { linked_graph, LINK } from "./links";
import { definition_graph, ASPECT } from "./definition";
import { box_of, cell as node, extent, FRAME, type BoxData, type BoxNode, type Frame,
         type GridCell, type LineEdge, type Port, type CardClass, type Scene,
         type Slot } from "./scene";

export type Config = {
  /** How the layer is looked at: from inside (`internal`, `grid`); a package or folder read down
   *  the page (`folder`); a definition with what describes it round it (`definition`); the whole
   *  section it scopes, down to `cut`, each block there boxing its top level where `tops` says
   *  (`package`); or a cross-section of the host's sections along `target` (`profile`). Unsaid,
   *  inside — and with no layer, every package's domain as an package view. */
  look?: { kind: ViewKind; cut: Cut; tops?: boolean; target?: Id | null };
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
};

const SLOTS: readonly Slot[] = ["layer", "display", "relations"];

/** What a projection with no layer draws: every package's domain, as boxes down the page. */
const WHOLE = { kind: "package", cut: "tree" } as const;

/** A graph whose layer says how many cards its page holds across. */
function with_across(graph: Graph, layer: Id, across: number): Graph {
  const b = graph.blocks[layer]!;
  const layout = { ...setting_of(graph, layer, "layout"), across };
  return { ...graph, blocks: { ...graph.blocks, [layer]: { ...b, settings: { ...b.settings, layout } } } };
}

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

/** Project a layer through the block view, with what its usages read through laid in. A part of
 *  a definition seen through a usage wears the `part` mark. */
export function project(given: Graph, layer: Id | null, config: Config = {}): Scene {
  /** A whole section is drawn from its scope, down to its cut, and read only: it offers what the
   *  drawing shows, and nothing to lay out. */
  const look: Config["look"] = config.look ?? (layer === null ? WHOLE : undefined);
  /** A definition is drawn on its own layer, itself lit, what describes it round it: placed, so
   *  nothing moves, and only a real block or the note is picked — never a box. */
  if (look?.kind === "definition" && layer && given.blocks[layer]) {
    const scene = project(definition_graph(given, layer), ASPECT,
                          { ...config, look: { kind: "internal", cut: null } });
    const nodes = scene.nodes.map((n) => ({
      ...n, draggable: false, ...(given.blocks[n.id] || n.id === ABOUT ? {} : { selectable: false }),
      ...(n.id === layer ? { data: { ...n.data, marks: [...n.data.marks, "held" as const] } } : {}),
    }));
    return { ...scene, layer, nodes, slots: ["display"], trail: trail_of(given, layer) };
  }
  /** A package or folder nobody arranged reads as a page, as wide as the canvas; its places are
   *  the page's, so nothing is dragged. One somebody arranged draws as it was left. Either way
   *  its room hugs what it holds. */
  if (look?.kind === "folder" && layer && given.blocks[layer]) {
    const b = given.blocks[layer]!;
    const said = setting_of(given, layer, "layout")["kind"];
    const arranged = (said !== undefined && said !== "free")
      || children(given, layer).some((c) => c.x !== undefined);
    const layout = { ...setting_of(given, layer, "layout"), kind: "page",
                     ...(config.across ? { across: config.across } : {}) };
    const paged = arranged ? given : { ...given, blocks: { ...given.blocks,
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
  if (look && (look.kind === "package" || look.kind === "profile")) {
    const drawn = look.kind === "profile"
      ? profile_graph(given, look.target ?? null, config.across)
      : survey_graph(given, layer, look.cut,
                     { ...(config.packages ? { only: config.packages } : {}),
                       ...(look.tops ? { tops: true } : {}),
                       ...(config.across ? { across: config.across } : {}) });
    const scene = project(drawn, FOREST, { ...config, look: { kind: "internal", cut: null } });
    /** On a profile, each block on the way to what it cuts through, that included, wears the
     *  held mark. */
    const target = look.kind === "profile" ? look.target ?? null : null;
    const held = target && given.blocks[target] ? path(given, target).map((b) => b.id) : [];
    const marked = (n: BoxNode, mark: CardClass): BoxNode =>
      ({ ...n, data: { ...n.data, marks: [...n.data.marks, mark] } });
    /** A part's copy wears the part mark, as it does inside its usage, and is only looked at:
     *  it is picked and edited where it is a block — its definition, or inside its usage. */
    const nodes = scene.nodes.map((n) => (n.id.startsWith(ROW)
      ? { ...n, selectable: false, draggable: false }
      : !given.blocks[n.id] ? { ...marked(n, "part"), selectable: false, draggable: false }
      : held.includes(n.id) ? marked(n, "held") : n));
    /** A whole section has no layer of its own to trail to. */
    return { ...scene, nodes, slots: ["display"], trail: [] };
  }
  if (layer === null) return project(given, null, { ...config, look: WHOLE });
  /** An opened grid draws its grid view: its frame of cells is the room, which the hand sizes
   *  but never moves, under the grid's own crumbs. */
  if (layer !== GRID_LAYER && is_grid(given, layer)) {
    const { frame: _room, ...scene } = project(sheet_graph(given, layer), GRID_LAYER, config);
    const nodes = scene.nodes.map((n) => (n.id !== layer ? n : {
      ...n, draggable: false, data: { ...n.data, marks: [...n.data.marks, "room" as const] } }));
    return { ...scene, layer, nodes, trail: trail_of(given, layer) };
  }
  /** What its usages read through, and the links its cards' attributes draw between them. */
  const through = linked_graph(read_through(given, layer), layer);
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
    const mark: CardClass = shape_of(graph, g.id)!;
    holders.push(node(g.id, box,
                      { ...said, nest: group_depth(graph, g.id),
                        holds: members_of(graph, g.id).map((b) => b.id),
                        ...(mark === "grid" ? { grid: lattice(graph, g.id) }
                                            : { carries: group_carries(graph, g.id) }) },
                      mark));
  }
  /** Shallowest first, so a holder inside another draws over it. */
  holders.sort((a, b) => (a.data.nest ?? 0) - (b.data.nest ?? 0));

  /** The room round what the layer holds, then every end and interface seated on it all. */
  const room = frame_of(graph, layer, [...holders, ...boxes], config.room);
  const at = new Map<Id, Rect>(spots.map((p) => [p.id, p]));
  if (room) at.set(FRAME, room);
  const seating = seat_all(graph, linked, at, room && layer ? { id: FRAME, of: layer } : undefined);

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

  /** The seats each box offers, put onto the box that offers them. */
  const placed = [...holders, ...boxes, ...seats].map((n) => {
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
    edges: line_edges(graph, linked, seating),
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
  /** An interface opened from inside keeps the wall it is set into. */
  const side = graph.blocks[layer]?.side;
  const set_in = side ? { side } : {};
  const least = { w: UNIT * 14, h: UNIT * 9 };
  /** A room is a whole number of cells. */
  if (drawn.length === 0) {
    return { ...roomed({ x: -least.w / 2, y: -least.h / 2, ...least }),
             label, role, ...(stamps.length ? { stamps } : {}), holds_parts, ...set_in };
  }
  const pad = PAD;
  const at = drawn.map(box_of);
  const x = Math.min(...at.map((b) => b.x)) - pad;
  const y = Math.min(...at.map((b) => b.y)) - pad;
  const w = Math.max(least.w, Math.max(...at.map((b) => b.x + b.w)) + pad - x);
  const h = Math.max(least.h, Math.max(...at.map((b) => b.y + b.h)) + pad - y);
  return { ...roomed({ x, y, w, h }), label, role, ...(stamps.length ? { stamps } : {}),
           holds_parts, ...set_in };
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
 *  cards that overlap draws nothing. */
function line_edges(graph: Graph, linked: readonly Relation[], seating: Seating): LineEdge[] {
  const met = new Map(seating.perches.map((p) => [`${p.edge}|${p.end}`, p]));
  return linked.map((e): LineEdge => {
    const wire = wire_of(graph, e.id);
    const label = wire.name ? label_of(graph, e.id) : "";
    const alias = wire.alias ? alias_of(graph, e.id, true) : "";
    /** A link is drawn to be read, never picked. */
    const link = e.id.startsWith(LINK);
    const module = edge_base(graph, e.id);
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
      data: { module, dir: e.dir ?? "none", wire,
              ...(link ? { link: true } : {}),
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
