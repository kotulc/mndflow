/** What a relationship looks like.
 *
 *  **The run between two cards is the library's**; what is ours is the two
 *  things it cannot know — whether this layer is being read with right angles
 *  or with curves, and how a relationship's name is set.
 *
 *  A name is HTML rather than SVG text, so it takes the ramp's type like
 *  everything else on the page: one font stack, one set of steps, and a name
 *  that can be hovered and right-clicked like the line it belongs to. SVG text
 *  could do none of those without a second copy of the type scale. */

import { BaseEdge, EdgeLabelRenderer, getBezierPath, getSmoothStepPath,
         type EdgeProps } from "@xyflow/react";
import type { LineEdge } from "@mnd/views";

/** How square a right-angled corner is. Small enough to read as a corner, big
 *  enough not to look like an artefact at the zoom a whole layer is seen at. */
const BEND = 6;

export function Wire(props: EdgeProps<LineEdge>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
          label, data, markerEnd, markerStart, style } = props;

  const ends = { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition };
  const [path, x, y] = data?.curved
    ? getBezierPath(ends)
    : getSmoothStepPath({ ...ends, borderRadius: BEND });

  return (
    <>
      <BaseEdge id={id} path={path} style={style}
                markerEnd={markerEnd} markerStart={markerStart} />
      {label ? (
        <EdgeLabelRenderer>
          {/* `nodrag` and `nopan` because the label sits in a layer over the
              canvas: without them a press on a name pans the viewport. */}
          <div className="mnd-wire-name nodrag nopan"
               style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
               title={String(label)}>
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

/** One type, keyed by the name a projection asks for. Registered once at module
 *  scope — a fresh object each render remounts every line on the canvas. */
export const EDGE_TYPES = { wire: Wire } as const;
