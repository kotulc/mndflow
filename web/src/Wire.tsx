/** A relationship on the canvas, and the route the user can lay out by hand.
 *
 *  Drawn with right angles; middle segments are draggable and move in the one
 *  direction that means anything. End stubs always leave outward from their
 *  seats — seats are chosen by the router, not slid by end-segment drag.
 *
 *  A curved relationship has no segments to drag, so routing one begins by
 *  switching the canvas to angles — and a line that has been routed stays
 *  angular whatever the toggle says afterwards. */

import { useEffect, useRef, useState } from "react";
import {
  BaseEdge, getBezierPath, Position, useReactFlow, useStore, type EdgeProps,
} from "@xyflow/react";

import { across, drag, runOf, type Axis, type Move, type Reach } from "./core/route";
import type { Spot } from "./core/types";

export type WireData = {
  /** Orthogonal corners: user-saved, or the auto plan used for grab bands. */
  corners: Spot[];
  /** True when corners were saved by a middle-segment drag on this layer. */
  saved: boolean;
  /** Right angles rather than curves — the canvas-wide display toggle. */
  angular: boolean;
  reach: { from: Reach; to: Reach };
  onRoute: (id: string, corners: Spot[], moves: Move[]) => void;
};

/** Which way a run leaves each handle position. */
const AWAY: Record<Position, Spot> = {
  [Position.Left]: { x: -1, y: 0 },
  [Position.Right]: { x: 1, y: 0 },
  [Position.Top]: { x: 0, y: -1 },
  [Position.Bottom]: { x: 0, y: 1 },
};

/** How much of a corner is rounded off. */
const ROUND = 6;

/** How near a segment has to come to level with an end before the drag takes
 *  it to mean level, in screen pixels. */
const SNAP = 14;

/** How wide a segment's grab band is, in screen pixels. */
const BAND = 24;

/** Segments shorter than this, on screen, are not offered for dragging. */
const STUBBY = 16;

type Held = {
  seg: number;
  run: Spot[];
  axis: Axis;
  out: Spot;
  back: Spot;
  reach: { from: Reach; to: Reach };
  laid: { corners: Spot[]; moves: Move[] } | null;
};

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
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;
  const { markerStart, markerEnd, style, label, selected, data } = props;
  const { corners, saved, angular, reach, onRoute } = data as unknown as WireData;
  const flow = useReactFlow();
  const zoom = useStore((state) => state.transform[2]);
  const [draft, setDraft] = useState<{ corners: Spot[]; moves: Move[] } | null>(null);
  const held = useRef<Held | null>(null);
  const [dragging, setDragging] = useState(false);
  const commit = useRef(onRoute);
  commit.current = onRoute;

  const out = AWAY[sourcePosition];
  const back = AWAY[targetPosition];
  // A line the user has routed stays routed; auto corners alone do not force
  // angles when the canvas is set to curves.
  const stepped = angular || saved || (draft?.corners.length ?? 0) > 0;

  const from = { x: sourceX, y: sourceY };
  const to = { x: targetX, y: targetY };
  const run = runOf(from, out, to, back, draft?.corners ?? corners);

  const [curved, bendX, bendY] = getBezierPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  });
  const middle = Math.floor((run.length - 1) / 2);
  const path = stepped ? pathOf(run) : curved;
  const labelX = stepped ? (run[middle].x + run[middle + 1].x) / 2 : bendX;
  const labelY = stepped ? (run[middle].y + run[middle + 1].y) / 2 : bendY;

  function grab(seg: number) {
    return (event: React.PointerEvent) => {
      if (event.button !== 0) return;
      event.stopPropagation();

      const axis = across(run[seg], run[seg + 1]);
      if (!axis) return;

      held.current = { seg, run, axis, out, back, reach, laid: null };
      setDragging(true);
    };
  }

  useEffect(() => {
    if (!dragging) return;

    function move(event: PointerEvent) {
      const grabbed = held.current;
      if (!grabbed) return;

      const at = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const laid = drag(grabbed.run, grabbed.seg, at[grabbed.axis],
                        grabbed.out, grabbed.back, grabbed.reach,
                        SNAP / Math.max(flow.getZoom(), 0.01));

      const ends = grabbed.run[grabbed.run.length - 1];
      const drawn = runOf(grabbed.run[0], grabbed.out, ends, grabbed.back, laid.corners);

      grabbed.laid = { corners: drawn.slice(1, -1), moves: [] };
      setDraft(grabbed.laid);
    }

    function drop() {
      const grabbed = held.current;
      held.current = null;
      setDragging(false);
      setDraft(null);
      if (grabbed?.laid) commit.current(id, grabbed.laid.corners, grabbed.laid.moves);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", drop);
    window.addEventListener("pointercancel", drop);

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", drop);
      window.removeEventListener("pointercancel", drop);
    };
  }, [dragging, flow, id]);

  const lastSeg = run.length - 2;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={style}
        markerStart={markerStart}
        markerEnd={markerEnd}
        label={label}
        labelX={labelX}
        labelY={labelY}
      />

      {run.slice(0, -1).map((point, seg) => {
        // End stubs leave outward from seats the router owns — not draggable.
        if (seg === 0 || seg === lastSeg) return null;

        const next = run[seg + 1];
        const axis = across(point, next);
        const length = Math.hypot(next.x - point.x, next.y - point.y);
        if (!axis || length * zoom < STUBBY) return null;

        const pad = BAND / 2 / Math.max(zoom, 0.01);
        const upright = axis === "x";
        const band = {
          x: upright ? point.x - pad : Math.min(point.x, next.x),
          y: upright ? Math.min(point.y, next.y) : point.y - pad,
          width: upright ? pad * 2 : length,
          height: upright ? length : pad * 2,
        };

        return (
          <g key={seg} className={`leg${selected ? " shown" : ""}${stepped ? "" : " ghost"}`}>
            <rect
              className="leg-grab nodrag nopan"
              {...band}
              style={{ cursor: upright ? "ew-resize" : "ns-resize" }}
              onPointerDown={grab(seg)}
              onMouseDown={(event) => event.stopPropagation()}
            />
            <line className="leg-mark" x1={point.x} y1={point.y} x2={next.x} y2={next.y} />
          </g>
        );
      })}
    </>
  );
}
