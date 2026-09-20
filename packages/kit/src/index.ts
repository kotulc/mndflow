/** The one surface mndflow offers anything outside this repo. */

/** The model, and the vocabulary it is written in. */
export {
  type Arrangement, type Block, type BlockModule, type Components, type Definition,
  type Dir, type Field, type FieldDef, type File, type Flow, type Graph, type Id,
  type Point, type Relation, type Side,
  type Cell, type HeaderRole, type Span, type ValueForm,
  ARRANGEMENTS, BLOCK_MODULES, ROOT, SCHEMA,
  empty_graph, new_id,
} from "@mnd/core";

/** Files. An envelope holding a graph, in and out. */
export { type Opened, hash, open, write, write_subtree } from "@mnd/core";

/** The door, asked rather than run: what a graph violates, and how to say it. */
export { type Fault, say, validate } from "@mnd/core";

/** The vocabulary's own checks, which the door does not make. */
export { type Allowed, type Allows, type Expects, type Note, type NoteKind, type Range,
         allows_of, expects_of, may_hold, may_seat, may_take, permits, review } from "@mnd/core";

/** Reading a graph. Every derived answer the engine gives about one. */
export {
  allocated_to, allocations_of, arrangement_of, at_cell, cell_of, children,
  edge_base, edges_in, grid_of, head_of, heads, isa, is_container, is_grid, is_group,
  is_header, is_holder, is_interface,
  is_reference, is_top_block, layer_id, members_of, merge_at, base_of,
  owner_of, path, region_of, shown_name, stands_for, subtree, would_head,
} from "@mnd/core";

/** The floor. `base_graph()` is a fresh workspace with the base package in it. */
export { ALL, BASE, RELATIONS, base_graph, by_id } from "@mnd/defs";

/** A layer, projected — and the two artifacts a projection makes on its own. */
export {
  type BoxData, type BoxNode, type Config, type Frame, type GridCell,
  type LineData, type LineEdge, type Trait, type Paper, type Scene, type Slot,
  SHEET, box_of, draw, draw_svg, extent, outline, project,
} from "@mnd/views";
