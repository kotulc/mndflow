/** Graph canvas: one layer of the object graph, editable throughout.
 *
 *  Positions are held by React Flow while a drag is in progress and committed
 *  to the log on release — otherwise a node would not move until it landed.
 *
 *  Gestures: drag to position, drop one node on another to put it inside,
 *  double-click empty space to make something, drag a link into empty space to
 *  make and attach something, double-click a relation to name it, Delete to
 *  remove. Selecting here selects in the explorer too. */

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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { isGroup } from "./core/fold";
import { LEAF, place, sizeOf, type Arrangement } from "./core/layout";
import type { Graph } from "./core/types";
import { LIFTED, NodeCard } from "./NodeCard";
import { RegionFrame } from "./RegionFrame";

const nodeTypes = { card: NodeCard, region: RegionFrame };

/** Objects sitting directly inside the open group. */
function layerOf(graph: Graph, open: string | null) {
  const here = open && graph.nodes[open] ? open : null;

  return Object.values(graph.nodes).filter(
    (node) => (node.parent && graph.nodes[node.parent] ? node.parent : null) === here,
  );
}

type Props = {
  graph: Graph;
  scope: string | null;
  view: string | null;
  path: string[];
  touched: string[];
  onSelect: (id: string | null) => void;
  onPick: (id: string) => void;
  onOpen: (id: string) => void;
  onUp: () => void;
  onNest: (id: string, parent: string) => void;
  onPromote: (id: string, parent: string | null) => void;
  onCreateAt: (label: string, x: number, y: number) => void;
  onSprout: (from: string, label: string, x: number, y: number) => void;
  onRename: (id: string, label: string) => void;
  onLift: (id: string, x: number, y: number) => void;
  onLink: (source: string, target: string, from?: string, to?: string) => void;
  onRelation: (id: string, relation: string) => void;
  onReanchor: (id: string, from?: string, to?: string) => void;
  onFlip: (id: string) => void;
  onPlaceMany: (moved: { id: string; x: number; y: number }[]) => void;
  onArrange: (kind: Arrangement) => void;
  /** Right-angled routing instead of curves. */
  angular: boolean;
  onAngular: (on: boolean) => void;
  onUnlink: (id: string) => void;
  onDelete: (id: string) => void;
  onRegion: (members: string[], color: string) => void;
  onRenameRegion: (id: string, label: string) => void;
  onResizeRegion: (id: string, x: number, y: number, w: number, h: number) => void;
  onDropRegion: (id: string) => void;
  pickedRegion: string | null;
  onPickRegion: (id: string) => void;
};

/** Default tint for a freshly grouped selection; edited afterwards from the
 *  frame's own swatch. Distinct from the accent green (picked/changed) and
 *  the crossing-edge violet, so a region reads as its own thing. */
const REGION_COLOR = "#d9a441";

