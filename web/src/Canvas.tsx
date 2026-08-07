/** Graph canvas: one layer of the object graph, editable throughout.
 *
 *  Positions are held by React Flow while a drag is in progress and committed
 *  to the log on release — otherwise a node would not move until it landed.
 *
 *  The buttons divide the work. Left selects and moves: click to select, then
 *  drag what is selected, which is what makes a card, an interface and a group
 *  all movable by the same gesture. Right draws relationships, and a right
 *  click that never moves falls through to the default action for whatever is
 *  under it. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  MarkerType,
  SelectionMode,
  type Edge,
  type Node as FlowNode,
  type NodeChange,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  axisOf, blocksOf, groupsIn, isProxy, isReference, membersOf, nameOf, notesIn, portsOf, proxyIn,
  refOf, tiesOf, titleOf,
} from "./core/fold";
import {
  around, arranged, CELL, cell, HUG, LEAF, middled, place, SEAT, seatAt, sizeOf,
} from "./core/layout";
import {
  attach, lanes, route as planRoute, runOf, type Box, type Seat,
} from "./core/route";
import type { Axis, End, Graph, Kind, Layout, Side, Spot } from "./core/types";
import { Frame } from "./Frame";
import { GroupFrame } from "./GroupFrame";
import { type Grazed, LIFTED, NodeCard, REFERRED, type Seated } from "./NodeCard";
import { Note } from "./Note";
import { Wire } from "./Wire";

const nodeTypes = { card: NodeCard, region: GroupFrame, frame: Frame, note: Note };
const edgeTypes = { wire: Wire };

/** Room the layer's frame leaves around its contents, which is where the
 *  interfaces on its edge sit. */
const MARGIN = 96;
/** The least a layer's working area is ever worth, whatever the panel's shape
 *  will not go below. A frame is drawn from its contents, so a layer holding
 *  two cards would otherwise be a small box magnified to fill the panel — the
 *  same picture, with everything twice the size and no more room to work in. */
const LEAST = { w: 520, h: 320 };
/** The band left around a layer's frame, in screen pixels. It is where you
 *  double-click to leave, and where the parent's border shows when the layer
 *  is an interface, so it is the same on every side of every layer. */
const BAND = 56;
/** Room a group's boundary leaves around its members — same as the selection
 *  rect's padding, so a freshly grouped set keeps the box it was drawn with.
 *
 *  Half a cell: enough to read as a boundary round the members rather than a
 *  second border on them. It need not be a whole cell, because nothing snaps a
 *  boundary — the members are what land on the grid, and the boundary follows
 *  them wherever they land. */
/** How far a right drag must travel before it is a relationship rather than a
 *  right click that wandered. */
const THRESHOLD = 12;
/** How near a card's border counts as being on it rather than inside it. */
const EDGE = 14;
/** How many layers of the trail the breadcrumb spells out. Past this the
 *  middle is elided: the project and the last few are what tell you where you
 *  are, and a deep branch spelled out in full is a wall of names. */
const TRAIL = 3;
/** How near the layer's own border counts as being on it. Its margin is wide,
 *  because that is where its interfaces sit, but the border is still a border:
 *  treating the whole margin as the edge lit the frame up from halfway across
 *  the canvas. */
const RIM = 30;
/** A note's drawn size, used only to decide which of its sides a leader leaves
 *  by. Its real height is its text's; being a few pixels out picks the same
 *  side of four either way. */
const NOTE = { w: 168, h: 40 };

/** Stacking among canvas pieces. Edges live in their own layer and sit above
 *  every node (see `.react-flow__edges` in styles); within the node layer,
 *  cards sit over group bands, notes sit over cards, and interfaces sit over
 *  their host via CSS. */
const DEPTH = { frame: 0, group: 1, card: 2, note: 3, edge: 4 } as const;

/** The arrangements. Each is a one-time action — press it and the layer is laid
 *  out that way — so none of them lights up: there is no arrangement a layer is
 *  currently *in*. */
const LAYOUTS: { shape: Layout; mark: string; tip: string }[] = [
  { shape: "grid", mark: "▦", tip: "Arrange as a grid" },
  { shape: "radial", mark: "⊙", tip: "Arrange around a hub" },
  { shape: "across", mark: "▤", tip: "Arrange in ranks, across" },
  { shape: "down", mark: "▥", tip: "Arrange in ranks, down" },
];

/** Which way the layer reads. A setting, so it does light up. */
const AXES: { axis: Axis; mark: string; tip: string }[] = [
  { axis: "none", mark: "·", tip: "No flow direction" },
  { axis: "across", mark: "→", tip: "Flows read across" },
  { axis: "down", mark: "↓", tip: "Flows read down" },
];

/** What a right drag makes, in the order the one control steps through. */
/** `tie` is not among them: it has a gesture of its own, so it is not something
 *  this control can land on. A reference is not here either — it is derived
 *  from an end being a proxy, and keeps whichever of these it was given. */
const KIND_NEXT: Partial<Record<Kind, Kind>> = {
  untyped: "flow", flow: "assoc", assoc: "untyped",
};
const KIND_MARK: Partial<Record<Kind, string>> = {
  untyped: "— plain", flow: "⇥ flow", assoc: "⋯ assoc",
};

/** A handler that keeps one identity for the life of the canvas, calling
 *  whatever it was last given.
 *
 *  The project's actions are rebuilt on every render, so a handler put straight
 *  into a node's or an edge's data makes that data new every render too — which
 *  sets the flow's state, which renders again, and does not stop. */
function useSteady<A extends unknown[], R>(fn: (...args: A) => R) {
  const latest = useRef(fn);
  latest.current = fn;

  return useCallback((...args: A) => latest.current(...args), []);
}

/** Which edge of a box faces a point — the side a relationship with no
 *  interface of its own leaves from. */
function facing(from: Box, to: Box): Side {
  const dx = to.x + to.w / 2 - (from.x + from.w / 2);
  const dy = to.y + to.h / 2 - (from.y + from.h / 2);

  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";

  return dy > 0 ? "bottom" : "top";
}

/** Nearest edge of an element to a screen point, and the seat on it. The
 *  element is measured on screen, so its length is divided by the zoom to get
 *  the canvas units seats are counted in. `corner` is that element's top-left
 *  in canvas units, so seats land on the absolute lattice. */
function nearestEdge(
  box: DOMRect, x: number, y: number, zoom: number, corner: { x: number; y: number },
): { side: Side; at: number } {
  const gaps = {
    left: x - box.left, right: box.right - x, top: y - box.top, bottom: box.bottom - y,
  };
  const side = (Object.keys(gaps) as Side[])
    .reduce((best, name) => (gaps[name] < gaps[best] ? name : best), "left" as Side);
  const flat = side === "top" || side === "bottom";
  const frac = flat ? (x - box.left) / box.width : (y - box.top) / box.height;
  const extent = (flat ? box.width : box.height) / (zoom || 1);
  const origin = flat ? corner.x : corner.y;

  return { side, at: seatAt(frac, extent, origin) };
}

/** Seats already in use on one card: the ports somebody made by hand, plus
 *  whatever this pass has derived so far. */
type Used = Record<string, Seat[]>;

/** One relationship's geometry, worked out rather than stored: the whole run,
 *  ends included, and the edge of each card it leaves by. */
export type Laid = {
  points: Spot[];
  fromSide: Side;
  toSide: Side;
};

/** Half an interface mark, in canvas units. A mark straddles the border it sits
 *  on, so a run ending on the border runs to the middle of its own square and
 *  pokes out inside it. Ending on the outer face instead, the line meets the
 *  interface rather than piercing it. */
const MARK = 5.5;

/** Which walls a flow relationship leaves and arrives by, given the layer's
 *  axis. Out on the forward face, in on the one behind — the convention the
 *  arrangement already reads by, so a flow line runs with the layer instead of
 *  doubling back across it. A free layer imposes nothing. */
function flowSides(axis: Axis): { from: Side; to: Side } | null {
  if (axis === "across") return { from: "right", to: "left" };
  if (axis === "down") return { from: "bottom", to: "top" };

  return null;
}

/** Card boxes that a route must clear, excluding the two ends it attaches to. */
function obstaclesOf(boxes: Record<string, Box>, fromId: string, toId: string): Box[] {
  const skip = new Set([fromId, toId]);

  return Object.entries(boxes)
    .filter(([id]) => !skip.has(id))
    .map(([, box]) => box);
}

/** The seat a hand-made interface holds, when this end has one on this card.
 *
 *  A port belonging to the far node does not count where a reference is
 *  standing in for it: the reference is a different card, and the seat means
 *  nothing on it. */
function pinnedAt(graph: Graph, port: string | undefined, owner: string): Seat | undefined {
  const node = port ? graph.elements[port] : undefined;
  if (!node || node.parent !== owner) return undefined;

  return node.side != null && node.at != null ? { side: node.side, at: node.at } : undefined;
}

/** Seats a card starts the pass with: every interface on it that somebody
 *  placed. Everything else on that card is derived and claimed as it goes. */
function seatsOn(graph: Graph, owner: string): Seat[] {
  return portsOf(graph, owner)
    .filter((p) => p.side != null && p.at != null)
    .map((p) => ({ side: p.side!, at: p.at! }));
}

/** Where one relationship meets its two ends, and the corners between.
 *
 *  A hand-made interface pins its end; every other end is free, and the router
 *  picks a seat that faces the path and that nothing else has taken. */
