/** What a relationship looks like.
 *
 *  **The run is ours**; what the library gives is the frame to draw it in. A
 *  run bends square and gets round what it passes, and a relationship's name is
 *  set beside it.
 *
 *  A name is HTML rather than SVG text, so it takes the ramp's type like
 *  everything else on the page: one font stack, one set of steps, and a name
 *  that can be hovered and right-clicked like the line it belongs to. SVG text
 *  could do none of those without a second copy of the type scale. */

import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
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
  /** **A run is a route**, and a route through the card it ends on is wrong. */
  const run = route({ x: sourceX, y: sourceY }, sourcePosition,
                    { x: targetX, y: targetY }, targetPosition, data?.clear ?? []);
  const path = drawn(run, BEND);
  const { x, y } = middle_of(run);

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
