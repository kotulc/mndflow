/** What a relationship looks like. */

import type { CSSProperties } from "react";
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import { drawn, heads, middle_of, route, BARE, type LineEdge,
         type Wire as Look } from "@mnd/views";
import { head_url, Heads, Name, useNaming } from "@mnd/theme";

/** How square a right-angled corner is. */
const BEND = 6;

/** How a run paints itself, as the attributes `card.css` already reads. */
function paint(look: Look): { attrs: Record<string, string>; style: CSSProperties } {
  const tinted = look.hue !== undefined;
  /** Only stated keys become attributes, so an unstyled tie keeps its module's look. */
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

  /** A line with no name still has somewhere to type one. */
  const naming = useNaming();
  /** A run routes round the cards it ends on. */
  const run = route({ x: sourceX, y: sourceY }, sourcePosition,
                    { x: targetX, y: targetY }, targetPosition, data?.clear ?? []);
  const path = drawn(run, BEND);
  const { x, y } = middle_of(run);
  const look = data?.wire ?? BARE;
  const end = heads(data);
  const { attrs, style: tint } = paint(look);

  /** The name and the handle, composed rather than folded together. */
  const middle = [label ? String(label) : "", data?.alias ?? ""]
    .filter(Boolean).join(" ");

  return (
    <>
      <g className="mnd-wire" {...attrs} style={tint}>
        <BaseEdge id={id} path={path} style={style}
                  markerStart={head_url(end.from)} markerEnd={head_url(end.to)} />
        {/* A double line is two strokes, not a thicker one. */}
        {look.border_style === "double"
          ? <path className="mnd-wire-core" d={path} /> : null}
      </g>
      {middle || naming.id === id ? (
        <EdgeLabelRenderer>
          {/* `nodrag` and `nopan`, so a press on a name does not pan. */}
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

/** The heads live in the theme, shared with the tray's preview. */
export { Heads };

/** One type, keyed by the name a projection asks for. */
export const EDGE_TYPES = { wire: Wire } as const;
