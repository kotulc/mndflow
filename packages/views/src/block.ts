/** The block view: any planar projection.
 *
 *  A layer is what is looked at; this is the looking. It reads the graph and
 *  hands back a Scene — it never writes a mutation and never touches the DOM. */

import { arrangement_of, children, edges_in, is_interface, module_of, owner_of,
         shown_name, READS,
         type Graph, type Id, type Reading, type Relation, type Side } from "@mnd/core";
import { boundary, laid, seated, GAP, GRID, type Placed } from "@mnd/views";
import { carried, marks_of, trail_of } from "./derive";
import { look_of } from "./look";
import { read, reading_of } from "./read";
import { box_of, cell as node, type BoxNode, type Frame, type LineEdge, type Port,
         type Mark, type Scene, type Slot } from "./scene";

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
   *  with them, so they are placed once the cards are. */
  const ports = config.interfaces === false ? [] : seated(graph, spots);

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
    groups.push(node(g.id, box, { ...carried(graph, g.id), marks: ["group"], cells: [] },
                     "group"));
  }

  /** A seated interface draws over the card it sits on, so it comes last. */
  const seats: BoxNode[] = ports.map((p) => {
    const b = graph.blocks[p.id]!;
    return node(p.id, p, { ...carried(graph, p.id),
                           ...(b.parent ? { on: b.parent } : {}) }, "seat");
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
   *  an end the relationship placed itself overrides it. */
  const linked = seen ? seen.links
    : edges_in(graph, layer).map((e) => landed(graph, e, ports.length > 0));
  /** **The two ends, and nothing about the run between them.** Where a line
   *  goes is the renderer's, which is why nothing here routes one. */
  const edges: LineEdge[] = linked.map((e): LineEdge => ({
    id: e.id,
    source: e.from,
    target: e.to,
    label: e.type ? graph.defs[e.type]?.name : undefined,
    data: { module: e.module, dir: e.dir ?? "none" },
  }));

  const frame = frame_of(graph, layer, drawn);

  return {
    layer,
    ...(frame ? { frame } : {}),
    nodes: drawn,
    edges,
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
function frame_of(graph: Graph, layer: Id | null, drawn: readonly BoxNode[]): Frame | null {
  if (layer === null || layer === graph.root) return null;
  const label = shown_name(graph, layer);
  const ports = wall_of(graph, layer);
  const least = { w: GRID * 14, h: GRID * 9 };
  if (drawn.length === 0) {
    return { x: -least.w / 2, y: -least.h / 2, ...least, label, ports };
  }
  const pad = GAP.unit;
  const at = drawn.map(box_of);
  const x = Math.min(...at.map((b) => b.x)) - pad;
  const y = Math.min(...at.map((b) => b.y)) - pad;
  const w = Math.max(least.w, Math.max(...at.map((b) => b.x + b.w)) + pad - x);
  const h = Math.max(least.h, Math.max(...at.map((b) => b.y + b.h)) + pad - y);
  return { x, y, w, h, label, ports };
}

/** The layer's own interfaces, set into its walls and seen from inside.
 *
 *  **Where they sit is not decided here.** The frame is grown to whatever panel
 *  it is drawn in, so a wall's run is a fact about a window; what this knows is
 *  which wall each one is in and how far along, which is what the model stores.
 *
 *  A block with interfaces is still a block, so these are also drawn on its
 *  card from the layer above — the same interfaces, from the other side. */
function wall_of(graph: Graph, layer: Id): Port[] {
  return children(graph, layer)
    .filter(is_interface)
    .map((b) => ({
      id: b.id,
      label: shown_name(graph, b.id),
      side: b.side!,
      at: b.at ?? 0.5,
      marks: marks_of(graph, b.id),
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
function landed(graph: Graph, e: Relation, drawn: boolean): Relation {
  const side = (id: Id): Side | undefined => {
    const b = graph.blocks[id];
    return b && is_interface(b) ? b.side : undefined;
  };
  return {
    ...e,
    from: drawn ? e.from : owner_of(graph, e.from),
    to: drawn ? e.to : owner_of(graph, e.to),
    fromSide: e.fromSide ?? side(e.from),
    toSide: e.toSide ?? side(e.to),
  };
}

