/** Graph canvas: one layer of the object graph, editable throughout.
 *
 *  Positions are held by React Flow while a drag is in progress and committed
 *  to the log on release — otherwise a node would not move until it landed.
 *
 *  What the pointer and the keyboard *mean* is `gestures.ts`. This composes the
 *  layer: where everything sits, what draws it, and the controls around it. */

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

import type { Picked } from "../actions";
import {
  axisOf, blocksOf, groupsIn, isReference, nameOf, notesIn, portsOf, proxyIn,
  relationNames, tiesOf, titleOf, typeName,
} from "../graph/fold";
import { around, arranged, CELL, cell, HUG, LEAF, place, sizeOf } from "../geometry/layout";
import {
  attach, lanes, route as planRoute, runOf, type Box, type Seat,
} from "../geometry/route";
import type { Axis, EdgeForm, End, Graph, Layout, Side, Spot } from "../graph/types";
import { Frame } from "./Frame";
import { useGestures, type Prompt } from "./gestures";
import { GroupFrame } from "./GroupFrame";
import { NodeCard } from "./NodeCard";
import { type Grazed, type Seated } from "./card";
import { Note } from "./Note";
import { restated } from "./sync";
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
/** How many layers of the trail the breadcrumb spells out. Past this the
 *  middle is elided: the project and the last few are what tell you where you
 *  are, and a deep branch spelled out in full is a wall of names. */
