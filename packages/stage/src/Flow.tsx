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
  Background, BackgroundVariant, Controls, MiniMap, Panel, ReactFlow,
  ReactFlowProvider, SelectionMode, useEdgesState, useNodesState, useReactFlow,
  type Connection, type Edge, type Node, type NodeChange,
  type OnConnectEnd, type OnConnectStart, type OnSelectionChangeFunc,
} from "@xyflow/react";
import type { Id, Point } from "@mnd/core";
import { box_of, type BoxNode, type LineEdge, type Scene } from "@mnd/views";
import { NODE_TYPES } from "./nodes";

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
  | { kind: "wall"; on: string; end: "from" | "to"; to: string };

export type FlowViewProps = {
  scene: Scene;
  picked?: readonly Id[];
  onGesture?: (g: Gesture) => void;
  /** A right drag from one thing to another. */
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
};

/** What a row being dragged out of the tree carries. */
export const DRAGGED = "text/mnd-block";

/** **Fitting frames what is there; it never magnifies.** One small card on a
 *  wide canvas blown up to four times its size is not a view of anything. */
const FIT = { padding: 0.25, maxZoom: 1 };

/** Long enough to read as one motion, short enough not to be waited on. */
const FLIGHT = 260;

/** The frame sits behind everything and takes no gesture; a seat sits in front
 *  of the card it is on. React Flow paints in this order. */
const DEPTH: Record<string, number> = { frame: 0, card: 1, control: 1, seat: 2 };

const FRAME = "__frame";

/** The projection's nodes, plus the two things it cannot know: what the app has
 *  selected, and how deep each one sits. */
