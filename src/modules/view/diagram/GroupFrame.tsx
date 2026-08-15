/** A boundary drawn around the holders of one shared attribute — a group.
 *
 *  It carries no structure: no node's parent changes, and the object explorer
 *  never shows it. Its size is never the user's to set, only its members' —
 *  the boundary follows them with the same margin the selection rect used
 *  when they were grouped.
 *
 *  Membership is a drag, the way a container's is: drop a card inside the
 *  boundary and it joins, take it out and it leaves. Empty space inside the
 *  boundary is the group's: click selects it, drag moves it with its members.
 *  Cards sit above and keep their own pointer — only the clear space between
 *  them belongs to the boundary. No need to select first.
 *
 *  Look matches the selection box that creates it: a faint dashed line and a
 *  light fill kept inside the border, with the name breaking the line the way
 *  a layer's frame does. */

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";

import { Name } from "./pieces";

export type GroupData = {
  label: string;
  picked: boolean;
  /** A card is being dragged over this boundary and would join it. */
  dropping: boolean;
  /** The pointer is on this boundary's clear space (or its rim). */
  grazed: boolean;
  /** The pointer is on its name, which is its own target: a right-click there
   *  renames rather than acting on the boundary. */
  titled: boolean;
  onPick: () => void;
  onLabel: (label: string) => void;
  onNameTaken: (name: string) => boolean;
  onSay: (message: string) => void;
};

export const GroupFrame = memo(({ data }: NodeProps) => {
  const { label, picked, dropping, grazed, titled, onPick, onLabel, onNameTaken, onSay } =
    data as unknown as GroupData;

  return (
    <div
      className={["region", picked ? "picked" : "", grazed ? "grazed" : "",
                  dropping ? "dropping" : ""].join(" ")}
      onClick={onPick}
    >
      {/* Draggable with the boundary: the name is an obvious handle, and
          renaming is a right-click rather than a left one. */}
      <span className={`region-name${titled ? " grazed" : ""}`}>
        <Name text={label || "group"} className="region-label" onRename={onLabel}
              taken={onNameTaken} onSay={onSay} />
      </span>
    </div>
  );
});
