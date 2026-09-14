/** Where a tie meets a line: **the middle of the line's run.**
 *
 *  A tie joins a note to anything, a line included. The line has no box, so a
 *  knot stands in for it — a small node at the midpoint of the run, read off
 *  what the scene already draws so the projection and the canvas agree. */

import { Position } from "@xyflow/system";
import type { Id, Side } from "@mnd/core";
import { middle_of, route } from "./route";
import { box_of, cell, FRAME, type BoxNode, type Frame, type LineEdge } from "./scene";
import { at_seat, type Perch, type Rect } from "./seat";

type Point = { x: number; y: number };
type End = Point & { face: Position };

/** How big a knot is drawn. */
export const KNOT = 8;

/** The node a tie ends on in place of the line it names. */
export function knot_id(edge: Id): string {
  return `k-${edge}`;
}

/** The line a knot stands for, or null where the id is not a knot. */
export function knotted(id: string): Id | null {
  return id.startsWith("k-") ? id.slice(2) : null;
}

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
  if (node?.type === "knot") {
    return { ...centre(box), face: FACE[knot_face(node.data.side, centre(box),
                                                  centre(other ? box_of(other) : box))] };
  }
  if (node?.data.side) return { ...centre(box), face: FACE[node.data.side] };
  return { ...centre(box), face: FACE[facing(box, other ? box_of(other) : box)] };
}

/** The middle of a drawn line's run, and whether the leg there runs across,
 *  or null where either end is not drawn. */
export function middle_of_line(edge: LineEdge, nodes: readonly BoxNode[],
                               perches: readonly Perch[], frame?: Frame)
    : (Point & { across: boolean }) | null {
  const a = end_of(edge, "from", nodes, perches, frame);
  const b = end_of(edge, "to", nodes, perches, frame);
  if (!a || !b) return null;
  const run = route(a, a.face, b, b.face, edge.data?.clear ?? []);
  const at = middle_of(run);
  const leg = run.findIndex((p, i) => i > 0 && on_leg(run[i - 1]!, p, at));
  const across = leg < 0 || run[leg - 1]!.y === run[leg]!.y;
  return { ...at, across };
}

/** Which way a tie leaves a knot: **square to the line**, toward its note. The
 *  knot's `side` says how the line runs there — `top` across, `left` down. */
export function knot_face(side: Side | undefined, at: Point, far: Point): Side {
  return side === "left" ? (far.x >= at.x ? "right" : "left")
                         : (far.y >= at.y ? "bottom" : "top");
}

function on_leg(p: Point, q: Point, at: Point): boolean {
  return at.x >= Math.min(p.x, q.x) && at.x <= Math.max(p.x, q.x)
      && at.y >= Math.min(p.y, q.y) && at.y <= Math.max(p.y, q.y);
}

/** A knot for every line a tie ends on, placed at that line's middle. */
export function knots_of(edges: readonly LineEdge[], nodes: readonly BoxNode[],
                         perches: readonly Perch[], frame?: Frame): BoxNode[] {
  const out: BoxNode[] = [];
  for (const tie of edges) {
    for (const which of ["source", "target"] as const) {
      const line_id = knotted(tie[which]);
      const line = line_id ? edges.find((e) => e.id === line_id) : undefined;
      if (!line || out.some((k) => k.id === tie[which])) continue;
      const at = middle_of_line(line, nodes, perches, frame);
      if (!at) continue;
      out.push({ ...cell(tie[which], { x: at.x - KNOT / 2, y: at.y - KNOT / 2, w: KNOT, h: KNOT },
                         { label: "", marks: [], side: at.across ? "top" : "left" }, "knot"),
                 selectable: false, draggable: false });
    }
  }
  return out;
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