function Flow(props: Props) {
  const { graph, scope, view, path, touched, onSelect, onPick, onOpen, onUp, onNest } = props;
  const { onPromote, onCreateAt, onSprout, onLink, onRelation, onUnlink, onDelete } = props;
  const { onRename, onLift, onFlip, onReanchor, onPlaceMany, onArrange, angular, onAngular } = props;
  const { onRegion, onRenameRegion, onResizeRegion } = props;
  const { onDropRegion, pickedRegion, onPickRegion } = props;
  const flow = useReactFlow();
  const [naming, setNaming] = useState<string | null>(null);
  const [naming2, setNaming2] = useState<{ x: number; y: number; from?: string } | null>(null);
  /** The node a dragged card is currently hovering over. */
  const [dropping, setDropping] = useState<string | null>(null);
  const dropRef = useRef<string | null>(null);
  /** The card under the pointer right now, if any. */
  const heldRef = useRef<string | null>(null);
  /** The frame, so a drag can tell whether it ended outside the layer. */
  const frameRef = useRef<HTMLDivElement>(null);

  const members = useMemo(() => layerOf(graph, view), [graph, view]);
  const marked = useMemo(() => new Set(touched), [touched]);

  const built = useMemo<FlowNode[]>(() => {
    const spots = place(graph, members);

    return members.map((node) => ({
      id: node.id,
      type: "card",
      position: spots[node.id] ?? { x: 0, y: 0 },
      data: {
        node,
        graph,
        changed: marked.has(node.id),
        dropping: dropping === node.id,
        // The explorer's selection, kept apart from the canvas's own so that
        // one card being looked at cannot cancel a box selection.
        picked: node.id === scope,
        onPick,
        onOpen,
        onRename,
      },
    }));
  }, [graph, members, placementKey(members), scope, marked, dropping, onPick, onOpen, onRename]);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(built);

  /** Cards currently box-selected — enough to offer turning them into a
   *  region, once there is more than one. Read straight off the nodes React
   *  Flow already tracks rather than a separate selection-change listener,
   *  which is prone to looping against the library's own selection store. */
  const boxed = useMemo(() => nodes.filter((n) => n.selected).map((n) => n.id), [nodes]);

  /** Colored frames drawn behind the cards, one per region that still has
   *  more than one live member in the open layer. Uses React Flow's own
   *  measured node bounds rather than this file's own size estimate, which
   *  is only ever an approximation for auto-layout spacing — a group card
   *  can render wider than that estimate, and a frame built from the guess
   *  would then clip the very card it's supposed to contain. */
  const regionNodes = useMemo<FlowNode[]>(() => {
    const pad = 22;

    return Object.values(graph.regions)
      .map((region) => {
        const here = region.members.filter((id) => graph.nodes[id]?.parent === view);
        if (here.length < 2) return null;

        // A frame the user has resized keeps that size; only an untouched
        // one still follows its members automatically, the same way a node
        // keeps a dragged position instead of the auto-layout's guess.
        let box: { x: number; y: number; width: number; height: number };
        if (region.x !== null && region.y !== null && region.w !== null && region.h !== null) {
          box = { x: region.x, y: region.y, width: region.w, height: region.h };
        } else {
          const auto = flow.getNodesBounds(here);
          if (!auto.width || !auto.height) return null;
          box = { x: auto.x - pad, y: auto.y - pad, width: auto.width + pad * 2, height: auto.height + pad * 2 };
        }

        return {
          id: region.id,
          type: "region",
          position: { x: box.x, y: box.y },
          // Stated directly rather than left for the resize observer to
          // discover it later: we already know the size, and a node stays
          // invisible *and unclickable* until measured — which silently ate
          // clicks meant for the frame's own controls — while the resize
          // handles specifically read `measured`, not `width`/`height`, as
          // their drag baseline and would start from zero without it too.
          width: box.width,
          height: box.height,
          measured: { width: box.width, height: box.height },
          // No explicit z-index: a negative one renders behind React Flow's
          // own pane, not just behind the cards, which swallowed clicks meant
          // for the frame's own controls. Coming first in the nodes array
          // already keeps it visually behind the cards that follow it.
          style: { width: box.width, height: box.height },
          draggable: false,
          selectable: false,
          data: {
            label: region.label,
            color: region.color,
            picked: pickedRegion === region.id,
            onPick: () => onPickRegion(region.id),
            onLabel: (label: string) => onRenameRegion(region.id, label),
            onRemove: () => onDropRegion(region.id),
            onResize: (x: number, y: number, w: number, h: number) =>
              onResizeRegion(region.id, x, y, w, h),
          },
        } as FlowNode;
      })
      .filter((n): n is FlowNode => n !== null);
  }, [graph, view, nodes, flow, pickedRegion, onPickRegion, onRenameRegion, onResizeRegion,
      onDropRegion]);

  // React Flow owns positions during a drag; the graph owns them otherwise.
  // The card being dragged keeps the position React Flow is giving it, or
  // hovering over a drop target would snap it back to where it started.
  useEffect(() => {
    setNodes((current) => {
      const held = heldRef.current;
      const chosen = new Map(current.map((n) => [n.id, n.selected]));

      return built.map((n) => {
        const same = { ...n, selected: chosen.get(n.id) ?? false };
        const at = n.id === held ? current.find((c) => c.id === held)?.position : null;

        return at ? { ...same, position: at } : same;
      });
    });
  }, [built, setNodes]);

  /** Edges as the graph describes them, before React Flow adds selection. */
  const built_edges: Edge[] = useMemo(() => {
    const here = new Set(members.map((n) => n.id));

    /** Whichever node in this layer stands for `id` — itself, or the group
     *  containing it. A relation into something nested still has to be
     *  visible from outside, or it looks as though nothing happened. */
    const standIn = (id: string): string | null => {
      let cursor: string | null = id;
      while (cursor) {
        if (here.has(cursor)) return cursor;
        cursor = graph.nodes[cursor]?.parent ?? null;
      }

      return null;
    };

    return Object.values(graph.edges)
      .map((edge) => ({ edge, source: standIn(edge.source), target: standIn(edge.target) }))
      .filter((e) => e.source && e.target && e.source !== e.target)
      .map(({ edge, source, target }) => {
        const inner = edge.source !== source || edge.target !== target;

        // A relation into something nested says so, and names what it
        // actually reaches — a dashed line alone does not tell you that.
        const reaches = inner ? graph.nodes[edge.target]?.label : "";
        const label = inner
          ? `${edge.relation || "→"}  ↳ ${reaches}`
          : edge.relation;

        return {
          id: edge.id,
          source: source!,
          target: target!,
          label,
          type: angular ? "smoothstep" : "default",
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16,
                       color: marked.has(edge.target) ? "#4ade80" : "#3f6552" },
          // Whatever the edge was tied to, or sensible ends when it was made
          // by the conversation rather than by hand. Without naming them, an
          // edge takes the first anchor — the left — and loops back on itself.
          sourceHandle: inner ? "right-s-0" : edge.from || "right-s-0",
          targetHandle: inner ? "left-t-0" : edge.to || "left-t-0",
          // Stated on the edge rather than left to the container's defaults,
          // so a relation is always clickable and always deletable.
          selectable: true,
          focusable: true,
          interactionWidth: 18,
          // Lets either end be dragged onto a different anchor.
          reconnectable: true,
          className: inner ? "crossing" : "",
          style: marked.has(edge.source) && marked.has(edge.target)
            ? { stroke: "#4ade80", strokeWidth: 2 }
            : { stroke: "#2f4a3e", strokeDasharray: inner ? "4 3" : undefined },
        };
      });
  }, [graph, members, marked, angular]);

  // Edges need their own change handler for the same reason nodes do: without
  // one React Flow has nowhere to record a selection, so clicking a relation
  // did nothing at all.
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(built_edges);
  useEffect(() => setEdges(built_edges), [built_edges, setEdges]);


  // Refit on a layer change, and when the layer gains or loses something —
  // an answer, a chip, a drag between groups, an undo. Keyed on who is here
  // rather than how many: moving between two layers of the same size would
  // otherwise leave the viewport pointing at nothing.
  //
  // Deliberately *not* keyed on the selection. Selecting is a glance, and a
  // canvas that chases every click is impossible to work on.
  const population = members.map((n) => n.id).sort().join(",");
  useEffect(() => {
    const timer = setTimeout(
      () => flow.fitView({ duration: 320, padding: 0.18, maxZoom: 1.3 }),
      40,
    );

    return () => clearTimeout(timer);
  }, [flow, view, population]);

  /** How far the canvas may be panned: everything in this layer, plus room on
   *  every side to put something new. It grows as the layer does, so there is
   *  always somewhere to work but never an empty void to get lost in. */
  const extent = useMemo<[[number, number], [number, number]]>(() => {
    const spots = place(graph, members);
    const boxes = members.map((node) => {
      const at = spots[node.id] ?? { x: 0, y: 0 };
      const size = sizeOf(graph, node);

      return { x1: at.x, y1: at.y, x2: at.x + size.w, y2: at.y + size.h };
    });
    const room = 520;
    const left = Math.min(0, ...boxes.map((b) => b.x1)) - room;
    const top = Math.min(0, ...boxes.map((b) => b.y1)) - room;
    const right = Math.max(LEAF.w, ...boxes.map((b) => b.x2)) + room;
    const bottom = Math.max(LEAF.h, ...boxes.map((b) => b.y2)) + room;

    return [[left, top], [right, bottom]];
  }, [graph, members, placementKey(members)]);

  /** Whichever card the dragged one is sitting on top of. */
  const overlapping = useCallback(
    (dragged: FlowNode) => {
      const hits = flow.getIntersectingNodes(dragged).filter((n) => n.id !== dragged.id);

      return hits.length ? hits[hits.length - 1].id : null;
    },
    [flow],
  );

  return (
    <>
      <div className="crumbs">
        <button onClick={() => onSelect(null)} className={view ? "" : "here"}>
          {graph.title || "project"}
        </button>
        {path.map((id, index) => (
          <span key={id}>
            <span className="sep">/</span>
            <button onClick={() => onSelect(id)} className={index === path.length - 1 ? "here" : ""}>
              {graph.nodes[id]?.label}
            </button>
          </span>
        ))}
        {view && (
          <button className="up" onClick={onUp} title="Up one layer">
            ↑
          </button>
        )}
      </div>

      {view && graph.nodes[view] && (
        <div className="layer-frame" ref={frameRef} aria-hidden>
          <span className="layer-name">{graph.nodes[view].label}</span>
        </div>
      )}

      <div className="arrange">
        {(["grid", "row", "column", "flow"] as const).map((kind) => (
          <button key={kind} onClick={() => onArrange(kind)} title={`Arrange as ${kind}`}>
            {kind}
          </button>
        ))}
        <button
          className={angular ? "on" : ""}
          onClick={() => onAngular(!angular)}
          title="Right angles instead of curves"
        >
          {angular ? "⌐ angles" : "~ curves"}
        </button>
      </div>

      <ReactFlow
        nodes={[...regionNodes, ...nodes]}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
        minZoom={0.15}
        // Double-click has its own meaning here — make something, or step
        // back out — so the library's own double-click-to-zoom would fight it.
        zoomOnDoubleClick={false}
        nodesDraggable
        nodesConnectable
        panOnDrag={[1, 2]}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        panOnScroll
        multiSelectionKeyCode={["Shift", "Meta", "Control"]}
        elementsSelectable
        edgesFocusable
        // Backspace alone is the library's default, which is why Delete
        // appeared to do nothing to a selected node or relation.
        deleteKeyCode={["Delete", "Backspace"]}
        translateExtent={extent}
        // A region's own click handler picks it for the context pane; this
        // one is for cards only, or it would immediately clear that pick.
        onNodeClick={(_, node) => node.type !== "region" && onSelect(node.id)}
        onNodeDoubleClick={(_, node) => isGroup(graph, node.id) && onOpen(node.id)}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes(LIFTED)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onDrop={(event) => {
          const lifted = event.dataTransfer.getData(LIFTED);
          if (!lifted) return;

          event.preventDefault();
          const at = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
          onLift(lifted, at.x - LEAF.w / 2, at.y - LEAF.h / 2);
        }}
        onPaneClick={() => (setNaming(null), setNaming2(null))}
        onDoubleClick={(event) => {
          // Only the empty canvas makes something new. A card renames itself
          // and a relation names itself, and both sit inside this handler's
          // reach — without excluding them, naming a relation also created a
          // node underneath it.
          const on = (what: string) => (event.target as HTMLElement).closest(what);
          if (on(".react-flow__node") || on(".react-flow__edge") || on(".floating")) return;

          // Outside the frame is "leave", not "make" — there is nothing to
          // put a new node into out there, only the layer above to return to.
          const frame = frameRef.current?.getBoundingClientRect();
          if (view && frame) {
            const out = event.clientX < frame.left || event.clientX > frame.right ||
                        event.clientY < frame.top || event.clientY > frame.bottom;
            if (out) return onUp();
          }

          const at = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
          setNaming2({ x: at.x - LEAF.w / 2, y: at.y - LEAF.h / 2 });
        }}
        onNodeDragStart={(_, node) => (heldRef.current = node.id)}
        onNodeDrag={(_, node) => {
          // Only re-render when the target actually changes, not every pixel.
          const hit = overlapping(node);
          if (hit === dropRef.current) return;

          dropRef.current = hit;
          setDropping(hit);
        }}
        onNodeDragStop={(event, node, dragged) => {
          const into = dropRef.current;
          dropRef.current = null;
          heldRef.current = null;
          setDropping(null);

          // Dropped on another card: that card becomes its container.
          if (into) return onNest(node.id, into);

          // Pushed past the edge of the frame, while inside a layer: it
          // belongs to whatever contains this layer. The card's own middle is
          // what counts, not the pointer — you aim with the card you can see.
          const frame = frameRef.current?.getBoundingClientRect();
          const card = document
            .querySelector(`.react-flow__node[data-id="${node.id}"]`)
            ?.getBoundingClientRect();

          if (view && frame && card) {
            const x = card.left + card.width / 2;
            const y = card.top + card.height / 2;
            const out = x < frame.left || x > frame.right || y < frame.top || y > frame.bottom;
            if (out) return onPromote(node.id, graph.nodes[view]?.parent ?? null);
          }

          // A selection dragged together lands together.
          const moved = (dragged?.length ? dragged : [node])
            .map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }));
          onPlaceMany(moved);
        }}
        onConnect={({ source, target, sourceHandle, targetHandle }) => {
          // A chip's anchor names the child it belongs to, so a relation can
          // reach inside a group; anything else is an anchor on the card.
          const inside = (handle: string | null) => handle?.startsWith("child:");
          const from = inside(sourceHandle) ? sourceHandle!.slice(6) : source;
          const to = inside(targetHandle) ? targetHandle!.slice(6) : target;
          if (!from || !to || from === to) return;

          onLink(from, to,
                 inside(sourceHandle) ? undefined : sourceHandle ?? undefined,
                 inside(targetHandle) ? undefined : targetHandle ?? undefined);
        }}
        onConnectEnd={(event, state) => {
          if (state.toNode || !state.fromNode) return;
          const point = "clientX" in event ? event : event.changedTouches[0];
          const at = flow.screenToFlowPosition({ x: point.clientX, y: point.clientY });
          setNaming2({ x: at.x - LEAF.w / 2, y: at.y - LEAF.h / 2, from: state.fromNode.id });
        }}
        onEdgeDoubleClick={(_, edge) => setNaming(edge.id)}
        onNodesDelete={(gone) => gone.forEach((node) => onDelete(node.id))}
        onEdgesDelete={(gone) => gone.forEach((edge) => onUnlink(edge.id))}
        onReconnect={(oldEdge, connection) => {
          // A chip's anchor names the child it belongs to, matching onConnect.
          const inside = (handle: string | null | undefined) => handle?.startsWith("child:");
          const from = inside(connection.sourceHandle)
            ? connection.sourceHandle!.slice(6) : connection.source;
          const to = inside(connection.targetHandle)
            ? connection.targetHandle!.slice(6) : connection.target;
          if (!from || !to) return;

          // Only the anchor may move this way — dropping on a different card
          // would rewire what the relation actually connects, which a plain
          // drag has no business deciding on its own.
          if (from !== oldEdge.source || to !== oldEdge.target) return;

          onReanchor(oldEdge.id,
                     inside(connection.sourceHandle) ? undefined : connection.sourceHandle ?? undefined,
                     inside(connection.targetHandle) ? undefined : connection.targetHandle ?? undefined);
        }}
      >
        <Background gap={22} size={1} />
        <Controls />
      </ReactFlow>

      {boxed.length > 1 && (
        <div className="grouping">
          <span>{boxed.length} selected</span>
          <button onClick={() => onRegion(boxed, REGION_COLOR)}>Group</button>
        </div>
      )}

      {naming && (
        <div className="floating">
          <span className="caret">&gt;</span>
          <input
            autoFocus
            defaultValue={graph.edges[naming]?.relation ?? ""}
            placeholder="what is this relation?"
            list="relation-kinds"
            onKeyDown={(event) => {
              if (event.key === "Enter") onRelation(naming, event.currentTarget.value);
              if (event.key === "Enter" || event.key === "Escape") setNaming(null);
            }}
          />
          <datalist id="relation-kinds">
            {graph.relations.map((name) => <option key={name} value={name} />)}
          </datalist>
          <button onClick={() => (onFlip(naming), setNaming(null))} title="Turn it around">
            ⇄
          </button>
          <button onClick={() => (onUnlink(naming), setNaming(null))} title="Remove it">
            ✕
          </button>
        </div>
      )}

      {naming2 && (
        <div className="floating">
          <span className="caret">+</span>
          <input
            autoFocus
            placeholder={naming2.from ? "name the thing it connects to" : "name it"}
            onBlur={() => setNaming2(null)}
            onKeyDown={(event) => {
              const text = event.currentTarget.value.trim();
              if (event.key === "Enter" && text) {
                naming2.from
                  ? onSprout(naming2.from, text, naming2.x, naming2.y)
                  : onCreateAt(text, naming2.x, naming2.y);
              }
              if (event.key === "Enter" || event.key === "Escape") setNaming2(null);
            }}
          />
        </div>
      )}
    </>
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
