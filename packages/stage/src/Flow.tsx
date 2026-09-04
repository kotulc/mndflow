/** Scene → React Flow, and nothing else.
 *
 *  It reads what a projection placed and knows nothing about the graph, the log
 *  or the actions. Naming what a gesture meant is the whole of its input job:
 *  it says what was meant and never writes a mutation.
 *
 *  **A projection now hands over the library's own arrays**, so there is no
 *  translation left here — only the few things a node cannot carry (whether it
 *  is picked, which wall a line leaves by) and the binding of React Flow's
 *  callbacks back to the gesture vocabulary the app already speaks. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background, BackgroundVariant, Controls, NodeToolbar, Panel, Position,
  ReactFlow, ReactFlowProvider, SelectionMode, ViewportPortal, useEdgesState,
  useNodesState, useReactFlow, useStore,
  type Node, type NodeChange, type OnSelectionChangeFunc,
} from "@xyflow/react";
import type { Id, Point, Side, Spot } from "@mnd/core";
import { at_seat, box_of, extent, nearest_seat, perch_id, snap, FRAME, PORT,
         type BoxNode, type Frame, type LineEdge, type Rect, type Scene } from "@mnd/views";
import { NamingContext } from "@mnd/theme";
import { CellsContext, DRAGGED, NODE_TYPES } from "./nodes";

export { DRAGGED };
import { EDGE_TYPES } from "./Wire";

/** What a gesture on the canvas meant. The consumer decides what to do with
 *  it. `kind` is what was under the pointer, never what it looked like. */
export type Gesture = {
  on: string | null;
  kind: "box" | "band" | "cell" | "brim" | "seat" | "route" | "anchor" | "frame" | "title"
      | "name" | "note" | "empty";
  button: "left" | "right";
  count: 1 | 2;
  /** Where, in scene coordinates. A position can only come from a gesture. */
  at: Point;
  /** Where, on the screen. **Both, because they answer different questions** —
   *  what the model records is a place on the drawing, and what a menu opens
   *  next to is a place on the page. */
  screen: Point;
  /** Whether the modifier that extends a selection was down. **The one key the
   *  canvas reports** — a range of cells is picked by pointing at its far
   *  corner, and only the pointer knows the key was held. */
  shift?: boolean;
  /** What this gesture knows beyond what it is on, as the arguments an action
   *  would need. **A seat is the case that needs it**: which wall of which
   *  border, and how far along, are answers only the pointer has — a perch is
   *  derived and a wall is a place rather than a thing. */
  given?: Record<string, unknown>;
};

/** A positional change, which is unsayable and undoable like anything else.
 *
 *  **Two, where there were four.** A sweep is a selection and arrives as one; a
 *  seat is a move whose node happens to be seated on another, so the canvas
 *  reports it the same way and the app reads the scene to tell them apart. */
export type Adjust =
  /** **Two answers, because a drop lands on two different sorts of thing.**
   *  `over` is a block it came to rest on, which is filing it inside that
   *  block; `into` is a boundary it came to rest within, which is joining that
   *  boundary. A boundary is not somewhere a block can live — it is a band
   *  drawn round blocks that already live here — and treating it as one filed
   *  cards under it, where the layer could not draw them and the tree did not
   *  list them. They looked deleted. */
  | { kind: "move"; on: string; to: Point; over: string | null; into: string | null;
      /** Which cell of `into` it came to rest in, where that is a grid.
       *  **Placement resolving to an address** — the same drop, read against a
       *  lattice the canvas has and nothing downstream does. */
      cell?: { r: number; c: number } }
  /** Several cards put down at once. **A sweep dragged, and a boundary
   *  dragged** — a band is its members' bounds, so it has no place of its own
   *  and moving it is moving them. Nothing lands *on* anything here: a drop
   *  that files one card inside another is one card, one gesture. */
  | { kind: "place"; at: readonly { id: string; to: Point }[] }
  | { kind: "wall"; on: string; end: "from" | "to"; to: string }
  /** An interface set into the open layer's own wall, slid along it. **The
   *  canvas answers this one itself**: which wall and how far along are read
   *  off the room, and the room is a size only the canvas knows. */
  | { kind: "wall-seat"; on: string; side: Side; at: number }
  /** A line's end slid along the border it meets. **A perch is derived**, so
   *  what this writes is the wall and the fraction the end was pinned to — the
   *  seat goes back to being worked out the moment it is unpinned. */
  | { kind: "anchor"; on: string; end: "from" | "to"; side: Side; at: number }
  /** A relationship asked to run straight. **Where two borders can meet
   *  without a jog is a fact about two rectangles**, which a relationship
   *  carries neither of — so the canvas is the only thing that can say it, and
   *  saying it is what makes this an adjustment rather than something sayable. */
  | { kind: "straighten"; on: string; fromSide: Side; fromAt: number;
      toSide: Side; toAt: number; align?: string; x?: number; y?: number }
  /** A corner dragged. **The one card whose size is yours to set** — every
   *  other one is sized from what it holds, and a block has carried `w` and
   *  `h` all along with no gesture that wrote them. */
  | { kind: "size"; on: string; w: number; h: number; to: Point };

export type FlowViewProps = {
  scene: Scene;
  picked?: readonly Id[];
  onGesture?: (g: Gesture) => void;
  /** A drag from one card's edge to another. **The library's gesture, not
   *  ours** — a connection starts on a handle, and React Flow's own drag
   *  filter takes the left button only, so this cannot be the right one.
   *
   *  `walls` is the one thing only the drag knows: which wall of the room an
   *  end was let go on. A perch is derived from where two rectangles ended up,
   *  and the room is grown to the panel after the projection placed it — so an
   *  end aimed at a wall by hand says which, or it lands wherever the geometry
   *  works out and never where you pointed. */
  onRelate?: (from: string, to: string,
              walls?: { fromSide?: Side; toSide?: Side }) => void;
  /** A right drag across empty ground: the region a group will fill. **A
   *  region, not a grid** — how many rows and columns that is is a question
   *  about cell sizes, and the consumer is where those live. */
  onSweep?: (box: { x: number; y: number; w: number; h: number }) => void;
  onAdjust?: (adjust: Adjust) => void;
  /** What is selected now — a click, a shift-sweep and a modifier-click all
   *  arrive here and nowhere else. */
  onPick?: (ids: string[]) => void;
  /** Which cells are picked. **Beside the ids, never among them** — a cell has
   *  no id, so it cannot ride in a node selection. */
  cells?: readonly Spot[];
  /** What the app is saying, shown over the drawing rather than beside it. */
  said?: React.ReactNode;
  /** Something dropped onto the drawing from outside it, at the point it
   *  landed. The explorer drags rows; anything else that can set a
   *  `text/mnd-block` payload works the same. */
  onDrop?: (id: string, at: Point) => void;
  /** Which name is being typed in place, and what was typed. **A name is
   *  edited where it is read**, so the field is drawn on the thing it names
   *  rather than in a dialog over it — and like every other gesture the canvas
   *  says what was typed and never writes it. A `null` label is a name left as
   *  it was. */
  naming?: string | null;
  onNamed?: (label: string | null) => void;
  /** Chrome the host may turn off — a thumbnail wants none of it. */
  chrome?: boolean;
  /** Whether relationships are read with curves rather than right angles.
   *  Display state: it changes what you are looking at and nothing about the
   *  project, so it arrives as a prop and never enters the log. */
  curved?: boolean;
};

/** **Fitting frames what is there; it never magnifies.** One small card on a
 *  wide canvas blown up to four times its size is not a view of anything. */
const FIT = { padding: 0.25, maxZoom: 1 };

/** How far a press must travel before it is a drag rather than a click that
 *  shook on the way down. */
const NUDGE = 5;

/** The band left around a layer's frame, in screen pixels. **It is where you
 *  double click to leave**, so it is the same on every side of every layer and
 *  a frame is never fitted tighter than this. */
const BAND = 56;

/** Long enough to read as one motion, short enough not to be waited on.
 *  **A nesting doll opening is the slowest thing in the product**, and it was
 *  over before it registered at half this. */
const FLIGHT = 440;

/** Whether the camera should not travel. Asked rather than stored: it is a
 *  setting somebody can change while the app is open. */
const still = () => typeof matchMedia === "function"
  && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** What React Flow is told it may shrink to, kept here so a flight that starts
 *  on a small card starts somewhere the viewport will actually go. */
const MIN_ZOOM = 0.1;

/** The four walls, in the order they are drawn. */
const SIDES: readonly Side[] = ["top", "right", "bottom", "left"];

/** **What sits in front of what, said once.**
 *
 *  Four bands, and every one of them is a statement about the notation: the
 *  room is behind everything, a boundary is a wash behind what it holds, lines
 *  and cards are the drawing, and an interface is on a card's border so it is
 *  in front of the card. Relationships are not nodes — the stylesheet puts
 *  their layer at `LINES`, which is the one place the two scales meet.
 *
 *  **Nothing else may reorder this.** React Flow lifts whatever is selected by
 *  a thousand, which put a picked card in front of its own interfaces and in
 *  front of every other card on the layer — so that is turned off and this
 *  table is the whole of the answer. */
