/** A note on the canvas: a card of text describing whatever it is tied to.
 *
 *  One attribute, like a group — the difference is only how it draws. A group
 *  is a boundary around its holders and is placed by them; a note sits where it
 *  was put and reaches its holders with a faint leader line, so it can describe
 *  one thing, several things, or nothing at all.
 *
 *  The note *is* its text. There is no head, no border zone and nothing else on
 *  it to aim at, so right-click opens the offered list for it the way every
 *  other existing thing does.
 *
 *  Its size is the larger of what was asked for — the drag that made it, or a
 *  later resize — and what its text needs. A minimum rather than a measurement:
 *  the box can never disagree with what it says, because what it says always
 *  wins. The SE handle, when the note is picked, is how `size` is reached. */

import { memo, useRef, useState } from "react";
import { useReactFlow, type NodeProps } from "@xyflow/react";

import { Name, Perch, type Seated } from "./pieces";
import { takes } from "./map";
import type { Side } from "../../../graph/types";

/** Floor matching the canvas's drawn note — a resize cannot go below the
 *  ordinary card of text. */
const FLOOR = { w: 168, h: 40 };

export type NoteData = {
  text: string;
  picked: boolean;
  /** The pointer is on it, which is what a right-click would write. */
  grazed: boolean;
  /** The least room it was asked for, from the drag that made it or a resize. */
  least: { w: number; h: number };
  seats: Seated[];
  litEdges: Set<string>;
  onPick: () => void;
  onLabel: (text: string) => void;
  onSize: (w: number, h: number) => void;
  onSlideAnchor: (edge: string, end: "from" | "to", side: Side, at: number) => void;
};

export const Note = memo(({ data, positionAbsoluteX = 0, positionAbsoluteY = 0 }: NodeProps) => {
  const { text, picked, grazed, least, seats, litEdges, onPick, onLabel, onSize, onSlideAnchor } =
    data as unknown as NoteData;
  const { getZoom } = useReactFlow();
  /** Live least size while the SE handle is dragged; null when not resizing. */
  const [draft, setDraft] = useState<{ w: number; h: number } | null>(null);
  const drag = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const room = draft ?? least;
  const host = { x: positionAbsoluteX, y: positionAbsoluteY, w: room.w, h: room.h };

  function sized(event: React.PointerEvent) {
    if (!drag.current) return { w: room.w, h: room.h };
    const zoom = getZoom() || 1;
    return {
      w: Math.max(FLOOR.w, drag.current.w + (event.clientX - drag.current.x) / zoom),
      h: Math.max(FLOOR.h, drag.current.h + (event.clientY - drag.current.y) / zoom),
    };
  }

  function sizeDown(event: React.PointerEvent) {
    // The note is otherwise draggable; the handle must own this gesture alone.
    event.stopPropagation();
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, w: room.w, h: room.h };
    setDraft({ w: room.w, h: room.h });
  }

  function sizeMove(event: React.PointerEvent) {
    if (!drag.current) return;
    event.stopPropagation();
    setDraft(sized(event));
  }

  function sizeUp(event: React.PointerEvent) {
    if (!drag.current) return;
    event.stopPropagation();
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    const next = sized(event);
    drag.current = null;
    setDraft(null);
    onSize(next.w, next.h);
  }

  return (
    <div
      className={["note", picked ? "picked" : "", grazed ? "grazed" : ""].join(" ")}
      style={{ minWidth: room.w, minHeight: room.h }}
      onClick={onPick}
    >
      {seats.map((s) => (
        <Perch
          key={`${s.edge}-${s.end}`}
          seated={s.edge}
          end={s.end}
          side={s.side}
          at={s.at}
          port={s.port}
          placed={s.placed}
          show={s.show}
          lit={litEdges.has(s.edge) || picked}
          host={host}
          onSlide={onSlideAnchor}
        />
      ))}

      <Name text={text || "note"} className="note-text" onRename={onLabel} />

      {/* SE only: the note's top-left is where it was put, so a resize grows or
          shrinks the least room without moving the corner. Inline rather than a
          stylesheet rule — one handle, and the visual style is otherwise frozen.
          Absent when the diagram declines `size`. */}
      {picked && takes("size") && (
        <div
          title="Resize"
          style={{
            position: "absolute",
            right: -3,
            bottom: -3,
            width: 10,
            height: 10,
            cursor: "nwse-resize",
            background: "var(--note)",
            borderRadius: 1,
            zIndex: 2,
          }}
          onPointerDown={sizeDown}
          onPointerMove={sizeMove}
          onPointerUp={sizeUp}
          onPointerCancel={sizeUp}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.stopPropagation()}
        />
      )}
    </div>
  );
});
