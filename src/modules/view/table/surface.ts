/** The table module's projection surface.
 *
 *  Rows and a scrollbar, no frame and no camera. Declared here so a definition
 *  that picks `table` never inherits a border it cannot draw. The panel shell
 *  hosts crumbs and types beside the list. */

import type { Surface } from "../diagram/surface";

/** Structure as a list: scroll the rows, crumbs to say where you are, types
 *  when the vocabulary matters. No interfaces, axis or arrangement — those
 *  only make sense on a plane. */
export const TABLE: Surface = {
  surround: "none",
  viewport: "scroll",
  chrome: ["crumbs", "types"],
  asks: true,
};
