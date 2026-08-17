/** How a relationship paints, from the style component.
 *
 *  `lookOf` is the definition's portable fields (and set, when present). A
 *  reference — a line that reaches another layer — still draws violet and
 *  dashed: that is derived from what the ends *are*, so it stays the engine's
 *  fact offered to the module, never a style on a definition that does not
 *  exist for it. */

import { MarkerType, type EdgeMarkerType } from "@xyflow/react";

import type { Look } from "../../style";

/** Defaults when a definition says nothing.
 *
 *  Steps on the theme's ramp rather than colours (Y.6). These are handed to
 *  React Flow as stroke values and the edge is drawn in the page, so a `var()`
 *  resolves — which is what lets a route follow the theme at all. An exported
 *  SVG has no page and is the one caller that cannot use them (`svg.ts`). */
const PLAIN = {
  color: "var(--route)",
  head: "var(--route-head)",
} as const;

/** A reference's own hue — nothing else has claimed violet. Fixed across
 *  themes, since *elsewhere* means the same thing in all of them; only its
 *  lightness follows the ladder. */
const AWAY = {
  color: "var(--route-away)",
  head: "var(--route-away)",
  dash: "5 4",
} as const;

const DASH: Record<NonNullable<Look["line"]>, string | undefined> = {
  solid: undefined,
  dashed: "6 4",
  dotted: "2 3",
};

/** Marker shape from the portable `head` field. Absent means today's filled. */
function marker(head: Look["head"] | undefined, color: string): EdgeMarkerType | undefined {
  if (head === "none") return undefined;
  if (head === "open") {
    return { type: MarkerType.Arrow, width: 16, height: 16, color };
  }

  // filled, hollow, or unspoken — closed arrow. Hollow is a later distinction.
  return { type: MarkerType.ArrowClosed, width: 16, height: 16, color };
}

/** Stroke, dash and arrowheads for one relationship as drawn. */
export function paint(look: Look, away: boolean): {
  stroke: string;
  dash?: string;
  head: (dir: "forward" | "back") => EdgeMarkerType | undefined;
} {
  if (away) {
    return {
      stroke: AWAY.color,
      dash: AWAY.dash,
      head: () => ({ type: MarkerType.ArrowClosed, width: 16, height: 16, color: AWAY.head }),
    };
  }

  const stroke = look.color ?? PLAIN.color;
  const tip = look.color ?? PLAIN.head;

  return {
    stroke,
    dash: look.line ? DASH[look.line] : undefined,
    head: () => marker(look.head, tip),
  };
}
