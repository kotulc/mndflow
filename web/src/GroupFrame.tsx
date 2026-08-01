/** A boundary drawn around the holders of one shared attribute — a group.
 *
 *  It carries no structure: no node's parent changes, and the object explorer
 *  never shows it. Its size is never the user's to set, only its members' —
 *  the boundary follows them with a small margin, the way the layer's own
 *  frame follows its contents.
 *
 *  Membership is a drag, the way a container's is: drop a card inside the
 *  boundary and it joins, take it out and it leaves. Click the background to
 *  select the boundary itself, then drag to move everything inside.
 *
 *  It has no look of its own to set. One faint dashed line, the same for every
 *  group, so a canvas of them reads as one kind of thing rather than as a
 *  palette; overlapping backgrounds compound, which is all the distinction the
 *  drawing needs. Colour and the rest come later. */

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";

import { Name } from "./NodeCard";

export type GroupData = {
  label: string;
  picked: boolean;
  /** A card is being dragged over this boundary and would join it. */
  dropping: boolean;
  onPick: () => void;
  onLabel: (label: string) => void;
};

export const GroupFrame = memo(({ data }: NodeProps) => {
  const { label, picked, dropping, onPick, onLabel } = data as unknown as GroupData;

  return (
    <div
      className={`region ${picked ? "picked" : ""} ${dropping ? "dropping" : ""}`}
      onClick={onPick}
    >
      <div className="region-tools nodrag">
        <Name text={label || "group"} live={picked} className="name" onRename={onLabel} />
      </div>
    </div>
  );
});
