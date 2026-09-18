/** What a view module hands back. */

import type { Edge, Node } from "@xyflow/react";
import type { Dir, Id, Mark, Role, Side } from "@mnd/core";
import type { Arrow, Look, Wire } from "./look";
import type { Perch } from "./seat";

/** What one drawn thing carries beyond where it sits and how big it is. */
export type BoxData = {
  /** The mark a thing wears beside its name while nobody has named it. */
  alias?: string;
  label: string;
  /** The definition this usage names, if any. */
  def?: Id;
  /** What this is drawn on, where it is seated rather than placed. */
  on?: Id;
  /** Where the box points, if it points anywhere. */
  link?: string;
  /** Everything true of it at once, drawn as classes. */
  marks: readonly Trait[];
  /** The one system mark, derived: what this card stands in for, or that it holds parts. */
  mark?: Mark;
  /** What sort of thing it is: the icon it wears unless somebody set their own. */
  role?: Role;
  /** How its definition says it draws. */
  look?: Look;
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
};

/** What a card wears as classes: everything true of it at once, as against the one system
 *  mark it carries. */
export type Trait = "container" | "reference" | "missing" | "note" | "group" | "grid"
                 | "interface" | "berth" | "in" | "out" | "unnamed"
                 | "cell" | "header" | "merged";

/** One cell of a grid, placed inside the grid's own box. */
export type GridCell = {
  r: number;
  c: number;
  x: number;
  y: number;
  w: number;
  h: number;
  marks: readonly Trait[];
};

/** What one line carries; routing is the renderer's. */
export type LineData = {
  /** The shipped base this run draws as: `line`, or `tie` where a note sits at an end. */
  module: Id;
  dir: Dir;
  /** How it is painted and what draws at its ends. */
  wire?: Wire;
  /** The handle, beside the name rather than inside it. */
  alias?: string;
  /** The boxes this run must stay outside of: every card on the layer. */
  clear?: readonly { x: number; y: number; w: number; h: number }[];
};

/** One drawn thing. React Flow's node, with our data on it. */
export type BoxNode = Node<BoxData>;

/** Whether a drawn node holds others rather than being one of them — a boundary or a grid. */
export function holds(n: { type?: string } | null | undefined): boolean {
  return n?.type === "group" || n?.type === "grid";
}

/** One line. React Flow's edge, with our data on it. */
export type LineEdge = Edge<LineData>;

/** What draws at each end of a run. */
export function heads(data: LineData | undefined): { from: Arrow; to: Arrow } {
  const dir = data?.dir ?? "none";
  const to = dir === "forward" || dir === "both";
  const from = dir === "back" || dir === "both";
  return {
    from: data?.wire?.from_arrow ?? (from ? "arrow" : "none"),
    to: data?.wire?.to_arrow ?? (to ? "arrow" : "none"),
  };
}

/** Which control group this projection offers. */
export type Slot = "layer" | "display" | "relations";

/** One of the layer's own interfaces, seen from inside. */
export type Port = {
  id: Id;
  label: string;
  side: Side;
  at: number;
  marks: readonly Trait[];
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
  /** The system mark it earns, where it stands in for something. */
  mark?: Mark;
  /** Whether it holds anything, which is what fills its icon. */
  holds_parts?: boolean;
  /** Which wall of its own parent this layer is set into, when the layer is itself an interface. */
  side?: Side;
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
