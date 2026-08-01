/** A boundary drawn around the holders of one shared attribute — a group.
 *
 *  It carries no structure: no node's parent changes, and the object explorer
 *  never shows it. Its size is never the user's to set, only its members' —
 *  the boundary follows them with a small margin, the way the layer's own
 *  frame follows its contents.
 *
 *  Click the background to select it, then drag to move everything inside.
 *  Its name is edited here, on the canvas; its colour lives in the attribute
 *  panel, where the rest of the attribute already is. */

import { memo, useState } from "react";
import type { NodeProps } from "@xyflow/react";

export type GroupData = {
  label: string;
  color: string;
  picked: boolean;
  onPick: () => void;
  onLabel: (label: string) => void;
};

export const GroupFrame = memo(({ data }: NodeProps) => {
  const { label, color, picked, onPick, onLabel } = data as unknown as GroupData;
  const [editing, setEditing] = useState(false);

  function rename(value: string) {
    onLabel(value.trim());
    setEditing(false);
  }

  return (
    <div
      className={`region ${picked ? "picked" : ""}`}
      style={{ borderColor: color, background: `${color}1a` }}
      onClick={onPick}
    >
      <div className="region-tools nodrag">
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
      </div>
    </div>
  );
});