const TRAIL = 3;
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
const FORM_NEXT: Record<EdgeForm, EdgeForm> = { line: "directed", directed: "line" };
const FORM_MARK: Record<EdgeForm, string> = { line: "— plain", directed: "⇥ directed" };

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
  edge: { source: string; target: string; from?: string; to?: string; form?: EdgeForm;
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
  const sides = edge.form === "directed" && edge.source !== view && edge.target !== view
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

type Props = {
  graph: Graph;
  view: string | null;
  picked: Picked;
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
  onPick: (next: Picked) => void;
  /** Whether a name is already spoken for in a layer, so the prompt can say so. */
  onNameTaken: (parent: string | null, label: string, except: string | null) => boolean;
  /** What this project calls a plain block — the fallback a card's chip shows
   *  when nothing has given it a subtype of its own. */
  unit: string;
  /** Something outside the canvas is pointing at, lit as though hovered. The
   *  canvas's own pointer wins where the two disagree. */
  hinted: Grazed;
  /** Whatever the app has to say, and at most one thing to do about it.
   *
   *  One channel for all of it — a repaired log, a refused name, a question
   *  before something irreversible. The browser's own `alert` and `confirm`
   *  are two more places to look and cannot be styled or tested. */
  said: { text: string; act?: { label: string; run: () => void } } | null;
  onHeard: () => void;
  /** Say something in full, in the strip. Handed to every name on the canvas. */
  onSay: (message: string) => void;
  onOpen: (id: string | null) => void;
  onUp: () => void;
  onNest: (id: string, parent: string) => void;
  onPromote: (id: string, parent: string | null) => void;
  /** A node in this layer, joining any group boundaries it was made inside. */
  onCreateAt: (label: string, x: number, y: number, groups: string[]) => void;
  onSprout: (a: End, label: string, x: number, y: number, form: EdgeForm) => void;
  /** What a drag makes: the form picked in the toolbar. */
  form: EdgeForm;
  onForm: (form: EdgeForm) => void;
  onRename: (id: string, label: string) => void;
  onLift: (id: string, x: number, y: number) => void;
  /** Draw a relationship, with an interface at each end. */
  onWire: (a: End, b: End, form: EdgeForm) => void;
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
  const { graph, view, picked, path, showPorts, onShowPorts, angular, onAngular, unit } = props;
  const { hinted, said, onHeard, onSay } = props;
  const { onArrangeLayer, onAxis, onPick, onOpen, onUp, onNest, onPromote, onCreateAt } = props;
  const { onSprout, onNameTaken } = props;
  const { form, onForm } = props;
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
  const surface = useRef<HTMLDivElement>(null);
  /** The nodes as React Flow has them. Held by reference because the two ends
   *  of this cannot both be passed forwards: the gestures read what is
   *  selected, and what is built to be selected is drawn from what they
   *  highlight. Applying a change to them is steadied for the same reason —
   *  the handler is built below what wants it. */
  const flowNodes = useRef<FlowNode[]>([]);
  const changeNodes = useSteady((changes: NodeChange<FlowNode>[]) => onNodesChange(changes));
  /** The part of the canvas actually visible — what is left once the tray has
   *  taken its half. Everything answers to this: the frame takes its shape from
   *  the room it is shown in, and the camera fits into the same room.
   *
   *  A frame that kept its old proportions letterboxed itself into the strip
   *  left over, which on a narrow window left it a third of the width it could
   *  have had. */
  const [seen, setSeen] = useState({ w: 1180, h: 660 });

  useEffect(() => {
    const stage = surface.current;
    if (!stage) return;

    const measure = (to: (size: { w: number; h: number }) => void) =>
      new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        if (width && height) to({ w: width, h: height });
      });

    const onStage = measure(setSeen);
    onStage.observe(stage);

    return () => onStage.disconnect();
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
    const shape = (seen.w - BAND * 2) / (seen.h - BAND * 2);
    let w = Math.max(hug.w, LEAST.w);
    let h = Math.max(hug.h, LEAST.h);
    w / h > shape ? (h = w / shape) : (w = h * shape);

    // ...and never smaller than the panel itself, so a sparse layer is roomy
    // rather than magnified. The floor shares the shape, so this keeps it.
    const floor = Math.max(1, (seen.w - BAND * 2) / w, (seen.h - BAND * 2) / h);
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
  }, [view, graph, boxes, seen]);

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
      const drawsPort = showPorts && edge.form === "directed";

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

  /** The resting zoom: frame (or the free cards) plus the band of margin.
   *  Wheel zoom may go in from here, but not out past it. */
  const floorZoom = useMemo(() => {
    if (frameBox) {
      const scale = Math.min(
        (seen.w - BAND * 2) / frameBox.w,
        (seen.h - BAND * 2) / frameBox.h,
      );
      return Math.max(0.15, Math.min(scale, 1.6));
    }

    const outer = around(Object.values(boxes), 0);
    if (!outer || seen.w < 1 || seen.h < 1) return 0.15;

    // Matches fitView({ padding: 0.24, maxZoom: 1.3 }) at the top level.
    const pad = 0.24;
    const scale = Math.min(
      (seen.w * (1 - pad * 2)) / Math.max(outer.w, 1),
      (seen.h * (1 - pad * 2)) / Math.max(outer.h, 1),
    );
    return Math.max(0.15, Math.min(scale, 1.3));
  }, [frameBox, boxes, seen.w, seen.h]);

  /** Centered resting camera at the floor zoom — frame (or free cards) with
   *  even margin. Zoom-to-cursor leaves pan skewed when you hit the floor; this
   *  is what we snap back to. */
  const restViewport = useCallback((): Viewport | null => {
    const zoom = floorZoom;
    if (frameBox) {
      return {
        zoom,
        x: seen.w / 2 - (frameBox.x + frameBox.w / 2) * zoom,
        y: seen.h / 2 - (frameBox.y + frameBox.h / 2) * zoom,
      };
    }
    const outer = around(Object.values(boxes), 0);
    if (!outer) return null;
    return {
      zoom,
      x: seen.w / 2 - (outer.x + outer.w / 2) * zoom,
      y: seen.h / 2 - (outer.y + outer.h / 2) * zoom,
    };
  }, [floorZoom, frameBox, boxes, seen.w, seen.h]);

  /** What the pointer and the keyboard mean here. It reads the layer as worked
   *  out above and reaches the actions the canvas was handed; the props go in
   *  whole, since every one it can reach is among them. */
  const gestures = useGestures(props, {
    nodes: flowNodes,
    members,
    boxes,
    frameBox,
    bands,
    onNodesChange: changeNodes,
    setPrompt,
    restViewport,
  });
  const { dropping, joining, wire, sweep, moving, enclosing } = gestures;
  /** What is lit: whatever the pointer is over, or failing that whatever the
   *  contents table is pointing at. The pointer wins, since it is the more
   *  immediate of the two. */
  const grazed = gestures.hovered ?? hinted;

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
        unit,
        onNameTaken,
        onSay,
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
          onNameTaken: (name: string) => onNameTaken(view, name, attr.id),
          onSay,
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
            onNameTaken,
            onSay,
            straddles: graph.elements[view]?.side ?? null,
            axis,
            unit,
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
  flowNodes.current = nodes;

  // React Flow owns positions during a drag; the graph owns them otherwise.
  // The card (or group and its members) being dragged keep the positions
  // React Flow is giving them, or hovering over a drop target would snap
  // them back to where they started.
  useEffect(() => {
    setNodes((current) => restated(current, built, moving()));
  }, [built, setNodes, moving]);

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
        const form = edge.form ?? "line";

        return {
          id: edge.id,
          source,
          target,
          label: typeName(graph, edge.type),
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
          className: `form-${form}${away ? " reaching" : ""}`,
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
  }, [flow, view, population, axis, seen.w, seen.h, frameBox]);

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

  return (
    <div className="stage" ref={surface} {...gestures.surface}>
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
          className={form === "line" ? "" : "on"}
          onClick={() => onForm(FORM_NEXT[form])}
          title="What a right drag makes"
        >
          {FORM_MARK[form]}
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
        // row — two different lattices. The gestures' own `onNodesChange`
        // snaps while the drag moves, so what you see is what lands.
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
        // `Control` is deliberately not here: on a trackpad it is a real right
        // click, and every right-button gesture is one of ours.
        multiSelectionKeyCode={["Shift", "Meta"]}
        elementsSelectable
        edgesFocusable
        // Backspace alone is the library's default, which is why Delete
        // appeared to do nothing to a selected node or relation.
        deleteKeyCode={["Delete", "Backspace"]}
        translateExtent={extent}
        {...gestures.board}
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

      {/* Whatever the app has to say, in the same place it asks for a name.
          One strip for everything means never wondering where a message went. */}
      {said && (
        <div className="floating saying">
          <span className="caret">!</span>
          <span className="what">{said.text}</span>
          {said.act && (
            <button className="act" onClick={() => (said.act!.run(), onHeard())}>
              {said.act.label}
            </button>
          )}
          <button onClick={onHeard} title="Dismiss">✕</button>
        </div>
      )}

      {prompt?.kind === "relation" && (
        <div className="floating">
          <span className="caret">&gt;</span>
          <input
            autoFocus
            defaultValue={typeName(graph, graph.edges[prompt.id]?.type ?? "")}
            placeholder="what is this relation?"
            list="relation-kinds"
            onKeyDown={(event) => {
              if (event.key === "Enter") onRelation(prompt.id, event.currentTarget.value);
              if (event.key === "Enter" || event.key === "Escape") setPrompt(null);
            }}
          />
          <datalist id="relation-kinds">
            {relationNames(graph).map((name) => <option key={name} value={name} />)}
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
                  onSprout(prompt.end, text, prompt.x, prompt.y, form);
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
