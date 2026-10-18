/** What a view module hands back. */

import type { Edge, Node } from "@xyflow/react";
import type { Dir, End, Ends, Id, Key, Mark, Role, Side } from "@mnd/core";
import type { Arrow, Look, Wire } from "./look";
import type { Fan, Perch, Seat } from "./seat";

/** One row of a card's attributes: its name, its type's name, whether it keys, and the value a
 *  usage answers or the default a definition declares. */
export type Listed = {
  name: string; type: string; key?: Key; link?: boolean; value?: string; note?: string;
};

/** A large face's attributes as a ruled table: each row's cells, and each column's width in
 *  pixels — worked out once, so the card is sized and drawn alike. */
export type Ruled = { cells: readonly (readonly string[])[]; widths: readonly number[];
                      /** The row a second compartment starts at: a class card's behaviours. */
                      split?: number };

/** What one drawn thing carries beyond where it sits and how big it is. */
export type BoxData = {
  /** The mark a thing wears beside its name while nobody has named it. */
  alias?: string;
  label: string;
  /** What it is for, in a line: its own, else its definition's. Shown on hover. */
  description?: string;
  /** The definition this usage names, if any. */
  def?: Id;
  /** What this is drawn on, where it is seated rather than placed. */
  on?: Id;
  /** Where the box points, if it points anywhere. */
  link?: string;
  /** Everything true of it at once, drawn as classes. */
  marks: readonly CardClass[];
  /** The system marks, derived: what this card stands in for, or what describes it. */
  stamps?: readonly Mark[];
  /** What sort of thing it is: the icon it wears unless somebody set their own. */
  role?: Role;
  /** Whether it opens onto a view of its own. */
  opens?: boolean;
  /** How its definition says it draws. */
  look?: Look;
  /** Which face it draws with, and the large face's parts its look shows: its attributes as a
   *  table, and its body and preview as markdown. */
  face?: "small" | "large";
  table?: Ruled;
  text?: string;
  /** The lattice a grid draws, as boxes inside its own. */
  grid?: readonly GridCell[];
  /** Whom a boundary is drawn round. */
  holds?: readonly Id[];
  /** Every block nested inside a group, at any depth. */
  carries?: readonly Id[];
  /** A group seated inside another, not on the layer by itself. */
  member?: boolean;
  /** How many group boundaries enclose this block. */
  nest?: number;
  /** Which wall this is set into, on a box that is seated rather than placed. */
  side?: Side;
  /** Seats a line meets on this box's border, where the end has no interface of its own here. */
  seats?: readonly { id: string; side: Side; at: number }[];
  /** A registry's tile: how many times its entry is used, and that against the most used. */
  count?: number;
  heat?: number;
};

/** What a card wears as classes: everything true of it at once, as against the one system
 *  mark it carries. */
export type CardClass = "container" | "reference" | "missing" | "note" | "label" | "group"
                 /** A definition, or a stand-in for one: outlined on the canvas. */
                 | "definition"
                 /** A relation definition, drawn as a wire swatch, and whether its lines point. */
                 | "relation" | "directed"
                 | "grid" | "region"
                 | "interface" | "berth" | "in" | "out" | "unnamed"
                 | "cell" | "header" | "upright" | "merged"
                 /** An opened grid, standing in for the room. */
                 | "room"
                 /** A cell a block sits in. */
                 | "seated"
                 /** A block of a definition's structure, seen through a usage of it. */
                 | "part"
                 /** A block on a definition's path, the definition included. */
                 | "held"
                 /** A folder or block a view flattens into a box: not a group anybody made. */
                 | "flat";

/** One cell of a grid, placed inside the grid's own box. */
export type GridCell = {
  r: number;
  c: number;
  x: number;
  y: number;
  w: number;
  h: number;
  marks: readonly CardClass[];
  /** On a header line, the line it heads and that line's name: opened, the header is its
   *  line's tab. */
  line?: { way: "row" | "col"; i: number };
  index?: string;
};