function planEdge(
  graph: Graph,
  edge: { source: string; target: string; from?: string; to?: string; kind?: Kind;
          fromSide?: Side; toSide?: Side },
  boxes: Record<string, Box>,
  view: string | null,
  frameBox: Box | null,
  used: Used,
  axis: Axis = "none",
  solid: Box[] = [],
) {
  const fromBox = boxes[edge.source] ?? (edge.source === view ? frameBox : null);
  const toBox = boxes[edge.target] ?? (edge.target === view ? frameBox : null);
  if (!fromBox || !toBox) return null;

  // A flow's ends read as in and out, so they take the sides the layer's axis
  // gives them. Not on the frame, whose walls all face inward and whose sides
  // mean the opposite of a card's.
  const sides = edge.kind === "flow" && edge.source !== view && edge.target !== view
    ? flowSides(axis)
    : null;

  // A wall somebody chose beats the one the axis would have given, the same way
  // a card the user placed beats where layout would have put it.
  const sideFrom = edge.fromSide ?? sides?.from;
  const sideTo = edge.toSide ?? sides?.to;

  return planRoute(
    fromBox,
    toBox,
    [...obstaclesOf(boxes, edge.source, edge.target), ...solid],
    {
      pinFrom: pinnedAt(graph, edge.from, edge.source),
      pinTo: pinnedAt(graph, edge.to, edge.target),
      sideFrom,
      sideTo,
      fromTaken: used[edge.source] ?? [],
      toTaken: used[edge.target] ?? [],
      // Inside an open layer, paths stay in the frame — never skirt outside.
      bounds: frameBox ?? undefined,
      inwardFrom: edge.source === view,
      inwardTo: edge.target === view,
    },
  );
}

/** What the floating input is asking for. One prompt, several errands. */
type Prompt =
  | { kind: "node"; x: number; y: number }
  | { kind: "note"; x: number; y: number; w: number; h: number }
  | { kind: "sprout"; x: number; y: number; end: End }
  | { kind: "relation"; id: string }
  | { kind: "rename"; id: string };

/** A relationship being drawn, from the moment the right button goes down.
 *  `end` is where it started: an interface it began on, or a place on that
 *  node's border to make one at. */
type Wire = {
  end: End;
  origin: { x: number; y: number };
  to: { x: number; y: number };
  live: boolean;
};

/** Where the right button went down, and whether it went down on nothing —
 *  which is the one place a right drag makes a note. */
type Press = { x: number; y: number; bare: boolean };

/** The rectangle a right drag on the background sweeps out, once it has pulled
 *  clear of the press. In screen coordinates, like the relationship being
 *  drawn, so it needs nothing from the viewport transform to stay under the
 *  cursor. */
type Sweep = { from: { x: number; y: number }; to: { x: number; y: number } };

type Props = {
  graph: Graph;
  view: string | null;
  picked: { kind: "node" | "edge" | "attr"; id: string } | null;
  path: string[];
  showPorts: boolean;
  onShowPorts: (on: boolean) => void;
  angular: boolean;
  onAngular: (on: boolean) => void;
  /** Write down where an arrangement put everything. */
  onArrangeLayer: (spots: { id: string; x: number; y: number }[],
                   notes?: { id: string; x: number; y: number }[]) => void;
  /** Which way this layer reads — a setting, not an arrangement. */
  onAxis: (axis: Axis) => void;
  onPick: (next: { kind: "node" | "edge" | "attr"; id: string } | null) => void;
  /** Whether a name is already spoken for in a layer, so the prompt can say so. */
  onNameTaken: (parent: string | null, label: string, except: string | null) => boolean;
  onOpen: (id: string | null) => void;
  onUp: () => void;
  onNest: (id: string, parent: string) => void;
  onPromote: (id: string, parent: string | null) => void;
  /** A node in this layer, joining any group boundaries it was made inside. */
  onCreateAt: (label: string, x: number, y: number, groups: string[]) => void;
  onSprout: (a: End, label: string, x: number, y: number, kind: Kind) => void;
  /** What a drag makes: the kind picked in the toolbar. */
  kind: Kind;
  onKind: (kind: Kind) => void;
  onRename: (id: string, label: string) => void;
  onLift: (id: string, x: number, y: number) => void;
  /** Draw a relationship, with an interface at each end. */
  onWire: (a: End, b: End, kind: Kind) => void;
  onAddPort: (parent: string | null, side: Side, at: number) => void;
  /** Turn a derived seat into an interface of its own, where it sits. */
  onPromotePort: (edge: string, end: "from" | "to", owner: string,
                  side: Side, at: number) => void;
  onSlidePort: (id: string, side: Side, at: number) => void;
  onRelation: (id: string, relation: string) => void;
  /** Where a drag came to rest, and any group each thing joined or left by
   *  landing there — one gesture, so one action. */
  onPlaceMany: (moved: { id: string; x: number; y: number }[], what?: string,
                membership?: { attr: string; holder: string; join: boolean }[]) => void;
  onUnlink: (id: string) => void;
  onDelete: (id: string) => void;
  onGroup: (members: string[]) => void;
  /** Write a group's or a note's text — one action, since both are one
   *  attribute's name drawn on the canvas. */
  onNameAttr: (id: string, label: string) => void;
  /** A note in this layer, at the point the gesture began. */
  onNote: (text: string, x: number, y: number, w: number, h: number) => void;
  onPlaceNote: (id: string, x: number, y: number) => void;
  /** Tie a note to an object, or untie it if it is already tied. */
  onTie: (id: string, holder: string) => void;
  onDropAttr: (id: string) => void;
  /** Place a stand-in here for a node that lives in another layer. */
  onRefer: (target: string, x?: number, y?: number) => void;
  /** Go to where a node actually lives, and mark it there. */
  onReveal: (id: string) => void;
};

