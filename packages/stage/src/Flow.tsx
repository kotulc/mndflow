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

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Background, BackgroundVariant, Controls, NodeToolbar, Panel, Position,
  ReactFlow, ReactFlowProvider, SelectionMode, useEdgesState, useNodesState,
  useReactFlow, useStore,
  type Connection, type Edge, type Node, type NodeChange,
  type OnConnectEnd, type OnConnectStart, type OnSelectionChangeFunc,
} from "@xyflow/react";
import type { Id, Point, Side } from "@mnd/core";
import { at_seat, box_of, nearest_seat, snap, type BoxNode, type Frame,
         type LineEdge, type Scene } from "@mnd/views";
import { NODE_TYPES } from "./nodes";
import { EDGE_TYPES } from "./Wire";

/** What a gesture on the canvas meant. The consumer decides what to do with
 *  it. `kind` is what was under the pointer, never what it looked like. */
export type Gesture = {
  on: string | null;
  kind: "box" | "seat" | "route" | "frame" | "title" | "empty";
  button: "left" | "right";
  count: 1 | 2;
  /** Where, in scene coordinates. A position can only come from a gesture. */
  at: Point;
  /** Where, on the screen. **Both, because they answer different questions** —
   *  what the model records is a place on the drawing, and what a menu opens
   *  next to is a place on the page. */
  screen: Point;
};

/** A positional change, which is unsayable and undoable like anything else.
 *
 *  **Two, where there were four.** A sweep is a selection and arrives as one; a
 *  seat is a move whose node happens to be seated on another, so the canvas
 *  reports it the same way and the app reads the scene to tell them apart. */
export type Adjust =
  | { kind: "move"; on: string; to: Point; over: string | null }
  | { kind: "wall"; on: string; end: "from" | "to"; to: string }
  /** An interface set into the open layer's own wall, slid along it. **The
   *  canvas answers this one itself**: which wall and how far along are read
   *  off the room, and the room is a size only the canvas knows. */
  | { kind: "wall-seat"; on: string; side: Side; at: number }
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
   *  filter takes the left button only, so this cannot be the right one. */
  onRelate?: (from: string, to: string) => void;
  onAdjust?: (adjust: Adjust) => void;
  /** What is selected now — a click, a shift-sweep and a modifier-click all
   *  arrive here and nowhere else. */
  onPick?: (ids: string[]) => void;
  /** What the app is saying, shown over the drawing rather than beside it. */
  said?: React.ReactNode;
  /** Something dropped onto the drawing from outside it, at the point it
   *  landed. The explorer drags rows; anything else that can set a
   *  `text/mnd-block` payload works the same. */
  onDrop?: (id: string, at: Point) => void;
  /** Chrome the host may turn off — a thumbnail wants none of it. */
  chrome?: boolean;
  /** Whether relationships are read with curves rather than right angles.
   *  Display state: it changes what you are looking at and nothing about the
   *  project, so it arrives as a prop and never enters the log. */
  curved?: boolean;
};

/** What a row being dragged out of the tree carries. */
export const DRAGGED = "text/mnd-block";

/** **Fitting frames what is there; it never magnifies.** One small card on a
 *  wide canvas blown up to four times its size is not a view of anything. */
const FIT = { padding: 0.25, maxZoom: 1 };

/** The band left around a layer's frame, in screen pixels. **It is where you
 *  double click to leave**, so it is the same on every side of every layer and
 *  a frame is never fitted tighter than this. */
const BAND = 56;

/** Long enough to read as one motion, short enough not to be waited on.
 *  **A nesting doll opening is the slowest thing in the product**, and it was
 *  over before it registered at half this. */
const FLIGHT = 440;

/** What React Flow is told it may shrink to, kept here so a flight that starts
 *  on a small card starts somewhere the viewport will actually go. */
const MIN_ZOOM = 0.1;

/** The frame sits behind everything and takes no gesture; a seat sits in front
 *  of the card it is on. React Flow paints in this order. */
