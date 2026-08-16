/** The state module's projection surface.
 *
 *  A behavior layer on a plane: frame and camera like activity, so states and
 *  transitions sit in space. Chrome skips the structure-only toggles. */

import type { Surface } from "../diagram/surface";

/** Behavior as a framed diagram: place states, ask for names, arrange. */
export const STATE: Surface = {
  surround: "frame",
  viewport: "camera",
  chrome: ["crumbs", "types", "axis", "arrange", "relax"],
  asks: true,
};
