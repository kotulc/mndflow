/** How a relationship paints, from the style component.
 *
 *  `lookOf` is the definition's portable fields (and set, when present). A
 *  reference — a line that reaches another layer — still draws violet and
 *  dashed: that is derived from what the ends *are*, so it stays the engine's
 *  fact offered to the module, never a style on a definition that does not
 *  exist for it. */

import { MarkerType, type EdgeMarkerType } from "@xyflow/react";

import type { Look } from "../../style";

/** Defaults when a definition says nothing — today's green line. */
const PLAIN = {
  color: "#2f4a3e",
  head: "#3f6552",
} as const;

/** A reference's own hue — nothing else has claimed violet. */
const AWAY = {
  color: "#6d5aa8",
  head: "#6d5aa8",
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