const DEPTH: Record<string, number> = {
  frame: 0, group: 1, card: 3, control: 3, seat: 4,
};

/** The layer's working area, shaped like the panel it is shown in.
 *
 *  **A frame hugging its contents is not a room to work in.** A projection is
 *  headless and can only say what the layer holds; fitted, two cards in a wide
 *  layer come out as a small box magnified — the same picture, everything
 *  twice the size and no more room to put anything. So the hug is grown to the
 *  panel's shape and floored to its size, which is what leaves the same band
 *  on every side once it is fitted, and gives a sparse layer somewhere to work.
 *
 *  **Here rather than in the projection** because the panel's shape is a fact
 *  about a window, and `views` is not allowed to know about one. */
function panelled(frame: Frame, seen: { w: number; h: number }): Frame {
  const room = { w: seen.w - BAND * 2, h: seen.h - BAND * 2 };
  if (room.w <= 0 || room.h <= 0) return frame;
  const shape = room.w / room.h;
  let { w, h } = frame;
  w / h > shape ? (h = w / shape) : (w = h * shape);
  const floor = Math.max(1, room.w / w, room.h / h);
  w = snap(w * floor);
  h = snap(h * floor);
  return { ...frame,
           x: snap(frame.x + frame.w / 2 - w / 2),
           y: snap(frame.y + frame.h / 2 - h / 2), w, h };
}

/** Where a line meets the room's own wall.
 *
 *  **Worked out here because the room is.** The projection puts the frame round
 *  what the layer holds; this grows it to the panel, so a fraction along a wall
 *  decided back there lands somewhere else entirely once the wall has been
 *  stretched — which is a line to the layer leaving a card straight and then
 *  jogging to meet a point that moved. A run between a card and the layer it is
 *  in should go straight out, so the point on the wall is the card's own perch
 *  carried across.
 *
 *  **The other end only.** Where that end is an interface it has a seat of its
 *  own and nothing here can improve on it. */
function met_on(room: Frame, scene: Scene): Frame {
  if (!room.seats?.length) return room;
  const box = new Map(scene.nodes.map((n) => [n.id, box_of(n)]));
  const opposite = new Map<string, Point>();
  for (const p of scene.perches) {
    /** **A seat somebody dragged is not one to work out again.** */
    if (p.on !== FRAME || p.pinned) continue;
    const mate = scene.perches.find((q) => q.edge === p.edge && q.end !== p.end);
    const on = mate && box.get(mate.on);
    if (!mate || !on) continue;
    opposite.set(perch_id(p.edge, p.end), middle(on, mate));
  }
  if (!opposite.size) return room;
  return { ...room, seats: room.seats.map((t) => {
    const to = opposite.get(t.id);
    if (!to) return t;
    const along = t.side === "left" || t.side === "right"
      ? (to.y - room.y) / (room.h || 1)
      : (to.x - room.x) / (room.w || 1);
    return { ...t, at: Math.min(0.98, Math.max(0.02, along)) };
  }) };
}

/** The projection's nodes, plus the two things it cannot know: what the app has
 *  selected, and how deep each one sits. */
function nodes_of(scene: Scene, picked: readonly Id[], frame: Frame | null): BoxNode[] {
  const out: BoxNode[] = frame ? [{
    id: FRAME,
    type: "frame",
    position: { x: frame.x, y: frame.y },
    width: frame.w,
    height: frame.h,
    data: { label: frame.label, marks: [],
            ...(frame.role ? { role: frame.role } : {}),
            ...(frame.side ? { side: frame.side } : {}),
            ...(frame.seats ? { seats: frame.seats } : {}) },
    draggable: false,
    selectable: false,
    focusable: false,
    zIndex: DEPTH["frame"],
  }] : [];

  /** The layer's own interfaces, set into the room's walls. **Placed here
   *  because the room is**: the projection said which wall and how far along,
   *  and the panel decides where that wall actually runs. */
  for (const p of frame?.ports ?? []) {
    const at = at_seat(frame!, { side: p.side, at: p.at });
    out.push({
      id: p.id,
      type: "seat",
      position: { x: at.x, y: at.y },
      width: at.w,
      height: at.h,
      data: { label: p.label, marks: p.marks, on: FRAME, side: p.side,
              ...(p.look ? { look: p.look } : {}) },
      selected: picked.includes(p.id),
      zIndex: DEPTH["seat"],
      measured: { width: at.w, height: at.h },
    });
  }

  for (const n of scene.nodes) {
    out.push({
      ...n,
      selected: picked.includes(n.id),
      zIndex: DEPTH[n.type ?? "card"] ?? 1,
      /** **Told, not measured.** The projection already decided how big this
       *  is, so saying so up front lets an edge route on the first frame
       *  rather than after a resize observation. */
      measured: { width: n.width, height: n.height },
    });
  }
  return out;
}

/** How a relationship reads, from what it is. **Weight and dash, never a hue**
 *  — a definition's slot is what colour means on this canvas, and a line
 *  borrowing one would be saying something the vocabulary already says. */
const READS: Record<string, string> = {
  line: "line", directed: "directed", reference: "line dashed", tie: "line tie",
};

/** **Which seat each end meets is the projection's**, and arrives on the edge
 *  already — so nothing here chooses a point on a border. */
function edges_of(scene: Scene, picked: readonly Id[], curved: boolean): LineEdge[] {
  return scene.edges.map((e) => {
    const d = e.data;
    const forward = d?.dir === "forward" || d?.dir === "both" || d?.module === "directed";
    const back = d?.dir === "back" || d?.dir === "both";
    return {
      ...e,
      type: "wire",
      data: { ...(d ?? { module: "line" as const, dir: "none" as const }), curved },
      selected: picked.includes(e.id),
      className: READS[d?.module ?? "line"] ?? "line",
      /** **The end is taken hold of by its own grip**, which appears when the
       *  line is picked. The library's anchors sit on the same two points and
       *  cannot be told apart from it. */
      reconnectable: false,
      markerEnd: forward ? { type: "arrowclosed" as const } : undefined,
      markerStart: back ? { type: "arrowclosed" as const } : undefined,
    };
  });
}

/** What was under a pointer, by the id React Flow reported. **The frame's own
 *  name is its own region** — a name is renamed where it is read, so a double
 *  click on it means the layer rather than the ground behind it. */
function kind_of(scene: Scene, id: string | null,
                 target?: EventTarget | null): Gesture["kind"] {
  if (!id) return "empty";
  const el = target instanceof Element ? target : null;
  if (id === FRAME) return el?.closest(".mnd-frame-name") ? "title" : "frame";
  /** **A name is renamed where it is read.** It is its own target wherever it
   *  is drawn — on a card, along a boundary, on a chip inside a container, off
   *  to one side of a relationship — the same way the room's name always was,
   *  so there is one gesture for it and not one per surface. Before the line
   *  it belongs to, because a relationship's name is the one that is drawn
   *  away from the thing it names. */
  if (el?.closest(NAMES)) return "name";
  if (scene.edges.some((e) => e.id === id)) return "route";
  /** **A card's border is a wall, not the card.** The body is the block; the
   *  border is where an interface goes, and the pointer is precise enough to
   *  tell the two apart. */
  if (el?.closest(".mnd-brim")) return "brim";
  if (scene.frame?.ports.some((p) => p.id === id)) return "seat";
  /** **A cell is its own target.** It has no id, so it is not a node and could
   *  never be reported as one — what is under the pointer is the grid, and
   *  which cell is read back off the DOM. */
  if (el?.closest(".mnd-grid-cell")) return "cell";
  const node = scene.nodes.find((n) => n.id === id);
  /** **A boundary is not a block you can go into.** It is a band drawn round
   *  blocks that already live here, so it has no layer of its own to open and
   *  no border for a line to end on — and saying so here is what keeps every
   *  surface from having to work it out again from a mark. */
  if (node?.type === "group") return "band";
  /** **A note is not a block you can go into.** It is a remark left on this
   *  layer — there is nothing inside it and nothing to put there, so two
   *  clicks on one mean what they mean on every other name: edit the text,
   *  which is the whole of what a note is. */
  if (node?.type === "note") return "note";
  return node?.data.on ? "seat" : "box";
}

/** Everywhere a name is drawn on a card. A note is not among them — a note
 *  *is* its text, so the card is the target and there is nothing narrower on
 *  it to aim at. */
const NAMES = ".mnd-label, .mnd-group-name, .mnd-tag, .mnd-wire-text";

/** What in a Scene would change the drawing. **Identity is no use** — a
 *  projection is a pure function run on every render, so the object is new
 *  every time and anything watching it would reset the canvas continuously.
 *
 *  **What is selected is not in here.** Rebuilding the arrays throws away
 *  React Flow's own copy of the selection, which it then reports back — so a
 *  signature that moved with the selection had the two mirroring each other a
 *  render apart, for ever. Structure rebuilds the arrays; a pick only ever
 *  touches the flag. */
