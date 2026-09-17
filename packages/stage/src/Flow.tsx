/** Scene → React Flow, and nothing else. */

import { useCallback, useMemo } from "react";
import {
  Background, BackgroundVariant, Controls, NodeToolbar, Panel, Position,
  ReactFlow, ReactFlowProvider, SelectionMode, ViewportPortal, useReactFlow,
} from "@xyflow/react";
import type { Point, Spot } from "@mnd/core";
import { box_of, holds, nearest_seat, FRAME, UNIT, type BoxNode } from "@mnd/views";
import { NamingContext } from "@mnd/theme";
import { CellsContext, DRAGGED, NODE_TYPES } from "./nodes";
import { EDGE_TYPES, Heads } from "./Wire";
import type { Adjust, FlowViewProps, Gesture, Landing } from "./gestures";
import { MIN_ZOOM } from "./arrays";
import { useDrag } from "./drag";
import { useDraw } from "./draw";
import { Grips } from "./Grips";
import { kind_of, spread } from "./pointer";
import { useCamera, useRoom } from "./room";
import { Sweeping } from "./Sweeping";
import { useSync } from "./sync";

export type { Adjust, FlowViewProps, Gesture, Landing };
export { DRAGGED };

function Canvas(props: FlowViewProps) {
  const { scene, picked = [], onGesture, onRelate, onSweep, onAdjust, onPick, onDrop,
          said, chrome = true, lattice = false, frame: framed = true } = props;
  const flow = useReactFlow();
  const { frame, fit, seen } = useRoom(scene);
  const { nodes, edges, moved, rewired, chose, key, again } = useSync(scene, picked, frame, onPick);
  useCamera(scene, frame, fit, seen, key, nodes);

  /** Where the pointer is on the drawing, unsnapped. */
  const at = useCallback((e: { clientX: number; clientY: number }): Point =>
    flow.screenToFlowPosition({ x: e.clientX, y: e.clientY }, { snapToGrid: false }),
    [flow]);
  const { drawing, swallow, pressed, moved_to, released } = useDraw(scene, at, onRelate, onSweep);
  const { landing, landing_on, dragging, stopped, changed } =
    useDrag(scene, frame, moved, onAdjust, again);

  const say = useCallback((on: string | null, e: React.MouseEvent,
                          button: "left" | "right", count: 1 | 2) => {
    /** The press that drew something is not also a click on what it began on. */
    if (swallow.current) return;
    const kind = kind_of(scene, on, e.target);
    /** Which wall and how far along, for a border pointed at. */
    const box = kind === "frame" ? frame
      : kind === "box" || kind === "brim" ? scene.nodes.find((n) => n.id === on) : null;
    const seat = box ? nearest_seat("w" in box ? box : box_of(box as BoxNode), at(e)) : null;
    /** A cell gesture carries its grid and address. */
    const el_at = e.target instanceof Element
      ? e.target.closest(".mnd-grid-cell")?.getAttribute("data-at") : null;
    const spot = kind === "cell" && el_at && on
      ? { group: on, r: Number(el_at.split(",")[0]), c: Number(el_at.split(",")[1]) }
      : null;
    const given = spot ?? (seat
      ? { side: seat.side, at: seat.at, ...(kind === "brim" ? { owner: on } : {}) }
      : null);
    /** A chip's name belongs to the block it stands for. */
    const el = e.target instanceof Element ? e.target : null;
    const chip = kind === "name" ? el?.closest("[data-cell]")?.getAttribute("data-cell") : null;
    onGesture?.({
      on: kind === "title" || kind === "frame" ? scene.layer : chip ?? on,
      kind, button, count, at: at(e), screen: { x: e.clientX, y: e.clientY },
      ...(given ? { given } : {}),
    });
  }, [onGesture, scene, at, frame]);

  /** A gesture said without a pointer, for controls like the open button. */
  const tell = useCallback((on: string, count: 1 | 2) => {
    const n = scene.nodes.find((x) => x.id === on);
    const b = n ? box_of(n) : { x: 0, y: 0, w: 0, h: 0 };
    const p = flow.flowToScreenPosition({ x: b.x, y: b.y });
    onGesture?.({ on, kind: kind_of(scene, on), button: "left", count,
                  at: { x: b.x, y: b.y }, screen: p });
  }, [scene, flow, onGesture]);

  /** The one card a toolbar would belong to. */
  const only = useMemo(() => {
    if (picked.length !== 1) return null;
    const n = scene.nodes.find((x) => x.id === picked[0]);
    /** A boundary and a grid have no inside to open. */
    return n && !n.data.on && n.selectable !== false
      && !holds(n) && n.type !== "note" ? n.id : null;
  }, [picked, scene]);

  return (
    <ReactFlow
      className={framed ? "mnd-flow" : "mnd-flow frameless"}
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
        const spot = at(e);
        const land = landing_on(id, spot);
        onDrop?.(id, spot, { over: land.over?.id ?? null, into: land.into?.id ?? null,
                             ...(land.cell ? { cell: land.cell } : {}) });
      }}
      proOptions={{ hideAttribution: true }}
      /** Depth is the notation's, not the selection's. */
      elevateNodesOnSelect={false}
      elevateEdgesOnSelect={false}
      /** Left works what is there, right draws; the middle button pans. */
      panOnDrag={[1]}
      selectionOnDrag
      /** Shift does not start the library's selection. */
      selectionKeyCode={null}
      selectionMode={SelectionMode.Full}
      multiSelectionKeyCode={["Meta", "Control"]}
      /** Under five pixels a drag is a click. */
      nodeDragThreshold={5}
      /** The shell owns the keys, not the focused node. */
      nodesFocusable={false}
      edgesFocusable={false}
      /** Deleting is the app's. */
      deleteKeyCode={null}
      zoomOnDoubleClick={false}
      /** Relationships are drawn with the right button, not the library's connections. */
      nodesConnectable={false}
      onNodeDrag={(_, node) => dragging(node)}
      onNodeDragStop={(_, node, dragged) => stopped(node, dragged)}
      onNodeClick={(e, n) => say(n.id, e, "left", 1)}
      onNodeDoubleClick={(e, n) => say(n.id, e, "left", 2)}
      onNodeContextMenu={(e, n) => { e.preventDefault(); say(n.id, e, "right", 1); }}
      /** A right-click on a swept selection is about the card under it. */
      onSelectionContextMenu={(e, ns) => {
        e.preventDefault();
        say(ns[0]?.id ?? null, e, "right", 1);
      }}
      onEdgeClick={(e, edge) => say(edge.id, e, "left", 1)}
      onEdgeContextMenu={(e, edge) => { e.preventDefault(); say(edge.id, e, "right", 1); }}
      onPaneClick={(e) => say(null, e as React.MouseEvent, "left", 1)}
      /** A relationship's name is outside every node and edge, so its right-click is caught here. */
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
        /** Two clicks outside the room leave the layer. */
        const el = e.target as HTMLElement;
        /** Two clicks on a run or a node mean nothing here. */
        if (el.closest<HTMLElement>(".mnd-wire-name")) return;
        if (el.closest(".react-flow__node")) return;
        const p = at(e);
        const inside = frame && p.x >= frame.x && p.y >= frame.y
          && p.x <= frame.x + frame.w && p.y <= frame.y + frame.h;
        if (inside) return;
        say(null, e, "left", 2);
      }}
    >
      {/* One strip, and everything the app says goes to it. */}
      {said ? <Panel position="top-center" className="strip">{said}</Panel> : null}
      {/* An open button on the one picked card. */}
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
      {/* What the right button is drawing, while it is being drawn. */}
      {drawing ? (
        <ViewportPortal>
          <svg className="mnd-drawing"
               style={{ position: "absolute", overflow: "visible", left: 0, top: 0,
                        pointerEvents: "none" }}>
            {drawing.on ? (
              <line className="mnd-drawn" x1={drawing.from.x} y1={drawing.from.y}
                    x2={drawing.to.x} y2={drawing.to.y} />
            ) : <Sweeping at={spread(drawing.from, drawing.to)} />}
          </svg>
        </ViewportPortal>
      ) : null}
      {/* The ends of what is picked, and the berths near it. */}
      <Grips scene={scene} picked={picked} frame={frame} at={at}
             onAdjust={onAdjust} onGesture={onGesture} />
      {/* The heads every run draws from. */}
      <Heads />
      {chrome ? <Background variant={BackgroundVariant.Dots} gap={UNIT} size={1} /> : null}
      {/* The unit, ruled as squares from the layer's origin. */}
      {chrome && lattice ? (
        <Background id="cells" variant={BackgroundVariant.Lines}
                    gap={UNIT} offset={UNIT / 2}
                    lineWidth={1} className="mnd-lattice" />
      ) : null}
      {chrome ? <Controls showInteractive={false} fitViewOptions={fit} /> : null}
    </ReactFlow>
  );
}

/** Each drawing gets its own React Flow provider and camera. */
export function FlowView({ naming = null, onNamed, ...props }: FlowViewProps) {
  /** The layer's own name is typed on the frame. */
  const typing = useMemo(() => ({
    id: naming === props.scene.layer ? FRAME : naming,
    done: (label: string | null) => onNamed?.(label),
  }), [naming, props.scene.layer, onNamed]);
  /** The same for the lattice: what is picked, and how to pick. */
  const { cells, onPickCells } = props;
  const picking = useMemo(() => ({
    picked: cells ?? EMPTY_CELLS,
    pick: (next: readonly Spot[]) => onPickCells?.(next),
  }), [cells, onPickCells]);
  return (
    <ReactFlowProvider>
      <NamingContext.Provider value={typing}>
        <CellsContext.Provider value={picking}>
          <Canvas {...props} />
        </CellsContext.Provider>
      </NamingContext.Provider>
    </ReactFlowProvider>
  );
}

/** One empty list, so the context never sees a fresh array. */
const EMPTY_CELLS: readonly Spot[] = [];
