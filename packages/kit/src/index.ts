/** The one surface mndflow offers anything outside this repo.
 *
 *  **Data in, data and artifacts out.** A graph is what travels: a statement of
 *  what the model *is*, self-describing and validatable without executing
 *  anything. What comes back is another graph, a file, or a drawing.
 *
 *  **The test, and it is the whole of the rule:** a signature naming `Log`,
 *  `Step` or `Mutation` is internal. Graph to graph, and graph to Scene, is the
 *  seam. Nothing else is offered, and there are no exceptions to look up.
 *
 *  So the log, the steps, the mutations, the session, the action registry and
 *  the inference are all inside. So is `layout`: a consumer does not place
 *  anything, because projecting is what places, and the Scene it hands back
 *  already carries the geometry.
 *
 *  The consequence is intended: a consumer says what a model *is*, never what
 *  changed. Round-tripping is read a graph and write a graph, and diffing
 *  belongs to whoever cares. What buys it is a mutation union free to grow,
 *  because nothing outside this repo has ever been able to name one.
 *
 *  Headless. Nothing here reaches React or the DOM, so a consumer that only
 *  wants a drawing never pulls a renderer in. `@mnd/kit/react` is where the
 *  React viewer lives, and importing this never loads it. */

/** The model, and the vocabulary it is written in. */
export {
  type Arrangement, type Block, type BlockModule, type Components, type Definition,
  type Dir, type Field, type FieldDef, type File, type Flow, type Graph, type Id,
  type Point, type RelationModule, type Relation, type Side,
  type ValueForm, type ViewModule,
  ARRANGEMENTS, BLOCK_MODULES, READS, ROOT, SCHEMA, VIEW_MODULES,
  def_id, empty_graph, new_id,
} from "@mnd/core";

/** Files. An envelope holding a graph, in and out. */
export { type Opened, hash, open, write, write_subtree } from "@mnd/core";

/** The door, asked rather than run: what a graph violates, and how to say it. */
export { type Fault, say, validate } from "@mnd/core";

/** The vocabulary's own checks, which the door does not make.
 *
 *  **They advise while modelling and refuse only at translation**, so this is
 *  the half of validity a translator owns: `validate` says whether the graph
 *  can be read, and `review` says whether it says what its definitions asked
 *  for. A note is never repaired, because an unfinished model is not broken. */
export { type Note, type NoteKind, type Range, type Rules, review, rules_of } from "@mnd/core";

/** Reading a graph. Every derived answer the engine gives about one. */
export {
  arrangement_of, children, defs_in_scope, edges_in, isa, is_container,
  is_interface, is_reference, is_top_block, layer_id, module_of, owner_of, path,
  resolve_def, shown_name, stands_for, subtree,
} from "@mnd/core";

/** The floor. `base_graph()` is a fresh workspace with the base package in it. */
export { ALL, BASE, RELATIONS, base_graph, by_id } from "@mnd/defs";

/** A layer, projected — and the two artifacts a projection makes on its own. */
export {
  type BoxData, type BoxNode, type Config, type Frame, type LineData,
  type LineEdge, type Mark, type Paper, type Scene, type Slot, type View,
  SHEET, block, box_of, draw, draw_svg, extent, matrix, outline, table, view, views,
} from "@mnd/views";
