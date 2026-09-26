/** Every shared shape: the graph, the mutations, the steps. */

export type Id = string;

export const ROOT = "ws";

/** A place on a layer. */
export type Point = { x: number; y: number };

/** Which edge of a frame something sits on. */
export type Side = "top" | "right" | "bottom" | "left";

/** An interface's decorative mark. */
export type Flow = "in" | "out" | "both";

/** How a layer places what it holds: by hand, or laid out for you. */
export type Arrangement = "free" | "auto";

export const ARRANGEMENTS: readonly Arrangement[] = ["free", "auto"];

export type Dir = "none" | "forward" | "back" | "both";

/** The value forms a field may take. Closed. */
export type ValueForm = "text" | "number" | "flag" | "choice" | "link";

export const VALUE_FORMS: readonly ValueForm[] = ["text", "number", "flag", "choice", "link"];

export type Field = {
  name: string;
  form: ValueForm;
  value?: string;
  tags?: string[];
};

export type FieldDef = Field & { unit?: string; choices?: string[]; many?: boolean };

/** An address inside a group's grid. */
export type Cell = { r: number; c: number };

/** A merged region: a cell's extent, stated on the grid and never on a cell. */
export type Span = { r: number; c: number; rows: number; cols: number };

/** Which line a header heads. Derived from where it sits, never stored — see `head_of`. */
export type HeaderRole = "row" | "col" | "both";

/** The two ways a block may hold blocks on its own layer: a boundary round them, or a lattice of
 *  cells. A capability its definition states — see `Allows.holder`. */
export type Shape = "group" | "grid";

/** A grid's lattice, held on the block that is one. */
export type Grid = {
  rows: number;
  cols: number;
  /** Which outer lines head the rest: the top row heads columns, the left column heads rows. */
  head?: { top?: boolean; left?: boolean };
  /** Cells with an extent of their own. */
  merges?: Span[];
  /** A plain value per cell, by row then column. A value is data, not a part: a cell seating a
   *  block draws the block. */
  values?: string[][];
  /** The definition whose fields head its columns. Its first row reads their names and holds no
   *  values. */
  schema?: Id;
  /** One cell's size in units, where its cells are not a card's. */
  size?: { w: number; h: number };
};

/** A place on the workspace's shelf: a folder somebody made, or where one of its own definitions
 *  sits. The list's order is the explorer's. */
export type Shelved = {
  id: Id;
  group: "block" | "relation";
  /** The folder it sits in; absent is its group's top. */
  in?: Id;
  /** A folder's name. A definition's entry has none, since the definition carries it. */
  name?: string;
};

/** The one element; what it is comes from its definition. */
export type Block = {
  id: Id;
  parent: Id | null;
  type?: Id;
  name?: string;
  body?: string;
  /** A reference: what it stands for — a block, a definition or a package. */
  of?: Id;
  /** Where its content lives outside the workspace: one uri, whatever locator syntax the thing
   *  it names spells. **Provenance rather than a link** — nothing syncs to it, so it may go stale
   *  without anything breaking, and nothing here parses it. A within-part and a revision are the
   *  uri's own business (`#heading`, `@v2`): they were fields once, and nothing ever read them. */
  source?: string;
  /** The group or grid block this one sits in, on the same layer. Membership, never parenthood. */
  group?: Id;
  /** Where in that grid: replaces `x`/`y` for a gridded block. */
  cell?: Cell;
  /** Its lattice, where its definition makes it a grid. */
  grid?: Grid;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  /** Only meaningful when this block is the open layer. */
  arrangement?: Arrangement;
  side?: Side;
  at?: number;
  order?: number;
  /** A handle serial, minted once and never rewritten. */
  alias?: number;
  /** Handle counters per kind, held on the workspace. */
  counters?: Record<string, number>;
  /** Pinned definitions, in order: relations on the rail, blocks in the explorer. */
  pinned?: Id[];
  /** The workspace's own definitions as filed in the explorer, in order. */
  shelf?: Shelved[];
  /** What this one block says about how it draws, over whatever its definition said. */
  looks?: Components;
  /** Words put on this block to say what it is like. */
  tags?: string[];
  flow?: Flow;
  fields?: Field[];
};

export type Relation = {
  id: Id;
  from: Id;
  to: Id;
  /** What it is called, exactly as a block carries one. Absent draws its definition's name, the
   *  way an unnamed card draws its kind word. */
  name?: string;
  type?: Id;
  dir?: Dir;
  /** Which wall a relationship end leaves by. */
  fromSide?: Side;
  toSide?: Side;
  /** A handle serial, as a block carries. */
  alias?: number;
  /** Words describing this line; its own, never inherited. */
  tags?: string[];
  /** What this one line says about how it draws, over whatever its definition said. */
  looks?: Components;
  /** No fields: what a connection says belongs to the blocks at its ends. */
};

/** Which block module the engine dispatches on. Three, because `folder`, `note`, `group` and
 *  `grid` turned out to be the plain block with different configuration. */
export type BlockModule = "block" | "reference" | "interface";