const DEPTH: Record<string, number> = { frame: 0, card: 1, control: 1, seat: 2 };

const FRAME = "__frame";

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

/** The projection's nodes, plus the two things it cannot know: what the app has
 *  selected, and how deep each one sits. */
function nodes_of(scene: Scene, picked: readonly Id[], frame: Frame | null): BoxNode[] {
  const out: BoxNode[] = frame ? [{
    id: FRAME,
    type: "frame",
    position: { x: frame.x, y: frame.y },
    width: frame.w,
    height: frame.h,
    data: { label: frame.label, marks: [] },
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
      data: { label: p.label, marks: p.marks, on: FRAME,
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

/** Which walls a line leaves and arrives by.
 *
 *  **Every card offers four, so something has to choose**, and left to itself
 *  React Flow takes the first — which sends a line between two neighbours out
 *  the top, around and back, reading as a box rather than a link. The two nodes
 *  are already placed, so the answer is just which way one lies from the other. */
function walls(scene: Scene): Map<string, { out: string; in: string }> {
  const at = new Map(scene.nodes.map((n) => [n.id, box_of(n)]));
  const out = new Map<string, { out: string; in: string }>();
  for (const e of scene.edges) {
    const a = at.get(e.source);
    const b = at.get(e.target);
    if (!a || !b) continue;
    const dx = (b.x + b.w / 2) - (a.x + a.w / 2);
    const dy = (b.y + b.h / 2) - (a.y + a.h / 2);
    out.set(e.id, Math.abs(dx) >= Math.abs(dy)
      ? (dx >= 0 ? { out: "s-r", in: "t-l" } : { out: "s-l", in: "t-r" })
      : (dy >= 0 ? { out: "s-b", in: "t-t" } : { out: "s-t", in: "t-b" }));
  }
  return out;
}

/** How a relationship reads, from what it is. **Weight and dash, never a hue**
 *  — a definition's slot is what colour means on this canvas, and a line
 *  borrowing one would be saying something the vocabulary already says. */
const READS: Record<string, string> = {
  line: "line", directed: "directed", reference: "line dashed", tie: "line away",
};

function edges_of(scene: Scene, picked: readonly Id[], curved: boolean): LineEdge[] {
  const wall = walls(scene);
  return scene.edges.map((e) => {
    const d = e.data;
    const forward = d?.dir === "forward" || d?.dir === "both" || d?.module === "directed";
    const back = d?.dir === "back" || d?.dir === "both";
    return {
      ...e,
      type: "wire",
      data: { ...(d ?? { module: "line" as const, dir: "none" as const }), curved },
      sourceHandle: wall.get(e.id)?.out,
      targetHandle: wall.get(e.id)?.in,
      selected: picked.includes(e.id),
      className: READS[d?.module ?? "line"] ?? "line",
      reconnectable: true,
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
  if (id === FRAME) {
    const el = target instanceof Element ? target : null;
    return el?.closest(".mnd-frame-name") ? "title" : "frame";
  }
  if (scene.edges.some((e) => e.id === id)) return "route";
  if (scene.frame?.ports.some((p) => p.id === id)) return "seat";
  return scene.nodes.find((n) => n.id === id)?.data.on ? "seat" : "box";
}

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
    frame && `${frame.x},${frame.y},${frame.w},${frame.h},${frame.label}`,
    frame?.ports.map((p) => `${p.id}${p.side}${p.at}${p.marks.join("")}`).join("|"),
    scene.nodes.map((n) => {
      const b = box_of(n);
      const k = n.data.look;
      /** **Everything the card draws from, not only where it sits.** Retyping a
       *  block moves nothing and renames nothing; what it changes is the look,
       *  and a signature blind to that leaves the old card on the canvas. */
      return [
        n.id, n.type, `${b.x},${b.y},${b.w},${b.h}`, n.data.label,
        n.data.marks.join(""),
        k && `${k.slot}${k.emphasis}${k.weight}${k.voice}${k.shape}${k.label}${k.kind ?? ""}`,
        n.data.cells?.map((c) => `${c.id}${c.kind}${c.tint}${c.rest ?? ""}`).join(""),
        n.data.fields?.map((f) => `${f.name}=${f.value}`).join(""),
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

function Canvas(props: FlowViewProps) {
  const { scene, picked = [], onGesture, onRelate, onAdjust, onPick, onDrop,
          said, chrome = true, curved = false } = props;
  const flow = useReactFlow();
  { const w = globalThis as any; w.__t = w.__t ?? []; w.__t.push(`R picked=${JSON.stringify(picked)}`); }

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
    const room = holds ? { ...held!.room, label: f.label } : panelled(f, seen);
    kept.current = { of: scene.layer, seen: seen_key, room };
    return room;
  }, [scene.frame, scene.layer, seen]);

  /** **The band is the same on every side, whatever the layer holds.** The
   *  frame is already shaped like the panel, so one fraction of it leaves the
   *  same margin on both axes — and that margin is the ground you double click
   *  to come back out. Without a frame there is nothing to leave room around,
   *  so a plain fit does. */
  const fit = useMemo(() => (frame && seen.w > BAND * 2
    ? { padding: (BAND * 2) / (seen.w - BAND * 2), maxZoom: 1 }
    : FIT), [frame, seen.w]);

  /** **React Flow keeps its own copy, and we keep ours in step with it.**
   *  It has bookkeeping on that array that nothing here can reproduce — what
   *  each node measured, what is mid-drag — and handing it a fresh array every
   *  render without ever applying a change throws that away. */
  const [nodes, set_nodes, moved] = useNodesState<BoxNode>(nodes_of(scene, picked, frame));
  const [edges, set_edges] = useEdgesState<LineEdge>(edges_of(scene, picked, curved));
  const key = `${signature(scene, frame)}~${curved ? "curve" : "angle"}`;

  /** **Which drawing the arrays on the canvas are of.** Until the effect below
   *  has installed the new ones they are still the last layer's, and what they
   *  say about the selection is about a drawing nobody is looking at. */
  const installed = useRef(key);

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
    const still = typeof matchMedia === "function"
      && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const last = was.current;
    const moved_layer = last !== undefined && last !== scene.layer;
    const rect = frame ? `${frame.x},${frame.y},${frame.w},${frame.h}` : "";
    const grew = !moved_layer && room.current !== rect;
    was.current = scene.layer;
    room.current = rect;

    const before = drawn.current;
    drawn.current = scene.nodes;
    { const w = globalThis as any; w.__t.push(`STRUCT key-change moved=${moved_layer}`); }
    set_nodes(nodes_of(scene, picked, frame));
    set_edges(edges_of(scene, picked, curved));
    installed.current = key;

    if (grew) { settle(still ? 0 : FLIGHT); return; }
    if (!moved_layer) return;
    if (still) { settle(0); return; }
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

  /** **A pick made somewhere else, put onto the canvas.** The tree and the
   *  question loop both select, and neither goes through React Flow — so the
   *  flag is written here, and only onto the rows that disagree. A pick made
   *  *on* the canvas arrives already agreed with and writes nothing, which is
   *  what stops the two copies from echoing each other. */
  const held = chosen(picked);
  useEffect(() => {
    const want = new Set<string>(picked);
    { const w = globalThis as any; w.__t.push(`MARK want=${JSON.stringify([...want])}`); }
    set_nodes((ns) => marked(ns, want));
    set_edges((es) => marked(es, want));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [held]);

  const at = useCallback((e: { clientX: number; clientY: number }): Point =>
    flow.screenToFlowPosition({ x: e.clientX, y: e.clientY }), [flow]);

  const say = useCallback((on: string | null, e: React.MouseEvent,
                          button: "left" | "right", count: 1 | 2) => {
    const kind = kind_of(scene, on, e.target);
    onGesture?.({ on: kind === "title" ? scene.layer : on, kind, button, count,
                  at: at(e), screen: { x: e.clientX, y: e.clientY } });
  }, [onGesture, scene, at]);

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

  /** A drag between two things is a relationship. React Flow calls the press
   *  `onConnectStart` and the release `onConnectEnd`; both only fire for a drag
   *  that began on a handle, which is what tells it apart from moving a card. */
  const from = useMemo(() => ({ current: null as string | null }), []);
  const start: OnConnectStart = useCallback((_, p) => { from.current = p.nodeId; }, [from]);
  const end: OnConnectEnd = useCallback((_e, state) => {
    const began = from.current;
    from.current = null;
    const to = state.toNode?.id;
    if (began && to && to !== began) onRelate?.(began, to);
  }, [from, onRelate]);

  /** Taking a line's end to another card. **The library's gesture** — it draws
   *  the handle, tracks the drag and says where it landed. */
  const rewalled = useCallback((edge: Edge, to: Connection) => {
    const end: "from" | "to" = to.source === edge.source ? "to" : "from";
    const landed = end === "to" ? to.target : to.source;
    if (landed) onAdjust?.({ kind: "wall", on: edge.id, end, to: landed });
  }, [onAdjust]);

  /** **Where it came to rest, not where the pointer was.** A card grabbed by
   *  its corner lands somewhere the pointer never went, so what it was dropped
   *  *on* is read off the card's own middle. */
  const dropped = useCallback((node: Node) => {
    /** An interface in the room's own wall slides along it, and which wall it
     *  landed in is a question about the room. */
    const port = frame?.ports.find((p) => p.id === node.id);
    if (port && frame) {
      const seat = nearest_seat(frame, { x: node.position.x, y: node.position.y });
      onAdjust?.({ kind: "wall-seat", on: node.id, side: seat.side, at: seat.at });
      return;
    }
    const drawn = scene.nodes.find((n) => n.id === node.id);
    if (!drawn) return;
    const b = box_of(drawn);
    const p = { x: node.position.x + b.w / 2, y: node.position.y + b.h / 2 };
    const over = scene.nodes.find((n) => {
      if (n.id === node.id || n.data.on) return false;
      const o = box_of(n);
      return p.x >= o.x && p.x <= o.x + o.w && p.y >= o.y && p.y <= o.y + o.h;
    })?.id ?? null;
    onAdjust?.({ kind: "move", on: node.id, to: node.position, over });
  }, [scene, frame, onAdjust]);

  /** Selection is the app's to hold, and **this is the only place it is
   *  reported**. Reporting it from the click handler as well would clobber a
   *  multi-selection down to whichever card was touched last. */
  const chose: OnSelectionChangeFunc = useCallback(({ nodes: ns, edges: es }) => {
    /** **Not while the arrays are a layer behind.** Descending swaps the
     *  drawing and the selection in one go, and the canvas reports the old
     *  drawing's selection before it has been handed the new one — taken at
     *  face value that clears the pick that did the descending. */
    { const w = globalThis as any; w.__t.push(`CHOSE stale=${installed.current !== key}`); }
    if (installed.current !== key) return;
    const ids = [...ns.map((n) => n.id).filter((id) => id !== FRAME),
                 ...es.map((e) => e.id)];
    const same = ids.length === picked.length && ids.every((id) => picked.includes(id));
    { const w = globalThis as any; w.__t.push(`  ids=${JSON.stringify(ids)} picked=${JSON.stringify(picked)} same=${same}`); }
    if (!same) onPick?.(ids);
  }, [picked, onPick, key]);

  /** Everything React Flow reports about its own copy is applied to its own
   *  copy — that is what keeps a node measured and hittable.
   *
   *  **A corner coming to rest passes through here too.** The resizer is drawn
   *  inside the node, which knows nothing about the app; what it does is report
   *  a dimension change, and the end of one is the gesture worth recording. */
  const changed = useCallback((cs: NodeChange<BoxNode>[]) => {
    moved(cs);
    for (const c of cs) {
      if (c.type !== "dimensions" || c.resizing !== false || !c.dimensions) continue;
      const n = scene.nodes.find((x) => x.id === c.id);
      if (!n) continue;
      onAdjust?.({ kind: "size", on: c.id, to: n.position,
                   w: Math.round(c.dimensions.width),
                   h: Math.round(c.dimensions.height) });
    }
  }, [moved, scene, onAdjust]);

  /** **A card cannot be dragged out of the layer it is in.** Containment used
   *  to be an invariant checked after the fact; bounding the drag makes it one
   *  the gesture cannot break. */
  /** The one card a toolbar would belong to. **One or none** — a toolbar over
   *  a multi-selection would have to say which card it acted on, and a control
   *  that has to explain itself is the wrong control. */
  const only = useMemo(() => {
    if (picked.length !== 1) return null;
    const n = scene.nodes.find((x) => x.id === picked[0]);
    return n && !n.data.on && n.selectable !== false ? n.id : null;
  }, [picked, scene]);

  const extent = useMemo(() => {
    if (!frame) return undefined;
    const to = { x: frame.x + frame.w, y: frame.y + frame.h };
    return [[frame.x, frame.y], [to.x, to.y]] as [[number, number], [number, number]];
  }, [frame]);

  return (
    <ReactFlow
      className="mnd-flow"
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      onNodesChange={changed}
      onSelectionChange={chose}
      fitView
      fitViewOptions={fit}
      minZoom={MIN_ZOOM}
      maxZoom={4}
      nodeExtent={extent}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
      onDrop={(e) => {
        const id = e.dataTransfer.getData(DRAGGED);
        if (!id) return;
        e.preventDefault();
        onDrop?.(id, at(e));
      }}
      proOptions={{ hideAttribution: true }}
      /** The left button works what is already there, so it never pans: a drag
       *  on a card moves it, a drag from its edge relates it, and a drag on the
       *  ground sweeps. Panning is the middle button, the right button and the
       *  wheel — the right button opens the offered list on a click, and a drag
       *  is not a click. */
      panOnDrag={[1, 2]}
      selectionKeyCode="Shift"
      selectionMode={SelectionMode.Full}
      multiSelectionKeyCode={["Meta", "Control"]}
      /** **Under this, a drag is a click.** A press that wanders by a pixel is
       *  still a press, which is what keeps a small target hittable. */
      nodeDragThreshold={5}
      snapToGrid
      snapGrid={[24, 24]}
      /** Deleting is the app's — it writes a log entry and decides whether a
       *  line is unlinked or a block removed — so the canvas applies nothing. */
      deleteKeyCode={null}
      zoomOnDoubleClick={false}
      nodesConnectable
      connectionMode={"loose" as never}
      onConnectStart={start}
      onConnectEnd={end}
      onReconnect={rewalled}
      onNodeDragStop={(_, node) => dropped(node)}
      onNodeClick={(e, n) => say(n.id, e, "left", 1)}
      onNodeDoubleClick={(e, n) => say(n.id, e, "left", 2)}
      onNodeContextMenu={(e, n) => { e.preventDefault(); say(n.id, e, "right", 1); }}
      onEdgeClick={(e, edge) => say(edge.id, e, "left", 1)}
      onEdgeContextMenu={(e, edge) => { e.preventDefault(); say(edge.id, e, "right", 1); }}
      onPaneClick={(e) => say(null, e as React.MouseEvent, "left", 1)}
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
        if (el.closest(".mnd-frame-name")) { say(FRAME, e, "left", 2); return; }
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
      {chrome ? <Background variant={BackgroundVariant.Dots} gap={24} size={1} /> : null}
      {chrome ? <Controls showInteractive={false} fitViewOptions={fit} /> : null}
    </ReactFlow>
  );
}

/** React Flow keeps its viewport in context, so the provider is not optional —
 *  and a host mounting two drawings gets two cameras rather than one shared. */
export function FlowView(props: FlowViewProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
