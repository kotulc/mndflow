/** A relationship on the canvas.
 *
 *  It has nothing to lay out. The layer works out where every line meets its
 *  two cards, what corners it takes between them, and which lane it runs in
 *  where it shares one — all in one pass, for every relationship at once — and
 *  hands the finished run down here. So this only decides how to paint it.
 *
 *  Drawn with right angles, or as a curve between the same two points when the
 *  canvas is set to curves. There is no hand routing: a line that wants to be
 *  somewhere else is a layer that wants arranging. */

import { BaseEdge, getBezierPath, Position, type EdgeProps } from "@xyflow/react";

import type { Spot } from "../graph/types";

export type WireData = {
  /** The whole run, ends included, worked out by the layer. */
  run: { points: Spot[] };
  /** Right angles rather than curves — the canvas-wide display toggle. */
  angular: boolean;
};

/** How much of a corner is rounded off. */
const ROUND = 6;

/** Which way a curve leaves, from the direction the run sets off in. */
function facing(from: Spot, next: Spot): Position {
  if (Math.abs(next.x - from.x) >= Math.abs(next.y - from.y)) {
    return next.x >= from.x ? Position.Right : Position.Left;
  }

  return next.y >= from.y ? Position.Bottom : Position.Top;
}

/** The path through a run, with its corners rounded. */
function pathOf(run: Spot[]): string {
  let path = `M ${run[0].x},${run[0].y}`;

  for (let at = 1; at < run.length - 1; at += 1) {
    const [before, here, after] = [run[at - 1], run[at], run[at + 1]];
    const cut = Math.min(
      Math.hypot(here.x - before.x, here.y - before.y) / 2,
      Math.hypot(after.x - here.x, after.y - here.y) / 2,
      ROUND,
    );
    const into = { x: Math.sign(here.x - before.x) * cut, y: Math.sign(here.y - before.y) * cut };
    const on = { x: Math.sign(after.x - here.x) * cut, y: Math.sign(after.y - here.y) * cut };

    path += ` L ${here.x - into.x},${here.y - into.y}`;
    path += ` Q ${here.x},${here.y} ${here.x + on.x},${here.y + on.y}`;
  }

  const last = run[run.length - 1];

  return `${path} L ${last.x},${last.y}`;
}

export function Wire(props: EdgeProps) {
  const { id, markerStart, markerEnd, style, label, data } = props;
  const { run, angular } = data as unknown as WireData;
  const points = run.points;

  const from = points[0];
  const to = points[points.length - 1];
  const middle = Math.floor((points.length - 1) / 2);

  const [curved, bendX, bendY] = getBezierPath({
    sourceX: from.x,
    sourceY: from.y,
    targetX: to.x,
    targetY: to.y,
    sourcePosition: facing(from, points[1] ?? to),
    targetPosition: facing(to, points[points.length - 2] ?? from),
  });

  return (
    <BaseEdge
      id={id}
      path={angular ? pathOf(points) : curved}
      style={style}
      markerStart={markerStart}
      markerEnd={markerEnd}
      label={label}
      labelX={angular ? (points[middle].x + points[middle + 1].x) / 2 : bendX}
      labelY={angular ? (points[middle].y + points[middle + 1].y) / 2 : bendY}
    />
  );
}
