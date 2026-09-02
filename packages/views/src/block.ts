/** The block view: any planar projection.
 *
 *  A layer is what is looked at; this is the looking. It reads the graph and
 *  hands back a Scene — it never writes a mutation and never touches the DOM. */

import { arrangement_of, children, edges_in, is_interface, module_of, role_of,
         shown_name, READS,
         type Graph, type Id, type Reading, type Relation, type Side } from "@mnd/core";
import { at_seat, boundary, laid, perch_id, perched, seated, GAP, GRID,
         type Perch, type Placed } from "@mnd/views";
import { carried, marks_of, trail_of } from "./derive";
import { look_of } from "./look";
import { read, reading_of } from "./read";
import { box_of, cell as node, FRAME, type BoxData, type BoxNode, type Frame,
         type LineEdge, type Port, type Mark, type Scene, type Slot } from "./scene";

export type Config = {
  /** **What to show, when it is not the layer's own contents.**
   *
   *  A view block holds one reference per thing it shows, and projecting one
   *  projects what it holds. A caller with a set of blocks and no block to hold
   *  them — a filter, a search, a workspace status — hands the same set through
   *  the same door, so there is **one seam rather than two**.
   *
   *  Read by the table, which is where a result belongs. A plane places by the
   *  layer it is a plane of, the same way `reading` and `interfaces` are the
   *  block module's and no other's. */
  holds?: readonly Id[];
  /** Which reading of a behavior layer, where one applies. */
  reading?: Reading;
  /** Beyond this many, inference cuts higher in the tree. */
  n?: number;
  /** Whether interfaces draw. A display preference the shell hands down. */
  interfaces?: boolean;
};

const SLOTS: readonly Slot[] = ["arrange", "interfaces", "lines", "relations"];

/** A reading places for itself, so it offers columns where a plane offers an
 *  arrangement — and neither offers the other. */
const READ_SLOTS: readonly Slot[] = ["lines", "relations"];

