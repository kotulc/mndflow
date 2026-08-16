/** The sequence module's projection surface.
 *
 *  A behavior layer as columns: frame and camera like the activity view, so
 *  lifelines sit in space. Chrome skips the structure-only toggles. */

import type { Surface } from "../diagram/surface";

/** Behavior as a framed diagram: seat messages, ask for names, arrange. */
export const SEQUENCE: Surface = {
  surround: "frame",
  viewport: "camera",
  chrome: ["crumbs", "types", "axis", "arrange", "relax"],
  asks: true,
};
