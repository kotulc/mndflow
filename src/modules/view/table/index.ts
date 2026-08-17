/** The table view module — structure drawn as rows.
 *
 *  Projection surface (no frame, scroll), a gesture map that accepts none of
 *  the four adjustments, and composition that turns a layer's blocks and
 *  proxies into rows. The stage is a Contents-modelled panel: partial by
 *  default, expandable, with crumbs and types hosted beside the list.
 *  Registers itself so a later import replaces the stub S2.5 left in the
 *  view registry. */

export { TABLE } from "./surface";
export {
  MAP, takes, reaches,
  type Adjustment, type Binding, type GestureMap, type Hand, type Motion,
  type Reaches, type Target,
} from "./map";
export { rowsOf, type Row } from "./rows";
export { Row as RowView, type RowProps } from "./Row";
export { Table, type TableProps } from "./Table";
export { Types, kindsOf, trailOf, type TypesProps } from "./chrome";

import { register } from "../index";
import { TABLE } from "./surface";

// Replace the stub: same name, now carrying a surface.
register({
  name: "table", kind: "structure", word: "row", icon: "view_table", creates: "", surface: TABLE,
  // Rows, so nothing to draw and nothing to arrange — only what to list.
  chrome: ["types"],
});