/** Project a layer through the block view. */
export function project(graph: Graph, layer: Id | null, config: Config = {}): Scene {
  const how = arrangement_of(graph, layer);
  const here = children(graph, layer);
  /** A behavior layer is placed by its reading rather than by the arrangement:
   *  order runs along the reading and the lane decides the rest. */
  const reading = reading_of(graph, layer, config.reading);
  const seen = reading ? read(graph, layer, reading, READS[how] === "bottom"
                                                  || READS[how] === "top") : null;
  const spots = seen ? seen.spots : laid(graph, layer);
  /** Interfaces are seated on the cards they belong to rather than laid out
   *  with them, so they are placed once the cards are.
   *
   *  **Seated whether or not they are drawn.** Turning interfaces off is a
   *  display preference and says nothing about the relationships tied to them,
   *  so a hidden one still holds its seat — it becomes a *berth*, which draws
   *  nothing and keeps every line meeting the border where it always did. */
  const hidden = config.interfaces === false;
  const ports = seated(graph, spots);

  /** **Which component draws a box is said here and re-derived nowhere.** A
   *  note is text you resize and a boundary is a band behind its members;
   *  everything else is a rectangle, whatever it is a rectangle *of*. */
  const boxes: BoxNode[] = spots.map((p) =>
    node(p.id, p, carried(graph, p.id),
         module_of(graph, p.id) === "note" ? "note" : "card"));

  /** A boundary is its members' bounds — a fact about what it holds, never a
   *  stored size. It draws behind whatever it holds. */
  const groups: BoxNode[] = [];
  for (const g of here) {
    if (module_of(graph, g.id) !== "group") continue;
    const members = Object.values(graph.blocks)
      .filter((b) => b.groups?.includes(g.id)).map((b) => b.id);
    const box = boundary(spots, members);
    if (!box) continue;
    const at = boxes.findIndex((x) => x.id === g.id);
    if (at >= 0) boxes.splice(at, 1);
    groups.push(node(g.id, box,
                     { ...carried(graph, g.id), marks: ["group"], cells: [], holds: members },
                     "group"));
  }

  /** A seated interface draws over the card it sits on, so it comes last. A
   *  berth answers no gesture — it is not drawn, and picking what you cannot
   *  see is not a gesture anybody meant. */
  const seats: BoxNode[] = ports.map((p) => {
    const b = graph.blocks[p.id]!;
    const data: BoxData = { ...carried(graph, p.id), side: b.side!,
                            ...(b.parent ? { on: b.parent } : {}) };
    return hidden
      ? { ...node(p.id, p, { ...data, marks: [...data.marks, "berth"] }, "seat"),
          selectable: false, draggable: false }
      : node(p.id, p, data, "seat");
  });

  /** Lanes and lifelines are drawn behind, controls in front of neither — all
   *  three are derived, so none of them answers a gesture. */
  const derived: BoxNode[] = seen ? [
    ...seen.bands.map((b) => plain(b.id, b, b.label, ["lane"])),
    ...seen.lines.map((l) => plain(l.id, l, "", ["lifeline"])),
  ] : [];
  const controls: BoxNode[] = seen
    ? seen.controls.map((c) => plain(c.id, c, "", ["control", c.kind])) : [];

  const drawn = [...derived, ...groups, ...boxes, ...controls, ...seats];
  /** An end seated on an interface leaves by that interface's own side; only
   *  an end the relationship placed itself overrides it. An end on the layer
   *  itself meets the frame you are inside. */
  const linked = seen ? seen.links
    : edges_in(graph, layer).map((e) => landed(graph, e, layer));

  /** The room, before anything is seated on it. **A wall is a border like a
   *  card's**, so an end meeting one takes a seat the same way — which is what
   *  lets one grip mean the same thing wherever a line ends. */
  const room = frame_of(graph, layer, drawn, hidden);

  /** Where every other end meets the border it lands on. **Worked out here
   *  rather than left to the library**: left to itself it takes whichever
   *  handle comes first, which sends a line between two neighbours out of the
   *  top, around and back. Two placed rectangles already say which wall faces
   *  which, and a seat keeps two lines to the same card apart. */
  const at = new Map(drawn.map((n) => [n.id, box_of(n)]));
  if (room) {
    at.set(FRAME, room);
    /** **The layer's own interfaces are boxes too.** They are set into the room
     *  rather than laid out with what it holds, so they are nowhere among the
     *  drawn nodes — and an end that could not be found at all left the *other*
     *  end with no wall worked out either, which is a line leaving a card by
     *  whichever handle the library happened to have and arriving on the far
     *  side of it. */
    for (const p of room.ports) at.set(p.id, at_seat(room, p));
  }
  const perches = perched(graph, linked, at,
                          room && layer ? { id: FRAME, of: layer } : undefined);
  const offered = new Map<Id, { id: string; side: Side; at: number }[]>();
  for (const p of perches) {
    const held = offered.get(p.on) ?? [];
    held.push({ id: perch_id(p.edge, p.end), side: p.side, at: p.at });
    offered.set(p.on, held);
  }
  const met = new Map(perches.map((p) => [`${p.edge}|${p.end}`, p]));

  /** The seats each box offers, put onto the box that offers them. */
  const placed = drawn.map((n) => {
    const own = offered.get(n.id);
    return own ? { ...n, data: { ...n.data, seats: own } } : n;
  });

  /** **The two ends, and which seat each meets.** Where the run goes between
   *  them is still the renderer's; which point it leaves from is geometry, and
   *  geometry is this module's. */
  /** The card each end is a border of. **An interface is a border of the card
   *  it sits on**, and a perch is a border of the card it is on — so the box a
   *  run must keep out of is that card, at either end. The room is not one of
   *  them: it is what the run is inside. */
  const owns = new Map(drawn.map((n) => [n.id, box_of(n)]));
  const outside_of = (id: Id): { x: number; y: number; w: number; h: number } | null => {
    const n = drawn.find((x) => x.id === id);
    const of = n?.data.on ?? (n && n.type !== "group" ? id : null);
    return of && of !== FRAME ? owns.get(of) ?? null : null;
  };

  const edges: LineEdge[] = linked.map((e): LineEdge => {
    const clear = [outside_of(e.from), outside_of(e.to)]
      .filter((b): b is NonNullable<typeof b> => b !== null);
    return {
      id: e.id,
      source: e.from,
      target: e.to,
      sourceHandle: handle(met, e.id, "from", "s"),
      targetHandle: handle(met, e.id, "to", "t"),
      label: e.type ? graph.defs[e.type]?.name : undefined,
      data: { module: e.module, dir: e.dir ?? "none",
              ...(clear.length ? { clear } : {}) },
    };
  });

  /** The walls' own seats, put on the frame that offers them. */
  const walled = offered.get(FRAME);
  const frame = room && walled ? { ...room, seats: walled } : room;

  return {
    layer,
    ...(frame ? { frame } : {}),
    nodes: placed,
    edges,
    perches,
    /** **A slot says what this projection can offer, never what it is doing.**
     *  Dropping the interfaces group when interfaces are hidden would take away
     *  the only control that could bring them back. */
    slots: seen ? [...(reading === "sequence" ? ["columns" as Slot] : ["arrange" as Slot]),
                   ...READ_SLOTS]
                : SLOTS,
    trail: trail_of(graph, layer),
  };
}

