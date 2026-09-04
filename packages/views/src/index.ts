/** The projection. **One way to draw**, since the grid absorbed the table and
 *  the matrix — a layer is a plane, and what was a choice of view module is now
 *  a question about how the blocks in it are placed.
 *
 *  *View* is reserved rather than retired: it will name a data perspective —
 *  table, matrix, sequence — over the model, and it comes back defined.
 *
 *  **What a consumer needs, and not everything there is.** `look` is this
 *  package's own working and is reached through the few names below. */

export * from "./derive";
export * from "./scene";
export * from "./size";
export * from "./arrange";
export * from "./seat";
export * from "./svg";
export * from "./text";

export { project, type Config } from "./block";

export { CELLS, PLAIN, cells_of, look_key, look_of, type Cell, type Emphasis, type Label,
         type Layout, type Look, type Shape, type Slot, type Voice,
         type Weight } from "./look";
