/** Where a drawn line's ends leave from, and which way they set off. */

import { Position } from "@xyflow/system";
import type { Side } from "@mnd/core";
import { box_of, FRAME, type BoxNode, type Frame, type LineEdge } from "./scene";
import { at_seat, type Perch, type Rect } from "./seat";

type Point = { x: number; y: number };
type End = Point & { face: Position };

const FACE: Record<Side, Position> = {
  top: Position.Top, right: Position.Right, bottom: Position.Bottom, left: Position.Left,
};

const TURNED: Record<Side, Side> = { top: "bottom", right: "left", bottom: "top", left: "right" };

/** Where one end of a drawn line leaves from, and which way it sets off. */
export function end_of(edge: LineEdge, which: "from" | "to", nodes: readonly BoxNode[],
                       perches: readonly Perch[], frame?: Frame): End | null {
  const id = which === "from" ? edge.source : edge.target;
  const far = which === "from" ? edge.target : edge.source;
  const perch = perches.find((p) => p.edge === edge.id && p.end === which);
  const port = frame?.ports.find((p) => p.id === id);
  const node = nodes.find((n) => n.id === id);
  const box: Rect | undefined = id === FRAME ? frame
    : port && frame ? at_seat(frame, port) : node ? box_of(node) : undefined;
  if (!box) return null;
  if (perch) {
    const seat = at_seat(box, perch);
    return { ...centre(seat), face: FACE[perch.side] };
  }
  /** A port in the room's wall is looked at from inside, so it faces in. */
  if (port) return { ...centre(box), face: FACE[TURNED[port.side]] };
  const other = nodes.find((n) => n.id === far);
  if (node?.data.side) return { ...centre(box), face: FACE[node.data.side] };
  return { ...centre(box), face: FACE[facing(box, other ? box_of(other) : box)] };
}

function centre(b: Rect): Point {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

/** Which side of `box` faces `other`, by their centres. */
function facing(box: Rect, other: Rect): Side {
  const dx = (other.x + other.w / 2) - (box.x + box.w / 2);
  const dy = (other.y + other.h / 2) - (box.y + box.h / 2);
  return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? "right" : "left")
                                      : (dy >= 0 ? "bottom" : "top");
}