function nodes_of(scene: Scene, picked: readonly Id[]): BoxNode[] {
  const out: BoxNode[] = scene.frame ? [{
    id: FRAME,
    type: "frame",
    position: { x: scene.frame.x, y: scene.frame.y },
    width: scene.frame.w,
    height: scene.frame.h,
    data: { label: scene.frame.label, marks: [] },
    draggable: false,
    selectable: false,
    focusable: false,
    zIndex: DEPTH["frame"],
  }] : [];

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

function edges_of(scene: Scene, picked: readonly Id[]): LineEdge[] {
  const wall = walls(scene);
  return scene.edges.map((e) => {
    const d = e.data;
    const forward = d?.dir === "forward" || d?.dir === "both" || d?.module === "directed";
    const back = d?.dir === "back" || d?.dir === "both";
    return {
      ...e,
      type: "smoothstep",
      sourceHandle: wall.get(e.id)?.out,
      targetHandle: wall.get(e.id)?.in,
      selected: picked.includes(e.id),
      className: d?.module,
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
  return scene.nodes.find((n) => n.id === id)?.data.on ? "seat" : "box";
}

/** What in a Scene would change the drawing. **Identity is no use** — a
 *  projection is a pure function run on every render, so the object is new
 *  every time and anything watching it would reset the canvas continuously. */
function signature(scene: Scene, picked: readonly Id[]): string {
  const f = scene.frame;
  return [
    scene.layer,
    f && `${f.x},${f.y},${f.w},${f.h},${f.label}`,
    scene.nodes.map((n) => {
      const b = box_of(n);
      return `${n.id}:${b.x},${b.y},${b.w},${b.h}:${n.data.label}:${n.data.marks.join("")}`;
    }).join("|"),
    scene.edges.map((e) => `${e.id}:${e.source}>${e.target}:${e.data?.dir}`).join("|"),
    [...picked].sort().join(","),
  ].join("~");
}

function Canvas(props: FlowViewProps) {
  const { scene, picked = [], onGesture, onRelate, onAdjust, onPick, onDrop,
          said, chrome = true } = props;
  const flow = useReactFlow();

  /** **React Flow keeps its own copy, and we keep ours in step with it.**
   *  It has bookkeeping on that array that nothing here can reproduce — what
   *  each node measured, what is mid-drag — and handing it a fresh array every
   *  render without ever applying a change throws that away. */
  const [nodes, set_nodes, moved] = useNodesState<BoxNode>(nodes_of(scene, picked));
  const [edges, set_edges] = useEdgesState<LineEdge>(edges_of(scene, picked));
  const key = signature(scene, picked);

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
  useEffect(() => {
    const still = typeof matchMedia === "function"
      && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const last = was.current;
    const moved_layer = last !== undefined && last !== scene.layer;
    was.current = scene.layer;

    set_nodes(nodes_of(scene, picked));
    set_edges(edges_of(scene, picked));

    if (!moved_layer || still) return;
    /** Coming back up, the layer just left is drawn here — so the flight starts
     *  on that card and opens out. Going down there is no such box, and the
     *  fit alone reads as the camera closing in. */
    const from = last ? scene.nodes.find((n) => n.id === last) : undefined;
    if (from) {
      const b = box_of(from);
      void flow.fitBounds({ x: b.x, y: b.y, width: b.w, height: b.h }, { duration: 0 });
    }
    void flow.fitView({ ...FIT, duration: FLIGHT });
    /** The signature is what says the drawing changed; the scene object never
     *  repeats, so watching it would reset the canvas on every render. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const at = useCallback((e: { clientX: number; clientY: number }): Point =>
    flow.screenToFlowPosition({ x: e.clientX, y: e.clientY }), [flow]);

  const say = useCallback((on: string | null, e: React.MouseEvent,
                          button: "left" | "right", count: 1 | 2) => {
    const kind = kind_of(scene, on, e.target);
    onGesture?.({ on: kind === "title" ? scene.layer : on, kind, button, count,
                  at: at(e), screen: { x: e.clientX, y: e.clientY } });
  }, [onGesture, scene, at]);

  /** A right drag between two things is a relationship. React Flow calls the
   *  press `onConnectStart` and the release `onConnectEnd`. */
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
  }, [scene, onAdjust]);

  /** Selection is the app's to hold, and **this is the only place it is
   *  reported**. Reporting it from the click handler as well would clobber a
   *  multi-selection down to whichever card was touched last. */
  const chose: OnSelectionChangeFunc = useCallback(({ nodes: ns, edges: es }) => {
    const ids = [...ns.map((n) => n.id).filter((id) => id !== FRAME),
                 ...es.map((e) => e.id)];
    const same = ids.length === picked.length && ids.every((id) => picked.includes(id));
    if (!same) onPick?.(ids);
  }, [picked, onPick]);

  /** Everything React Flow reports about its own copy is applied to its own
   *  copy — that is what keeps a node measured and hittable. */
  const changed = useCallback((cs: NodeChange<BoxNode>[]) => moved(cs), [moved]);

  /** **A card cannot be dragged out of the layer it is in.** Containment used
   *  to be an invariant checked after the fact; bounding the drag makes it one
   *  the gesture cannot break. */
  const extent = useMemo(() => {
    const f = scene.frame;
    if (!f) return undefined;
    return [[f.x, f.y], [f.x + f.w, f.y + f.h]] as [[number, number], [number, number]];
  }, [scene.frame]);

  return (
    <ReactFlow
      className="mnd-flow"
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      onNodesChange={changed}
      onSelectionChange={chose}
      fitView
      fitViewOptions={FIT}
      minZoom={0.1}
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
      /** The left button works what is already there and the right button makes
       *  something new, so neither one pans: panning is the middle button and
       *  the wheel, and a sweep is shift and drag. */
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
        /** Two clicks on the ground come back out of the layer. React Flow has
         *  no pane-double-click of its own, so it is read off the target — and
         *  the frame counts as ground, since it *is* the layer you are in. */
        const el = e.target as HTMLElement;
        if (el.closest(".react-flow__node") && !el.closest(".mnd-frame")) return;
        say(el.closest(".mnd-frame") ? FRAME : null, e, "left", 2);
      }}
    >
      {/* One strip, and everything the app says goes to it. Positioned by the
          library, so it stays put through a pan and a zoom. */}
      {said ? <Panel position="top-center" className="strip">{said}</Panel> : null}
      {chrome ? <Background variant={BackgroundVariant.Dots} gap={24} size={1} /> : null}
      {chrome ? <Controls showInteractive={false} fitViewOptions={FIT} /> : null}
      {chrome ? <MiniMap pannable zoomable ariaLabel="the layer, small" /> : null}
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
