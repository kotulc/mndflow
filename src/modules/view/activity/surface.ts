/** The activity module's projection surface.
 *
 *  A behavior layer on a plane: frame and camera like the block diagram, so
 *  lanes and control nodes sit in space rather than in a scroll list. Chrome
 *  skips the structure-only toggles (interfaces, form, angular). */

import type { Surface } from "../diagram/surface";

/** Behavior as a framed diagram: place actions, ask for names, arrange. */
export const ACTIVITY: Surface = {
  surround: "frame",
  viewport: "camera",
  chrome: ["crumbs", "types", "axis", "arrange", "relax"],
  asks: true,
};
