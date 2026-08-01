/** The far end of a relationship that leaves this layer.
 *
 *  A relationship reaching outside the current scope is not a different kind
 *  of relationship, only a different drawing of one: it anchors to a
 *  semi-transparent placeholder with a dashed boundary, named for what it
 *  actually reaches, so the diagram says plainly that something continues
 *  elsewhere instead of ending in nothing. */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export type GhostData = {
  label: string;
  /** The real node this stands for, so double-clicking can go there. */
  target: string;
  onOpen: (id: string) => void;
};

export const Ghost = memo(({ data }: NodeProps) => {
  const { label, target, onOpen } = data as unknown as GhostData;

  return (
    <div
      className="ghost"
      title={`${label} — elsewhere in the project`}
      onDoubleClick={(event) => (event.stopPropagation(), onOpen(target))}
    >
      <Handle type="target" id="ghost-t" position={Position.Left} isConnectable={false} />
      <Handle type="source" id="ghost-s" position={Position.Right} isConnectable={false} />
      <span className="label">{label}</span>
    </div>
  );
});
