/** The matrix module's projection surface.
 *
 *  A grid with two axes and a scrollbar, no frame and no camera. Declared
 *  here so a definition that picks `matrix` never inherits a border it cannot
 *  draw. */

import type { Surface } from "../diagram/surface";

/** Structure as a grid: scroll the cells, crumbs to say where you are, types
 *  when the vocabulary matters. No axis or arrangement chrome — those move
 *  things on a plane, and a matrix has none. */
export const MATRIX: Surface = {
  surround: "none",
  viewport: "scroll",
  chrome: ["crumbs", "types"],
  asks: true,
};
