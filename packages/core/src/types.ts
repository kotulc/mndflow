/** Every shared shape: the graph, the mutations, the steps.
 *
 *  Two element kinds and no third — a block and a relation. Definitions group
 *  three ways by what they describe, in one id space. See schema.md. */

export type Id = string;

export const ROOT = "ws";

/** A place on a layer. The model already carries coordinates — a block has an
 *  `x` and a `y` — so the pair they make is named here, once, rather than
 *  redeclared identically by everything that computes or reads one. */
export type Point = { x: number; y: number };

/** Which edge of a frame something sits on. */
export type Side = "top" | "right" | "bottom" | "left";

/** An interface's decorative mark. Constrains nothing. */
export type Flow = "in" | "out" | "both";

/** How a layer places what it holds. One setting, two values.
 *
 *  **Model data, not a preference.** How a layer lays out is part of what the
 *  layer says, so a diagram reopens the way it was left and travels in a file
 *  with the rest of it.
 *
 *  `free` is hand placement; `grid` slots everything into the layer's own
 *  lattice, left to right and a new row when the square is full. **The four
 *  directional values are gone** — they ranked by relationships, which read as
 *  a picture of the graph rather than of the model.
 *
 *  **`grid` names the lattice, and so does a group.** They are the same
 *  lattice: a group is a named region of it, which is what lets a block seated
 *  in one line up with a block the layer placed. */
export type Arrangement = "free" | "grid";

export const ARRANGEMENTS: readonly Arrangement[] = ["free", "grid"];

/** Closed: two are picked, two are assigned from what sits at the ends. */
export type RelationModule = "line" | "directed" | "reference" | "tie";

export type Dir = "none" | "forward" | "back" | "both";

/** Closed, and permanent. */
export type ValueForm = "text" | "number" | "flag" | "choice" | "link";

export const VALUE_FORMS: readonly ValueForm[] = ["text", "number", "flag", "choice", "link"];

export type Field = {
  name: string;
  form: ValueForm;
  value?: string;
  tags?: string[];
};

export type FieldDef = Field & { unit?: string; choices?: string[]; many?: boolean };

/** An address inside a group's grid. **It rides on the block**, exactly as
 *  `side` and `at` do for an interface — so a cell is derived and never a
 *  block, and an empty cell is an address nobody claimed. */
export type Cell = { r: number; c: number };

/** A merged region: a cell's extent, stated on the group and never on a cell.
 *  Distinct from a footprint, which says how many cells a block needs. */
export type Span = { r: number; c: number; rows: number; cols: number };

/** Which row and column of a group carry meaning rather than contents. Row 0
 *  and column 0, marked. */
export type Headers = "none" | "row" | "col" | "both";

export const HEADERS: readonly Headers[] = ["none", "row", "col", "both"];

/** The one element. What it *is* comes from its definition. */
export type Block = {
  id: Id;
  parent: Id | null;
  type?: Id;
  label?: string;
  body?: string;
  /** A reference: the block it stands for. */
  of?: Id;
  /** The group this block sits in. **One group per block, and no nesting** —
   *  which is what lets an allocation be derived at all. */
  group?: Id;
  /** Where in that group. Replaces `x`/`y` for a gridded block, exactly as
   *  `side` and `at` replace them for an interface. */
  cell?: Cell;
  /** Only meaningful on a group: its extent, which is what lets an empty grid
   *  draw. A group with neither is a boundary — a band round its members. */
  rows?: number;
  cols?: number;
  headers?: Headers;
  /** Merged regions of this group's grid. */
  merges?: Span[];
  /** **A grid owns its corner.** A boundary still derives its bounds from its
   *  members; a grid cannot, or an empty one would be nothing. */
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  /** Only meaningful when this block is the open layer. */
  arrangement?: Arrangement;
  side?: Side;
  at?: number;
  num?: number;
  /** **A serial, minted once and never rewritten.** `num` is a position among
   *  siblings and is renumbered whenever anything moves, so a name read off it
   *  changed while you rearranged. This is handed out at creation and is the
   *  block's for good — which is what lets a block nobody has named be told
   *  from the one beside it. Drawn as a short mark (`A1`, `B7`), never as the
   *  number it is stored as.
   *
   *  **An alias, not a tag.** A tag is something you put on a block to say what
   *  it is like, and there can be any number of them; this is one mark the app
   *  hands out so that a thing with no name still has something to be called. */
  alias?: number;
  /** Whether the drawing writes this block's name on it. **Absent is yes.**
   *  Model data rather than a display preference: what a card says about itself
   *  is part of what the layer says, so it travels and it undoes. */
  labelled?: boolean;
  /** Whether this block is fixed where it was put. **Absent is no.**
   *
   *  **A lock is not a hand brake.** You may always drag a locked block; what
   *  it fixes is what the app would otherwise work out for itself — an
   *  interface stays on the wall it was put on rather than being re-seated, and
   *  a relationship end stays where it was pinned rather than being derived
   *  from where the two cards ended up.
   *
   *  On an ordinary block it is a mark and nothing more for now: the `grid`
   *  arrangement has full authority to re-order everything it lays out. */
  locked?: boolean;
  /** What this one block says about how it draws, over whatever its definition
   *  said. **The last word in the cascade**, keyed the way a definition's
   *  components are (`card`, `style`) so the two layer without translating.
   *
   *  Local until it is pinned: customising a block changes that block, and
   *  pinning is what turns the result into a definition anything else can name. */
  looks?: Components;
  /** Words put on this block to say what it is like. **The block's own, never
   *  its definition's**: two things of the same type are tagged differently all
   *  the time, and an untyped block can be tagged like anything else.
   *
   *  A tag carries nothing — no fields, no style, no inheritance. That is what
   *  separates it from a definition, and what lets there be any number. */
  tags?: string[];
  flow?: Flow;
  fields?: Field[];
};

