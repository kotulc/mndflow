/** A colored frame drawn behind a set of cards — a box-selection the user has
 *  chosen to keep. It carries no meaning for the graph, only for the eye:
 *  its name is edited right here, on the canvas, like a node's own label;
 *  its color lives in the context pane instead, once picked. Resize handles
 *  only show once picked, so an idle frame does not clutter the canvas. */

import { memo, useState } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";

export type RegionData = {
  label: string;
  color: string;
  picked: boolean;
  onPick: () => void;
  onLabel: (label: string) => void;
  onRemove: () => void;
  onResize: (x: number, y: number, w: number, h: number) => void;
};

export const RegionFrame = memo(({ data }: NodeProps) => {
  const { label, color, picked, onPick, onLabel, onRemove, onResize } =
    data as unknown as RegionData;
  const [editing, setEditing] = useState(false);

  function rename(value: string) {
    onLabel(value.trim());
    setEditing(false);
  }

  return (
    <div className="region" style={{ borderColor: color, background: `${color}1a` }}>
      <NodeResizer
        isVisible={picked}
        minWidth={140}
        minHeight={90}
        lineStyle={{ borderColor: color }}
        handleStyle={{ background: color, width: 8, height: 8 }}
        onResizeEnd={(_, params) => onResize(params.x, params.y, params.width, params.height)}
      />

      <div className="region-tools nodrag" onClick={onPick}>
        {editing ? (
          <input
            className="rename"
            autoFocus
            defaultValue={label}
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
            className="name"
            title="double-click to name this group"
            onDoubleClick={(event) => (event.stopPropagation(), setEditing(true))}
          >
            {label || "group"}
          </span>
        )}
        <button onClick={(event) => (event.stopPropagation(), onRemove())} title="Ungroup">
          ✕
        </button>
      </div>
    </div>
  );
});
