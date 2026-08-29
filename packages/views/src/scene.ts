/** What a view module hands back.
 *
 *  Plain data, importing nothing drawable — so a notation is a pure function,
 *  a renderer turns one into DOM and another into text, and most of the product
 *  is provably correct before anything is drawn.
 *
 *  **It is React Flow's own node and edge shape.** The types are imported for
 *  their shape and erased at build, so nothing here resolves React or touches a
 *  DOM; what it buys is that the renderer hands the library its own arrays
 *  rather than translating between two vocabularies that mean the same thing.
 *  Where a route ran and what region answers a click are **the library's
 *  business now** and appear nowhere below. */

import type { Edge, Node } from "@xyflow/react";
import type { Dir, Id, RelationModule } from "@mnd/core";

/** What one drawn thing carries beyond where it sits and how big it is. */
export type BoxData = {
  label: string;
  /** The definition this usage names, if any. Never a colour or a shape. */
  def?: Id;
  /** What this is drawn **on**, where it is seated rather than placed. An
   *  interface sits on its owner's edge, so a slide is a question about that
   *  card and not about the layer. */
  on?: Id;
  /** Where the box points, if it points anywhere. Derived from a field, so a
   *  translator makes a box clickable by saying where it came from and never
   *  by reaching into a renderer. A renderer that cannot follow one ignores it. */
  link?: string;
  /** How it reads, derived: a container, a reference, a note, a boundary. */
  marks: readonly Mark[];
};

export type Mark = "container" | "reference" | "missing" | "note" | "group"
                 | "interface" | "derived" | "in" | "out"
                 | "lane" | "lifeline" | "control" | "fork" | "join"
                 | "decision" | "merge" | "header" | "cell" | "filled" | "turned";

/** What one line carries. Where it runs is not here: the renderer routes it,
 *  and the two ends plus the walls they leave by are the whole of what a
 *  projection knows. */
export type LineData = {
  module: RelationModule;
  dir: Dir;
};

/** One drawn thing. React Flow's node, with our data on it. */
export type BoxNode = Node<BoxData>;

/** One line. React Flow's edge, with our data on it. */
export type LineEdge = Edge<LineData>;

/** Which control group this projection offers. The shell knows how to build
 *  each; a module declaring none simply has none. */
export type Slot = "arrange" | "interfaces" | "lines" | "columns" | "types" | "relations";

/** The open layer seen from within: a border with the name set into it, and
 *  the band outside it. A layer with nothing in it still gets one, so
 *  descending into an empty block shows somewhere to put something rather than
 *  a blank page. */
export type Frame = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
};

export type Scene = {
  /** The layer this is a projection of. */
  layer: Id | null;
  /** Absent only at the root, which has no outside to be seen from. */
  frame?: Frame;
  nodes: readonly BoxNode[];
  edges: readonly LineEdge[];
  slots: readonly Slot[];
  /** The trail from the root down to the layer, for a breadcrumb. */
  trail: readonly { id: Id; label: string }[];
};

export const EMPTY: Scene = {
  layer: null, nodes: [], edges: [], slots: [], trail: [],
};

/** One drawn thing, as a node. **Written once**, so `type`, the size fields
 *  and the data envelope cannot drift between the three projections. A table
 *  and a matrix draw cards like everything else; what a cell or a head *is* is
 *  in its marks, so nothing needs a component of its own. */
export function cell(id: Id, at: { x: number; y: number; w: number; h: number },
                     data: BoxData, type = "card"): BoxNode {
  return { id, type, position: { x: at.x, y: at.y }, width: at.w, height: at.h, data };
}

/** What a node occupies. Written once because a `Node` carries its size in two
 *  places and only one of them is ours to set. */
export function box_of(node: BoxNode): { x: number; y: number; w: number; h: number } {
  return {
    x: node.position.x,
    y: node.position.y,
    w: node.width ?? node.measured?.width ?? 0,
    h: node.height ?? node.measured?.height ?? 0,
  };
}

/** What the whole projection takes up, plus room for something new. Computed
 *  rather than stored: only a text renderer needs it, since anything drawing
 *  in a viewport asks the viewport to fit itself. */
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

/** What every well-formed Scene satisfies, whoever produced it.
 *
 *  A producer proves its output passes; a consumer proves it draws anything
 *  that does. Neither imports the other.
 *
 *  **Shorter than it was, on purpose.** Every bend being square and every hit
 *  naming something drawn were claims about a router and a hit tree this no
 *  longer owns. What is left is what a projection is still answerable for. */
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

  for (const e of scene.edges) {
    if (!ids.has(e.source)) out.push(`edge ${e.id} leaves a node that is not drawn`);
    if (!ids.has(e.target)) out.push(`edge ${e.id} reaches a node that is not drawn`);
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
