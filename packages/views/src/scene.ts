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
import type { Dir, Id, RelationModule, Role, Side } from "@mnd/core";
import type { Cell, Look } from "./look";
import type { Perch } from "./seat";

/** What one drawn thing carries beyond where it sits and how big it is. */
export type BoxData = {
  /** The mark a thing wears beside its name while nobody has named it. Drawn
   *  quietly and separately, so what somebody types replaces the name and not
   *  the mark. Absent once it is named, and on anything that carries none. */
  alias?: string;
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
  /** What it is, as the one word every surface draws a mark for. **The same
   *  question the tree asks**, answered in `core` so a card and a row cannot
   *  say different things about one block. */
  role?: Role;
  /** How its definition says it draws. **Names from closed sets, never
   *  values** — a renderer looks each one up and a definition cannot invent
   *  one. Absent on a box that stands for nothing in the graph. */
  look?: Look;
  /** What a container holds, for the picture drawn inside its card. Empty or
   *  absent on everything else. */
  cells?: readonly Cell[];
  /** The lattice a grid draws, as boxes inside its own. **Derived, and nothing
   *  in the graph** — a cell has no id, so it is named by row and column and a
   *  renderer addresses one that way too. Absent on a boundary, which has no
   *  cells. */
  grid?: readonly GridCell[];
  /** Whom a boundary is drawn round. **A band is its members' bounds**, so it
   *  has no place of its own to move — dragging one is dragging them, and this
   *  is the only place a renderer could learn who *them* is. */
  holds?: readonly Id[];
  /** The fields this usage shows, already resolved to what they say. */
  fields?: readonly { name: string; value: string }[];
  /** Which wall this is set into, on a box that is seated rather than placed.
   *  A line reaching an interface leaves by the interface's own wall, which is
   *  the one fact about it a router cannot work out from two rectangles. */
  side?: Side;
  /** Seats a line meets on this box's border, where the end has no interface
   *  of its own here. **Derived geometry, and nothing in the graph** — the box
   *  offers a handle at each, and the edge names it. */
  seats?: readonly { id: string; side: Side; at: number }[];
};

export type Mark = "container" | "reference" | "missing" | "note" | "group"
                 | "unlabelled" | "locked"
                 | "interface" | "berth" | "in" | "out" | "unnamed"
                 | "cell" | "header" | "header_row" | "header_col" | "merged" | "promoted";

/** One cell of a grid, placed inside the grid's own box. A merged region is one
 *  cell drawn once, at the span's corner and the span's size. */
export type GridCell = {
  r: number;
  c: number;
  x: number;
  y: number;
  w: number;
  h: number;
  marks: readonly Mark[];
};

/** What one line carries. Where it runs is not here: the renderer routes it,
 *  and the two ends plus the walls they leave by are the whole of what a
 *  projection knows. */
export type LineData = {
  module: RelationModule;
  dir: Dir;
  /** Whether this layer is being read with curves rather than right angles.
   *  **Display state, put on the line rather than beside it** — the renderer
   *  draws one edge at a time and this is the one thing about a run that is not
   *  derivable from its two ends. */
  curved?: boolean;
  /** The boxes this run must stay outside of: **every card on the layer**.
   *
   *  It used to be the two ends' own boxes and nothing else, on the reasoning
   *  that going round all of them was a different problem whose answers were
   *  long detours. That was true of a router that guessed at a handful of
   *  shapes; it is not true of one that searches the lanes the layer leaves,
   *  where going round is one extra corner. Measured on nine cards, five runs
   *  in nine passed through a card they had nothing to do with.
   *
   *  **Cards and notes, never bands or the room.** A group is drawn round
   *  things that live in it, so a run reaching one of them has to get inside;
   *  the frame is what the whole layer is inside. The renderer draws one edge
   *  at a time and cannot know any of this; the projection placed them. */
  clear?: readonly { x: number; y: number; w: number; h: number }[];
};

/** One drawn thing. React Flow's node, with our data on it. */
export type BoxNode = Node<BoxData>;

/** One line. React Flow's edge, with our data on it. */
export type LineEdge = Edge<LineData>;

/** Which control group this projection offers. The shell knows how to build
 *  each; a module declaring none simply has none.
 *
 *  **`display` and `relations` are two questions.** What a relationship *is* —
 *  a plain line, a direction, an association — is the model's and travels in
 *  the file; whether interfaces are drawn, whether a run bends square or
 *  curves, and pulling the bends out are all about the picture in front of you.
 *  Splitting them is what keeps a control that writes to the log out of the
 *  same box as three that do not. */
export type Slot = "layer" | "display" | "relations";

/** The open layer seen from within: a border with the name set into it, and
 *  the band outside it. A layer with nothing in it still gets one, so
 *  descending into an empty block shows somewhere to put something rather than
 *  a blank page. */
/** One of the layer's own interfaces, seen from inside.
 *
 *  **A side and a fraction, never a place.** The frame is grown to the panel by
 *  whoever is drawing it, so where on the screen a wall runs is not knowable
 *  here — what is knowable is which wall this sits in and how far along. */
export type Port = {
  id: Id;
  label: string;
  side: Side;
  at: number;
  marks: readonly Mark[];
  look?: Look;
};

/** The frame's own id, as an edge end and as a perch's host.
 *
 *  **Named once, here.** The frame is not a block — it is the layer you are
 *  inside, drawn — so it has no id of its own in the graph, and a renderer that
 *  invented one would be agreeing with this module by coincidence. */
export const FRAME = "__frame";

export type Frame = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  /** What the open layer is, as the mark every surface draws for it. The same
   *  question a card answers — you are inside the block, and it is still one. */
  role?: Role;
  /** Which wall of its own parent this layer is set into, when the layer is
   *  itself an interface. **Absent on an ordinary block** — you are inside a
   *  thing that straddles a border, and this is the border. */
  side?: Side;
  /** The interfaces set into this layer's own walls. A layer with none has an
   *  empty list rather than no list. */
  ports: readonly Port[];
  /** Seats a relationship meets on these walls with no interface of its own.
   *  **Fractions, like the ports** — the frame is grown to whatever panel it is
   *  drawn in, so where a wall runs is not knowable here. */
  seats?: readonly { id: string; side: Side; at: number }[];
};

export type Scene = {
  /** The layer this is a projection of. */
  layer: Id | null;
  /** Absent only at the root, which has no outside to be seen from. */
  frame?: Frame;
  nodes: readonly BoxNode[];
  edges: readonly LineEdge[];
  /** Where each relationship end meets the border it lands on, for the ends
   *  with no interface of their own. **Derived, and repeated on the boxes** —
   *  a box carries the seats it offers so it can draw them, and this is the
   *  same list read the other way round, by relationship. */
  perches: readonly Perch[];
  slots: readonly Slot[];
  /** The trail from the root down to the layer, for a breadcrumb. */
  trail: readonly { id: Id; label: string }[];
};

export const EMPTY: Scene = {
  layer: null, nodes: [], edges: [], perches: [], slots: [], trail: [],
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

  /** The frame and the interfaces set into it are drawn by whoever draws the
   *  frame, so they are ends a projection may name without placing. */
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
