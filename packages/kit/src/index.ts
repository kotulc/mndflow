/** The one surface mndflow offers anything outside this repo. */

/** The model, and the vocabulary it is written in. */
export {
  type Layout, type Block, type BlockModule, type Components, type DefBody,
  type Attribute, type Definition, type Dir, type Domain, type File, type Floor,
  type Flow, type Form, type Graph, type Id, type Point, type Relation, type Side,
  type Cell, type Grid, type HeaderRole, type Shape, type Span, type Value,
  LAYOUTS, BASE_PACKAGE, BLOCK_MODULES, MAIN, ROOT, SCHEMA,
  empty_graph, new_id,
} from "@mnd/core";

/** Files. An envelope holding a graph, in and out. */
export { type Opened, hash, open, unmet, write } from "@mnd/core";

/** Cards as markdown: a block or definition written as its card source, one read back into its
 *  frontmatter and body, and a folder of them collected as a package. */
export { type Card, type Collected, type Leaf, card_text, collect, names_in, read_card,
         said_as } from "@mnd/core";

/** The door, asked rather than run: what a graph violates, and how to say it. */
export { type Fault, say, validate } from "@mnd/core";

/** The vocabulary's own checks, which the door does not make. */
export { type Allowed, type Allows, type Expects, type Note, type NoteKind, type Range,
         allows_of, expects_of, may_hold, may_seat, permits, review } from "@mnd/core";

/** Reading a graph. Every derived answer the engine gives about one. */
export {
  all_defs, allocated_to, allocations_of, attributes_of, form_of, is_value_type, links_to,
  layout_of, at_cell, cell_of, children, def_at,
  def_of, domain_of, edge_base, edges_in, frozen, grid_of, group_head, head_of, headed_group,
  heading, holders_in, isa, is_container, is_grid, is_group, is_header, is_holder,
  is_interface, lattice_of, is_reference, layer_of, drawn_in, inline, is_folder, organizes,
  tree_of, in_domain, setting_of, traits_of, uses_of, members_of, merge_at, base_of, opens,
  owner_of, package_of, packages, path, region_of, shape_of, shown_name, stands_for, subtree,
  subtypes, used_by,
} from "@mnd/core";

/** Tags: definitions blocks and definitions carry. */
export { block_tags, def_tags, is_tag, is_trait, tag_named } from "@mnd/core";

/** The floor. `FLOOR` is the base package's blocks; `base_graph()` a fresh workspace on it. */
export { ALL, BASE, FLOOR, RELATIONS, base_graph, by_id } from "@mnd/defs";

/** A layer, projected — and the two artifacts a projection makes on its own. */
export {
  type BoxData, type BoxNode, type Config, type Frame, type GridCell,
  type LineData, type LineEdge, type CardClass, type Paper, type Scene, type Slot,
  SHEET, box_of, draw, draw_svg, extent, outline, project,
} from "@mnd/views";

/** The card's default size and the range it is held inside, in units of the lattice; setting it,
 *  and what one block measures under it — so a host placing blocks itself stacks them by it. */
export { CARD, LARGE, UNITS, face_of, set_card, size_of, type Face } from "@mnd/views";

/** What a card carries, the large face's markdown, and its attributes as a table. */
export { carried, face_table, face_text, listed, table, type Listed, type Ruled } from "@mnd/views";

/** The computed layout: a layer as a page of boxes. */
export { page_graph } from "@mnd/views";

/** Sections and navigation: how a host cuts the workspace into layers, the views each offers,
 *  what opening, leaving and revealing do to the canvas, and what the sections hold. */
export { held_at, leave_at, open_at, reveal_at, sight, view_of, view_on, EDITOR, type Cut,
         type Held, type Section, type Tiers, type Top, type View, type ViewKind,
         type Views } from "@mnd/core";

/** A whole section drawn — every root it lists, down to its cut — and a cross-section along a pick. */
export { profile_graph, survey_graph } from "@mnd/views";

