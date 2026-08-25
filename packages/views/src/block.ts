/** The block view: any planar projection.
 *
 *  A layer is what is looked at; this is the looking. It reads the graph and
 *  hands back a Scene — it never writes a mutation and never touches the DOM. */

import { arrangement_of, children, edges_in, is_interface, module_of, owner_of,
         shown_name, READS,
         type Graph, type Id, type Reading, type Relation, type Side } from "@mnd/core";
import { boundary, bounds, laid, route, seated, GAP, GRID, type Placed } from "@mnd/layout";
import { link_of, marks_of, trail_of } from "./derive";
import { read, reading_of } from "./read";
import type { Box, Frame, Hit, Mark, Route, Scene, Slot } from "./scene";

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

  const boxes: Box[] = spots.map((p) => {
    const b = graph.blocks[p.id]!;
    return {
      id: p.id, x: p.x, y: p.y, w: p.w, h: p.h,
      label: shown_name(graph, p.id),
      def: b.type,
      link: link_of(graph, p.id),
      marks: marks_of(graph, p.id),
    };
  });

  /** A boundary is its members' bounds — a fact about what it holds, never a
   *  stored size. It draws behind whatever it holds. */
  const groups: Box[] = [];
  for (const g of here) {
    if (module_of(graph, g.id) !== "group") continue;
    const members = Object.values(graph.blocks)
      .filter((b) => b.groups?.includes(g.id)).map((b) => b.id);
    const box = boundary(spots, members);
    if (!box) continue;
    const at = boxes.findIndex((x) => x.id === g.id);
    if (at >= 0) boxes.splice(at, 1);
    groups.push({ id: g.id, x: box.x, y: box.y, w: box.w, h: box.h,
                  label: shown_name(graph, g.id), def: g.type,
                  link: link_of(graph, g.id), marks: ["group"] });
  }

  /** A seated interface draws over the card it sits on, so it comes last. */
  const seats: Box[] = ports.map((p) => {
    const b = graph.blocks[p.id]!;
    return { id: p.id, x: p.x, y: p.y, w: p.w, h: p.h,
             label: shown_name(graph, p.id), def: b.type, on: b.parent ?? undefined,
             link: link_of(graph, p.id), marks: marks_of(graph, p.id) };
  });

  /** Lanes and lifelines are drawn behind, controls in front of neither — all
   *  three are derived, so none of them answers a gesture. */
  const derived: Box[] = seen ? [
    ...seen.bands.map((b): Box => plain(b.id, b, b.label, ["lane"])),
    ...seen.lines.map((l): Box => plain(l.id, l, "", ["lifeline"])),
  ] : [];
  const controls: Box[] = seen
    ? seen.controls.map((c): Box => plain(c.id, c, "", ["control", c.kind])) : [];

  const drawn = [...derived, ...groups, ...boxes, ...controls, ...seats];
  /** An end seated on an interface leaves by that interface's own side; only
   *  an end the relationship placed itself overrides it. */
  const linked = seen ? seen.links
    : edges_in(graph, layer).map((e) => landed(graph, e, ports.length > 0));
  const by_id = new Map(linked.map((e) => [e.id, e]));
  const routes: Route[] = route([...spots, ...seen?.controls ?? [], ...ports], linked, how)
    .map((r) => {
      const e = by_id.get(r.id)!;
      return { id: r.id, from: r.from, to: r.to, points: r.points,
               module: e.module, dir: e.dir ?? "none",
               label: e.type ? graph.defs[e.type]?.name : undefined };
    });

  const frame = frame_of(graph, layer, drawn);

  /** The frame is the biggest hit and comes first, so a smaller one always wins
   *  it — the innermost thing under the pointer is what a click acts on. */
  const hits: Hit[] = [
    ...(frame ? [{ on: layer ?? graph.root, kind: "frame" as const,
                   region: { x: frame.x, y: frame.y, w: frame.w, h: frame.h } }] : []),
    ...drawn.filter((b) => !derived_box(b)).map((b): Hit => ({
      on: b.id, kind: b.on ? "seat" : "box",
      region: { x: b.x, y: b.y, w: b.w, h: b.h } })),
    ...routes.map((r): Hit => ({ on: r.id, kind: "route", region: hull(r.points) })),
  ];

  return {
    layer,
    ...(frame ? { frame } : {}),
    boxes: drawn,
    routes,
    /** **A slot says what this projection can offer, never what it is doing.**
     *  Dropping the interfaces group when interfaces are hidden would take away
     *  the only control that could bring them back. */
    slots: seen ? [...(reading === "sequence" ? ["columns" as Slot] : ["arrange" as Slot]),
                   ...READ_SLOTS]
                : SLOTS,
    hits,
    /** Everything drawn, the frame included — a band reaches past the cards
     *  inside it, and a layer that measured only its cards would be drawn
     *  small enough to leave room for what it already holds. */
    bounds: bounds(frame ? [{ id: "frame", ...frame }, ...drawn] : drawn),
    trail: trail_of(graph, layer),
  };
}

/** The border a layer is seen from inside.
 *
 *  **The root has none** — a frame is a block seen from outside, and the
 *  workspace has no outside. Everywhere else it is what the layer holds plus a
 *  margin, and never smaller than the room a first block needs. */
function frame_of(graph: Graph, layer: Id | null, drawn: readonly Box[]): Frame | null {
  if (layer === null || layer === graph.root) return null;
  const least = { w: GRID * 14, h: GRID * 9 };
  if (drawn.length === 0) {
    return { x: -least.w / 2, y: -least.h / 2, ...least, label: shown_name(graph, layer) };
  }
  const pad = GAP.unit;
  const x = Math.min(...drawn.map((b) => b.x)) - pad;
  const y = Math.min(...drawn.map((b) => b.y)) - pad;
  const w = Math.max(least.w, Math.max(...drawn.map((b) => b.x + b.w)) + pad - x);
  const h = Math.max(least.h, Math.max(...drawn.map((b) => b.y + b.h)) + pad - y);
  return { x, y, w, h, label: shown_name(graph, layer) };
}

/** A derived box — a lane, a lifeline, a control. Drawn, and never picked:
 *  none of them is something anybody made. */
function derived_box(b: Box): boolean {
  return b.marks.includes("lane") || b.marks.includes("lifeline")
      || b.marks.includes("control");
}

/** A box that stands for nothing in the graph: it is placed, labelled and
 *  marked, and that is all there is to it. */
function plain(id: Id, at: Placed, label: string, marks: Mark[]): Box {
  return { id, x: at.x, y: at.y, w: at.w, h: at.h, label, marks };
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

/** A line is picked by the box around it, widened so a thin run is hittable. */
function hull(points: readonly { x: number; y: number }[]): Hit["region"] {
  const pad = 6;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y };
}
