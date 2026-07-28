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

const nodeTypes = { card: NodeCard };

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
  onFlip: (id: string) => void;
  onPlaceMany: (moved: { id: string; x: number; y: number }[]) => void;
  onArrange: (kind: Arrangement) => void;
  /** Right-angled routing instead of curves. */
  angular: boolean;
  onAngular: (on: boolean) => void;
  onUnlink: (id: string) => void;
  onDelete: (id: string) => void;
};

function Flow(props: Props) {
  const { graph, scope, view, path, touched, onSelect, onOpen, onUp, onNest } = props;
  const { onPromote, onCreateAt, onSprout, onLink, onRelation, onUnlink, onDelete } = props;
  const { onRename, onLift, onFlip, onPlaceMany, onArrange, angular, onAngular } = props;
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
        onSelect,
        onRename,
      },
    }));
  }, [graph, members, placementKey(members), scope, marked, dropping, onSelect, onRename]);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(built);

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
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
        minZoom={0.15}
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
        onNodeClick={(_, node) => onSelect(node.id)}
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
      >
        <Background gap={22} size={1} />
        <Controls />
      </ReactFlow>

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
