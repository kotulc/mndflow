/** Graph canvas. Renders the graph scoped to the selected object, marking
 *  whatever the last change touched so the user can see what just happened.
 *
 *  Editable throughout: drag to position, drag between handles to relate,
 *  double-click a relation to name it, Delete to remove. Selecting here
 *  selects in the explorer too — they are two views of one thing. */

import { useMemo, useState } from "react";
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { descendsFrom } from "./core/fold";
import type { Graph, Node as GraphNode } from "./core/types";

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

/** One layer: what sits directly inside the open group, and the relations
 *  between those things. Opening a group replaces the canvas with its contents
 *  rather than zooming into a corner of everything. */
function layer(graph: Graph, open: string | null): Graph {
  const here = open && graph.nodes[open] ? open : null;
  const nodes = Object.fromEntries(
    Object.values(graph.nodes)
      .filter((node) => (node.parent && graph.nodes[node.parent] ? node.parent : null) === here)
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
  const waiting: Record<string, number> = Object.fromEntries(nodes.map((n) => [n.id, 0]));
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
      position: { x: node.x ?? Number(level) * COLUMN, y: node.y ?? row * ROW },
      data: { label: node.label },
      style: {},
    })),
  );
}

/** Groups read as containers: dotted, translucent, and captioned with what is
 *  inside them. Whatever the last change touched is outlined in the accent. */
function style(node: GraphNode | undefined, changed: boolean) {
  const group = node?.kind === "group";

  return {
    border: `1px ${group ? "dashed" : "solid"} ${changed ? "#4ade80" : "#1e2f28"}`,
    background: changed ? "#12241a" : group ? "rgba(15,22,19,0.55)" : "#111a16",
    color: changed ? "#4ade80" : "#c8e6d0",
    borderRadius: 2,
    padding: 8,
    fontFamily: 'ui-monospace, "Cascadia Mono", Consolas, monospace',
    fontSize: 12,
    width: group ? 200 : 180,
    overflowWrap: "anywhere" as const,
  };
}

/** A glyph per child, so a closed group still shows how much is inside. */
function contents(graph: Graph, id: string): string {
  const kids = Object.values(graph.nodes).filter((n) => n.parent === id);
  if (!kids.length) return "";

  const glyphs = kids.slice(0, 6).map((k) => (k.kind === "group" ? "▧" : "▪")).join(" ");

  return `\n${glyphs}${kids.length > 6 ? ` +${kids.length - 6}` : ""}`;
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
  onLink: (source: string, target: string) => void;
  onRelation: (id: string, relation: string) => void;
  onUnlink: (id: string) => void;
  onDelete: (id: string) => void;
};

export function Canvas(props: Props) {
  const { graph, scope, view, path, touched, onSelect, onUp, onPlace, onLink } = props;
  const { onRelation, onUnlink, onDelete } = props;
  const marked = useMemo(() => new Set(touched), [touched]);
  const shown = useMemo(() => layer(graph, view), [graph, view]);
  const [naming, setNaming] = useState<string | null>(null);

  const nodes = useMemo(
    () =>
      layout(shown).map((node) => {
        const source = shown.nodes[node.id];

        return {
          ...node,
          data: {
            label: `${source?.label ?? ""}${source ? contents(graph, source.id) : ""}`,
          },
          selected: node.id === scope,
          style: style(source, marked.has(node.id)),
        };
      }),
    [shown, graph, marked, scope],
  );

  const edges: Edge[] = useMemo(
    () =>
      Object.values(shown.edges).map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.relation,
        style: { stroke: marked.has(edge.target) ? "#4ade80" : "#2f4a3e" },
      })),
    [shown, marked],
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
            <button
              onClick={() => onSelect(id)}
              className={index === path.length - 1 ? "here" : ""}
            >
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
        fitView
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneClick={() => setNaming(null)}
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
            defaultValue={shown.edges[naming]?.relation ?? ""}
            placeholder="what is this relation?"
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
