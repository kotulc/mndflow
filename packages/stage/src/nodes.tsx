/** What a box looks like, as React Flow node types.
 *
 *  **These are the notation, which is why they are still ours.** Everything
 *  around them — the viewport, the hit testing, the drag, the edge paths — is
 *  the library's. A node here draws a rectangle, a name and its handles, reads
 *  its look off `marks`, and knows nothing about the graph.
 *
 *  One component covers every box that is a rectangle, because they differ only
 *  in the marks they carry and the ramp keys off those. A frame, a seat and a
 *  control are the three that are not. **Which one draws a node is the
 *  projection's to say** — it sets `type`, so nothing here re-derives it from
 *  marks and a new mark cannot silently pick the wrong component. */

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { BoxNode } from "@mnd/views";

/** Where a line may join. **Every side, always** — which side a route actually
 *  leaves by is the router's to decide, and a card that offered fewer would
 *  make the arrangement decide it instead. Hidden until a connection starts;
 *  React Flow shows them itself. */
const SIDES = [
  { id: "t", position: Position.Top },
  { id: "r", position: Position.Right },
  { id: "b", position: Position.Bottom },
  { id: "l", position: Position.Left },
] as const;

function Joins() {
  return (
    <>
      {SIDES.map((s) => (
        <Handle key={`s-${s.id}`} type="source" id={`s-${s.id}`} position={s.position} />
      ))}
      {SIDES.map((s) => (
        <Handle key={`t-${s.id}`} type="target" id={`t-${s.id}`} position={s.position} />
      ))}
    </>
  );
}

/** The ordinary card, and every mark that is still a rectangle: a container, a
 *  reference, a note, a lane, a cell. The class list is the whole look. */
export function Card({ data, selected }: NodeProps<BoxNode>) {
  return (
    <div className={["mnd-card", ...data.marks, selected ? "picked" : ""]
            .filter(Boolean).join(" ")}
         data-def={data.def} title={data.label}>
      <span className="mnd-label">{data.label}</span>
      <Joins />
    </div>
  );
}

/** A decision and a merge are the one pair of controls that is not a bar. The
 *  diamond is a rotated square, so the name inside it turns back. */
export function Control({ data, selected }: NodeProps<BoxNode>) {
  return (
    <div className={["mnd-control", ...data.marks, selected ? "picked" : ""]
            .filter(Boolean).join(" ")}
         title={data.label}>
      <span className="mnd-diamond" />
      <span className="mnd-label">{data.label}</span>
      <Joins />
    </div>
  );
}

/** An interface, seated on its owner's wall. It carries no name — the mark is
 *  the whole of it, and a hover says the rest. */
export function Seat({ data, selected }: NodeProps<BoxNode>) {
  return (
    <div className={["mnd-seat", ...data.marks, selected ? "picked" : ""]
            .filter(Boolean).join(" ")}
         title={data.label}>
      <Joins />
    </div>
  );
}

/** The open layer seen from within: a border with the name set into it. Drawn
 *  as a node so it pans and zooms with everything else, but it takes no
 *  gesture — descending is a double click on the ground it covers. */
export function Frame({ data }: NodeProps<BoxNode>) {
  return (
    <div className="mnd-frame">
      <span className="mnd-frame-name">{data.label}</span>
    </div>
  );
}

/** Keyed by the name a projection asks for. Registered once, at module scope —
 *  a fresh object each render remounts every node on the canvas. */
export const NODE_TYPES = {
  card: Card,
  control: Control,
  seat: Seat,
  frame: Frame,
} as const;
