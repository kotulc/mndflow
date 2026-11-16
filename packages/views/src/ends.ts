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
  const box = box_at(id, nodes, frame);
  if (!box) return null;
  /** **A seat or port in the room's wall faces the side its line comes from**: in, unless the
   *  line comes from outside (`outer`). */
  const walled = (side: Side) => FACE[edge.data?.outer === which ? side : TURNED[side]];
  if (perch) {
    const seat = at_seat(box, perch);
    return { ...centre(seat), face: id === FRAME ? walled(perch.side) : FACE[perch.side] };
  }
  if (port) return { ...centre(box), face: walled(port.side) };
  if (node?.data.side) return { ...centre(box), face: FACE[node.data.side] };
  return { ...centre(box), face: FACE[facing(box, box_at(far, nodes, frame) ?? box)] };
}

/** What an end is drawn as: the room, a port in its wall, or a node. */
function box_at(id: string, nodes: readonly BoxNode[], frame?: Frame): Rect | undefined {
  if (id === FRAME) return frame;
  const port = frame?.ports.find((p) => p.id === id);
  if (port && frame) return at_seat(frame, port);
  const node = nodes.find((n) => n.id === id);
  return node ? box_of(node) : undefined;
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
