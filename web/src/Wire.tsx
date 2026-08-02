/** A relationship on the canvas, and the route the user can lay out by hand.
 *
 *  Drawn with right angles, every segment of it is draggable, and each one
 *  moves in the one direction that means anything: a vertical segment left and
 *  right, a horizontal one up and down. The corners either side follow.
 *
 *  The two segments at the ends leave an interface, so dragging one takes the
 *  interface with it — sliding it along the frame edge it sits on rather than
 *  coming away from it. Where the interface cannot follow that far, it stops at
 *  the end of its edge and a jog appears to carry the rest.
 *
 *  A curved relationship has no segments to drag, so routing one begins by
 *  switching the canvas to angles — and a line that has been routed stays
 *  angular whatever the toggle says afterwards, the same way a node the user
 *  has placed keeps its place. */

import { useEffect, useRef, useState } from "react";
import {
  BaseEdge, getBezierPath, Position, useReactFlow, useStore, type EdgeProps,
} from "@xyflow/react";

import { across, drag, runOf, type Axis, type Move, type Reach } from "./core/route";
import type { Spot } from "./core/types";

export type WireData = {
  corners: Spot[];
  /** Right angles rather than curves — the canvas-wide display toggle. */
  angular: boolean;
  /** How far each end's interface may slide. Null where the end is implied and
   *  has no interface of its own to move. */
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
 *  it to mean level, in screen pixels — so straightening a line asks for the
 *  same aim however far the layer is zoomed out. */
const SNAP = 14;

/** How wide a segment's grab band is, in screen pixels. */
const BAND = 24;

/** Segments shorter than this, on screen, are not offered for dragging. There
 *  is nothing to aim at, and their band would lie over their neighbours' and
 *  take the pointer from segments that can actually be moved. */
const STUBBY = 16;

/** An end where a drag has asked its interface to be, so the line can be drawn
 *  where it is going rather than where it has been. The interface's own square
 *  catches up when the drag is let go. */
function endAt(moves: Move[], end: "from" | "to", point: Spot, away: Spot): Spot {
  const move = moves.find((m) => m.end === end);

  return move ? { ...point, [away.x ? "y" : "x"]: move.at } : point;
}

/** A drag in progress. Everything it needs is taken when it starts, so that
 *  the route it is working from does not shift under it as the line redraws. */
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
  const { corners, angular, reach, onRoute } = data as unknown as WireData;
  const flow = useReactFlow();
  // Watched rather than read, since what counts as too short to offer is a
  // distance on screen and the layer is drawn at whatever scale it fits at.
  const zoom = useStore((state) => state.transform[2]);
  /** The route while a drag is in progress; the graph owns it otherwise. */
  const [draft, setDraft] = useState<{ corners: Spot[]; moves: Move[] } | null>(null);
  const held = useRef<Held | null>(null);
  const [dragging, setDragging] = useState(false);
  // Held by reference rather than listed as a dependency below: it arrives
  // fresh on every render, and a drag whose listeners are taken down and put
  // back that often loses the moves — and sometimes the release — in between.
  const commit = useRef(onRoute);
  commit.current = onRoute;

  const out = AWAY[sourcePosition];
  const back = AWAY[targetPosition];
  // A line the user has routed stays routed, whatever the toggle says.
  const stepped = angular || corners.length > 0;

  const shown = draft?.moves ?? [];
  const from = endAt(shown, "from", { x: sourceX, y: sourceY }, out);
  const to = endAt(shown, "to", { x: targetX, y: targetY }, back);
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
      // The pane would otherwise start a selection box under the line.
      event.stopPropagation();

      const axis = across(run[seg], run[seg + 1]);
      if (!axis) return;

      held.current = { seg, run, axis, out, back, reach, laid: null };
      setDragging(true);
    };
  }

  /** The drag itself belongs to the window, not to the band it started on.
   *  The band is thin, it moves with the line, and it is replaced outright
   *  whenever a jog changes how many segments there are — so a quick drag
   *  outran it and was dropped. Nothing here depends on where the pointer is
   *  or on what is still under it. */
  useEffect(() => {
    if (!dragging) return;

    function move(event: PointerEvent) {
      const grabbed = held.current;
      if (!grabbed) return;

      const at = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const laid = drag(grabbed.run, grabbed.seg, at[grabbed.axis],
                        grabbed.out, grabbed.back, grabbed.reach,
                        SNAP / Math.max(flow.getZoom(), 0.01));

      // Kept as the run it actually draws, so what is written down is what was
      // seen: square throughout, and with nothing left in it where a segment
      // has been dragged into line with the rest.
      const ends = grabbed.run[grabbed.run.length - 1];
      const drawn = runOf(
        endAt(laid.moves, "from", grabbed.run[0], grabbed.out), grabbed.out,
        endAt(laid.moves, "to", ends, grabbed.back), grabbed.back,
        laid.corners,
      );

      grabbed.laid = { corners: drawn.slice(1, -1), moves: laid.moves };
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

      {/* One band per segment, carrying the cursor for the way it moves, and a
          mark under each saying which part of the line is being offered — a run
          is one shape, and its segments are not otherwise told apart.

          Offered whether the line is drawn stepped or curved. A curve has no
          segments of its own, but dragging one is what routes a relationship,
          so hovering a curved line shows the run it would take and taking hold
          of it makes that the route. Waiting on the canvas-wide toggle left
          most relationships with nothing under the pointer at all. */}
      {run.slice(0, -1).map((point, seg) => {
        const next = run[seg + 1];
        const axis = across(point, next);
        // A stub left between two runs that are nearly in line is too short to
        // aim at, and its band would sit across theirs — so it is left out and
        // the neighbours it came between stay reachable.
        const length = Math.hypot(next.x - point.x, next.y - point.y);
        if (!axis || length * zoom < STUBBY) return null;

        // A rectangle rather than a fat invisible line: hit testing on a fill
        // is the one thing every browser agrees about, and the band is meant
        // to be a fixed size on screen rather than to shrink with the layer.
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
              // A different event from the one above, so stopping that one
              // does nothing for this: the pane reads it to start a selection.
              onMouseDown={(event) => event.stopPropagation()}
            />
            <line className="leg-mark" x1={point.x} y1={point.y} x2={next.x} y2={next.y} />
          </g>
        );
      })}
    </>
  );
}
