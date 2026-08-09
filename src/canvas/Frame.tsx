/** The frame around the layer being looked at — the node you have stepped
 *  into, drawn from the inside.
 *
 *  Inside it is the working canvas, left clear to the grid; outside is dimmed,
 *  so the frame reads as the boundary of the thing you are in rather than as a
 *  panel laid over it. It carries the layer's name and the interfaces on its
 *  edge, and leaves a margin on every side for them to sit in.
 *
 *  An interface opened from the inside straddles its parent's boundary. What
 *  marks that is the parent's own border, running through the dimmed margin on
 *  either side of this frame and stopping where this frame begins — you are
 *  inside the port, looking out at the wall it is set into. It runs across or
 *  down depending on which edge of the parent the port sits on. */

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";

import { nameOf, portsOf } from "../graph/fold";
import type { Axis, Graph, Side } from "../graph/types";
import { Anchor, Berth, type Grazed, Name, Perch, Port, type Seated } from "./card";

export type FrameData = {
  id: string;
  graph: Graph;
  /** Which edge of its parent this layer is set into, when it is an interface
   *  being looked at from the inside. Null for an ordinary node. */
  straddles: Side | null;
  /** How this layer arranges what it holds. Its two flow walls are marked, so
   *  which way the layer reads is visible without reading the toolbar. */
  axis: Axis;
  showPorts: boolean;
  /** Hidden interfaces whose seats still show as handles — see `Berth`. */
  litSeats: Set<string>;
  pickedPort: string | null;
  /** Seats this layer worked out for relationships reaching the frame itself. */
  seats: Seated[];
  /** Relationships selected right now, so their anchors show themselves. */
  litEdges: Set<string>;
  onPick: (id: string) => void;
  onOpen: (id: string) => void;
  onSlidePort: (id: string, side: Side, at: number) => void;
  onRename: (id: string, label: string) => void;
  onNameTaken: (parent: string | null, label: string, except: string | null) => boolean;
  onSay: (message: string) => void;
  /** Turn one of those seats into an interface of its own. */
  onPromote: (edge: string, side: Side, at: number) => void;
  /** What the pointer is over. The border lights up when it is this frame,
   *  since that is where the gestures that make interfaces live. */
  grazed: Grazed;
};

export const Frame = memo(({ data, width, height, positionAbsoluteX = 0,
                             positionAbsoluteY = 0 }: NodeProps) => {
  const { id, graph, straddles, axis, showPorts, litSeats, pickedPort, grazed } =
    data as unknown as FrameData;
  const { onPick, onOpen, onSlidePort, onRename, onNameTaken, onSay } =
    data as unknown as FrameData;
  const { seats, litEdges, onPromote } = data as unknown as FrameData;
  // A port on the left or right of its parent sits in a vertical wall; one on
  // the top or bottom sits in a horizontal one.
  const upright = straddles === "left" || straddles === "right";
  const host = {
    x: positionAbsoluteX,
    y: positionAbsoluteY,
    w: width ?? 0,
    h: height ?? 0,
  };

  return (
    <div className={`frame flow-${axis} ${
      grazed?.kind === "frame" && grazed.id === id ? "grazed" : ""}`}>
      {/* Always live: this layer is where you already are, so there is no
          first click to spend selecting it. */}
      <span className={`frame-name nodrag nopan${
        grazed?.kind === "title" && grazed.id === id ? " grazed" : ""}`}>
        <Name
          text={nameOf(graph, graph.elements[id])}
          className="frame-label"
          onRename={(label) => onRename(id, label)}
          taken={(name) => onNameTaken(graph.elements[id]?.parent ?? null, name, id)}
          onSay={onSay}
        />
      </span>

      {straddles && (
        <span className={`wall ${upright ? "upright" : "flat"}`} aria-hidden>
          <span className="before" />
          <span className="after" />
        </span>
      )}

      {/* Anchors for relations reaching the frame itself without an interface
          of their own, matching the ones every card carries. */}
      {(["top", "right", "bottom", "left"] as Side[]).map((side) => (
        <Anchor key={side} name={`auto-${side}`} side={side} inward />
      ))}

      {/* Hidden, an interface still leaves its seat behind — see `Berth`. */}
      {portsOf(graph, id).map((port) => (showPorts ? (
        <Port
          key={port.id}
          port={port}
          graph={graph}
          host={host}
          picked={pickedPort === port.id}
          grazed={grazed?.kind === "port" && grazed.id === port.id}
          onPick={onPick}
          onOpen={onOpen}
          inward
          onSlide={onSlidePort}
        />
      ) : (
        <Berth
          key={port.id}
          port={port}
          graph={graph}
          host={host}
          shown={litSeats.has(port.id)}
          inward
        />
      )))}

      {/* And the seats worked out for relationships with no interface here. */}
      {seats.map((s) => (
        <Perch
          key={s.edge}
          seated={s.edge}
          side={s.side}
          at={s.at}
          port={s.port}
          lit={litEdges.has(s.edge)}
          inward
          onPromote={onPromote}
        />
      ))}
    </div>
  );
});