function signature(scene: Scene, frame: Frame | null): string {
  return [
    scene.layer,
    frame && `${frame.x},${frame.y},${frame.w},${frame.h},${frame.label},${frame.role ?? ""}`
      + `,${frame.side ?? ""}`,
    frame?.seats?.map((t) => `${t.id}${t.side}${t.at}`).join("|"),
    frame?.ports.map((p) => `${p.id}${p.side}${p.at}${p.marks.join("")}`).join("|"),
    scene.nodes.map((n) => {
      const b = box_of(n);
      const k = n.data.look;
      /** **Everything the card draws from, not only where it sits.** Retyping a
       *  block moves nothing and renames nothing; what it changes is the look,
       *  and a signature blind to that leaves the old card on the canvas. */
      return [
        n.id, n.type, `${b.x},${b.y},${b.w},${b.h}`, n.data.label,
        n.data.marks.join(""), n.data.side ?? "",
        k && `${k.slot}${k.emphasis}${k.weight}${k.voice}${k.shape}${k.label}${k.kind ?? ""}`,
        n.data.cells?.map((c) => `${c.id}${c.kind}${c.tint}${c.rest ?? ""}`).join(""),
        /** **The lattice is what a grid draws.** Merging, splitting or adding a
         *  line moves nothing and renames nothing; what it changes is the
         *  cells, and a signature blind to them left the old grid drawn. */
        n.data.grid?.map((c) => `${c.r},${c.c},${c.w},${c.h}${c.marks.join("")}`).join(""),
        n.data.fields?.map((f) => `${f.name}=${f.value}`).join(""),
        /** **Where a line meets this card is part of what it draws.** Pinning
         *  an end to another wall moves nothing and renames nothing; what it
         *  moves is a handle, and a signature blind to that leaves the line
         *  entering where it used to. */
        n.data.seats?.map((t) => `${t.id}${t.side}${t.at}`).join(""),
      ].join(":");
    }).join("|"),
    scene.edges.map((e) =>
      `${e.id}:${e.source}>${e.target}:${e.data?.dir}:${e.data?.module}:${e.label ?? ""}`)
      .join("|"),
  ].join("~");
}

/** What is selected, as a value — so an effect can watch it without watching
 *  the array it arrived in. */
function chosen(picked: readonly Id[]): string {
  return [...picked].sort().join(",");
}

/** The same set, marked onto whichever of React Flow's own rows disagree.
 *  Untouched rows keep their identity, so nothing else about them is
 *  disturbed and a node that agrees is not re-rendered. */
function marked<T extends { id: string; selected?: boolean }>(
  rows: T[], want: Set<string>,
): T[] {
  return rows.some((r) => (r.selected ?? false) !== want.has(r.id))
    ? rows.map((r) => ((r.selected ?? false) === want.has(r.id)
        ? r : { ...r, selected: want.has(r.id) }))
    : rows;
}

/** Where a line's end is taken hold of, and where a hidden interface says it
 *  is still there.
 *
 *  **Both come and go with the selection**, which is why neither is a node: an
 *  array rebuilt every time anything is picked is the churn the canvas was
 *  memoised to stop. They are drawn into the viewport instead, so they pan and
 *  zoom with the drawing and cost nothing when nothing is picked. */
type Grip = { key: string; edge: string; end: "from" | "to"; on: string;
              side: Side; at: number; x: number; y: number };

/** The same rectangle, as the attributes an SVG rect wants. */
function box_svg(d: { from: Point; to: Point }) {
  const b = spread(d.from, d.to);
  return { x: b.x, y: b.y, width: b.w, height: b.h };
}

/** The rectangle two points make, whichever way round they were drawn. */
function spread(a: Point, b: Point): { x: number; y: number; w: number; h: number } {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y),
           w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}

/** How a relationship would run between these two without a bend.
 *
 *  **A straight run is one both borders can reach.** Where the two boxes
 *  overlap across the run there is a band a line crosses without a jog, and the
 *  middle of that band is where both ends go — said as a fraction of each
 *  border, because that is what a pinned end stores.
 *
 *  **Where they overlap nowhere, nothing about the line can straighten it**, so
 *  the far block is lined up with the near one. That is the thing you would
 *  otherwise do by hand, and it is a move like any other — snapped to the grid
 *  first, so the ends are pinned to where the card will actually be. */
function straight(a: Rect, b: Rect, movable: boolean, along?: "x" | "y") {
  /** Along whichever axis the two stand further apart: that is the way the run
   *  already goes, and turning it round would move the line rather than
   *  straighten it. **Unless an end says.** A line meeting an interface leaves
   *  by that interface's own wall, so the way the run goes was decided when the
   *  port was put there — free to pick for itself, this lined a card up under a
   *  port set into a side wall and left the run to curl round to reach it. */
  const apart = { x: Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w)),
                  y: Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h)) };
  const across = along ? along === "x" : apart.x >= apart.y;
  const lo = across ? Math.max(a.y, b.y) : Math.max(a.x, b.x);
  const hi = across ? Math.min(a.y + a.h, b.y + b.h) : Math.min(a.x + a.w, b.x + b.w);

  let box = b;
  let by: { dx: number; dy: number } | undefined;
  if (hi <= lo) {
    if (!movable) return null;
    /** **Middle to middle, and not rounded.** The far end may be a port eleven
     *  pixels across while a cell is twenty-four, so rounding the answer to the
     *  grid could push the two ends further apart than either is wide and leave
     *  nothing to line up — which is why straightening did nothing at all on
     *  every line between two interfaces. The block that actually moves is on
     *  the grid, and it moves by the gap between the two ends, so it lands back
     *  on the grid wherever the two ends sit alike on their own cards. */
    const want = across ? { x: b.x, y: a.y + a.h / 2 - b.h / 2 }
                        : { x: a.x + a.w / 2 - b.w / 2, y: b.y };
    by = { dx: want.x - b.x, dy: want.y - b.y };
    box = { ...b, ...want };
  }
  const band = across
    ? [Math.max(a.y, box.y), Math.min(a.y + a.h, box.y + box.h)]
    : [Math.max(a.x, box.x), Math.min(a.x + a.w, box.x + box.w)];
  if (band[1]! <= band[0]!) return null;
  const meet = (band[0]! + band[1]!) / 2;

  const ahead = across ? box.x + box.w / 2 >= a.x + a.w / 2
                       : box.y + box.h / 2 >= a.y + a.h / 2;
  const walls: [Side, Side] = across ? (ahead ? ["right", "left"] : ["left", "right"])
                                     : (ahead ? ["bottom", "top"] : ["top", "bottom"]);
  return {
    fromSide: walls[0], toSide: walls[1],
    fromAt: across ? (meet - a.y) / a.h : (meet - a.x) / a.w,
    toAt: across ? (meet - box.y) / box.h : (meet - box.x) / box.w,
    ...(by ? { by } : {}),
  };
}

/** How a relationship would have to be pinned to run straight, and the block
 *  that has to shift for it where one does.
 *
 *  **Either end may be the one that moves.** A line to an interface or to the
 *  layer itself has one end that cannot go anywhere — a port belongs to its
 *  card and the room is grown to the panel — so the other end is aligned to it
 *  instead. Only where neither end can move is there nothing to offer. */
function straightened(scene: Scene, frame: Frame | null, edge: string) {
  const e = scene.edges.find((x) => x.id === edge);
  if (!e) return null;
  const box = (id: string) => {
    if (id === FRAME) return frame;
    const n = scene.nodes.find((x) => x.id === id);
    return n ? box_of(n) : null;
  };
  /** Which block would move for this end to line up.
   *
   *  **A port moves by moving the card it is on.** An interface has no place of
   *  its own — it is seated on a border — so lining one up is sliding the whole
   *  card, which is what you would do by hand. A boundary has no place either
   *  and the room is not a block at all, so neither can be the one that moves. */
  const mover = (id: string): string | null => {
    const n = scene.nodes.find((x) => x.id === id);
    if (!n || id === FRAME || n.type === "group" || n.selectable === false) return null;
    const host = n.data.on ? scene.nodes.find((x) => x.id === n.data.on) : n;
    return host && host.id !== FRAME && host.type !== "group" ? host.id : null;
  };
  const from = box(e.source);
  const to = box(e.target);
  if (!from || !to) return null;
  /** **A line to the layer runs out of one wall of the card and into the same
   *  wall of the room.** Which wall the room end meets is whichever rim the
   *  line was drawn to, and the card end works its own out — so the two can
   *  disagree, and a run that could have been one straight segment goes out of
   *  the left of a card to meet the ceiling. Straightening it is agreeing:
   *  both take the wall the card is nearest, and nothing has to move. */
  if (e.source === FRAME || e.target === FRAME) {
    if (!frame) return null;
    const card = e.source === FRAME ? to : from;
    const wall = inner(frame, card);
    const down = wall === "left" || wall === "right";
    const meet = down ? card.y + card.h / 2 : card.x + card.w / 2;
    const along = down ? (meet - frame.y) / (frame.h || 1)
                       : (meet - frame.x) / (frame.w || 1);
    const room = Math.min(0.98, Math.max(0.02, along));
    return e.source === FRAME
      ? { fromSide: wall, fromAt: room, toSide: wall, toAt: 0.5 }
      : { fromSide: wall, fromAt: 0.5, toSide: wall, toAt: room };
  }

  /** Which way the run has to go, where an end has already said. */
  const wall = (id: string) => {
    const n = scene.nodes.find((x) => x.id === id);
    return n?.data.on ? n.data.side : undefined;
  };
  const set = wall(e.source) ?? wall(e.target);
  const along = set ? (set === "left" || set === "right" ? "x" : "y") : undefined;

  /** Where a move is called for, it is the mover's own box that shifts — the
   *  end may be a port, and a port travels with its card. */
  const shifted = (end: string, by: { dx: number; dy: number }) => {
    const id = mover(end);
    const n = id ? scene.nodes.find((x) => x.id === id) : null;
    if (!id || !n) return {};
    const b = box_of(n);
    return { align: id, x: b.x + by.dx, y: b.y + by.dy };
  };

  const ahead = straight(from, to, !!mover(e.target), along);
  if (ahead) {
    return { fromSide: ahead.fromSide, fromAt: ahead.fromAt,
             toSide: ahead.toSide, toAt: ahead.toAt,
             ...(ahead.by ? shifted(e.target, ahead.by) : {}) };
  }
  /** Nothing at the far end could move, so line the near end up instead. The
   *  two answers come back the other way round and are put back in order. */
  const back = straight(to, from, !!mover(e.source), along);
  if (!back) return null;
  return { fromSide: back.toSide, fromAt: back.toAt,
           toSide: back.fromSide, toAt: back.fromAt,
           ...(back.by ? shifted(e.source, back.by) : {}) };
}