/** The border a layer is seen from inside.
 *
 *  **The root has none** — a frame is a block seen from outside, and the
 *  workspace has no outside. Everywhere else it is what the layer holds plus a
 *  margin, and never smaller than the room a first block needs. */
function frame_of(graph: Graph, layer: Id | null, drawn: readonly BoxNode[],
                  hidden: boolean): Frame | null {
  if (layer === null || layer === graph.root) return null;
  const label = shown_name(graph, layer);
  const role = role_of(graph, layer);
  const ports = wall_of(graph, layer, hidden);
  /** An interface opened from the inside straddles its parent's border, and the
   *  wall it is set into is the one thing about this layer that is a fact about
   *  the layer above it. */
  const side = graph.blocks[layer]?.side;
  const set_in = side ? { side } : {};
  const least = { w: GRID * 14, h: GRID * 9 };
  if (drawn.length === 0) {
    return { x: -least.w / 2, y: -least.h / 2, ...least, label, role, ports, ...set_in };
  }
  const pad = GAP.unit;
  const at = drawn.map(box_of);
  const x = Math.min(...at.map((b) => b.x)) - pad;
  const y = Math.min(...at.map((b) => b.y)) - pad;
  const w = Math.max(least.w, Math.max(...at.map((b) => b.x + b.w)) + pad - x);
  const h = Math.max(least.h, Math.max(...at.map((b) => b.y + b.h)) + pad - y);
  return { x, y, w, h, label, role, ports, ...set_in };
}

/** The layer's own interfaces, set into its walls and seen from inside.
 *
 *  **Where they sit is not decided here.** The frame is grown to whatever panel
 *  it is drawn in, so a wall's run is a fact about a window; what this knows is
 *  which wall each one is in and how far along, which is what the model stores.
 *
 *  A block with interfaces is still a block, so these are also drawn on its
 *  card from the layer above — the same interfaces, from the other side. */
function wall_of(graph: Graph, layer: Id, hidden: boolean): Port[] {
  return children(graph, layer)
    .filter(is_interface)
    .map((b) => ({
      id: b.id,
      label: shown_name(graph, b.id),
      side: b.side!,
      at: b.at ?? 0.5,
      marks: hidden ? [...marks_of(graph, b.id), "berth" as Mark] : marks_of(graph, b.id),
      look: look_of(graph, b.id),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** A box that stands for nothing in the graph: it is placed, labelled and
 *  marked, and that is all there is to it. **Nothing anybody made is one**, so
 *  none of them takes a drag or a selection. */
function plain(id: Id, at: Placed, label: string, marks: Mark[]): BoxNode {
  const kind = marks.includes("decision") || marks.includes("merge") ? "control" : "card";
  return { ...node(id, at, { label, marks }, kind),
           draggable: false, selectable: false };
}

/** Where a relationship's ends land.
 *
 *  An end seated on an interface leaves by that interface's side unless it was
 *  walled somewhere else by hand — and with interfaces hidden it lands on the
 *  card instead, so turning them off hides the seats and never the lines. */
function landed(graph: Graph, e: Relation, layer: Id | null): Relation {
  const side = (id: Id): Side | undefined => {
    const b = graph.blocks[id];
    return b && is_interface(b) ? b.side : undefined;
  };
  /** The layer itself is the frame around you, and the frame is not a block. */
  const here = (id: Id): Id => (layer !== null && id === layer ? FRAME : id);
  return { ...e, from: here(e.from), to: here(e.to),
           fromSide: e.fromSide ?? side(e.from), toSide: e.toSide ?? side(e.to) };
}

/** Which handle an end leaves by.
 *
 *  A perch is a seat of its own and names itself; an end seated on an interface
 *  meets the interface, which offers one place and needs no choosing. **Nothing
 *  here picks a point** — both answers were worked out before this was asked. */
function handle(met: ReadonlyMap<string, Perch>, edge: Id,
                end: "from" | "to", role: "s" | "t"): string {
  return met.has(`${edge}|${end}`) ? `${role}-${perch_id(edge, end)}` : role;
}

