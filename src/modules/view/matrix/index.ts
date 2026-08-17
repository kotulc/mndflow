/** The matrix view module — structure drawn as a grid.
 *
 *  Projection surface (no frame, scroll), a gesture map that accepts none of
 *  the four adjustments, and composition that turns a layer's blocks and
 *  proxies into two axes with relationships in the cells. The stage is a
 *  Contents-modelled panel: partial by default, expandable, with crumbs and
 *  types hosted beside the grid. Registers itself so a later import replaces
 *  the stub S2.5 left in the view registry. */

export { MATRIX } from "./surface";
export {
  MAP, takes, reaches,
  type Adjustment, type Binding, type GestureMap, type Hand, type Motion,
  type Reaches, type Target,
} from "./map";
export { gridOf, type AxisItem, type Cell, type Grid } from "./grid";
export { Matrix, type MatrixProps } from "./Matrix";
export { Types, kindsOf, trailOf, type TypesProps } from "./chrome";

import { register } from "../index";
import { MATRIX } from "./surface";

// Replace the stub: same name, now carrying a surface.
register({
  name: "matrix", kind: "structure", word: "block", icon: "view_matrix", creates: null, surface: MATRIX,
});