/** Which wall of the room a box standing in it is nearest — and so the wall
 *  it should leave by, since the other end meets the same one. */
function inner(room: Rect, box: Rect): Side {
  const gap: Record<Side, number> = {
    left: box.x - room.x,
    right: (room.x + room.w) - (box.x + box.w),
    top: box.y - room.y,
    bottom: (room.y + room.h) - (box.y + box.h),
  };
  return (["left", "right", "top", "bottom"] as const)
    .reduce((a, b) => (gap[b] < gap[a] ? b : a));
}

/** The same boxes, moved by the same amount. **Only what is placed** — a seat
 *  is worked out from the card it sits on and re-seats itself. */
function shifted(nodes: readonly BoxNode[], by: Point) {
  return nodes.filter((n) => n.type !== "seat").map((n) => {
    const b = box_of(n);
    return { id: n.id, to: { x: b.x + by.x, y: b.y + by.y } };
  });
}

/** The middle of a seat, in scene coordinates. */
function middle(box: { x: number; y: number; w: number; h: number },
                seat: { side: Side; at: number }): Point {
  const r = at_seat(box, seat);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

function Canvas(props: FlowViewProps) {
  const { scene, picked = [], onGesture, onRelate, onSweep, onAdjust, onPick, onDrop,
          said, chrome = true, curved = false } = props;
  const flow = useReactFlow();
  /** What the stable callbacks below read instead of closing over a render. */
  const latest = useRef({ picked, onPick, key: "" });

  /** How much room there is to draw in. React Flow measures its own container,
   *  so the frame is shaped to the panel without a second observer. */
  const seen = useStore(useCallback((st) => ({ w: st.width, h: st.height }), []),
                        (a, b) => a.w === b.w && a.h === b.h);
  /** The room this layer is being worked in. **Kept until it stops holding
   *  the work**, rather than recomputed from the contents each time: the
   *  projection centres its frame on what the layer holds, so a room derived
   *  straight from it would slide half a card's width every time anything
   *  moved, and the camera would chase it. A new one is worked out when the
   *  layer changes, when the panel is resized, or when the work no longer fits
   *  — which is the only time more room is what you actually wanted. */
  const kept = useRef<{ of: Id | null; seen: string; room: Frame } | null>(null);
  const frame = useMemo(() => {
    const f = scene.frame;
    if (!f) { kept.current = null; return null; }
    const held = kept.current;
    const seen_key = `${seen.w}x${seen.h}`;
    const holds = held !== null && held.of === scene.layer && held.seen === seen_key
      && f.x >= held.room.x && f.y >= held.room.y
      && f.x + f.w <= held.room.x + held.room.w
      && f.y + f.h <= held.room.y + held.room.h;
    const room = holds
      ? { ...held!.room, label: f.label, ports: f.ports,
          ...(f.side ? { side: f.side } : {}), ...(f.seats ? { seats: f.seats } : {}) }
      : panelled(f, seen);
    kept.current = { of: scene.layer, seen: seen_key, room };
    return met_on(room, scene);
  }, [scene, seen]);

  /** **The band is the same on every side, whatever the layer holds.** The
   *  frame is already shaped like the panel, so one fraction of it leaves the
   *  same margin on both axes — and that margin is the ground you double click
   *  to come back out. Without a frame there is nothing to leave room around,
   *  so a plain fit does. */
  const fit = useMemo(() => (frame && seen.w > BAND * 2
    ? { padding: (BAND * 2) / (seen.w - BAND * 2), maxZoom: 1 }
    : FIT), [frame, seen.w]);

  /** **Draw the drawing again, without pretending the model moved.**
   *
   *  A seat's place is derived — a wall and a fraction along it — so where the
   *  pointer let go of one is not a position anybody stores. Where the drop
   *  changes nothing (dropped back on the wall it was already on, or on a wall
   *  it cannot take), the projection comes back identical, nothing re-installs
   *  the arrays, and the library goes on drawing the port where it was dragged
   *  to: adrift inside the card. */
  const [resync, again] = useState(0);

  /** **React Flow keeps its own copy, and we keep ours in step with it.**
   *  It has bookkeeping on that array that nothing here can reproduce — what
   *  each node measured, what is mid-drag — and handing it a fresh array every
   *  render without ever applying a change throws that away. */
  const [nodes, set_nodes, moved] = useNodesState<BoxNode>(nodes_of(scene, picked, frame));
  /** **The third of these is not optional.** React Flow reports a selection as
   *  a change and applies nothing itself; dropping the handler left every edge
   *  change — a click on a line above all — dispatched into nothing, so a
   *  relationship could not be picked at all. */
  const [edges, set_edges, rewired] = useEdgesState<LineEdge>(edges_of(scene, picked, curved));
  const key = `${signature(scene, frame)}~${curved ? "curve" : "angle"}~${resync}`;
  latest.current = { picked, onPick, key };

  /** **Which drawing the arrays on the canvas are of.** Until the effect below
   *  has installed the new ones they are still the last layer's, and what they
   *  say about the selection is about a drawing nobody is looking at. */
  const installed = useRef(key);

  /** **What the canvas last told us was selected.**
   *
   *  Selection lives in two places — the app's log and React Flow's own copy —
   *  and the write that keeps causing trouble is the echo: the canvas reports a
   *  pick, the app records it, and the app then writes it straight back to the
   *  canvas that just made it. Damping that with a guard leaves the ring in
   *  place. Remembering what came *from* the canvas removes it: a pick the
   *  canvas already knows about is never written back, and only a pick made
   *  somewhere else — the tree, the keyboard, the question loop — travels
   *  inward. One direction each, and no cycle to break. */
  const reported = useRef(chosen(picked));

  /** **The nesting-doll transition, and the only animation in the product.**
   *
   *  Descending into a container flies the camera in from where that card was;
   *  coming back out flies from where the layer you left now sits. The viewport
   *  is React Flow's, so the interpolation is too — the hand-rolled camera that
   *  used to do this was a second thing animating one transform, which is why
   *  it never settled.
   *
   *  Interruptible and skippable come free: a second descent retargets the same
   *  camera, and reduced motion asks for no duration at all. */
  const was = useRef<Id | null | undefined>(undefined);
  /** How big the room was. **A frame that grew is a frame to be fitted again**
   *  — it is sized to the panel, so leaving the camera where it was would put
   *  the band on one side and nothing on the other. */
  const room = useRef<string>("");
  /** What was drawn a moment ago. **Descending needs the layer you left**: the
   *  card you opened is drawn there and nowhere else, so it is the only place
   *  the flight can start from. */
  const drawn = useRef<readonly BoxNode[]>([]);

  /** Frame the working area, leaving the band. **Aimed at the rectangle rather
   *  than at what is on the canvas**: the arrays are handed over in the same
   *  effect that asks for this, and React Flow has not measured them yet — so
   *  fitting *nodes* here fits the layer you just left. The frame's rectangle
   *  is known without asking anybody. */
  const settle = useCallback((duration: number) => {
    if (!frame) { void flow.fitView({ ...FIT, duration }); return; }
    void flow.fitBounds({ x: frame.x, y: frame.y, width: frame.w, height: frame.h },
                        { padding: fit.padding, duration });
  }, [flow, frame, fit]);

  useEffect(() => {
    const quiet = still();
    const last = was.current;
    const moved_layer = last !== undefined && last !== scene.layer;
    const rect = frame ? `${frame.x},${frame.y},${frame.w},${frame.h}` : "";
    const grew = !moved_layer && room.current !== rect;
    was.current = scene.layer;
    room.current = rect;

    const before = drawn.current;
    drawn.current = scene.nodes;
    set_nodes(nodes_of(scene, picked, frame));
    set_edges(edges_of(scene, picked, curved));
    installed.current = key;
    reported.current = chosen(picked);

    if (grew) { settle(quiet ? 0 : FLIGHT); return; }
    if (!moved_layer) return;
    if (quiet) { settle(0); return; }
    /** **Both ways start on the card, and both end on the frame.**
     *
     *  Coming back up, the card is the layer you just left, drawn here — so
     *  `fitBounds` on it puts the camera where you were and the fit opens out.
     *
     *  Going down, the card is drawn in the layer you left and not in this one,
     *  so there is no rectangle here to aim at. What there is, still, is the
     *  viewport that was showing it: the card's place on the screen is known,
     *  and the new frame is put there before the fit pulls it open. Without
     *  this the camera has nowhere to travel from and descending cuts. */
    const back = last ? scene.nodes.find((n) => n.id === last) : undefined;
    const into = before.find((n) => n.id === scene.layer);
    if (back) {
      const b = box_of(back);
      void flow.fitBounds({ x: b.x, y: b.y, width: b.w, height: b.h }, { duration: 0 });
    } else if (into && frame) {
      const b = box_of(into);
      const vp = flow.getViewport();
      const on = { x: b.x * vp.zoom + vp.x, y: b.y * vp.zoom + vp.y,
                   w: b.w * vp.zoom, h: b.h * vp.zoom };
      const zoom = Math.max(MIN_ZOOM, on.w / frame.w);
      void flow.setViewport({
        zoom,
        x: on.x - frame.x * zoom,
        y: (on.y + on.h / 2) - (frame.y + frame.h / 2) * zoom,
      }, { duration: 0 });
    }
    settle(FLIGHT);
    /** The signature is what says the drawing changed; the scene object never
     *  repeats, so watching it would reset the canvas on every render. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /** **A layer with no frame has no room to grow, so the camera is the room.**
   *
   *  A framed layer is fitted again whenever the room outgrows what it held —
   *  the rectangle is the thing that changed and the camera follows it. The
   *  workspace has no such rectangle, so a card put down past the edge of the
   *  view was simply not there, and nothing said the drawing had got bigger.
   *  What says it here is what the drawing takes up: when that changes and no
   *  longer fits what is on screen, the camera opens out.
   *
   *  **Only when it changes**, and never mid-drag. Asked on every render it
   *  would pull the camera out of a close-up on any click, which is a fight
   *  rather than a fit. And it watches the installed nodes rather than the
   *  scene, because that is when React Flow's own copy is in step with what it
   *  is being asked to fit.  */
  const took = useRef<{ of: Id | null; box: string } | null>(null);
  useEffect(() => {
    if (frame || !nodes.length || nodes.some((n) => n.dragging)) return;
    const box = extent(scene);
    const size = `${box.x},${box.y},${box.w},${box.h}`;
    const before = took.current;
    took.current = { of: scene.layer, box: size };
    if (!before || before.of !== scene.layer || before.box === size) return;
    const vp = flow.getViewport();
    const shown = { x: -vp.x / vp.zoom, y: -vp.y / vp.zoom,
                    w: seen.w / vp.zoom, h: seen.h / vp.zoom };
    const fits = box.x >= shown.x && box.y >= shown.y
      && box.x + box.w <= shown.x + shown.w && box.y + box.h <= shown.y + shown.h;
    if (fits) return;
    void flow.fitView({ ...FIT, duration: still() ? 0 : FLIGHT });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, frame]);

  /** **A pick made somewhere else, put onto the canvas.** The tree and the
   *  question loop both select, and neither goes through React Flow — so the
   *  flag is written here, and only onto the rows that disagree. A pick made
   *  *on* the canvas arrives already agreed with and writes nothing, which is
   *  what stops the two copies from echoing each other. */
  const held = chosen(picked);
  useEffect(() => {
    if (held === reported.current) return;
    reported.current = held;
    const want = new Set<string>(picked);
    set_nodes((ns) => marked(ns, want));
    set_edges((es) => marked(es, want));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [held]);

  /** Where the pointer is, on the drawing.
   *
   *  **Not snapped.** The library rounds this to the snap grid unless told not
   *  to, and a cell is two thirds of a card's height — so every question the
   *  pointer answers came back in thirds. Which wall of a card you aimed at is
   *  read from how far out of its middle the point falls, and a press an inch
   *  below a card's bottom edge rounded up to two thirds of the way down and
   *  answered *right*. Placing still snaps, where placing is what is meant. */
  const at = useCallback((e: { clientX: number; clientY: number }): Point =>
    flow.screenToFlowPosition({ x: e.clientX, y: e.clientY }, { snapToGrid: false }),
    [flow]);

  const say = useCallback((on: string | null, e: React.MouseEvent,
                          button: "left" | "right", count: 1 | 2) => {
    /** The press that drew something is not also a click on what it began on. */
    if (swallow.current) return;
    const kind = kind_of(scene, on, e.target);
    /** Which wall, and where along it. **A border is a place, not a thing** —
     *  so an action that puts something on one is offered the answer rather
     *  than left to default to the right wall of everything. */
    const box = kind === "frame" ? frame
      : kind === "box" || kind === "brim" ? scene.nodes.find((n) => n.id === on) : null;
    const seat = box ? nearest_seat("w" in box ? box : box_of(box as BoxNode), at(e)) : null;
    /** **What only the drawing knows.** A wall and a fraction for a border you
     *  pointed at; for a relationship, where its two ends would have to meet to
     *  run straight — neither is anywhere in the graph. */
    const bend = kind === "route" && on ? straightened(scene, frame, on) : null;
    /** **A cell is a group plus an address**, and nothing else could say which
     *  — so the address the DOM was drawn with is handed on as it is. */
    const el_at = e.target instanceof Element
      ? e.target.closest(".mnd-grid-cell")?.getAttribute("data-at") : null;
    const spot = kind === "cell" && el_at && on
      ? { group: on, r: Number(el_at.split(",")[0]), c: Number(el_at.split(",")[1]) }
      : null;
    const given = spot ?? (seat
      ? { side: seat.side, at: seat.at, ...(kind === "brim" ? { owner: on } : {}) }
      : bend);
    /** A chip stands for a block one layer down, so the name on it is that
     *  block's and not the card's it is drawn inside. */
    const el = e.target instanceof Element ? e.target : null;
    const chip = kind === "name" ? el?.closest("[data-cell]")?.getAttribute("data-cell") : null;
    onGesture?.({
      on: kind === "title" || kind === "frame" ? scene.layer : chip ?? on,
      kind, button, count, at: at(e), screen: { x: e.clientX, y: e.clientY },
      ...(e.shiftKey ? { shift: true } : {}),
      ...(given ? { given } : {}),
    });
  }, [onGesture, scene, at, frame]);

  /** The same thing a gesture says, said without a pointer behind it. **A
   *  control that descends is the double click, spelled out** — so the vocabulary
   *  stays one thing and nobody downstream learns a second way to be asked. */
  const tell = useCallback((on: string, count: 1 | 2) => {
    const n = scene.nodes.find((x) => x.id === on);
    const b = n ? box_of(n) : { x: 0, y: 0, w: 0, h: 0 };
    const p = flow.flowToScreenPosition({ x: b.x, y: b.y });
    onGesture?.({ on, kind: kind_of(scene, on), button: "left", count,
                  at: { x: b.x, y: b.y }, screen: p });
  }, [scene, flow, onGesture]);

  /** **The right button draws.** Dragging from a card makes a relationship and
   *  dragging across empty ground makes a note — one button, and what it lands
   *  on says which. React Flow's own connection drag takes the left button only
   *  (its filter is `!event.button`), so this one is ours: a press, a distance,
   *  and what was under each end.
   *
   *  A press that never travels is a click, and a click is the offered list. */
  const drew = useRef<
    { x: number; y: number; on: string | null; side?: Side } | null>(null);
  const [drawing, draw] = useState<
    { from: Point; to: Point; on: string | null } | null>(null);
  /** A drag just ended, so the `contextmenu` that follows it is not a click. */
  const swallow = useRef(false);

  /** Which node a point on the page is over, and which wall of it where that is
   *  the room's own border. **Asked of the DOM rather than of the scene** — the
   *  pointer is already there, and a card drawn over another answers for itself
   *  without anything here sorting by depth. */
  const over = useCallback((x: number, y: number): { on: string | null; side?: Side } => {
    const el = document.elementFromPoint(x, y);
    const rim = el instanceof Element ? el.closest(".mnd-rim") : null;
    if (rim) {
      const side = SIDES.find((s) => rim.classList.contains(`mnd-rim-${s}`));
      return { on: FRAME, ...(side ? { side } : {}) };
    }
    const node = el instanceof Element ? el.closest(".react-flow__node") : null;
    const id = node?.getAttribute("data-id") ?? null;
    /** **A relationship never ends on a boundary.** A band says *these belong
     *  together* and holds no border of its own — so a drag that lets go on one
     *  has let go on the ground it is drawn over. */
    if (id && scene.nodes.some((n) => n.id === id && n.type === "group")) return { on: null };
    return { on: id === FRAME ? null : id };
  }, [scene]);

  const pressed = useCallback((e: React.PointerEvent) => {
    swallow.current = false;
    if (e.button !== 2) return;
    drew.current = { x: e.clientX, y: e.clientY, ...over(e.clientX, e.clientY) };
  }, [over]);

  const moved_to = useCallback((e: React.PointerEvent) => {
    const from = drew.current;
    if (!from) return;
    if (!drawing && Math.hypot(e.clientX - from.x, e.clientY - from.y) < NUDGE) return;
    draw({ from: at({ clientX: from.x, clientY: from.y }), to: at(e), on: from.on });
  }, [drawing, at]);

  const released = useCallback((e: React.PointerEvent) => {
    const from = drew.current;
    drew.current = null;
    const was = drawing;
    draw(null);
    if (!from || e.button !== 2 || !was) return;
    swallow.current = true;
    const to = over(e.clientX, e.clientY);
    /** **A line drawn to or from the wall is a line to or from the layer.** The
     *  frame is the block you are inside, seen from within — so an end let go on
     *  it is an end on that block, which is how a layer is wired to what it
     *  holds. **Both ends**: started on the wall and named by the sentinel, the
     *  relationship was made against a block that does not exist, and it showed
     *  in the list of what is here while nothing drew it. */
    const began = from.on === FRAME ? scene.layer : from.on;
    const landed = to.on === FRAME ? scene.layer : to.on;
    if (began && landed && landed !== began) {
      /** **The wall you let go on is the wall the line meets.** Every other end
       *  works its own out from two rectangles; a room's border is four places
       *  to stand, and aiming at one of them is a statement. */
      onRelate?.(began, landed, {
        ...(from.on === FRAME && from.side ? { fromSide: from.side } : {}),
        ...(to.on === FRAME && to.side ? { toSide: to.side } : {}),
      });
      return;
    }
    if (!from.on && !to.on) onSweep?.(spread(was.from, was.to));
  }, [drawing, over, onRelate, onSweep, at, scene.layer]);

  /** What a card let go here would land on, and it is asked once.
   *
   *  **Two answers, because a drop lands on two sorts of thing** — a block it
   *  came to rest on, which files it inside that block, and a boundary it came
   *  to rest within, which joins that boundary. **A card beats the band it is
   *  standing in**: a boundary is drawn round blocks that already live here, so
   *  a group under the pointer must never take a drop meant for a card inside
   *  it — which is what made dragging one block onto another inside a group
   *  report the group and file the card nowhere. */
  /** What travels with this node when it is dragged.
   *
   *  **A seat travels with the card it sits on**, because the library knows
   *  nothing of the seating and a card dragged alone left its interfaces
   *  standing where they were. **A boundary's members travel with the band**,
   *  because a band is its members' bounds — it has no place of its own, so
   *  dragging it and moving nothing was the only thing it could do. */
  const riders = useCallback((host: BoxNode): BoxNode[] => {
    const held = new Set<string>(host.data.holds ?? []);
    if (held.size) {
      for (const n of scene.nodes) if (n.data.on && held.has(n.data.on)) held.add(n.id);
    }
    return scene.nodes.filter((n) => n.data.on === host.id || held.has(n.id));
  }, [scene]);

  const landing_on = useCallback((id: string, at: Point) => {
    const holds = (n: BoxNode) => {
      const o = box_of(n);
      return at.x >= o.x && at.x <= o.x + o.w && at.y >= o.y && at.y <= o.y + o.h;
    };
    const lands = scene.nodes.filter((n) =>
      n.id !== id && !n.data.on && n.selectable !== false && n.type !== "note" && holds(n));
    const into = lands.find((n) => n.type === "group") ?? null;
    /** **Which cell, where the group is a grid.** The lattice is already on the
     *  node, in the grid's own coordinates, so the address is a lookup rather
     *  than arithmetic anybody could get differently. */
    const box = into ? box_of(into) : null;
    const cell = into && box
      ? into.data.grid?.find((c) => at.x >= box.x + c.x && at.x <= box.x + c.x + c.w
                                 && at.y >= box.y + c.y && at.y <= box.y + c.y + c.h)
      : undefined;
    return { over: lands.find((n) => n.type !== "group") ?? null, into,
             ...(cell ? { cell: { r: cell.r, c: cell.c } } : {}) };
  }, [scene]);

  /** **Where it came to rest, not where the pointer was.** A card grabbed by
   *  its corner lands somewhere the pointer never went, so what it was dropped
   *  *on* is read off the card's own middle. */
  const dropped = useCallback((node: Node, dragged: readonly Node[]) => {
    /** An interface in the room's own wall slides along it, and which wall it
     *  landed in is a question about the room. */
    const port = frame?.ports.find((p) => p.id === node.id);
    if (port && frame) {
      /** **Its middle, not its corner.** A port straddles the wall it is set
       *  into, so reading the corner puts the answer half a port off the
       *  border — enough for a nudge nobody meant to move it to another wall. */
      const seat = nearest_seat(frame, { x: node.position.x + PORT.w / 2,
                                         y: node.position.y + PORT.h / 2 });
      onAdjust?.({ kind: "wall-seat", on: node.id, side: seat.side, at: seat.at });
      again((n) => n + 1);
      return;
    }
    const drawn = scene.nodes.find((n) => n.id === node.id);
    if (!drawn) return;

    /** **An interface is seated, never filed.** Where it sits is worked out
     *  from the card it belongs to, so a drop says which wall it came to rest
     *  against and nothing else — let go over the middle of its own card it
     *  read as *put this inside that*, which is not a thing an interface can
     *  be, and the port stayed where the pointer left it. */
    if (drawn.data.on) {
      onAdjust?.({ kind: "move", on: node.id, to: node.position,
                   over: null, into: null });
      again((n) => n + 1);
      return;
    }
    const b = box_of(drawn);
    const by = { x: node.position.x - b.x, y: node.position.y - b.y };

    /** **A boundary has nowhere of its own to be put down.** It is drawn round
     *  what it holds, so what moved is what it holds — and it is never filed
     *  into anything: a band's middle is nearly always over one of its own
     *  members, so a nudge used to file the boundary inside a card it was
     *  drawn around, where nothing could draw it and the tree did not list it. */
    if (drawn.type === "group") {
      onAdjust?.({ kind: "place", at: shifted(riders(drawn), by) });
      return;
    }

    /** **A sweep dragged is every card of it put down.** The library reports
     *  one gesture and moves them all, so recording only the one under the
     *  hand left the rest to spring back on the next projection. */
    const many = dragged.filter((d) => d.id !== node.id && d.type !== "seat");
    if (many.length) {
      const at = [{ id: node.id, to: node.position },
                  ...many.map((d) => ({ id: d.id, to: d.position }))];
      onAdjust?.({ kind: "place", at });
      return;
    }

    /** **Dropping a card on a card puts it inside**, which is how a container
     *  is made — there is no other gesture for it, and a block that holds
     *  blocks is a container by that fact alone.
     *
     *  Read off the dropped card's own middle rather than the pointer: a card
     *  grabbed by its corner comes to rest somewhere the pointer never went. */
    const land = landing_on(node.id, { x: node.position.x + b.w / 2,
                                       y: node.position.y + b.h / 2 });
    onAdjust?.({ kind: "move", on: node.id, to: node.position,
                 over: land.over?.id ?? null, into: land.into?.id ?? null,
                 ...(land.cell ? { cell: land.cell } : {}) });
  }, [scene, frame, landing_on, riders, onAdjust]);

  /** Selection is the app's to hold, and **this is the only place it is
   *  reported**. Reporting it from the click handler as well would clobber a
   *  multi-selection down to whichever card was touched last. */
  const chose: OnSelectionChangeFunc = useCallback(({ nodes: ns, edges: es }) => {
    /** **Not while the arrays are a layer behind.** Descending swaps the
     *  drawing and the selection in one go, and the canvas reports the old
     *  drawing's selection before it has been handed the new one — taken at
     *  face value that clears the pick that did the descending. */
    const { picked, onPick, key } = latest.current;
    if (installed.current !== key) return;
    const ids = [...ns.map((n) => n.id).filter((id) => id !== FRAME),
                 ...es.map((e) => e.id)];
    /** Said by the canvas, so it is already true of the canvas. */
    reported.current = chosen(ids);
    const same = ids.length === picked.length && ids.every((id) => picked.includes(id));
    if (!same) onPick?.(ids);
    /** **Deliberately never rebuilt.** React Flow re-subscribes when this
     *  changes and calls it again on subscribing, so a callback rebuilt every
     *  render fires on every render — which is the noise that made a settled
     *  selection look like a running one. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Everything React Flow reports about its own copy is applied to its own
   *  copy — that is what keeps a node measured and hittable.
   *
   *  **A corner coming to rest passes through here too.** The resizer is drawn
   *  inside the node, which knows nothing about the app; what it does is report
   *  a dimension change, and the end of one is the gesture worth recording. */
  const changed = useCallback((cs: NodeChange<BoxNode>[]) => {
    /** **An interface travels with the card it is seated on.** It is a node of
     *  its own and the library knows nothing of the seating, so a card dragged
     *  on its own left its interfaces standing where they were — inboard,
     *  outboard, or hidden underneath by the time it came to rest. The move is
     *  the card's; every seat on it gets the same offset. */
    const carried: NodeChange<BoxNode>[] = [];
    /** **Never twice.** A node the library is already moving — the other cards
     *  of a sweep, a seat that happened to be selected too — carries itself,
     *  and adding an offset on top of that is what slid an interface off the
     *  border it is set into. */
    const own = new Set(cs.filter((c) => c.type === "position").map((c) => c.id));
    for (const c of cs) {
      if (c.type !== "position" || !c.position) continue;
      const host = scene.nodes.find((n) => n.id === c.id);
      if (!host) continue;
      const was = box_of(host);
      const dx = c.position.x - was.x;
      const dy = c.position.y - was.y;
      if (!dx && !dy) continue;
      for (const n of riders(host)) {
        if (own.has(n.id)) continue;
        const b = box_of(n);
        carried.push({ id: n.id, type: "position", dragging: c.dragging,
                       position: { x: b.x + dx, y: b.y + dy } });
      }
    }
    moved(carried.length ? [...cs, ...carried] : cs);
    for (const c of cs) {
      if (c.type !== "dimensions" || c.resizing !== false || !c.dimensions) continue;
      const n = scene.nodes.find((x) => x.id === c.id);
      if (!n) continue;
      onAdjust?.({ kind: "size", on: c.id, to: n.position,
                   w: Math.round(c.dimensions.width),
                   h: Math.round(c.dimensions.height) });
    }
  }, [moved, scene, riders, onAdjust]);

  /** Where the ends of the picked relationships sit. **Only the perched ones**
   *  — an end seated on an interface is that interface, which is a block with a
   *  drag of its own and needs no second grip. */
  const grips = useMemo((): Grip[] => {
    if (!picked.length) return [];
    const chosen = new Set(picked);
    const at = new Map(scene.nodes.map((n) => [n.id, box_of(n)]));
    /** **The frame is a border like a card's.** It is grown to the panel here
     *  rather than in the projection, so the room is the rectangle a seat on a
     *  wall is measured against. */
    if (frame) at.set(FRAME, frame);
    /** **Where the line actually meets the room's wall.** A seat on the frame
     *  is worked out again once the room has been grown to the panel — see
     *  `met_on` — so a grip placed from the projection's own answer stood a
     *  long way down the wall from the line it was the end of. */
    const met = new Map((frame?.seats ?? []).map((t) => [t.id, t]));
    const out: Grip[] = [];
    for (const p of scene.perches) {
      if (!chosen.has(p.edge)) continue;
      const box = at.get(p.on);
      if (!box) continue;
      const seat = p.on === FRAME ? met.get(perch_id(p.edge, p.end)) ?? p : p;
      out.push({ key: `${p.edge}-${p.end}`, edge: p.edge, end: p.end, on: p.on,
                 side: seat.side, at: seat.at, ...middle(box, seat) });
    }
    return out;
  }, [scene, picked, frame]);

  /** A hidden interface, saying where it is. **Only while the line tied to it
   *  or the card it sits on is picked** — enough to find a line's end without
   *  turning every square back on, which is what hiding them asked for. */
  const berths = useMemo((): Point[] => {
    if (!picked.length) return [];
    const chosen = new Set(picked);
    const tied = new Set<string>();
    for (const e of scene.edges) {
      if (chosen.has(e.id)) { tied.add(e.source); tied.add(e.target); }
    }
    const out: Point[] = [];
    for (const n of scene.nodes) {
      if (!n.data.marks.includes("berth")) continue;
      if (!tied.has(n.id) && !(n.data.on && chosen.has(n.data.on))) continue;
      const b = box_of(n);
      out.push({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
    }
    return out;
  }, [scene, picked]);

  /** What the card being dragged would land in, while it is being dragged.
   *  **A drop with no target shown is a guess** — you find out where a block
   *  went by letting go of it, which is the wrong moment to find out. */
  const [landing, land] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const dragging = useCallback((node: Node) => {
    const drawn = scene.nodes.find((n) => n.id === node.id);
    if (!drawn) return;
    const b = box_of(drawn);
    /** **The same question the drop asks**, so what is lit is what will happen.
     *  Asked separately, the preview took the first box under the point and lit
     *  the boundary while the drop filed the card into the block inside it. */
    if (drawn.type === "group") { land(null); return; }
    const land_on = landing_on(node.id, { x: node.position.x + b.w / 2,
                                          y: node.position.y + b.h / 2 });
    const on = land_on.over ?? land_on.into;
    land(on ? box_of(on) : null);
  }, [scene, landing_on]);

  /** Which grip is being dragged and where it has got to, so the mark follows
   *  the pointer instead of waiting for the model to catch up. */
  const [grabbed, grab] = useState<{ key: string; at: Point } | null>(null);

  /** Where a grip came to rest. **One drag, and where it lands says which of
   *  the two things it meant**: dropped back on its own card it is a slide, and
   *  the question is the one a seated interface answers — which wall, and how
   *  far along; dropped on something else it is that end taken there.
   *
   *  Two gestures on the same pixel is one too many, which is what the
   *  library's own reconnect anchors were: they sit exactly here, and a drag
   *  fired both a reconnect and a fresh connection. */
  const anchored = useCallback((g: Grip, e: { clientX: number; clientY: number }) => {
    const host = g.on === FRAME ? frame : scene.nodes.find((n) => n.id === g.on);
    if (!host) return;
    const to = at(e);
    /** The innermost thing under the point: a seat drawn over a card is the
     *  one you meant, and it is drawn last. */
    const landed = [...scene.nodes].reverse().find((n) => {
      if (n.id === g.on || n.selectable === false || n.type === "group") return false;
      const b = box_of(n);
      return to.x >= b.x && to.x <= b.x + b.w && to.y >= b.y && to.y <= b.y + b.h;
    });
    if (landed) { onAdjust?.({ kind: "wall", on: g.edge, end: g.end, to: landed.id }); return; }
    const seat = nearest_seat("w" in host ? host : box_of(host as BoxNode), to);
    if (seat.side === g.side && seat.at === g.at) return;
    onAdjust?.({ kind: "anchor", on: g.edge, end: g.end, side: seat.side, at: seat.at });
  }, [scene, at, onAdjust]);

  /** **A card may be put down anywhere; the room grows to hold it.** Bounding
   *  the drag to the frame made the last inch of every drag a fight — the card
   *  stopped against a wall the pointer went straight through, and came to rest
   *  somewhere nobody had put it. The room is worked out from what the layer
   *  holds, so putting something near the edge is how you ask for more of it. */
  /** The one card a toolbar would belong to. **One or none** — a toolbar over
   *  a multi-selection would have to say which card it acted on, and a control
   *  that has to explain itself is the wrong control. */
  const only = useMemo(() => {
    if (picked.length !== 1) return null;
    const n = scene.nodes.find((x) => x.id === picked[0]);
    /** **A boundary has no inside to open, and neither has a note.** One is
     *  its members' bounds and the other is a remark; the control offering to
     *  go into either offered something that could not happen. */
    return n && !n.data.on && n.selectable !== false
      && n.type !== "group" && n.type !== "note" ? n.id : null;
  }, [picked, scene]);

  return (
    <ReactFlow
      className="mnd-flow"
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      onNodesChange={changed}
      onEdgesChange={rewired}
      onSelectionChange={chose}
      fitView
      fitViewOptions={fit}
      minZoom={MIN_ZOOM}
      maxZoom={4}
      onPointerDown={pressed}
      onPointerMove={moved_to}
      onPointerUp={released}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
      onDrop={(e) => {
        const id = e.dataTransfer.getData(DRAGGED);
        if (!id) return;
        e.preventDefault();
        onDrop?.(id, at(e));
      }}
      proOptions={{ hideAttribution: true }}
      /** **Depth is the notation's, not the selection's.** Lifting a picked
       *  node by a thousand put a card in front of the interfaces seated on it
       *  and in front of the band it belongs to — see `DEPTH`. */
      elevateNodesOnSelect={false}
      elevateEdgesOnSelect={false}
      /** The left button works what is already there and the right button
       *  draws: a left drag on a card moves it and on the ground sweeps out a
       *  selection; a right drag from a card relates it and on the ground makes
       *  a note. **Panning is the middle button and the wheel** — the right one
       *  is spoken for. */
      panOnDrag={[1]}
      selectionOnDrag
      selectionKeyCode="Shift"
      selectionMode={SelectionMode.Full}
      multiSelectionKeyCode={["Meta", "Control"]}
      /** **Under this, a drag is a click.** A press that wanders by a pixel is
       *  still a press, which is what keeps a small target hittable. */
      nodeDragThreshold={5}
      snapToGrid
      snapGrid={[24, 24]}
      /** **The shell owns the keys.** The library binds its own to whatever
       *  node has focus — and its Escape unselects that node, so closing the
       *  offered list on a card quietly dropped that card out of the selection
       *  the list was about. Enter, Delete and Escape all mean something here
       *  already, and they should mean it wherever the focus happens to be. */
      nodesFocusable={false}
      edgesFocusable={false}
      /** Deleting is the app's — it writes a log entry and decides whether a
       *  line is unlinked or a block removed — so the canvas applies nothing. */
      deleteKeyCode={null}
      zoomOnDoubleClick={false}
      /** **Nothing here offers a connection.** A relationship is a right drag,
       *  which is ours; the library's own is a left drag from a handle, and the
       *  handles it wanted were the row of marks every card used to sprout. */
      nodesConnectable={false}
      onNodeDrag={(_, node) => dragging(node)}
      onNodeDragStop={(_, node, dragged) => { land(null); dropped(node, dragged); }}
      onNodeClick={(e, n) => say(n.id, e, "left", 1)}
      onNodeDoubleClick={(e, n) => say(n.id, e, "left", 2)}
      onNodeContextMenu={(e, n) => { e.preventDefault(); say(n.id, e, "right", 1); }}
      /** **A sweep leaves a rectangle over what it caught**, and the rectangle
       *  takes the pointer — so a right-click on a swept-up selection never
       *  reached the card under it and the offered list never opened. It is
       *  still a right-click on one of them; the library just reports it here. */
      onSelectionContextMenu={(e, ns) => {
        e.preventDefault();
        say(ns[0]?.id ?? null, e, "right", 1);
      }}
      onEdgeClick={(e, edge) => say(edge.id, e, "left", 1)}
      onEdgeContextMenu={(e, edge) => { e.preventDefault(); say(edge.id, e, "right", 1); }}
      onPaneClick={(e) => say(null, e as React.MouseEvent, "left", 1)}
      /** **A relationship's name is drawn over the canvas rather than on the
       *  line**, so it belongs to no node, no edge and not the ground: the
       *  library reports nothing for it either way round, and both buttons are
       *  answered here from what the name says it names. */
      onContextMenu={(e: React.MouseEvent) => {
        const wire = (e.target as HTMLElement).closest<HTMLElement>(".mnd-wire-name");
        const on = wire?.dataset["edge"];
        if (!on) return;
        e.preventDefault();
        say(on, e, "right", 1);
      }}
      onPaneContextMenu={(e) => {
        e.preventDefault();
        say(null, e as React.MouseEvent, "right", 1);
      }}
      onDoubleClick={(e: React.MouseEvent) => {
        /** Two clicks in the band come back out of the layer, and **the band is
         *  a place rather than an element**. Reading it off the target asks the
         *  browser which node the two clicks had in common, and for two clicks
         *  on different cards that answer is the ground — which took you up a
         *  layer when all you did was pick two things quickly. */
        const el = e.target as HTMLElement;
        /** **A relationship's name is drawn over the canvas rather than on the
         *  line**, so the library reports nothing for it and the two clicks
         *  land here as ground. Everything else that has a node behind it —
         *  the frame's own name included — is already reported as that node,
         *  and answering it here as well opened the rename twice. */
        const wire = el.closest<HTMLElement>(".mnd-wire-name")?.dataset["edge"];
        if (wire) { say(wire, e, "left", 2); return; }
        if (el.closest(".react-flow__node")) return;
        const p = at(e);
        const inside = frame && p.x >= frame.x && p.y >= frame.y
          && p.x <= frame.x + frame.w && p.y <= frame.y + frame.h;
        if (inside) return;
        say(null, e, "left", 2);
      }}
    >
      {/* One strip, and everything the app says goes to it. Positioned by the
          library, so it stays put through a pan and a zoom. */}
      {said ? <Panel position="top-center" className="strip">{said}</Panel> : null}
      {/* **Descending, said out loud.** A double click is quick once you know
          it and indistinguishable from re-selecting until you do, so the one
          card you have picked carries the control as well. It follows the card
          through a pan and a zoom, which is why it is the library's. */}
      {chrome && only ? (
        <NodeToolbar nodeId={only} isVisible position={Position.Top} className="mnd-tools">
          <button type="button" title="open this layer" onClick={() => tell(only, 2)}>
            open
          </button>
        </NodeToolbar>
      ) : null}
      {/* Where the card being dragged would land. */}
      {landing ? (
        <ViewportPortal>
          <div className="mnd-landing" style={{
            position: "absolute", left: landing.x, top: landing.y,
            width: landing.w, height: landing.h, pointerEvents: "none" }} />
        </ViewportPortal>
      ) : null}
      {/* What the right button is drawing, while it is being drawn. **A line
          from a card and a region on the ground** — the two things it makes
          have different shapes, and the drag should look like the one it is
          about to become. */}
      {drawing ? (
        <ViewportPortal>
          <svg className="mnd-drawing"
               style={{ position: "absolute", overflow: "visible", left: 0, top: 0,
                        pointerEvents: "none" }}>
            {drawing.on ? (
              <line className="mnd-drawn" x1={drawing.from.x} y1={drawing.from.y}
                    x2={drawing.to.x} y2={drawing.to.y} />
            ) : (
              <rect className="mnd-drawn mnd-drawn-area" {...box_svg(drawing)} />
            )}
          </svg>
        </ViewportPortal>
      ) : null}
      {/* The ends of what is picked, and the berths near it. Inside the
          viewport, so they pan and zoom with the drawing. */}
      {grips.length || berths.length ? (
        <ViewportPortal>
          {berths.map((b, i) => (
            <span key={`berth-${i}`} className="mnd-berth"
                  style={{ transform: `translate(-50%, -50%) translate(${b.x}px, ${b.y}px)` }} />
          ))}
          {grips.map((g) => {
            const to = grabbed?.key === g.key ? grabbed.at : g;
            return (
              <span key={g.key}
                    className={["mnd-anchor", "nodrag", "nopan",
                                grabbed?.key === g.key ? "held" : ""].filter(Boolean).join(" ")}
                    style={{ transform: `translate(-50%, -50%) translate(${to.x}px, ${to.y}px)` }}
                    title="drag to move this end along the border · double click to make it an interface"
                    /** The grip sits inside the pane, and a click that reaches
                     *  the pane clears the selection — which is the selection
                     *  that put the grip there. */
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      e.stopPropagation();
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      grab({ key: g.key, at: g });
                    }}
                    onPointerMove={(e) => {
                      if (grabbed?.key !== g.key) return;
                      grab({ key: g.key, at: at(e) });
                    }}
                    onPointerUp={(e) => {
                      if (grabbed?.key !== g.key) return;
                      grab(null);
                      anchored(g, e);
                    }}
                    /** **The right button offers what can be done here**, and
                     *  promoting this seat is one of them. Two clicks mean
                     *  going in or renaming everywhere else, so they mean
                     *  nothing on a grip. */
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      /** **The room is not a block, and the layer is.** An end
                       *  meeting the room's wall is an end on the block you are
                       *  inside, so promoting it makes one of that block's own
                       *  interfaces — named by the sentinel it was refused, for
                       *  a border that is not there. */
                      onGesture?.({ on: g.edge, kind: "anchor", button: "right", count: 1,
                                    at: at(e), screen: { x: e.clientX, y: e.clientY },
                                    given: { end: g.end,
                                             on: g.on === FRAME ? scene.layer : g.on,
                                             side: g.side, at: g.at } });
                    }} />
            );
          })}
        </ViewportPortal>
      ) : null}
      {chrome ? <Background variant={BackgroundVariant.Dots} gap={24} size={1} /> : null}
      {chrome ? <Controls showInteractive={false} fitViewOptions={fit} /> : null}
    </ReactFlow>
  );
}

/** React Flow keeps its viewport in context, so the provider is not optional —
 *  and a host mounting two drawings gets two cameras rather than one shared.
 *
 *  The name being typed rides a context of its own for the same reason: every
 *  surface that draws a name is a memoised node several levels down, and a prop
 *  threaded to all of them would redraw the canvas on every keystroke. */
export function FlowView({ naming = null, onNamed, ...props }: FlowViewProps) {
  /** **The layer's own name is drawn on the frame**, which is a node with an id
   *  of its own — so the one name the app says by layer is said here the way
   *  the drawing knows it. */
  const typing = useMemo(() => ({
    id: naming === props.scene.layer ? FRAME : naming,
    done: (label: string | null) => onNamed?.(label),
  }), [naming, props.scene.layer, onNamed]);
  return (
    <ReactFlowProvider>
      <NamingContext.Provider value={typing}>
        <CellsContext.Provider value={props.cells ?? EMPTY_CELLS}>
          <Canvas {...props} />
        </CellsContext.Provider>
      </NamingContext.Provider>
    </ReactFlowProvider>
  );
}

/** One empty list, so a canvas with nothing picked does not hand the context a
 *  fresh array on every render. */
const EMPTY_CELLS: readonly Spot[] = [];