/** What one line carries; routing is the renderer's. */
export type LineData = {
  /** The shipped base this run draws as: `line`, or `tie` where a note sits at an end. */
  module: Id;
  dir: Dir;
  /** What its ends mean, where the view draws them — a class or entity diagram — rather than
   *  its direction. */
  ends?: Ends;
  /** Whether an entity diagram draws it: multiplicities as crow's feet. */
  crows?: boolean;
  /** How it is painted and what draws at its ends. */
  wire?: Wire;
  /** The handle, beside the name rather than inside it. */
  alias?: string;
  /** Where its cross leg sits, out from the end its lines fan from. */
  fan?: Fan;
  /** A run already drawn, in the scene's own coordinates. Routing is skipped. */
  points?: readonly { x: number; y: number }[];
};

/** One drawn thing. React Flow's node, with our data on it. */
export type BoxNode = Node<BoxData>;

/** Whether a drawn node holds others rather than being one of them — a boundary or a grid. */
export function holds(n: { type?: string } | null | undefined): boolean {
  return n?.type === "group" || n?.type === "grid";
}

/** One line. React Flow's edge, with our data on it. */
export type LineEdge = Edge<LineData>;

/** What draws at each end of a run: what the line says, else what its end means — a diamond at
 *  the owner, an open head where it can be reached, a crow's foot on an entity diagram — else its
 *  direction. */
export function heads(data: LineData | undefined): { from: Head; to: Head } {
  const dir = data?.dir ?? "none";
  const to = dir === "forward" || dir === "both";
  const from = dir === "back" || dir === "both";
  return {
    from: data?.wire?.from_arrow ?? meant(data, "from") ?? (from ? "arrow" : "none"),
    to: data?.wire?.to_arrow ?? meant(data, "to") ?? (to ? "arrow" : "none"),
  };
}

/** A head: one a line may name, or one only what an end means draws. */
export type Head = Arrow | "filled" | "one" | "many" | "zero_one" | "zero_many";

/** The head an end's meaning draws, or none said. */
function meant(data: LineData | undefined, way: "from" | "to"): Head | undefined {
  const end: End | undefined = data?.ends?.[way];
  if (!end) return undefined;
  if (end.ownership === "composite") return "filled";
  if (end.ownership === "shared") return "diamond";
  if (data?.crows && end.multiplicity) return crow(end.multiplicity);
  return end.navigable ? "open" : undefined;
}

/** A crow's-foot head for a multiplicity: its lower bound zero or not, its upper one or many. A
 *  bare `*` is zero or many. */
function crow(multiplicity: string): Head {
  const [low, high = low] = multiplicity.split("..");
  const many = high === "*" || Number(high) > 1;
  const none = low === "0" || low === "*";
  return none ? (many ? "zero_many" : "zero_one") : many ? "many" : "one";
}

/** Whether an end draws the cross that says it cannot be reached. */
export function crossed(data: LineData | undefined, way: "from" | "to"): boolean {
  return data?.ends?.[way]?.navigable === false;
}

/** The words an end draws beside it: its role and its multiplicity — on an entity diagram the
 *  crow's foot says the multiplicity. */
export function end_words(data: LineData | undefined, way: "from" | "to"): string {
  const end = data?.ends?.[way];
  if (!end) return "";
  return [end.role, data?.crows ? "" : end.multiplicity].filter(Boolean).join(" ");
}

/** Which control group this projection offers. */
export type Slot = "layer" | "display" | "relations";

/** One of the layer's own interfaces, seen from inside. */
export type Port = {
  id: Id;
  label: string;
  side: Side;
  at: number;
  marks: readonly CardClass[];
  look?: Look;
};

/** The frame's own id, as an edge end and as a perch's host. */
export const FRAME = "__frame";

export type Frame = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  /** What the open layer is, as the icon every surface draws for it. */
  role?: Role;
  /** The system marks it earns. */
  stamps?: readonly Mark[];
  /** Whether it holds anything, which is what fills its icon. */
  holds_parts?: boolean;
  /** The interfaces set into this layer's own walls. */
  ports: readonly Port[];
  /** Seats a relationship meets on these walls with no interface of its own. */
  seats?: readonly { id: string; side: Side; at: number }[];
};

export type Scene = {
  /** The layer this is a projection of. */
  layer: Id | null;
  /** Absent only at the root, which has no outside to be seen from. */
  frame?: Frame;
  nodes: readonly BoxNode[];
  edges: readonly LineEdge[];
  /** Where each relationship end meets the border it lands on, for the ends with no interface of
   *  their own. */
  perches: readonly Perch[];
  slots: readonly Slot[];
  /** The trail from the root down to the layer, for a breadcrumb. */
  trail: readonly { id: Id; label: string }[];
};

