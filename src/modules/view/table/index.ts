/** The table view module — structure drawn as rows.
 *
 *  No component of its own (W.1): choosing `table` on the view toggle fills
 *  the tray with `Contents` at full stage size — same listing, same filters
 *  and sort — instead of this module drawing a second one. What stays here is
 *  what Contents cannot answer: the projection surface, the gesture map that
 *  accepts none of the four adjustments, and composition that turns a
 *  layer's blocks and proxies into rows for the rail's `types` group.
 *  Registers itself so a later import replaces the stub S2.5 left in the
 *  view registry. */

export { TABLE } from "./surface";
export {
  MAP, takes, reaches,
  type Adjustment, type Binding, type GestureMap, type Hand, type Motion,
  type Reaches, type Target,
} from "./map";
export { rowsOf, type Row } from "./rows";
export { kindsOf, trailOf } from "./chrome";

import { register } from "../index";
import { TABLE } from "./surface";
import { kindsOf } from "./chrome";
import { rowsOf } from "./rows";

// Replace the stub: same name, now carrying a surface.
register({
  name: "table", kind: "structure", word: "row", icon: "view_table", creates: "", surface: TABLE,
  // Rows, so nothing to draw and nothing to arrange — only what to list.
  chrome: ["types"],
  // A row's type is its definition's name, so the mark is a block's.
  types: { icon: "role_leaf", of: (graph, layer) => kindsOf(rowsOf(graph, layer)) },
});
