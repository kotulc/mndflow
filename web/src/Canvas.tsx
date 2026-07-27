/** Graph canvas. Renders the graph scoped to the selected document, marking
 *  whatever the last turn touched so the user can see what their answer just
 *  did — the only signal that a change landed, since nothing is confirmed. */

import { useMemo, useState } from "react";
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { Graph, Node as GraphNode } from "./api";

const COLUMN = 240;
const ROW = 110;

function depth(graph: Graph, id: string): number {
  let level = 0;
  let cursor = graph.nodes[id]?.parent;

  while (cursor && graph.nodes[cursor] && level < 20) {
    level += 1;
    cursor = graph.nodes[cursor].parent;
  }

  return level;
}

/** Whether a node sits anywhere beneath `root` in the hierarchy. */
function under(graph: Graph, node: GraphNode, root: string): boolean {
  let cursor = node.parent;

  while (cursor && graph.nodes[cursor]) {
    if (cursor === root) return true;
    cursor = graph.nodes[cursor].parent;
  }

  return false;
}

/** Graph reduced to one document and everything nested beneath it. A missing
 *  root — an undone node, say — falls back to showing the whole project. */
function scoped(graph: Graph, root: string | null): Graph {
  if (!root || !graph.nodes[root]) return graph;

  const nodes = Object.fromEntries(
    Object.values(graph.nodes)
      .filter((node) => node.id === root || under(graph, node, root))
      .map((node) => [node.id, node]),
  );
  const edges = Object.fromEntries(
    Object.values(graph.edges)
      .filter((edge) => edge.source in nodes && edge.target in nodes)
      .map((edge) => [edge.id, edge]),
  );

  return { ...graph, nodes, edges };
}

/** Order within a column. A directed edge between two nodes in the same column
 *  puts the target after the source, so a sequence reads top to bottom.
 *  Whatever the edges leave unordered keeps its existing order. */
function sequence(nodes: GraphNode[], graph: Graph): GraphNode[] {
  const here = new Map(nodes.map((node) => [node.id, node]));
  const next: Record<string, string[]> = {};
  const waiting: Record<string, number> = Object.fromEntries(nodes.map((node) => [node.id, 0]));
  const seen = new Set<string>();

  for (const edge of Object.values(graph.edges)) {
    const pair = `${edge.source}>${edge.target}`;
    if (!here.has(edge.source) || !here.has(edge.target) || seen.has(pair)) continue;

    seen.add(pair);
    (next[edge.source] ??= []).push(edge.target);
    waiting[edge.target] += 1;
  }

  const ready = nodes.filter((node) => waiting[node.id] === 0);
  const ordered: GraphNode[] = [];

  while (ready.length) {
    const node = ready.shift()!;
    ordered.push(node);

    for (const id of next[node.id] ?? []) {
      waiting[id] -= 1;
      if (waiting[id] === 0) ready.push(here.get(id)!);
    }
  }

  // A cycle leaves nodes unplaced; append them so none ever vanish.
  return [...ordered, ...nodes.filter((node) => !ordered.includes(node))];
}

/** Column-per-depth placement — enough to read the hierarchy without a layout
 *  dependency. A node the user has dragged keeps where they put it: automatic
 *  layout should never argue with a position somebody chose. */
function layout(graph: Graph): Node[] {
  const columns: Record<number, GraphNode[]> = {};

  for (const node of Object.values(graph.nodes)) {
    (columns[depth(graph, node.id)] ??= []).push(node);
  }

  return Object.entries(columns).flatMap(([level, nodes]) =>
    sequence(nodes, graph).map((node, row) => ({
      id: node.id,
      position: {
        x: node.x ?? Number(level) * COLUMN,
        y: node.y ?? row * ROW,
      },
      data: { label: node.label },
      style: {},
    })),
  );
}

function style(changed: boolean, isGroup: boolean) {
  return {
    border: changed ? "1px solid #4ade80" : "1px solid #1e2f28",
    background: changed ? "#12241a" : isGroup ? "#0f1613" : "#111a16",
    color: changed ? "#4ade80" : "#c8e6d0",
    borderStyle: isGroup ? "dashed" : "solid",
    borderRadius: 2,
    padding: 8,
    fontFamily: 'ui-monospace, "Cascadia Mono", Consolas, monospace',
    fontSize: 12,
    width: 180,
    overflowWrap: "anywhere" as const,
  };
}

type Props = {
  graph: Graph;
  scope: string | null;
  touched: string[];
  busy: boolean;
  onSelect: (id: string | null) => void;
  onPlace: (id: string, x: number, y: number) => void;
  onLink: (source: string, target: string) => void;
  onRelation: (id: string, relation: string) => void;
  onUnlink: (id: string) => void;
  onDelete: (id: string) => void;
};

export function Canvas(props: Props) {
  const { graph, scope, touched, busy, onSelect, onPlace, onLink } = props;
  const { onRelation, onUnlink, onDelete } = props;
  const marked = useMemo(() => new Set(touched), [touched]);
  const view = useMemo(() => scoped(graph, scope), [graph, scope]);
  const [naming, setNaming] = useState<string | null>(null);

  const nodes = useMemo(
    () =>
      layout(view).map((node) => ({
        ...node,
        style: style(marked.has(node.id), view.nodes[node.id]?.kind === "group"),
      })),
    [view, marked],
  );

  const edges: Edge[] = useMemo(
    () =>
      Object.values(view.edges).map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.relation,
        style: { stroke: marked.has(edge.target) ? "#4ade80" : "#2f4a3e" },
      })),
    [view, marked],
  );

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
        nodesDraggable={!busy}
        nodesConnectable={!busy}
        elementsSelectable
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneClick={() => (setNaming(null), onSelect(null))}
        onNodeDragStop={(_, node) => onPlace(node.id, node.position.x, node.position.y)}
        onConnect={({ source, target }) => source && target && onLink(source, target)}
        onEdgeDoubleClick={(_, edge) => setNaming(edge.id)}
        onNodesDelete={(gone) => gone.forEach((node) => onDelete(node.id))}
        onEdgesDelete={(gone) => gone.forEach((edge) => onUnlink(edge.id))}
      >
        <Background />
        <Controls />
      </ReactFlow>

      {naming && (
        <div className="relation">
          <span className="caret">&gt;</span>
          <input
            autoFocus
            defaultValue={view.edges[naming]?.relation ?? ""}
            placeholder="what is this relation?"
            disabled={busy}
            onBlur={() => setNaming(null)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onRelation(naming, event.currentTarget.value);
                setNaming(null);
              }
              if (event.key === "Escape") setNaming(null);
            }}
          />
        </div>
      )}
    </>
  );
}