export const EMPTY: Scene = {
  layer: null, nodes: [], edges: [], perches: [], slots: [], trail: [],
};

/** One drawn thing, as a node. */
export function cell(id: Id, at: { x: number; y: number; w: number; h: number },
                     data: BoxData, type = "card"): BoxNode {
  return { id, type, position: { x: at.x, y: at.y }, width: at.w, height: at.h, data };
}

/** What a node occupies. */
export function box_of(node: BoxNode): { x: number; y: number; w: number; h: number } {
  return {
    x: node.position.x,
    y: node.position.y,
    w: node.width ?? node.measured?.width ?? 0,
    h: node.height ?? node.measured?.height ?? 0,
  };
}

/** The seats spoken for on a border: its lines' anchors and its interfaces but `except`. A face's
 *  middle is free while no line meets that face. */
export function taken_on(scene: Scene, on: Id, except?: Id): Seat[] {
  const out: Seat[] = scene.perches.filter((p) => p.on === on)
    .map(({ side, at }) => ({ side, at }));
  if (on === FRAME) {
    const ports = (scene.frame?.ports ?? []).filter((p) => p.id !== except);
    return [...out, ...ports.map(({ side, at }) => ({ side, at }))];
  }
  const host = scene.nodes.find((n) => n.id === on);
  if (!host) return out;
  const box = box_of(host);
  for (const n of scene.nodes) {
    if (n.data.on !== on || n.id === except || !n.data.side) continue;
    const c = box_of(n);
    const down = n.data.side === "left" || n.data.side === "right";
    out.push({ side: n.data.side,
               at: down ? (c.y + c.h / 2 - box.y) / box.h : (c.x + c.w / 2 - box.x) / box.w });
  }
  return out;
}

/** What the whole projection takes up, plus room for something new. */
export function extent(scene: Scene): { x: number; y: number; w: number; h: number } {
  const all = [...scene.nodes.map(box_of), ...(scene.frame ? [scene.frame] : [])];
  if (!all.length) return { x: 0, y: 0, w: 0, h: 0 };
  const x = Math.min(...all.map((b) => b.x));
  const y = Math.min(...all.map((b) => b.y));
  return {
    x, y,
    w: Math.max(...all.map((b) => b.x + b.w)) - x,
    h: Math.max(...all.map((b) => b.y + b.h)) - y,
  };
}

/** What every well-formed Scene satisfies, whoever produced it. */
export function faults(scene: Scene): string[] {
  const out: string[] = [];
  const ids = new Set(scene.nodes.map((n) => n.id));

  if (ids.size !== scene.nodes.length) out.push("two nodes share an id");

  for (const n of scene.nodes) {
    const b = box_of(n);
    if (b.w <= 0 || b.h <= 0) out.push(`node ${n.id} has no size`);
    if (typeof n.data.label !== "string") out.push(`node ${n.id} has no label`);
    if (!n.type) out.push(`node ${n.id} says nothing about how it draws`);
  }

  /** The frame and its ports may be named as ends without being placed. */
  const walled = new Set<string>([FRAME, ...(scene.frame?.ports ?? []).map((p) => p.id)]);
  const met = (id: string) => ids.has(id) || walled.has(id);
  for (const e of scene.edges) {
    if (!met(e.source)) out.push(`edge ${e.id} leaves a node that is not drawn`);
    if (!met(e.target)) out.push(`edge ${e.id} reaches a node that is not drawn`);
    for (const p of e.data?.points ?? []) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        out.push(`edge ${e.id} has a point off the page`);
      }
    }
  }

  if (scene.frame && (scene.frame.w <= 0 || scene.frame.h <= 0)) {
    out.push("the frame has no size");
  }
  for (const n of scene.nodes) {
    const seated = n.data.on;
    if (seated && !ids.has(seated)) out.push(`node ${n.id} is seated on nothing drawn`);
    if (!scene.frame) continue;
    const f = scene.frame;
    const b = box_of(n);
    if (b.x < f.x || b.y < f.y || b.x + b.w > f.x + f.w || b.y + b.h > f.y + f.h) {
      out.push(`node ${n.id} is drawn outside the frame`);
    }
  }

  return out;
}
