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
  useNodesState,
  useReactFlow,
  type Edge,
  type Node as FlowNode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { LEAF, place } from "./core/layout";
import type { Graph } from "./core/types";
import { NodeCard } from "./NodeCard";

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
  onUp: () => void;
  onPlace: (id: string, x: number, y: number) => void;
  onNest: (id: string, parent: string) => void;
  onCreateAt: (label: string, x: number, y: number) => void;
  onSprout: (from: string, label: string, x: number, y: number) => void;
  onLink: (source: string, target: string) => void;
  onRelation: (id: string, relation: string) => void;
  onUnlink: (id: string) => void;
  onDelete: (id: string) => void;
};

function Flow(props: Props) {
  const { graph, scope, view, path, touched, onSelect, onUp, onPlace, onNest } = props;
  const { onCreateAt, onSprout, onLink, onRelation, onUnlink, onDelete } = props;
  const flow = useReactFlow();
  const [naming, setNaming] = useState<string | null>(null);
  const [naming2, setNaming2] = useState<{ x: number; y: number; from?: string } | null>(null);
  /** The node a dragged card is currently hovering over. */
  const [dropping, setDropping] = useState<string | null>(null);
  const dropRef = useRef<string | null>(null);
  /** The card under the pointer right now, if any. */
  const heldRef = useRef<string | null>(null);

  const members = useMemo(() => layerOf(graph, view), [graph, view]);
  const marked = useMemo(() => new Set(touched), [touched]);

  const built = useMemo<FlowNode[]>(() => {
    const spots = place(graph, members);

    return members.map((node) => ({
      id: node.id,
      type: "card",
      position: spots[node.id] ?? { x: 0, y: 0 },
      selected: node.id === scope,
      data: {
        node,
        graph,
        changed: marked.has(node.id),
        dropping: dropping === node.id,
      },
    }));
  }, [graph, members, placementKey(members), scope, marked, dropping]);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(built);

  // React Flow owns positions during a drag; the graph owns them otherwise.
  // The card being dragged keeps the position React Flow is giving it, or
  // hovering over a drop target would snap it back to where it started.
  useEffect(() => {
    setNodes((current) => {
      const held = heldRef.current;
      const at = held && current.find((n) => n.id === held)?.position;
      if (!held || !at) return built;

      return built.map((n) => (n.id === held ? { ...n, position: at } : n));
    });
  }, [built, setNodes]);

  const edges: Edge[] = useMemo(() => {
    const here = new Set(members.map((n) => n.id));

    return Object.values(graph.edges)
      .filter((edge) => here.has(edge.source) && here.has(edge.target))
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.relation,
        style: { stroke: marked.has(edge.target) ? "#4ade80" : "#2f4a3e" },
      }));
  }, [graph, members, marked]);

  // Centre on whatever the explorer selected, so navigating the tree moves the
  // canvas to match instead of leaving the user to find it.
  useEffect(() => {
    const shown = members.map((n) => n.id);
    const target = scope && shown.includes(scope) ? [{ id: scope }] : undefined;
    const timer = setTimeout(
      () => flow.fitView({ nodes: target, duration: 350, padding: target ? 0.45 : 0.2, maxZoom: 1.3 }),
      30,
    );

    return () => clearTimeout(timer);
  }, [flow, view, scope]);

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

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
        minZoom={0.15}
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneClick={() => (setNaming(null), setNaming2(null))}
        onDoubleClick={(event) => {
          // Only the empty canvas makes something new; a card handles its own.
          if ((event.target as HTMLElement).closest(".react-flow__node")) return;
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
        onNodeDragStop={(_, node) => {
          const into = dropRef.current;
          dropRef.current = null;
          heldRef.current = null;
          setDropping(null);
          // Dropped on another card: it becomes the container. Otherwise the
          // card simply stays where it was let go.
          if (into) onNest(node.id, into);
          else onPlace(node.id, node.position.x, node.position.y);
        }}
        onConnect={({ source, target }) => source && target && onLink(source, target)}
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
            onBlur={() => setNaming(null)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onRelation(naming, event.currentTarget.value);
              if (event.key === "Enter" || event.key === "Escape") setNaming(null);
            }}
          />
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