export const BLOCK_MODULES: readonly BlockModule[] = ["block", "reference", "interface"];

/** The shipped block bases. A kind is a definition, not a module: `folder`, `note`, `group` and
 *  `grid` differ from `block` by what they configure and nothing else. **There is no `resource`**: every block may
 *  point at external content through `source`, so a kind for it said nothing the slot does not. */
export const BASE_BLOCKS: readonly Id[] = [
  "block", "folder", "reference", "interface", "group", "grid", "note",
];

/** The shipped relation bases. `tie` is a definition — a dashed run with no heads — which is what
 *  a relation touching a note resolves to. */
export const BASE_RELATIONS: readonly Id[] = ["line", "tie"];


/** A package: a named set of definitions the workspace draws on. Named so a person can find it,
 *  and addressed by id so a block may stand in for one. */
export type Package = {
  id: Id;
  /** Unique within the workspace. */
  name: string;
  /** The package this one builds on. A package is never written into, only extended. */
  extends?: Id;
};

export type Components = Record<string, Record<string, unknown>>;

export type Definition = {
  id: Id;
  /** The package this came from, by id; absent means the workspace made it. */
  from?: Id;
  /** The shipped base this stands in for wherever an element names no definition. */
  default?: Id;
  group: "block" | "relation";
  /** What a usage of it draws where it carries no name of its own — the kind word on a card, the
   *  word on a run. **One key for both**: a line used to read a `label` here and a block the
   *  name, which was two keys for one job. */
  name: string;
  /** What this definition is for, in a sentence — **a description of it, never content it
   *  holds**. A block's `body` is the thing itself; this is prose about the vocabulary. Named as
   *  every other description here is: an action's `about`, a catalogue entry's `about`. */
  about?: string;
  extends?: Id;
  /** Words put on it to say what it is like. **Tagging is generic**: it indexes a definition the
   *  same way it indexes a block, and nothing inherits one. */
  tags?: string[];
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
  packages: Record<Id, Package>;
};

export function empty_graph(): Graph {
  return { root: ROOT, blocks: { [ROOT]: { id: ROOT, parent: null, name: "workspace", type: "folder" } },
           edges: {}, defs: {}, packages: {} };
}

/** The closed mutation set. A new sort of thing is a definition, not an op. */
export type Mutation =
  | { op: "checkpoint"; graph: Graph }
  | { op: "add_block"; block: Block }
  /** `type: null` clears it. */
  | { op: "update_block"; id: Id; name?: string; type?: Id | null }
  | { op: "delete_block"; id: Id }
  | { op: "move_block"; id: Id; parent: Id | null }
  | { op: "place_block"; id: Id; x: number; y: number }
  | { op: "order_block"; id: Id; order: number }
  | { op: "set_alias"; id: Id; alias: number }
  | { op: "set_counter"; kind: string; n: number }
  /** The whole shortlist, in order. */
  | { op: "set_pinned"; ids: Id[] }
  /** The whole shelf, in order. */
  | { op: "set_shelf"; shelf: Shelved[] }
  | { op: "size_block"; id: Id; w: number; h: number }
  | { op: "set_body"; id: Id; body: string }
  /** A definition's description. Its own op, because it is not the same thing as a body. */
  | { op: "set_about"; id: Id; about: string }
  /** Where a block came from; null gives it back. */
  | { op: "set_source"; id: Id; source: string | null }
  | { op: "set_group"; id: Id; group: Id | null }
  | { op: "seat_cell"; id: Id; cell: Cell | null }
  /** A block's lattice, written whole: its shape is one thing. Null gives it back. */
  | { op: "set_grid"; id: Id; grid: Grid | null }
  | { op: "link_blocks"; edge: Relation }
  /** As `update_block`: only what is said changes, and `type: null` clears it. */
  | { op: "update_edge"; id: Id; name?: string; type?: Id | null }
  | { op: "delete_edge"; id: Id }
  | { op: "set_dir"; id: Id; dir: Dir }
  | { op: "flip_edge"; id: Id }
  | { op: "set_end"; id: Id; end: "from" | "to"; port: Id }
  | { op: "set_port"; id: Id; side: Side; at: number }
  | { op: "set_side"; id: Id; end: "from" | "to"; side: Side | null }
  | { op: "mark_port"; id: Id; flow: Flow | null }
  /** A value on a block. An edge has none to set — see `Relation`. */
  | { op: "set_field"; id: Id; field: Field }
  | { op: "drop_field"; id: Id; name: string }
  /** The order a block's values are listed in, by name. */
  | { op: "order_fields"; id: Id; names: string[] }
  | { op: "set_def"; def: Definition }
  | { op: "drop_def"; id: Id }
  | { op: "set_package"; pkg: Package }
  /** Its definitions go with it. */
  | { op: "drop_package"; id: Id }
  | { op: "set_arrangement"; layer: Id; arrangement: Arrangement }
  | { op: "set_tags"; id: Id; tags: string[] }
  /** Everything this block says about how it draws, given back at once. */
  | { op: "drop_looks"; id: Id }
  /** One property of one component on one block. */
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

export const SCHEMA = "3.0";