export type Relation = {
  id: Id;
  from: Id;
  to: Id;
  module: RelationModule;
  type?: Id;
  dir?: Dir;
  fromSide?: Side;
  toSide?: Side;
  /** Where along that wall the end was pinned. **Only ever set by hand** — an
   *  end nobody has dragged has no fraction, and the seat it meets is worked
   *  out from where the two blocks ended up. */
  fromAt?: number;
  toAt?: number;
  fields?: Field[];
};

/** Which block module the engine dispatches on. Open — one more is additive.
 *
 *  **Seven, since the grid.** A `view` module had one way to draw and no
 *  configuration left once the grid absorbed the table and the matrix. *View*
 *  is reserved rather than retired: it will name a data perspective over the
 *  model, and it comes back defined. */
export type BlockModule =
  | "block" | "folder" | "resource"
  | "reference" | "interface" | "group" | "note";

export const BLOCK_MODULES: readonly BlockModule[] = [
  "block", "folder", "resource",
  "reference", "interface", "group", "note",
];

/** **The kinds a block may be changed between.** A block, a folder and a
 *  resource differ in what they are *for* and in nothing a gesture would have
 *  to invent, so one becomes another by saying so.
 *
 *  Everything else is arrived at by making one: a reference is a second
 *  appearance of something, an interface is seated on a wall, a group has
 *  members and a note is its text — each of them carries something a plain
 *  block has no answer for, so retyping into one would have to make it up.
 *  **Subtyping them is not the same act**: make one, customise it, and pin
 *  that, which never changes anybody's kind. */
export const OPEN_MODULES: readonly BlockModule[] = ["block", "folder", "resource"];

export type Components = Record<string, Record<string, unknown>>;

export type Definition = {
  id: Id;
  /** The block it is filed under. Ownership, lock and scope all derive from this. */
  home: Id;
  group: "block" | "relation";
  name: string;
  body?: string;
  extends?: Id;
  fields?: FieldDef[];
  size?: { w: number; h: number };
  names?: Record<string, string>;
  components?: Components;
};

export type Graph = {
  root: Id;
  blocks: Record<Id, Block>;
  edges: Record<Id, Relation>;
  defs: Record<Id, Definition>;
};

export function empty_graph(): Graph {
  return { root: ROOT, blocks: { [ROOT]: { id: ROOT, parent: null, label: "workspace", type: "folder" } },
           edges: {}, defs: {} };
}

/** The closed mutation set. A new sort of thing is a definition, not an op. */
export type Mutation =
  | { op: "checkpoint"; graph: Graph }
  | { op: "add_block"; block: Block }
  | { op: "update_block"; id: Id; label?: string; type?: Id }
  | { op: "delete_block"; id: Id }
  | { op: "move_block"; id: Id; parent: Id | null }
  | { op: "place_block"; id: Id; x: number; y: number }
  | { op: "order_block"; id: Id; num: number }
  | { op: "size_block"; id: Id; w: number; h: number }
  | { op: "set_body"; id: Id; body: string }
  | { op: "set_group"; id: Id; group: Id | null }
  | { op: "seat_cell"; id: Id; cell: Cell | null }
  | { op: "set_grid"; id: Id; rows?: number; cols?: number; headers?: Headers }
  | { op: "merge_cells"; id: Id; span: Span }
  | { op: "split_cells"; id: Id; r: number; c: number }
  | { op: "link_blocks"; edge: Relation }
  | { op: "update_edge"; id: Id; type: Id }
  | { op: "delete_edge"; id: Id }
  | { op: "set_dir"; id: Id; dir: Dir }
  | { op: "set_form"; id: Id; module: RelationModule }
  | { op: "flip_edge"; id: Id }
  | { op: "set_end"; id: Id; end: "from" | "to"; port: Id }
  | { op: "set_port"; id: Id; side: Side; at: number }
  | { op: "set_side"; id: Id; end: "from" | "to"; side: Side | null; at?: number }
  | { op: "mark_port"; id: Id; flow: Flow | null }
  | { op: "set_field"; id: Id; field: Field }
  | { op: "drop_field"; id: Id; name: string }
  | { op: "set_def"; def: Definition }
  | { op: "drop_def"; id: Id }
  | { op: "set_arrangement"; layer: Id; arrangement: Arrangement }
  | { op: "set_labelled"; id: Id; labelled: boolean }
  | { op: "set_locked"; id: Id; locked: boolean }
  | { op: "set_tags"; id: Id; tags: string[] }
  /** One property of one component on one block. `null` gives it back to
   *  whatever the chain said, which is not the same as setting a default. */
  | { op: "set_look"; id: Id; key: string; name: string; value: unknown };

export type MutationOp = Mutation["op"];

export type Step = {
  id: Id;
  /** The action that produced it. */
  action: string;
  /** Steps before this one. */
  at: number;
  status: "applied" | "reverted";
  mutations: Mutation[];
};

export type Log = Step[];

/** The envelope a file carries. */
export type File = {
  schema: string;
  id: Id;
  graph: Graph;
  meta?: Record<string, unknown>;
};

export const SCHEMA = "2.0";
