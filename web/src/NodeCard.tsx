/** One card on the canvas.
 *
 *  A group shows what is inside it as a grid of chips, and a chip that is
 *  itself a group shows its own contents in miniature — so nesting is visible
 *  at every level without opening anything. Each chip's fill follows how
 *  closely its name relates to the group's, which makes a group that has drifted
 *  off topic look ragged rather than reading as tidy.
 *
 *  Contents are a preview, not the real nodes: opening a group is what makes
 *  its children editable. */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import { affinity, tile } from "./core/layout";
import type { Graph, Node } from "./core/types";

/** Below this a chip has no room for words, only its shade. */
const READABLE = 46;

export type CardData = {
  node: Node;
  graph: Graph;
  changed: boolean;
  dropping: boolean;
};

/** The contents of a group, laid out as a grid that recurses into subgroups. */
function Contents({ graph, id, size }: { graph: Graph; id: string; size: number }) {
  const kids = Object.values(graph.nodes).filter((n) => n.parent === id);
  if (!kids.length) return <span className="hollow">empty</span>;

  const { cols } = tile(kids.length);

  return (
    <div className="treemap" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {kids.map((kid) => {
        const cell = size / cols;

        return (
          <div
            key={kid.id}
            className={`cell ${kid.kind}`}
            title={kid.label}
            // Fill carries the affinity score; the floor keeps a weak match
            // visible rather than invisible.
            style={{ background: `rgba(74, 222, 128, ${0.08 + affinity(graph, kid) * 0.5})` }}
          >
            {kid.kind === "group" ? (
              <Contents graph={graph} id={kid.id} size={cell} />
            ) : (
              cell >= READABLE && <span className="tag">{kid.label}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const NodeCard = memo(({ data, selected }: NodeProps) => {
  const { node, graph, changed, dropping } = data as unknown as CardData;
  const group = node.kind === "group";
  const classes = ["card", node.kind, selected ? "picked" : "", changed ? "changed" : "",
                   dropping ? "dropping" : ""].join(" ");

  return (
    <div className={classes}>
      <Handle type="target" position={Position.Left} />

      <div className="card-head">
        <span className="label">{node.label}</span>
        {node.type && <span className="kind">{node.type}</span>}
      </div>

      {group && <Contents graph={graph} id={node.id} size={160} />}

      <Handle type="source" position={Position.Right} />
    </div>
  );
});