function Flow(props: Props) {
  const { graph, view, picked, path, showPorts, onShowPorts, angular, onAngular } = props;
  const { onArrangeLayer, onAxis, onPick, onOpen, onUp, onNest, onPromote, onCreateAt } = props;
  const { onSprout, onNameTaken } = props;
  const { kind, onKind } = props;
  const axis = axisOf(graph, view);
  // Everything the cards, the frame and the lines are handed has to keep one
  // identity, or their data is rebuilt on every render — see `useSteady`.
  const onRename = useSteady(props.onRename);
  const onSlidePort = useSteady(props.onSlidePort);
  const onNameAttr = useSteady(props.onNameAttr);
  const { onLift, onWire, onAddPort, onRelation } = props;
  const onPromotePort = useSteady(props.onPromotePort);
  const { onPlaceMany, onUnlink, onDelete, onGroup, onDropAttr } = props;
  const { onNote, onPlaceNote, onTie, onRefer, onReveal } = props;
  const flow = useReactFlow();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  /** Whether the name being typed is already spoken for in this layer. */
  const [clash, setClash] = useState(false);
  const [wire, setWire] = useState<Wire | null>(null);
  const [sweep, setSweep] = useState<Sweep | null>(null);
  /** The card a dragged card is currently over — the one it would go inside. */
  const [dropping, setDropping] = useState<string | null>(null);
  const dropRef = useRef<string | null>(null);
  /** Group boundaries a dragged card would land inside, so they light up the
   *  way a container does. */
  const [joining, setJoining] = useState<string[]>([]);
  const joinRef = useRef("");
  /** The one element the pointer is over, and so the one that highlights.
   *  Resolved here rather than by `:hover`, which lights every ancestor of
   *  whatever is under the cursor. */
  const [grazed, setGrazed] = useState<Grazed>(null);
  const grazeRef = useRef("");
  const heldRef = useRef<string | null>(null);
  /** Where a group's boundary sat when its drag began, and where each member
   *  sat — the drag moves them together by a snapped delta. */
  const groupRef = useRef<{
    id: string;
    x: number;
    y: number;
    members: Record<string, { x: number; y: number }>;
  } | null>(null);
  /** Where the right button went down, whatever it went down on. */
  const pressRef = useRef<Press | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  /** The panel's own size, so a layer's floor takes its shape from the screen
   *  it is drawn on — a tall window wants a tall frame, not a wide one
   *  floating in the middle of it. */
  const [panel, setPanel] = useState({ w: 1180, h: 660 });

  useEffect(() => {
    const stage = surface.current;
    if (!stage) return;

    const watch = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setPanel({ w: width, h: height });
    });
    watch.observe(stage);

    return () => watch.disconnect();
  }, []);

  const members = useMemo(() => blocksOf(graph, view), [graph, view]);
  const notes = useMemo(() => notesIn(graph, view), [graph, view]);
  const pickedNode = picked?.kind === "node" ? picked.id : null;

  /** Where everything in this layer sits, and how big it is — the one source
   *  the frame, the groups and the relation anchors all measure against. */
  /** A note occupies space like a card does, so nothing is laid on top of one
   *  and no line is drawn through one. It is not a node, so it is neither
   *  arranged nor connected — only avoided. */
  const noteBoxes = useMemo(
    () => notes.map((attr) => ({
      x: cell(attr.x!),
      y: cell(attr.y!),
      w: Math.max(NOTE.w, cell(attr.w ?? 0)),
      h: Math.max(NOTE.h, cell(attr.h ?? 0)),
    })),
    [notes],
  );

  const boxes = useMemo(() => {
    const spots = place(graph, members, noteBoxes);
    const found: Record<string, Box> = {};

    for (const node of members) {
      const at = spots[node.id] ?? { x: 0, y: 0 };
      const size = sizeOf(graph, node);
      found[node.id] = { x: at.x, y: at.y, w: size.w, h: size.h };
    }

    return found;
  }, [graph, members, noteBoxes, placementKey(members)]);

  /** The layer's own frame, with room on every side for its interfaces. */
  const frameBox = useMemo(() => {
    if (!view || !graph.elements[view]) return null;

    const hug = around(Object.values(boxes), MARGIN) ?? { x: 0, y: 0, w: 0, h: 0 };

    // Shaped like the space it will be shown in, so that scaling it to fit
    // leaves the same band on every side. A frame of any other shape fits by
    // one axis and letterboxes on the other, which is why one layer sat in
    // generous bands top and bottom while the next had almost none.
    const shape = (panel.w - BAND * 2) / (panel.h - BAND * 2);
    let w = Math.max(hug.w, LEAST.w);
    let h = Math.max(hug.h, LEAST.h);
    w / h > shape ? (h = w / shape) : (w = h * shape);

    // ...and never smaller than the panel itself, so a sparse layer is roomy
    // rather than magnified. The floor shares the shape, so this keeps it.
    const floor = Math.max(1, (panel.w - BAND * 2) / w, (panel.h - BAND * 2) / h);
    w *= floor;
    h *= floor;

    // ...and onto the grid, so the frame's own border — and every interface
    // seated on it — lands on the same lattice the cards do. It costs the
    // panel's proportions up to a cell in each direction, which on a frame this
    // size is a fraction of a percent, and it stops the frame juddering by a
    // pixel every time the window is dragged.
    w = cell(w);
    h = cell(h);

    return { x: cell(hug.x + hug.w / 2 - w / 2), y: cell(hug.y + hug.h / 2 - h / 2), w, h };
  }, [view, graph, boxes, panel]);

  /** Each group's boundary: the box round its members, plus a small margin.
   *  Its own, never the user's — the boundary follows what is in it. */
  const bands = useMemo(
    () => groupsIn(graph, view)
      .map(({ attr, here }) => ({
        attr,
        box: around(here.map((id) => boxes[id]).filter(Boolean), HUG)!,
      }))
      .filter((band) => band.box),
    [graph, view, boxes],
  );

  /** Hidden interfaces whose seats still show as handles: the two ends of a
   *  selected relationship. Enough to see where a line is tied on without
   *  turning every square on the layer back on. A selected card shows its own,
   *  which the card decides for itself. */
  /** Relationships whose ends should show themselves: the selected one. An
   *  anchor draws nothing until it is worth finding. */
  const litEdges = useMemo(
    () => new Set(picked?.kind === "edge" ? [picked.id] : []),
    [picked],
  );

  const litSeats = useMemo(() => {
    const edge = picked?.kind === "edge" ? graph.edges[picked.id] : null;

    return new Set([edge?.from, edge?.to].filter(Boolean) as string[]);
  }, [graph, picked]);

  /** The node standing in for one that lives elsewhere, so a relationship
   *  reaching out of the layer is drawn against what is actually here. */
  const standIn = useCallback((id: string) => {
    if (id === view || members.some((n) => n.id === id)) return id;

    return proxyIn(graph, view, id)?.id ?? null;
  }, [graph, members, view]);

  /** Every relationship's geometry for this layer, worked out in one pass.
   *
   *  Seats are derived here and nowhere else. A port is a node only where
   *  somebody made one; everywhere else, where a line meets a card is a fact
   *  about this layer's arrangement rather than something stored, so it is
   *  worked out afresh whenever the arrangement changes and never written to
   *  the log. One pass, so each edge sees the seats the ones before it took and
   *  no two ends land in the same seat. */
  const laid = useMemo(() => {
    const used: Used = {};
    const runs: Record<string, Laid> = {};
    const seats: Record<string, Seated[]> = {};

    const claim = (owner: string, seat: Seat) => {
      used[owner] ??= seatsOn(graph, owner);
      used[owner].push(seat);
    };

    for (const edge of Object.values(graph.edges)) {
      const source = standIn(edge.source);
      const target = standIn(edge.target);
      if (!source || !target || source === target) continue;

      used[source] ??= seatsOn(graph, source);
      used[target] ??= seatsOn(graph, target);

      const ends = { ...edge, source, target };
      const planned = planEdge(graph, ends, boxes, view, frameBox, used, axis, noteBoxes);
      if (!planned) continue;

      // Only a flow end draws a square, so only a flow end has one to stop at.
      const drawsPort = showPorts && edge.kind === "flow";

      const fromBox = boxes[source] ?? frameBox!;
      const toBox = boxes[target] ?? frameBox!;

      const points = runOf(
        attach(fromBox, planned.from.side, planned.from.at), planned.out,
        attach(toBox, planned.to.side, planned.to.at), planned.back,
        planned.corners,
      );

      if (drawsPort) {
        const last = points.length - 1;
        points[0] = { x: points[0].x + planned.out.x * MARK,
                      y: points[0].y + planned.out.y * MARK };
        points[last] = { x: points[last].x + planned.back.x * MARK,
                         y: points[last].y + planned.back.y * MARK };
      }

      runs[edge.id] = {
        points,
        fromSide: planned.from.side,
        toSide: planned.to.side,
      };

      for (const [owner, port, seat] of [
        [source, edge.from, planned.from],
        [target, edge.to, planned.to],
      ] as const) {
        // A hand-made interface is already on the card and already counted;
        // only a derived seat has to be claimed and drawn.
        if (pinnedAt(graph, port, owner)) continue;
        claim(owner, seat);
        (seats[owner] ??= []).push({
          edge: edge.id, side: seat.side, at: seat.at, port: drawsPort,
        });
      }
    }

    // Runs sharing a line are spread apart last, once every one of them is
    // known — two relationships going the same way have to be told apart, and
    // no single edge can see that on its own.
    const spread = lanes(Object.fromEntries(
      Object.entries(runs).map(([id, run]) => [id, run.points]),
    ));
    for (const [id, points] of Object.entries(spread)) runs[id] = { ...runs[id], points };

    return { runs, seats };
  }, [graph, boxes, frameBox, view, axis, showPorts, noteBoxes, standIn]);

  /** Lay this layer out the chosen way.
   *
   *  A one-time action: what it works out is committed as ordinary placement,
   *  so everything can be dragged afterwards. It touches nothing else — which
   *  way the layer reads is a separate setting, and arranging as a grid is no
   *  reason to forget it. */
  const onArrange = useCallback((shape: Layout) => {
    const spots = arranged(graph, members, shape);
    const laid = Object.entries(spots).map(([id, at]) => ({ id, x: at.x, y: at.y }));

    onArrangeLayer(laid, reNoted(spots));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reNoted is stable per graph
  }, [onArrangeLayer, graph, members, view]);

  /** Where each tied note should sit once this layer is laid out afresh.
   *
   *  Worked out here rather than in the fold, because it needs the arrangement
   *  the layer is about to take and only the canvas can run that. A note tied to
   *  nothing keeps its place: there is nothing for it to follow. */
  const reNoted = useCallback((spots: Record<string, Spot>) => {
    const boxOf = (id: string) => {
      const at = spots[id];

      return at && graph.elements[id] ? { ...at, ...sizeOf(graph, graph.elements[id]) } : null;
    };

    // Everything a note has to stay off: the cards, and the boundaries drawn
    // round them — a note laid over either is worse than one sitting further
    // down. Notes placed earlier in this pass join the list as they go.
    const taken = [
      ...members.map((n) => boxOf(n.id)),
      ...groupsIn(graph, view)
        .map(({ here }) => around(here.map(boxOf).filter(Boolean) as Box[], HUG)),
    ].filter(Boolean) as Box[];

    const clashes = (box: Box) => taken.some((other) =>
      box.x < other.x + other.w + HUG && box.x + box.w + HUG > other.x &&
      box.y < other.y + other.h + HUG && box.y + box.h + HUG > other.y);

    return notesIn(graph, view).flatMap((attr) => {
      const held = tiesOf(graph, attr.id).map(boxOf).filter(Boolean) as Box[];
      if (!held.length) return [];

      const round = around(held, 0)!;

      // Just under what it describes, aligned to its left — clear of the ranks,
      // and the one place a reader already looks for a caption. Then down a row
      // at a time until it is clear of everything else.
      let at = { x: cell(round.x), y: cell(round.y + round.h + CELL) };

      for (let drop = 0; drop < 40 && clashes({ ...at, ...NOTE }); drop += 1) {
        at = { x: at.x, y: at.y + CELL };
      }

      taken.push({ ...at, ...NOTE });

      return [{ id: attr.id, x: at.x, y: at.y }];
    });
  }, [graph, members, view]);

  /** Turn a derived seat into an interface of its own, where it sits. Which end
   *  of the relationship it is follows from which card it is drawn on. */
  const promoteSeat = useCallback((owner: string) =>
    (edgeId: string, side: Side, at: number) => {
      const edge = graph.edges[edgeId];
      if (!edge) return;
      const end = standIn(edge.source) === owner ? "from" : "to";

      onPromotePort(edgeId, end, owner, side, at);
    }, [graph, standIn, onPromotePort]);

  const built = useMemo<FlowNode[]>(() => {
    const cards = members.map((node) => ({
      id: node.id,
      type: "card",
      position: { x: boxes[node.id].x, y: boxes[node.id].y },
      zIndex: DEPTH.card,
      // Stated, not measured. `sizeOf` is what every other piece of geometry
      // reads — the group boundaries, which side a relation leaves by, where a
      // port sits in canvas units — and a card left to size itself from its
      // text agreed with none of it. A port is placed as a percentage of the
      // card it is drawn in, so a card 150 wide while the arithmetic said 170
      // put every one of its interfaces somewhere the lines did not expect.
      width: boxes[node.id].w,
      height: boxes[node.id].h,
      style: { width: boxes[node.id].w, height: boxes[node.id].h },
      data: {
        node,
        graph,
        dropping: dropping === node.id,
        picked: node.id === pickedNode,
        grazed,
        showPorts,
        litSeats,
        pickedPort: pickedNode,
        seats: laid.seats[node.id] ?? [],
        litEdges,
        onPick: (id: string) => onPick({ kind: "node", id }),
        onOpen,
        onSlidePort,
        onRename,
        onPromote: promoteSeat(node.id),
      },
    })) as FlowNode[];

    const groups = bands.map(({ attr, box }) => {
      const chosen = picked?.kind === "node" && picked.id === attr.id;

      return {
        id: attr.id,
        type: "region",
        position: { x: box.x, y: box.y },
        zIndex: DEPTH.group,
        // Stated rather than measured: a node stays invisible *and unclickable*
        // until React Flow has measured it, and a drag reads its baseline from
        // `measured` specifically, so both are given here.
        width: box.w,
        height: box.h,
        // The clear space inside takes the pointer so empty gaps drag the
        // group; cards sit above and keep their own. Stated inline because
        // React Flow's stylesheet claims `pointer-events: all` on every node
        // at the same specificity a rule of ours would have.
        style: { width: box.w, height: box.h, pointerEvents: "all" },
        draggable: true,
        selectable: false,
        data: {
          label: nameOf(graph, attr),
          picked: chosen,
          grazed: grazed?.kind === "group" && grazed.id === attr.id,
          titled: grazed?.kind === "title" && grazed.id === attr.id,
          dropping: joining.includes(attr.id),
          onPick: () => onPick({ kind: "node", id: attr.id }),
          onLabel: (label: string) => onNameAttr(attr.id, label),
        },
      } as FlowNode;
    });

    // A note is small and precise, so it moves at once like a card rather than
    // wanting a click first the way a boundary does. Its size is the larger of
    // what its drag asked for and what its text needs — a minimum, never a
    // measurement, so the box and what it says can never disagree.
    const written = notes.map((attr) => ({
      id: attr.id,
      type: "note",
      // On the grid by being drawn, the same as a card — see `place`.
      position: { x: cell(attr.x!), y: cell(attr.y!) },
      zIndex: DEPTH.note,
      selectable: false,
      data: {
        text: nameOf(graph, attr),
        picked: picked?.kind === "node" && picked.id === attr.id,
        // A note *is* its text, so it lights as a name does — there is nothing
        // else on it to be over.
        grazed: grazed?.kind === "title" && grazed.id === attr.id,
        least: { w: Math.max(NOTE.w, cell(attr.w ?? 0)),
                 h: Math.max(NOTE.h, cell(attr.h ?? 0)) },
        onPick: () => onPick({ kind: "node", id: attr.id }),
        onLabel: (text: string) => onNameAttr(attr.id, text),
      },
    })) as FlowNode[];

    const frame: FlowNode[] = frameBox && view
      ? [{
          id: view,
          type: "frame",
          position: { x: frameBox.x, y: frameBox.y },
          zIndex: DEPTH.frame,
          // Stated width and height are enough to make it visible; `measured`
          // is deliberately left for React Flow to fill in, because supplying
          // it makes the library skip measuring the node — and measuring is
          // also when it records where the handles are. Given one, every
          // relation attached to this frame's interfaces silently vanished.
          width: frameBox.w,
          height: frameBox.h,
          // Transparent to the pointer, or it would cover the whole layer and
          // no drag on empty canvas could ever reach the pane to draw a
          // selection box. Its ports opt back in; its edge is found by
          // position instead, in `under` below.
          style: { width: frameBox.w, height: frameBox.h, pointerEvents: "none" },
          draggable: false,
          selectable: false,
          data: {
            id: view,
            graph,
            straddles: graph.elements[view]?.side ?? null,
            axis,
            showPorts,
            litSeats,
            pickedPort: pickedNode,
            seats: laid.seats[view] ?? [],
            litEdges,
            onPick: (id: string) => onPick({ kind: "node", id }),
            onOpen,
            onSlidePort,
            onRename,
            onPromote: promoteSeat(view),
            grazed,
          },
        } as FlowNode]
      : [];

    // Depth within the node layer: frame, then group boundaries, then cards,
    // then notes. Relations sit above all of these via the edges layer.
    return [...frame, ...groups, ...cards, ...written];
  }, [graph, members, notes, boxes, bands, frameBox, view, dropping, joining, pickedNode,
      picked, showPorts, litSeats, litEdges, grazed, laid, promoteSeat, onPick, onOpen,
      onSlidePort, onRename, onNameAttr]);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(built);

  // Snap while the pointer moves, so the lattice under a card (or under a
  // group's members) is the one it will settle on — free-dragging made every
  // half-cell look like a valid drop, then release jumped to a full step.
  // `middled` / `cell` are idempotent, so applying them to already-snapped
  // positions is a no-op.
  const onNodesChangeSnapped = useCallback((changes: NodeChange<FlowNode>[]) => {
    const here = new Set(members.map((n) => n.id));
    const start = groupRef.current;
    const extras: NodeChange<FlowNode>[] = [];

    const mapped = changes.map((change) => {
      if (change.type !== "position" || !change.position) return change;

      if (start && change.id === start.id) {
        const dx = cell(change.position.x - start.x);
        const dy = cell(change.position.y - start.y);
        for (const [id, home] of Object.entries(start.members)) {
          extras.push({
            type: "position",
            id,
            position: { x: home.x + dx, y: home.y + dy },
            dragging: change.dragging,
          });
        }

        return { ...change, position: { x: start.x + dx, y: start.y + dy } };
      }

      if (here.has(change.id) && graph.elements[change.id]) {
        // Members of a group being dragged are positioned from the group's
        // snapped delta above — leave them alone if a stray change arrives.
        if (start?.members[change.id]) return change;

        return {
          ...change,
          position: middled(change.position, sizeOf(graph, graph.elements[change.id])),
        };
      }

      if (graph.elements[change.id]?.element === "note") {
        return {
          ...change,
          position: { x: cell(change.position.x), y: cell(change.position.y) },
        };
      }

      return change;
    });

    onNodesChange([...mapped, ...extras]);
  }, [onNodesChange, members, graph]);

  // React Flow owns positions during a drag; the graph owns them otherwise.
  // The card (or group and its members) being dragged keep the positions
  // React Flow is giving them, or hovering over a drop target would snap
  // them back to where they started.
  useEffect(() => {
    setNodes((current) => {
      const group = groupRef.current;
      const moving = group
        ? new Set([group.id, ...Object.keys(group.members)])
        : heldRef.current ? new Set([heldRef.current]) : null;
      const chosen = new Map(current.map((n) => [n.id, n.selected]));
      const now = new Map(current.map((n) => [n.id, n.position]));

      return built.map((n) => {
        const same = { ...n, selected: chosen.get(n.id) ?? false };
        const at = moving?.has(n.id) ? now.get(n.id) : null;

        return at ? { ...same, position: at } : same;
      });
    });
  }, [built, setNodes]);

  /** The frame an interface sits on, wherever it is drawn in this layer. */
  const hostBox = useCallback(
    (port: string | undefined) => {
      const parent = port ? graph.elements[port]?.parent : null;

      return parent ? boxes[parent] ?? (parent === view ? frameBox : null) : null;
    },
    [graph, boxes, frameBox, view],
  );

  /** Edges as the graph describes them, before React Flow adds selection. */
  const builtEdges: Edge[] = useMemo(() => {
    /** A note's leaders: one faint line to each object it is tied to that is
     *  drawn in this layer. Decoration, not relationships — they take no
     *  pointer, cannot be selected, and are never routed by hand. */
    const tethers = notes.flatMap((attr) => {
      const mine = { x: cell(attr.x!), y: cell(attr.y!), w: NOTE.w, h: NOTE.h };

      return tiesOf(graph, attr.id).filter((id) => boxes[id]).map((id) => ({
        id: `tie-${attr.id}-${id}`,
        source: attr.id,
        target: id,
        type: "straight",
        zIndex: DEPTH.group,
        sourceHandle: `auto-${facing(mine, boxes[id])}-s`,
        targetHandle: `auto-${facing(boxes[id], mine)}-t`,
        selectable: false,
        focusable: false,
        deletable: false,
        className: "tether",
      } as Edge));
    });

    const drawn = Object.values(graph.edges)
      .map((edge) => {
        const source = standIn(edge.source);
        const target = standIn(edge.target);
        const run = laid.runs[edge.id];
        if (!source || !target || source === target || !run) return null;

        // A reference: it reaches something living in another layer. Either an
        // end was substituted by a proxy standing in for it, or an end simply
        // is a proxy because the line was drawn straight onto one. Both are the
        // same fact about the relationship, so both draw alike.
        const away = source !== edge.source || target !== edge.target ||
          isReference(graph, edge);

        const forward = edge.dir === "forward" || edge.dir === "both";
        const back = edge.dir === "back" || edge.dir === "both";
        // A line reaching out of the layer carries its own colour, not just a
        // dash — see `.reaching`. Violet is the hue nothing else has claimed.
        const tint = away ? "#6d5aa8" : "#2f4a3e";
        const head = { type: MarkerType.ArrowClosed, width: 16, height: 16,
                       color: away ? "#6d5aa8" : "#3f6552" };
        const kind = edge.kind ?? "untyped";

        return {
          id: edge.id,
          source,
          target,
          label: edge.type,
          type: "wire",
          zIndex: DEPTH.edge,
          // The whole run, ends included. React Flow's own handle positions are
          // a four-a-side approximation; the layer's plan is where the line
          // actually meets each card, so `Wire` draws from this and not from
          // the coordinates the library hands it.
          data: { run, angular },
          markerEnd: forward ? head : undefined,
          markerStart: back ? head : undefined,
          // Bookkeeping only — the drawn endpoints come from `run`. Naming the
          // side the plan chose keeps the library's idea of the edge and ours
          // pointing the same way.
          sourceHandle: `auto-${run.fromSide}-s`,
          targetHandle: `auto-${run.toSide}-t`,
          // Stated on the edge rather than left to the container's defaults,
          // so a relation is always clickable and always deletable.
          selectable: true,
          focusable: true,
          className: `kind-${kind}${away ? " reaching" : ""}`,
          selected: picked?.kind === "edge" && picked.id === edge.id,
          style: { stroke: tint, strokeDasharray: away ? "5 4" : undefined },
        } as Edge;
      })
      .filter((e): e is Edge => e !== null);

    return [...drawn, ...tethers];
  }, [graph, notes, boxes, laid, standIn, angular, picked]);

  // Edges need their own change handler for the same reason nodes do: without
  // one React Flow has nowhere to record a selection.
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(builtEdges);
  useEffect(() => setEdges(builtEdges), [builtEdges, setEdges]);

  // Nothing writes seats back. A card moving changes `boxes`, which changes the
  // plan, which redraws the lines — no step, no history, and nothing to
  // converge on over a second render.

  // Refit on a layer change, and when the layer gains or loses something.
  // Deliberately *not* keyed on the selection: selecting is a glance, and a
  // canvas that chases every click is impossible to work on.
  const population = members.map((n) => n.id).sort().join(",");

  /** The resting zoom: frame (or the free cards) plus the band of margin.
   *  Wheel zoom may go in from here, but not out past it. */
  const floorZoom = useMemo(() => {
    if (frameBox) {
      const scale = Math.min(
        (panel.w - BAND * 2) / frameBox.w,
        (panel.h - BAND * 2) / frameBox.h,
      );
      return Math.max(0.15, Math.min(scale, 1.6));
    }

    const outer = around(Object.values(boxes), 0);
    if (!outer || panel.w < 1 || panel.h < 1) return 0.15;

    // Matches fitView({ padding: 0.24, maxZoom: 1.3 }) at the top level.
    const pad = 0.24;
    const scale = Math.min(
      (panel.w * (1 - pad * 2)) / Math.max(outer.w, 1),
      (panel.h * (1 - pad * 2)) / Math.max(outer.h, 1),
    );
    return Math.max(0.15, Math.min(scale, 1.3));
  }, [frameBox, boxes, panel.w, panel.h]);

  /** Centered resting camera at the floor zoom — frame (or free cards) with
   *  even margin. Zoom-to-cursor leaves pan skewed when you hit the floor; this
   *  is what we snap back to. */
  const restViewport = useCallback((): Viewport | null => {
    const zoom = floorZoom;
    if (frameBox) {
      return {
        zoom,
        x: panel.w / 2 - (frameBox.x + frameBox.w / 2) * zoom,
        y: panel.h / 2 - (frameBox.y + frameBox.h / 2) * zoom,
      };
    }
    const outer = around(Object.values(boxes), 0);
    if (!outer) return null;
    return {
      zoom,
      x: panel.w / 2 - (outer.x + outer.w / 2) * zoom,
      y: panel.h / 2 - (outer.y + outer.h / 2) * zoom,
    };
  }, [floorZoom, frameBox, boxes, panel.w, panel.h]);

  useEffect(() => {
    const timer = setTimeout(() => {
      // At the top level there is no frame, so the contents are what is fitted.
      if (!view || !frameBox) {
        flow.fitView({ duration: 320, padding: 0.24, maxZoom: 1.3, minZoom: floorZoom });
        return;
      }

      // Inside a layer it is the frame that is placed, not the contents: the
      // frame is the working area, and the band around it is what you
      // double-click to leave by. Set directly rather than fitted, because a
      // fit spends its padding on one axis and lets the other take whatever is
      // left — the band has to be the same all the way round.
      const rest = restViewport();
      if (rest) flow.setViewport(rest, { duration: 320 });
    }, 40);

    return () => clearTimeout(timer);
    // restViewport is read for the value; population/frameBox/panel still gate
    // when a refit runs, so dragging cards does not chase the camera. The axis
    // is in there too: rearranging a layer moves everything at once, and a
    // camera left where it was is looking at a corner of the new arrangement.
  }, [flow, view, population, axis, panel.w, panel.h, frameBox]);

  // If the floor rises (panel shrinks, frame grows), pull the viewport up so
  // it never sits below what wheel zoom is allowed to reach.
  useEffect(() => {
    const now = flow.getViewport();
    if (now.zoom < floorZoom - 1e-4) {
      const rest = restViewport();
      if (rest) flow.setViewport(rest);
      else flow.setViewport({ ...now, zoom: floorZoom });
    }
  }, [flow, floorZoom, restViewport]);

  // Wheel zooms toward the cursor, so zooming into a corner then back out
  // lands at the floor with pan still skewed. When zoom *arrives* at the
  // floor from above, restore the resting center. Panning while already at
  // the floor is left alone.
  const zoomAboveFloor = useRef(false);
  const settlingRest = useRef(false);
  const onMove = useCallback(
    (_: unknown, vp: Viewport) => {
      if (settlingRest.current) return;
      const atFloor = vp.zoom <= floorZoom + 1e-3;
      if (!atFloor) {
        zoomAboveFloor.current = true;
        return;
      }
      if (!zoomAboveFloor.current) return;
      zoomAboveFloor.current = false;
      const rest = restViewport();
      if (!rest) return;
      if (Math.abs(vp.x - rest.x) < 0.5 && Math.abs(vp.y - rest.y) < 0.5) return;
      settlingRest.current = true;
      flow.setViewport(rest);
      requestAnimationFrame(() => {
        settlingRest.current = false;
      });
    },
    [flow, floorZoom, restViewport],
  );

  /** How far the canvas may be panned: the layer, plus room on every side to
   *  put something new. It grows as the layer does. */
  const extent = useMemo<[[number, number], [number, number]]>(() => {
    const outer = frameBox ?? around(Object.values(boxes), MARGIN)
                           ?? { x: -260, y: -140, w: 520, h: 280 };
    // Inside a frame, only enough to reach past its edge — that is the gesture
    // for pushing a card up a layer, and beyond it there is nothing to see.
    const room = frameBox ? MARGIN * 2 : 520;

    return [[outer.x - room, outer.y - room],
            [outer.x + outer.w + room, outer.y + outer.h + room]];
  }, [boxes, frameBox]);

  /** The card a dragged card would go inside, if any.
   *
   *  Its own middle decides, not the pointer — you aim with the card you can
   *  see. Anywhere on another card means inside it: a card's border is not a
   *  drop target, because a drop there used to turn the card into an interface
   *  and that made every ordinary move a hazard. Interfaces are made
   *  deliberately now, and only at the border of the layer you are in. */
  const landing = useCallback(
    (dragged: FlowNode) => {
      const size = sizeOf(graph, graph.elements[dragged.id]);
      const mid = { x: dragged.position.x + size.w / 2, y: dragged.position.y + size.h / 2 };

      for (const [id, box] of Object.entries(boxes)) {
        if (id === dragged.id) continue;
        // A reference holds nothing, so nothing lands in one.
        if (isProxy(graph.elements[id])) continue;

        const near = Math.max(box.x - mid.x, mid.x - (box.x + box.w),
                              box.y - mid.y, mid.y - (box.y + box.h));
        if (near <= EDGE) return id;
      }

      return null;
    },
    [graph, boxes],
  );

  /** Where a card has landed, in its own middle — what every drop test uses,
   *  because you aim with the card you can see rather than with the pointer. */
  const middleOf = useCallback((node: { id: string; position: { x: number; y: number } }) => {
    const size = sizeOf(graph, graph.elements[node.id]);

    return { x: node.position.x + size.w / 2, y: node.position.y + size.h / 2 };
  }, [graph]);

  /** The groups a card belongs to, having come to rest at `mid`.
   *
   *  Each boundary is measured from the members that are *staying put*. A
   *  member helps define the boundary it sits in, so measured against all of
   *  them a card could never be dragged far enough to leave — it would take
   *  the boundary with it. Against the ones standing still, joining and
   *  leaving are the same test read in opposite directions.
   *
   *  When every member is on the move there is nothing to measure against, and
   *  nothing to measure: the group is travelling rather than being left, so
   *  whoever is in it stays in it. */
  const enclosing = useCallback(
    (mover: string, mid: { x: number; y: number }, moving: Set<string>) =>
      groupsIn(graph, view)
        .filter(({ attr, here }) => {
          const staying = here.filter((id) => !moving.has(id));
          if (!staying.length) return here.includes(mover);

          const box = around(staying.map((id) => boxes[id]).filter(Boolean), HUG);

          return box && mid.x >= box.x && mid.x <= box.x + box.w &&
                        mid.y >= box.y && mid.y <= box.y + box.h;
        })
        .map(({ attr }) => attr.id),
    [graph, view, boxes],
  );

  /** The card, port, chip, relation or frame under a screen point, as ids. The
   *  frame is transparent to the pointer, so its edge is found by measuring
   *  instead: inside the layer's box but outside the contents it encloses. */
  const under = useCallback((x: number, y: number) => {
    const element = document.elementFromPoint(x, y) as HTMLElement | null;
    const nothing = { id: null, port: null, cell: null, title: false, box: null };

    // With several nodes selected the library lays its own rectangle over
    // them, which answers the hit test before any card does. Pointing at it is
    // pointing at the selection.
    if (element?.closest(".react-flow__nodesselection")) {
      return { ...nothing, kind: "selection" as const };
    }

    // A relation sits above the cards, so reaching one means it is what the
    // pointer is on — segment grabs win over the block or interface below.
    const line = element?.closest(".react-flow__edge") as HTMLElement | null;
    if (line) return { ...nothing, id: line.dataset.id ?? null, kind: "edge" as const };

    const port = element?.closest(".port") as HTMLElement | null;
    const cell = element?.closest(".cell") as HTMLElement | null;
    // A name is its own target wherever it is written — a card's as much as a
    // frame's — since the right button renames there and makes nothing. A note
    // is written all the way through: the whole of it is its name.
    const title = Boolean(
      element?.closest(".frame-name, .region-name, .card-head .label, .note"),
    );
    const host = element?.closest(".react-flow__node") as HTMLElement | null;
    const kind = host?.classList.contains("react-flow__node-card") ? "card"
               : host?.classList.contains("react-flow__node-frame") ? "frame"
               : host?.classList.contains("react-flow__node-region") ? "group"
               : host?.classList.contains("react-flow__node-note") ? "note"
               : null;

    if (host && kind) {
      return { id: host.dataset.id ?? null, kind, port: port?.dataset.port ?? null,
               cell: cell?.dataset.cell ?? null, title,
               box: host.getBoundingClientRect() };
    }

    // Nothing of ours under the pointer: it may still be the layer's own edge.
    if (view && frameBox) {
      const at = flow.screenToFlowPosition({ x, y });
      const inside = at.x >= frameBox.x && at.x <= frameBox.x + frameBox.w &&
                     at.y >= frameBox.y && at.y <= frameBox.y + frameBox.h;
      const near = Math.min(at.x - frameBox.x, frameBox.x + frameBox.w - at.x,
                            at.y - frameBox.y, frameBox.y + frameBox.h - at.y) < RIM;

      if (inside && near) {
        const corner = flow.flowToScreenPosition({ x: frameBox.x, y: frameBox.y });
        const far = flow.flowToScreenPosition({ x: frameBox.x + frameBox.w,
                                                y: frameBox.y + frameBox.h });

        return {
          ...nothing,
          id: view,
          kind: "frame" as const,
          box: new DOMRect(corner.x, corner.y, far.x - corner.x, far.y - corner.y),
        };
      }
    }

    return { ...nothing, kind: null };
  }, [view, frameBox, flow]);

  /** The one element in context under the pointer — what highlights, and what
   *  a right-click would act on.
   *
   *  Innermost wins: an interface over the card it sits on, a chip over the
   *  container holding it. A card is one target, border included: the whole of
   *  it takes the same action, so lighting its ring apart would be describing a
   *  distinction the tool no longer makes. */
  const grazedAt = useCallback((x: number, y: number): Grazed => {
    const hit = under(x, y);

    if (hit.kind === "selection") return { kind: "selection", id: "" };
    if (hit.kind === "edge") return hit.id ? { kind: "edge", id: hit.id } : null;
    if (hit.title && hit.id) return { kind: "title", id: hit.id };
    if (hit.port) return { kind: "port", id: hit.port };
    if (hit.cell) return { kind: "cell", id: hit.cell };

    if (hit.id && (hit.kind === "card" || hit.kind === "frame" || hit.kind === "group")) {
      return { kind: hit.kind, id: hit.id };
    }

    // Nothing under the pointer in the DOM may still sit inside a boundary —
    // kept as a fallback when an edge or the pane answers the hit test first.
    const at = flow.screenToFlowPosition({ x, y });
    const inside = bands
      .filter(({ box }) => at.x >= box.x && at.x <= box.x + box.w &&
                           at.y >= box.y && at.y <= box.y + box.h)
      .sort((a, b) => a.box.w * a.box.h - b.box.w * b.box.h);

    return inside.length ? { kind: "group", id: inside[0].attr.id } : null;
  }, [under, flow, bands]);

  /** What a right click does where a menu is not built yet: the default entry
   *  of the menu that will replace it. */
  const fallback = useCallback((x: number, y: number) => {
    const hit = under(x, y);
    const chosen = nodes.filter((n) => n.selected).map((n) => n.id);

    // On a selection of several: group them, which is the one thing a right
    // click on more than one node could reasonably mean. Only *on* it, though —
    // a right click elsewhere is about whatever is under the cursor, and a
    // selection left over from a moment ago should not swallow it.
    const onSelection = hit.kind === "selection" || (hit.id !== null && chosen.includes(hit.id));
    if (chosen.length > 1 && onSelection) return onGroup(chosen);

    // A name opens its own editor on the right button — see `Name` — and an
    // interface is already one; both wait for the menu.
    if (hit.title || hit.port) return;

    // A relationship's kind is a name, and a name is written where it is drawn.
    // The last name on the canvas that took a different gesture.
    if (hit.kind === "edge" && hit.id) return setPrompt({ kind: "relation", id: hit.id });

    // Anywhere on a card, and anywhere on the layer's own border, makes an
    // interface. Where the click landed decides which point of the border it
    // goes to; it is not a test the click has to pass.
    if ((hit.kind === "card" || hit.kind === "frame") && hit.id && hit.box) {
      const corner = flow.screenToFlowPosition({ x: hit.box.left, y: hit.box.top });
      const { side, at: along } = nearestEdge(hit.box, x, y, flow.getZoom(), corner);

      return onAddPort(hit.id, side, along);
    }

    // Empty background: a node in this layer, joining any boundary it lands in.
    const at = flow.screenToFlowPosition({ x, y });

    setPrompt({ kind: "node", x: at.x - LEAF.w / 2, y: at.y - LEAF.h / 2 });
  }, [under, nodes, flow, onGroup, onAddPort]);

  // Shortcuts the canvas owns. Inside a field the field's own editing wins,
  // and Esc abandons whatever is half-drawn — prompt or relationship alike.
  useEffect(() => {
    function press(event: KeyboardEvent) {
      if (event.key === "Escape") {
        return (setWire(null), setSweep(null), setPrompt(null), onPick(null));
      }
      if ((event.target as HTMLElement).closest("input, textarea")) return;

      const chosen = nodes.filter((n) => n.selected).map((n) => n.id);

      if (event.key === "Enter" && pickedNode) {
        event.preventDefault();

        return setPrompt({ kind: "rename", id: pickedNode });
      }

      // One card is enough here, where a boundary round a single block can only
      // have been asked for. The right button keeps its own rule: on one card
      // it still makes an interface, since that is what a card is for.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "g") {
        event.preventDefault();

        return chosen.length ? onGroup(chosen) : undefined;
      }

      // Show me this. Which *this* is already answered by what is selected, so
      // one key covers both fitting the layer and going to one thing in it.
      if (event.key.toLowerCase() === "f" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        const seen = pickedNode ? [pickedNode] : chosen;

        if (seen.length) {
          return flow.fitView({ nodes: seen.map((id) => ({ id })), duration: 320,
                                padding: 0.6, maxZoom: 1.6 });
        }

        const rest = restViewport();

        return rest ? flow.setViewport(rest, { duration: 320 })
                    : flow.fitView({ duration: 320, padding: 0.24, maxZoom: 1.3 });
      }

      // The library deletes what it has selected, which is cards and relations.
      // An interface, or a group boundary, is selected by us and not by it, so
      // it has to be removed here or Delete would appear to do nothing.
      if (event.key === "Delete" || event.key === "Backspace") {
        if (picked?.kind === "node") return (event.preventDefault(), onDropAttr(picked.id));
        if (picked?.kind === "edge") return (event.preventDefault(), onUnlink(picked.id));
        if (pickedNode && !nodes.some((n) => n.id === pickedNode && n.type === "card")) {
          event.preventDefault();

          return onDelete(pickedNode);
        }
      }
    }

    window.addEventListener("keydown", press);

    return () => window.removeEventListener("keydown", press);
  }, [nodes, pickedNode, picked, flow, restViewport, onGroup, onPick,
      onDropAttr, onUnlink, onDelete]);

  /** The right button, from press to release. Below the threshold it is a
   *  click and falls through to the default action; past it, a relationship
   *  is being drawn and an interface appears at the edge it started from. */
  /** The wall a right drag named, where it named one.
   *
   *  Only the layer's own frame names one. A card has no border zone — a drag
   *  from anywhere on it means "from this card", and there is no wall in the
   *  gesture to record. The frame is the exception the spec already makes, since
   *  its interior is the background and so its border has to stay a zone: a drag
   *  there is necessarily *on a wall*, and which wall is what the user meant. */
  function wallAt(hit: { kind: string | null; port: string | null; box: DOMRect | null },
                  x: number, y: number): Side | undefined {
    if (hit.kind !== "frame" || hit.port || !hit.box) return undefined;

    const corner = flow.screenToFlowPosition({ x: hit.box.left, y: hit.box.top });

    return nearestEdge(hit.box, x, y, flow.getZoom(), corner).side;
  }

  function rightDown(event: React.PointerEvent) {
    if (event.button !== 2) return;

    const hit = under(event.clientX, event.clientY);
    // Recorded whatever is underneath, so that a right click over empty canvas
    // still reaches its default action even though there is nothing there to
    // draw a relationship from — and so a drag knows whether it set off from
    // nothing, which is the one place a drag makes a note.
    pressRef.current = { x: event.clientX, y: event.clientY, bare: hit.kind === null };

    // A name is set into a border but is not one, so nothing starts from it.
    if (hit.title) return;
    if (!hit.id || (hit.kind !== "card" && hit.kind !== "frame")) return;

    const origin = { x: event.clientX, y: event.clientY };

    setWire({
      // The interface it set off from, where it set off from one, and the wall
      // it set off through, where the gesture named one. Anywhere else on a card
      // is just the card: where the line leaves it is the layer's to work out.
      end: { node: hit.id, port: hit.port ?? undefined, side: wallAt(hit, origin.x, origin.y) },
      origin,
      to: origin,
      live: false,
    });
  }

  /** What highlights under the pointer. Worked out rather than left to `:hover`,
   *  which lights every ancestor. Only set when the answer changes. */
  const graze = useCallback((x: number, y: number) => {
    const now = grazedAt(x, y);
    const key = now ? `${now.kind}:${now.id}` : "";
    if (key === grazeRef.current) return;
    grazeRef.current = key;
    setGrazed(now);
  }, [grazedAt]);

  function rightMove(event: React.PointerEvent) {
    graze(event.clientX, event.clientY);

    const to = { x: event.clientX, y: event.clientY };

    if (wire) {
      const far = Math.hypot(to.x - wire.origin.x, to.y - wire.origin.y) > THRESHOLD;

      return setWire({ ...wire, to, live: wire.live || far });
    }

    // A right drag on the background: show the rectangle it is sweeping out, so
    // the gesture under way is visible while it is under way. Amber and dashed,
    // which is a note's own look and nothing like the selection box.
    const down = pressRef.current;
    if (!down?.bare) return;

    const far = Math.hypot(to.x - down.x, to.y - down.y) > THRESHOLD;

    setSweep(far ? { from: { x: down.x, y: down.y }, to } : null);
  }

  function rightUp(event: React.PointerEvent) {
    if (event.button !== 2) return;

    const down = pressRef.current;
    const held = wire;
    pressRef.current = null;
    setWire(null);
    setSweep(null);

    // Never past the threshold, or never on anything to draw from: a right
    // click, and a right click runs the default action for what is under it.
    if (!held?.live) {
      if (!down) return;

      const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
      if (moved <= THRESHOLD) return fallback(event.clientX, event.clientY);

      // Past it, having set off from nothing: a note. It lands in the top-left
      // corner of the rectangle swept out, whichever way the drag ran, and the
      // rest of the rectangle is the least room it gets — a minimum, so a long
      // description has space and a longer one still grows the card. What it
      // says is asked for before anything is made, the same as a node's name.
      if (down.bare) {
        const at = flow.screenToFlowPosition({ x: Math.min(down.x, event.clientX),
                                               y: Math.min(down.y, event.clientY) });
        const far = flow.screenToFlowPosition({ x: Math.max(down.x, event.clientX),
                                                y: Math.max(down.y, event.clientY) });

        setPrompt({ kind: "note", x: at.x, y: at.y,
                    w: Math.round(far.x - at.x), h: Math.round(far.y - at.y) });
      }

      return;
    }

    const hit = under(event.clientX, event.clientY);

    // Let go on a note: tie what the drag set off from to it, or untie it if it
    // was tied already. A note is not a node, so no relationship is drawn and no
    // interface is made — the line between them is a leader.
    if (hit.kind === "note" && hit.id) return onTie(hit.id, held.end.node);

    const landed = hit.kind === "card" || hit.kind === "frame" ? hit.id : null;

    // Released on something: the relationship, and nothing else. An interface
    // it landed on is kept as that end's anchor; otherwise the layer decides
    // where the line meets the card, and there is nothing to record.
    if (landed && landed !== held.end.node) {
      return onWire(held.end, {
        node: landed,
        port: hit.port ?? undefined,
        side: wallAt(hit, event.clientX, event.clientY),
      }, kind);
    }

    // Nothing under it: make the far end where it was let go, and attach.
    const at = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setPrompt({
      kind: "sprout",
      x: at.x - LEAF.w / 2,
      y: at.y - LEAF.h / 2,
      end: held.end,
    });
  }

  return (
    <div
      className="stage"
      ref={surface}
      onPointerDown={rightDown}
      onPointerMove={rightMove}
      onPointerUp={rightUp}
      onPointerLeave={() => (grazeRef.current = "", setGrazed(null), setSweep(null))}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="crumbs">
        <button onClick={() => onOpen(null)} className={view ? "" : "here"}>
          {titleOf(graph) || "project"}
        </button>

        {/* The project, then the last few layers. Whatever is skipped is left
            as an ellipsis that opens the deepest layer it stands for, so the
            way back is still one click even when the trail is long. */}
        {path.length > TRAIL && (
          <span>
            <span className="sep">/</span>
            <button
              className="elided"
              title={path.slice(0, -TRAIL).map((id) => nameOf(graph, graph.elements[id])).join(" / ")}
              onClick={() => onOpen(path[path.length - TRAIL - 1])}
            >
              …
            </button>
          </span>
        )}

        {path.slice(-TRAIL).map((id, index, shown) => (
          <span key={id}>
            <span className="sep">/</span>
            <button onClick={() => onOpen(id)} className={index === shown.length - 1 ? "here" : ""}>
              {nameOf(graph, graph.elements[id])}
            </button>
          </span>
        ))}

        {view && (
          <button className="up" onClick={onUp} title="Up one layer">
            ↑
          </button>
        )}
      </div>

      <div className="arrange">
        <button
          className={showPorts ? "on" : ""}
          onClick={() => onShowPorts(!showPorts)}
          title="Interfaces on the canvas"
        >
          {showPorts ? "□ interfaces" : "· interfaces"}
        </button>
        <button
          className={kind === "untyped" ? "" : "on"}
          onClick={() => onKind(KIND_NEXT[kind] ?? "untyped")}
          title="What a right drag makes"
        >
          {KIND_MARK[kind] ?? KIND_MARK.untyped}
        </button>
        <button
          className={angular ? "on" : ""}
          onClick={() => onAngular(!angular)}
          title={angular ? "Angles" : "Curves"}
        >
          {angular ? "⌐" : "~"}
        </button>
        {/* Which way the layer reads: a setting, and one about relationships —
            it decides which sides a flow attaches to and how its line runs. */}
        {AXES.map(({ axis: which, mark, tip }) => (
          <button
            key={which}
            className={`${which === "none" ? "apart " : ""}${axis === which ? "on" : ""}`}
            onClick={() => onAxis(which)}
            title={tip}
          >
            {mark}
          </button>
        ))}
      </div>

      {/* Arrangements, opposite the zoom controls. Each is a one-time action,
          so none of them lights up — there is no arrangement a layer is
          currently *in*, only one it was last put through. */}
      <div className="shape">
        {LAYOUTS.map(({ shape, mark, tip }) => (
          <button key={shape} onClick={() => onArrange(shape)} title={tip}>
            {mark}
          </button>
        ))}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChangeSnapped}
        onEdgesChange={onEdgesChange}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
        minZoom={floorZoom}
        // Own stacking: relations above cards, cards above groups — the library
        // must not bump a selected card back over a line you are trying to grab.
        zIndexMode="manual"
        elevateNodesOnSelect={false}
        elevateEdgesOnSelect={false}
        // Double-click has its own meaning here — step in, or step back out —
        // so the library's own double-click-to-zoom would fight it.
        zoomOnDoubleClick={false}
        nodesDraggable
        // Deliberately *not* `snapToGrid`. The library snaps a node's corner to
        // a line, and a card is placed by its middle landing on the middle of a
        // row — two different lattices. `onNodesChangeSnapped` applies `middled`
        // (and `cell` for notes and group deltas) while the drag moves, so what
        // you see is what lands.
        // Relationships are the right button's business, drawn by hand below;
        // the handles here are anchors for geometry, not grab points.
        nodesConnectable={false}
        // Middle button only. The right button draws relationships, and while
        // the library also had it the pan handler captured the pointer first —
        // the canvas slid away and no line was ever drawn.
        panOnDrag={[1]}
        selectionOnDrag
        // A box takes what it encloses. Anything it merely brushes past — the
        // group boundary it was drawn inside, most of all — is left alone.
        selectionMode={SelectionMode.Full}
        // Wheel zooms. Vertical pan is what the middle button and the track
        // are for; scrolling alone used to shove the layer instead of scaling.
        zoomOnScroll
        panOnScroll={false}
        onMove={onMove}
        onPaneMouseMove={(event) => graze(event.clientX, event.clientY)}
        onNodeMouseMove={(event) => graze(event.clientX, event.clientY)}
        onNodeMouseLeave={(event) => graze(event.clientX, event.clientY)}
        onPaneMouseLeave={() => (grazeRef.current = "", setGrazed(null))}
        // `Control` is deliberately not here: on a trackpad it is a real right
        // click, and every right-button gesture is one of ours.
        multiSelectionKeyCode={["Shift", "Meta"]}
        elementsSelectable
        edgesFocusable
        // Backspace alone is the library's default, which is why Delete
        // appeared to do nothing to a selected node or relation.
        deleteKeyCode={["Delete", "Backspace"]}
        translateExtent={extent}
        onNodeClick={(_, node) => {
          if (node.type === "card") return onPick({ kind: "node", id: node.id });
          if (node.type === "region") return onPick({ kind: "node", id: node.id });
          // A placeholder is not a thing in itself: picking it picks whatever
          // it reaches, so the panel shows the node and not the stand-in.
          if (node.type === "ghost") {
            return onPick({ kind: "node", id: (node.data as { target: string }).target });
          }
          // The frame is the layer itself, and the layer is what an empty
          // selection already shows.
          if (node.type === "frame") return onPick(null);
        }}
        onNodeDoubleClick={(_, node) => {
          if (node.type !== "card") return;

          // A reference has no contents of its own — going into one takes you
          // to where the node it stands for actually lives.
          // A proxy has no inside: going into one goes to where its block
          // actually lives, which is what the reference is for.
          const stands = refOf(graph, node.id);

          return stands ? onReveal(stands) : onOpen(node.id);
        }}
        onEdgeClick={(_, edge) => onPick({ kind: "edge", id: edge.id })}
        onDragOver={(event) => {
          const kinds = event.dataTransfer.types;
          if (!kinds.includes(LIFTED) && !kinds.includes(REFERRED)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = kinds.includes(LIFTED) ? "move" : "link";
        }}
        onDrop={(event) => {
          const lifted = event.dataTransfer.getData(LIFTED);
          const referred = event.dataTransfer.getData(REFERRED);
          if (!lifted && !referred) return;

          event.preventDefault();
          const at = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
          const x = at.x - LEAF.w / 2;
          const y = at.y - LEAF.h / 2;

          // A chip out of a treemap is the node itself, moving here. A row out
          // of the explorer is a mention of it, staying where it is.
          if (lifted) return onLift(lifted, x, y);
          if (referred !== view && !members.some((n) => n.id === referred)) {
            onRefer(referred, x, y);
          }
        }}
        onPaneClick={(event) => {
          setPrompt(null);

          // Empty canvas, or a miss that still sits inside a boundary — the
          // same reckoning that decides what highlights under the pointer.
          const spot = grazedAt(event.clientX, event.clientY);

          onPick(spot?.kind === "group" ? { kind: "attr", id: spot.id } : null);
        }}
        onDoubleClick={(event) => {
          const on = (what: string) => (event.target as HTMLElement).closest(what);
          if (on(".react-flow__node") || on(".react-flow__edge") || on(".floating")) return;
          if (!view || !frameBox) return;

          // Only *outside* the frame is "leave". The frame is transparent to
          // the pointer, so every double-click on empty canvas arrives here,
          // including the ones inside the layer — which were stepping out of
          // a layer the user was working in.
          const at = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
          const out = at.x < frameBox.x || at.x > frameBox.x + frameBox.w ||
                      at.y < frameBox.y || at.y > frameBox.y + frameBox.h;

          if (out) onUp();
        }}
        onNodeDragStart={(_, node) => {
          if (node.type === "region") {
            // Dragging is how you take hold of it; picking follows so the
            // panel shows what is moving without a separate click first.
            onPick({ kind: "node", id: node.id });
            const holders = membersOf(graph, node.id).map((m) => m.id);
            groupRef.current = {
              id: node.id,
              x: node.position.x,
              y: node.position.y,
              members: Object.fromEntries(
                holders
                  .filter((id) => boxes[id])
                  .map((id) => [id, { x: boxes[id].x, y: boxes[id].y }]),
              ),
            };

            return;
          }

          heldRef.current = node.id;
        }}
        onNodeDrag={(_, node, moving) => {
          if (node.type !== "card") return;

          // Only re-render when a target actually changes, not every pixel.
          const hit = landing(node);
          if (hit !== dropRef.current) {
            dropRef.current = hit;
            setDropping(hit);
          }

          // Dropping inside a card is a move into it, so no group is being
          // joined at the same time — the card lands in another layer.
          const afoot = new Set((moving?.length ? moving : [node]).map((n) => n.id));
          const inside = hit ? [] : enclosing(node.id, middleOf(node), afoot);
          const key = inside.join(",");
          if (key !== joinRef.current) {
            joinRef.current = key;
            setJoining(inside);
          }
        }}
        onNodeDragStop={(_, node, dragged) => {
          // A group's boundary carries its members: whatever it travelled,
          // they travelled, in one action — delta already snapped to the grid.
          const start = groupRef.current;
          if (node.type === "region" && start && start.id === node.id) {
            groupRef.current = null;
            const dx = node.position.x - start.x;
            const dy = node.position.y - start.y;
            const moved = Object.entries(start.members)
              .map(([id, home]) => ({ id, x: home.x + dx, y: home.y + dy }));

            return onPlaceMany(moved, `moved group of ${moved.length}`);
          }

          // A note has a place of its own, and takes nothing with it.
          if (node.type === "note") {
            heldRef.current = null;

            return onPlaceNote(node.id, node.position.x, node.position.y);
          }

          // Worked out again from where the card actually came to rest. The
          // ref behind the hover indicator is a frame or two stale by now, and
          // the last inch of a drag is exactly where the answer changes.
          const into = node.type === "card" ? landing(node) : null;
          dropRef.current = null;
          heldRef.current = null;
          joinRef.current = "";
          setDropping(null);
          setJoining([]);

          // Dropped on another card: that card becomes its container.
          if (into) return onNest(node.id, into);

          // Pushed past the edge of the frame, while inside a layer: it
          // belongs to whatever contains this layer. The card's own middle is
          // what counts, not the pointer — you aim with the card you can see.
          if (view && frameBox) {
            const { x, y } = middleOf(node);
            const out = x < frameBox.x || x > frameBox.x + frameBox.w ||
                        y < frameBox.y || y > frameBox.y + frameBox.h;
            if (out) return onPromote(node.id, graph.elements[view]?.parent ?? null);
          }

          // A selection dragged together lands together.
          const cards = (dragged?.length ? dragged : [node]).filter((n) => n.type === "card");
          const moved = cards.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }));

          // ...and joins or leaves whatever boundaries it landed in or out of.
          // A group takes members by drag the way a container does; what makes
          // it a group rather than a container is that nothing's parent moves.
          const here = groupsIn(graph, view);
          const afoot = new Set(cards.map((n) => n.id));
          const membership = cards.flatMap((card) => {
            const inside = new Set(enclosing(card.id, middleOf(card), afoot));

            return here
              .filter(({ attr, here }) => here.includes(card.id) !== inside.has(attr.id))
              .map(({ attr }) => ({ attr: attr.id, holder: card.id,
                                    join: inside.has(attr.id) }));
          });

          onPlaceMany(moved, "", membership);
        }}
        // A placeholder is a drawing of something elsewhere; deleting it here
        // would mean deleting a node in another layer, which is not what the
        // key was pressed for.
        onNodesDelete={(gone) =>
          gone.filter((node) => node.type === "card").forEach((node) => onDelete(node.id))}
        onEdgesDelete={(gone) => gone.forEach((edge) => onUnlink(edge.id))}
      >
        {/* The backdrop *is* the lattice things land on, so it is the same
            spacing rather than a decoration that nearly matches it.

            `offset` is given a whole cell rather than left at its default of
            zero, which is not the no-op it reads as: the library computes the
            pattern's shift as `offset * zoom || 1 + gap / 2`, and zero is
            falsy, so a default offset silently displaces the dots by half a
            cell and a pixel. Cards were landing exactly on the grid and the
            grid was the thing drawn wrong. A whole cell is one full period of
            the pattern, so it shifts by exactly nothing. */}
        <Background gap={CELL} offset={CELL} size={1} />
        <Controls />
      </ReactFlow>

      {/* The relationship as it is being drawn, in screen coordinates so it
          needs nothing from the viewport transform to stay under the cursor. */}
      {wire?.live && (
        <svg className="wiring">
          <line
            x1={wire.origin.x - (surface.current?.getBoundingClientRect().left ?? 0)}
            y1={wire.origin.y - (surface.current?.getBoundingClientRect().top ?? 0)}
            x2={wire.to.x - (surface.current?.getBoundingClientRect().left ?? 0)}
            y2={wire.to.y - (surface.current?.getBoundingClientRect().top ?? 0)}
          />
        </svg>
      )}

      {/* The rectangle a right drag on the background is sweeping out. It says
          which gesture is under way and where the note will land; its size is
          not the note's, which is its text's. */}
      {sweep && (() => {
        const stage = surface.current?.getBoundingClientRect();

        return (
          <svg className="wiring">
            <rect
              className="sweep"
              x={Math.min(sweep.from.x, sweep.to.x) - (stage?.left ?? 0)}
              y={Math.min(sweep.from.y, sweep.to.y) - (stage?.top ?? 0)}
              width={Math.abs(sweep.to.x - sweep.from.x)}
              height={Math.abs(sweep.to.y - sweep.from.y)}
            />
          </svg>
        );
      })()}

      {prompt?.kind === "relation" && (
        <div className="floating">
          <span className="caret">&gt;</span>
          <input
            autoFocus
            defaultValue={graph.edges[prompt.id]?.type ?? ""}
            placeholder="what is this relation?"
            list="relation-kinds"
            onKeyDown={(event) => {
              if (event.key === "Enter") onRelation(prompt.id, event.currentTarget.value);
              if (event.key === "Enter" || event.key === "Escape") setPrompt(null);
            }}
          />
          <datalist id="relation-kinds">
            {graph.relations.map((name) => <option key={name} value={name} />)}
          </datalist>
          <button onClick={() => (onUnlink(prompt.id), setPrompt(null))} title="Remove it">
            ✕
          </button>
        </div>
      )}

      {prompt?.kind === "rename" && (
        <div className="floating">
          <span className="caret">✎</span>
          <input
            autoFocus
            className={clash ? "clash" : undefined}
            defaultValue={graph.elements[prompt.id]?.label ?? ""}
            placeholder="rename it"
            onBlur={() => (setPrompt(null), setClash(false))}
            onChange={(event) => setClash(onNameTaken(
              graph.elements[prompt.id]?.parent ?? null, event.target.value, prompt.id))}
            onKeyDown={(event) => {
              const taken = onNameTaken(graph.elements[prompt.id]?.parent ?? null,
                                        event.currentTarget.value, prompt.id);
              if (event.key === "Enter" && taken) return setClash(true);
              if (event.key === "Enter") onRename(prompt.id, event.currentTarget.value);
              if (event.key === "Enter" || event.key === "Escape") {
                setPrompt(null);
                setClash(false);
              }
            }}
          />
          {clash && <span className="clash-why">name already here</span>}
        </div>
      )}

      {(prompt?.kind === "node" || prompt?.kind === "sprout" || prompt?.kind === "note") && (
        <div className="floating">
          <span className="caret">+</span>
          <input
            autoFocus
            className={clash ? "clash" : undefined}
            placeholder={prompt.kind === "sprout" ? "name the thing it connects to"
              : prompt.kind === "note" ? "what does it say?"
              : "name it"}
            onBlur={() => (setPrompt(null), setClash(false))}
            // A note is its text and shares nothing with its neighbours; only
            // the two that make a block have a name to keep clear of.
            onChange={(event) => setClash(prompt.kind !== "note" &&
              onNameTaken(view, event.target.value, null))}
            onKeyDown={(event) => {
              const text = event.currentTarget.value.trim();
              if (event.key === "Enter" && text && prompt.kind !== "note" &&
                  onNameTaken(view, text, null)) {
                return setClash(true);
              }
              if (event.key === "Enter" && text) {
                if (prompt.kind === "sprout") {
                  onSprout(prompt.end, text, prompt.x, prompt.y, kind);
                } else if (prompt.kind === "note") {
                  onNote(text, prompt.x, prompt.y, prompt.w, prompt.h);
                } else {
                  // Made in the clear space inside a boundary, it joins that
                  // group — the same test a card dropped there passes.
                  const mid = { x: prompt.x + LEAF.w / 2, y: prompt.y + LEAF.h / 2 };
                  onCreateAt(text, prompt.x, prompt.y, enclosing("", mid, new Set()));
                }
              }
              if (event.key === "Enter" || event.key === "Escape") setPrompt(null);
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Identity for the placement inputs, so a re-render only reflows when a
 *  position actually changed. */
function placementKey(members: { id: string; x: number | null; y: number | null }[]) {
  return members.map((n) => `${n.id}:${n.x},${n.y}`).join("|");
}

export function Canvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Flow {...props} />
    </ReactFlowProvider>
  );
}
