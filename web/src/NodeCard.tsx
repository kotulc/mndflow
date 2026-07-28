/** One card on the canvas.
 *
 *  A group shows what is inside it as a grid of chips, and a chip that is
 *  itself a group shows its own contents in miniature — so nesting is visible
 *  at every level without opening anything. Each chip's fill follows how
 *  closely its name relates to the group's, which makes a group that has
 *  drifted off topic look ragged rather than reading as tidy.
 *
 *  The chips are live: clicking one selects that object, and dragging one onto
 *  the canvas lifts it back out of the group. */

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import { isGroup } from "./core/fold";
import { affinity, tile } from "./core/layout";
import type { Graph, Node } from "./core/types";
import { useEmbeddings } from "./useEmbeddings";

/** Below this a chip has no room for words, only its shade. */
const READABLE = 46;
/** Evenly spaced offsets along one edge, as percentages. */
function spread(count: number): number[] {
  return Array.from({ length: count }, (_, i) => ((i + 1) / (count + 1)) * 100);
}

/** Where a card can be joined: four anchors on a plain node, one per side.
 *  Something holding contents is wider than it is tall, so it gets a second
 *  anchor along the top and the bottom — six in all. */
function anchorsFor(group: boolean) {
  const ends = group ? 2 : 1;

  return [
    { position: Position.Left, along: spread(1), axis: "top" as const },
    { position: Position.Right, along: spread(1), axis: "top" as const },
    { position: Position.Top, along: spread(ends), axis: "left" as const },
    { position: Position.Bottom, along: spread(ends), axis: "left" as const },
  ];
}
/** What a dragged chip carries, so the canvas knows what was let go of. */
export const LIFTED = "application/mndflow-node";

export type CardData = {
  node: Node;
  graph: Graph;
  changed: boolean;
  dropping: boolean;
  picked: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, label: string) => void;
};

type ContentsProps = {
  graph: Graph;
  id: string;
  size: number;
  onSelect: (id: string) => void;
};

/** The contents of a group, laid out as a grid that recurses into subgroups. */
function Contents({ graph, id, size, onSelect }: ContentsProps) {
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
            className={`cell nodrag ${isGroup(graph, kid.id) ? "group" : "object"}`}
            title={`${kid.label} — drag onto the canvas to lift it out`}
            draggable
            onDragStart={(event) => {
              event.stopPropagation();
              event.dataTransfer.setData(LIFTED, kid.id);
              event.dataTransfer.effectAllowed = "move";
            }}
            onClick={(event) => (event.stopPropagation(), onSelect(kid.id))}
            // Fill carries the affinity score; the floor keeps a weak match
            // visible rather than invisible.
            style={{ background: `rgba(74, 222, 128, ${0.08 + affinity(graph, kid) * 0.5})` }}
          >
            {isGroup(graph, kid.id) ? (
              <Contents graph={graph} id={kid.id} size={cell} onSelect={onSelect} />
            ) : (
              cell >= READABLE && <span className="tag">{kid.label}</span>
            )}

            <Handle
              type="target"
              id={`child:${kid.id}`}
              position={Position.Left}
              className="chip-handle"
            />
            <Handle
              type="source"
              id={`child:${kid.id}`}
              position={Position.Right}
              className="chip-handle"
            />
          </div>
        );
      })}
    </div>
  );
}

export const NodeCard = memo(({ data, selected }: NodeProps) => {
  const { node, graph, changed, dropping, picked, onSelect, onRename } =
    data as unknown as CardData;
  const [editing, setEditing] = useState(false);
  // Shading follows affinity, which is only known once vectors exist.
  useEmbeddings();

  const group = isGroup(graph, node.id);
  const classes = ["card", group ? "group" : "object",
                   selected || picked ? "picked" : "",
                   selected ? "chosen" : "",
                   changed ? "changed" : "", dropping ? "dropping" : ""].join(" ");

  function rename(value: string) {
    const wanted = value.trim();
    if (wanted && wanted !== node.label) onRename(node.id, wanted);

    setEditing(false);
  }

  const sides = anchorsFor(group);

  return (
    <div className={classes}>
      {/* Every anchor is both a source and a target, so a relation can start or
          end at any of them. */}
      {sides.map(({ position, along, axis }) =>
        along.map((at, index) => (
          <span key={`${position}-${index}`}>
            <Handle
              type="target"
              id={`${position}-t-${index}`}
              position={position}
              style={{ [axis]: `${at}%` }}
            />
            <Handle
              type="source"
              id={`${position}-s-${index}`}
              position={position}
              style={{ [axis]: `${at}%` }}
            />
          </span>
        )),
      )}

      <div className="card-head">
        {editing ? (
          <input
            className="rename"
            autoFocus
            defaultValue={node.label}
            onPointerDown={(event) => event.stopPropagation()}
            onBlur={(event) => rename(event.target.value)}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter") rename(event.currentTarget.value);
              if (event.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <span
            className="label"
            title="double-click to rename"
            onDoubleClick={(event) => (event.stopPropagation(), setEditing(true))}
          >
            {node.label}
          </span>
        )}
        {node.type && !editing && <span className="kind">{node.type}</span>}
      </div>

      {group && <Contents graph={graph} id={node.id} size={160} onSelect={onSelect} />}
    </div>
  );
});
