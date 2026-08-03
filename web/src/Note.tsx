/** A note on the canvas: a card of text describing whatever it is tied to.
 *
 *  One attribute, like a group — the difference is only how it draws. A group
 *  is a boundary around its holders and is placed by them; a note sits where it
 *  was put and reaches its holders with a faint leader line, so it can describe
 *  one thing, several things, or nothing at all.
 *
 *  The note *is* its text. There is no head, no border zone and nothing else on
 *  it to aim at, so it takes the same rule every other name on the canvas takes:
 *  right-click it to write it. Its size is its text's, not the user's — the
 *  drag that makes one is a gesture and not a measurement. */

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";

import { Anchor, Name } from "./NodeCard";
import type { Side } from "./core/types";

export type NoteData = {
  text: string;
  picked: boolean;
  /** The pointer is on it, which is what a right-click would write. */
  grazed: boolean;
  onPick: () => void;
  onLabel: (text: string) => void;
};

const SIDES: Side[] = ["top", "right", "bottom", "left"];

export const Note = memo(({ data }: NodeProps) => {
  const { text, picked, grazed, onPick, onLabel } = data as unknown as NoteData;

  return (
    <div
      className={["note", picked ? "picked" : "", grazed ? "grazed" : ""].join(" ")}
      onClick={onPick}
    >
      {/* One anchor per side, so a leader leaves by whichever faces what it is
          tied to — the same arrangement a card uses for an implied interface. */}
      {SIDES.map((side) => <Anchor key={side} name={`auto-${side}`} side={side} />)}

      <Name text={text || "note"} className="note-text" onRename={onLabel} />
    </div>
  );
});
