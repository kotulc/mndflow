/** The matrix view module — structure drawn as a grid.
 *
 *  Projection surface (no frame, scroll), a gesture map that accepts none of
 *  the four adjustments, and composition that turns a layer's blocks and
 *  proxies into two axes with relationships in the cells. Cells paint as a
 *  heatmap (W.4): hue from each kind's own style, opacity from the count. The
 *  stage is a Contents-modelled panel: partial by default, expandable, with
 *  crumbs and types hosted beside the grid. Registers itself so a later
 *  import replaces the stub S2.5 left in the view registry. */

export { MATRIX } from "./surface";
export {
  MAP, takes, reaches,
  type Adjustment, type Binding, type GestureMap, type Hand, type Motion,
  type Reaches, type Target,
} from "./map";
export { gridOf, type AxisItem, type Cell, type Grid } from "./grid";
export { Matrix, type MatrixProps } from "./Matrix";
export { kindsOf, trailOf } from "./chrome";
export { bandsOf, type Band } from "./paint";

import { register } from "../index";
import { MATRIX } from "./surface";
import { kindsOf } from "./chrome";
import { gridOf } from "./grid";

// Replace the stub: same name, now carrying a surface.
register({
  name: "matrix", kind: "structure", word: "block", icon: "view_matrix", creates: null,
  surface: MATRIX,
  chrome: ["types"],
  // A cell's mark is a relationship kind, so the mark is a line's.
  types: { icon: "relation_typed", of: (graph, layer) => kindsOf(gridOf(graph, layer)) },
});
