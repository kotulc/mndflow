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

import { nameOf, portsOf } from "./core/fold";
import type { Graph, Side } from "./core/types";
import { Anchor, Name, Port } from "./NodeCard";

export type FrameData = {
  id: string;
  graph: Graph;
  /** Which edge of its parent this layer is set into, when it is an interface
   *  being looked at from the inside. Null for an ordinary node. */
  straddles: Side | null;
  showPorts: boolean;
  pickedPort: string | null;
  onPick: (id: string) => void;
  onOpen: (id: string) => void;
  onSlidePort: (id: string, side: Side, at: number) => void;
  onRename: (id: string, label: string) => void;
  /** True while the pointer is near the border, which is where the gestures
   *  that make interfaces live. */
  grazed: boolean;
};

export const Frame = memo(({ data }: NodeProps) => {
  const { id, graph, straddles, showPorts, pickedPort, grazed } =
    data as unknown as FrameData;
  const { onPick, onOpen, onSlidePort, onRename } = data as unknown as FrameData;
  // A port on the left or right of its parent sits in a vertical wall; one on
  // the top or bottom sits in a horizontal one.
  const upright = straddles === "left" || straddles === "right";

  return (
    <div className={`frame ${grazed ? "grazed" : ""}`}>
      {/* Always live: this layer is where you already are, so there is no
          first click to spend selecting it. */}
      <span className="frame-name nodrag nopan">
        <Name
          text={nameOf(graph, graph.nodes[id])}
          live
          className="frame-label"
          onRename={(label) => onRename(id, label)}
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

      {showPorts && portsOf(graph, id).map((port) => (
        <Port
          key={port.id}
          port={port}
          graph={graph}
          picked={pickedPort === port.id}
          onPick={onPick}
          onOpen={onOpen}
          inward
          onSlide={onSlidePort}
        />
      ))}
    </div>
  );
});
