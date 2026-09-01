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

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import type { LineEdge } from "@mnd/views";
import { Name, useNaming } from "@mnd/theme";
import { drawn, middle_of, route } from "./route";

/** How square a right-angled corner is. Small enough to read as a corner, big
 *  enough not to look like an artefact at the zoom a whole layer is seen at. */
const BEND = 6;



export function Wire(props: EdgeProps<LineEdge>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
          label, data, markerEnd, markerStart, style } = props;

  /** **A line with no name still has somewhere to type one.** Nothing is drawn
   *  for a relationship nobody has named, so asking to name one had nowhere to
   *  put the field. */
  const naming = useNaming();
  const ends = { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition };
  /** **Right angles are ours; curves are the library's.** A curve is read as a
   *  sketch and nobody asks it to go round anything; a right-angled run is read
   *  as a route, and a route through the card it ends on is wrong. */
  let path: string;
  let x: number;
  let y: number;
  if (data?.curved) {
    [path, x, y] = getBezierPath(ends);
  } else {
    const run = route({ x: sourceX, y: sourceY }, sourcePosition,
                      { x: targetX, y: targetY }, targetPosition, data?.clear ?? []);
    path = drawn(run, BEND);
    ({ x, y } = middle_of(run));
  }

  return (
    <>
      <BaseEdge id={id} path={path} style={style}
                markerEnd={markerEnd} markerStart={markerStart} />
      {label || naming.id === id ? (
        <EdgeLabelRenderer>
          {/* `nodrag` and `nopan` because the label sits in a layer over the
              canvas: without them a press on a name pans the viewport.
              **A relationship's name is drawn off the line**, so it says whose
              it is: it is not in the line's own hit area, and nothing else
              could work out from a pointer which run it belongs to. */}
          <div className="mnd-wire-name nodrag nopan" data-edge={id}
               style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
               title={label ? String(label) : ""}>
            <Name id={id} className="mnd-wire-text" text={label ? String(label) : ""} />
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

/** One type, keyed by the name a projection asks for. Registered once at module
 *  scope — a fresh object each render remounts every line on the canvas. */
export const EDGE_TYPES = { wire: Wire } as const;
