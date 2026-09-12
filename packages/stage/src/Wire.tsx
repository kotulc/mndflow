/** What a relationship looks like.
 *
 *  **The run is ours**; what the library gives is the frame to draw it in. A
 *  run bends square and gets round what it passes, and what it says is set
 *  beside it: its name in the middle, and whatever values it draws at each end.
 *
 *  **It is painted from the same table a card is.** `style` is shared across a
 *  block, an interface and a line, so the attributes below are the ones
 *  `look_of` names and the ones `card.css` reads — which is what keeps a
 *  vocabulary looking like one family whether it drew a box or a run.
 *
 *  A name is HTML rather than SVG text, so it takes the ramp's type like
 *  everything else on the page: one font stack, one set of steps, and a name
 *  that can be hovered and right-clicked like the line it belongs to. SVG text
 *  could do none of those without a second copy of the type scale. */

import { type CSSProperties } from "react";
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import { heads, BARE, type LineEdge, type Wire as Look } from "@mnd/views";
import { head_url, Heads, Name, useNaming } from "@mnd/theme";
import { drawn, middle_of, route } from "./route";

/** How square a right-angled corner is. Small enough to read as a corner, big
 *  enough not to look like an artefact at the zoom a whole layer is seen at. */
const BEND = 6;

/** How a run paints itself, as the attributes `card.css` already reads.
 *
 *  **A tint is the family question asked finer**, exactly as it is on a card: a
 *  hue somebody picked arrives as two custom properties and the family table
 *  computes its six steps from them. */
function paint(look: Look): { attrs: Record<string, string>; style: CSSProperties } {
  const tinted = look.hue !== undefined;
  /** **Only what was said.** An attribute for every key would paint every run
   *  neutral and solid, and a reference and a tie would lose the one thing
   *  their module says about them — so an unstated key leaves no attribute and
   *  the module's own rule keeps the ground. */
  const stated = (name: string, value: string | undefined) =>
    value ? { [`data-${name}`]: value } : {};
  return {
    attrs: {
      ...(tinted ? { "data-family": "tint" } : stated("family", look.family)),
      ...stated("border-width", look.border_width),
      ...stated("border-style", look.border_style),
      ...stated("border-contrast", look.border_contrast),
      ...stated("name-font", look.name_font),
      ...stated("name-weight", look.name_weight),
      ...stated("name-contrast", look.name_contrast),
    },
    style: {
      ...(tinted ? {
        "--card-h": String(look.hue),
        "--card-c": `calc(var(--tint-ceiling) * ${look.intensity ?? 0.65})`,
      } : {}),
      ...(look.opacity !== undefined ? { opacity: look.opacity } : {}),
    } as CSSProperties,
  };
}

export function Wire(props: EdgeProps<LineEdge>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
          label, data, style } = props;

  /** **A line with no name still has somewhere to type one.** Nothing is drawn
   *  for a relationship nobody has named, so asking to name one had nowhere to
   *  put the field. */
  const naming = useNaming();
  /** **A run is a route**, and a route through the card it ends on is wrong. */
  const run = route({ x: sourceX, y: sourceY }, sourcePosition,
                    { x: targetX, y: targetY }, targetPosition, data?.clear ?? []);
  const path = drawn(run, BEND);
  const { x, y } = middle_of(run);
  const look = data?.wire ?? BARE;
  const end = heads(data);
  const { attrs, style: tint } = paint(look);

  /** **The name and the handle, composed rather than folded together.** That is
   *  the whole of what a run writes: an edge holds no values, so there is
   *  nothing at either end to draw and nothing else in the middle. */
  const middle = [label ? String(label) : "", data?.alias ?? ""]
    .filter(Boolean).join(" ");

  return (
    <>
      <g className="mnd-wire" {...attrs} style={tint}>
        <BaseEdge id={id} path={path} style={style}
                  markerStart={head_url(end.from)} markerEnd={head_url(end.to)} />
        {/* **A double line is two strokes, not a thicker one.** The stylesheet
            widens the run and this draws the ground back through the middle of
            it, which is the only way a stroke can be double. */}
        {look.border_style === "double"
          ? <path className="mnd-wire-core" d={path} /> : null}
      </g>
      {middle || naming.id === id ? (
        <EdgeLabelRenderer>
          {/* `nodrag` and `nopan` because the label sits in a layer over the
              canvas: without them a press on a name pans the viewport.
              **A relationship's name is drawn off the line**, so it says whose
              it is: it is not in the line's own hit area, and nothing else
              could work out from a pointer which run it belongs to. */}
          <div className="mnd-wire-name nodrag nopan" data-edge={id} {...attrs}
               style={{ ...tint,
                        transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
               title={middle}>
            <Name id={id} className="mnd-wire-text card-name" text={middle} />
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

/** **The heads live in the theme**, beside the role marks and for the same
 *  reason: the tray previews a run from the same table the canvas draws it
 *  from. Re-exported so the canvas mounts one set for the page. */
export { Heads };

/** One type, keyed by the name a projection asks for. Registered once at module
 *  scope — a fresh object each render remounts every line on the canvas. */
export const EDGE_TYPES = { wire: Wire } as const;
