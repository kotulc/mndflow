/** A boundary drawn around the holders of one shared attribute — a group.
 *
 *  It carries no structure: no node's parent changes, and the object explorer
 *  never shows it. Its size is never the user's to set, only its members' —
 *  the boundary follows them with the same margin the selection rect used
 *  when they were grouped.
 *
 *  Membership is a drag, the way a container's is: drop a card inside the
 *  boundary and it joins, take it out and it leaves. Click the background to
 *  select the boundary itself, then drag to move everything inside.
 *
 *  Look matches the selection box that creates it: a faint dashed line and a
 *  light fill kept inside the border, with the name breaking the line the way
 *  a layer's frame does. */

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";

import { Name } from "./NodeCard";

export type GroupData = {
  label: string;
  picked: boolean;
  /** A card is being dragged over this boundary and would join it. */
  dropping: boolean;
  /** The pointer is in the clear space inside it, which is where a click
   *  selects it. Worked out by the canvas, since the boundary is transparent
   *  to the pointer until it has been picked. */
  grazed: boolean;
  /** The pointer is on its name, which is its own target: a click there edits
   *  the name rather than acting on the boundary. */
  titled: boolean;
  onPick: () => void;
  onLabel: (label: string) => void;
};

export const GroupFrame = memo(({ data }: NodeProps) => {
  const { label, picked, dropping, grazed, titled, onPick, onLabel } =
    data as unknown as GroupData;

  return (
    <div
      className={["region", picked ? "picked" : "", grazed ? "grazed" : "",
                  dropping ? "dropping" : ""].join(" ")}
      onClick={onPick}
    >
      <span className={`region-name nodrag${titled ? " grazed" : ""}`}>
        <Name
          text={label || "group"}
          live={picked}
          className="region-label"
          onRename={onLabel}
        />
      </span>
    </div>
  );
});
