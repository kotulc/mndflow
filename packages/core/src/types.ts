/** Every shared shape: the graph, the mutations, the steps. */

export type Id = string;

/** The workspace package's root: everything the user can edit sits under it. */
export const ROOT = "workspace";

/** The shipped package's root. */
export const BASE_PACKAGE = "base";

/** The plain definition a new workspace builds its structure in. */
export const MAIN = "main";

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
  /** Whether its value names what carries it: a table's key column. */
  key?: boolean;
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
  /** The block definition each column allocates, in order, or `""` for one allocating none. Its
   *  first row reads its own first values, or where a column has none, its definition's name. */
  columns?: Id[];
  /** One cell's size in units, where its cells are not a card's. */
  size?: { w: number; h: number };
};

/** What makes a block a definition: explicit, and holding what only a definition says. */
export type DefBody = {
  /** The fields its usages carry values for. */
  schema?: FieldDef[];
};

/** The one element. **A definition is a block too**: one carrying `def`, sitting in a package's
 *  domain. Its `type` is what it extends; a usage's `type` is the definition it uses. */
export type Block = {
  id: Id;
  /** The block it sits under; null only for a package's root. */
  parent: Id | null;
  type?: Id;
  name?: string;
  /** What a block holds as text, or what a definition is for. */
  body?: string;
  /** Present on a definition, and only there. */
  def?: DefBody;
  /** On a package root: the packages it depends on. */
  uses?: Id[];
  /** A reference: the block it stands for — a usage, a definition or a package. */
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
  /** How it draws and what it may do, by component: a definition's own word, or a usage's
   *  override of its definition's. Inherited down the `type` chain, nearest first. */
  settings?: Components;
  /** The tag definitions it carries, by id. */
  tags?: string[];
  flow?: Flow;
  /** A usage's field values. */
  values?: Field[];
};

export type Relation = {
  id: Id;
  from: Id;
  to: Id;
  /** What it is called, exactly as a block carries one. Absent draws its definition's name, the
   *  way an unnamed card draws its kind word. */
  name?: string;
  type?: Id;
  /** A part of the `from` block's definition the run leaves from: a usage reads it through. */
  fromPart?: Id;
  /** A part of the `to` block's definition the run arrives at. */
  toPart?: Id;
  dir?: Dir;
  /** Which wall a relationship end leaves by. */
  fromSide?: Side;
  toSide?: Side;
  /** A handle serial, as a block carries. */
  alias?: number;
  /** Words describing this line; its own, never inherited. */
  tags?: string[];
  /** What this one line says about how it draws, over whatever its definition said. */
  settings?: Components;
  /** No fields: what a connection says belongs to the blocks at its ends. */
};

/** Which block module the engine dispatches on. Three, because `folder`, `note`, `group` and
 *  `grid` turned out to be the plain block with different configuration. */
export type BlockModule = "block" | "reference" | "interface";

export const BLOCK_MODULES: readonly BlockModule[] = ["block", "reference", "interface"];

/** The shipped block bases. A kind is a definition, not a module: `folder`, `note`, `group`,
 *  `grid` and `tag` differ from `block` by what they configure and nothing else. **There is no `resource`**: every block may
 *  point at external content through `source`, so a kind for it said nothing the slot does not. */
export const BASE_BLOCKS: readonly Id[] = [
  "block", "folder", "reference", "interface", "group", "grid", "note", "tag",
];

/** The shipped relation bases. `tie` is a definition — a dashed run with no heads — which is what
 *  a relation touching a note resolves to. */
export const BASE_RELATIONS: readonly Id[] = ["line", "tie"];


export type Components = Record<string, Record<string, unknown>>;

/** A definition: a block carrying `def`, always named. */
export type Definition = Block & { def: DefBody; name: string };

export type Graph = {
  root: Id;
  blocks: Record<Id, Block>;
  edges: Record<Id, Relation>;
};

/** A fresh workspace: its package root, the groups that organize its definitions, and `main`. */
export function empty_graph(): Graph {
  const group = (id: Id, name: string, order: number): Block =>
    ({ id, parent: ROOT, name, type: "group", def: {}, order });
  const blocks: Block[] = [
    { id: ROOT, parent: null, name: "workspace" },
    group(`${ROOT}.blocks`, "blocks", 1),
    group(`${ROOT}.relations`, "relations", 2),
    group(`${ROOT}.tags`, "tags", 3),
    { id: MAIN, parent: ROOT, name: "main", def: {}, group: `${ROOT}.blocks`, order: 4 },
  ];
  return { root: ROOT, blocks: Object.fromEntries(blocks.map((b) => [b.id, b])), edges: {} };
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
  | { op: "size_block"; id: Id; w: number; h: number }
  | { op: "set_body"; id: Id; body: string }
  /** A definition's field schema, written whole. */
  | { op: "set_schema"; id: Id; schema: FieldDef[] }
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
  /** An end moved onto a block, and optionally onto a part its definition holds. */
  | { op: "set_end"; id: Id; end: "from" | "to"; port: Id; part?: Id | null }
  | { op: "set_port"; id: Id; side: Side; at: number }
  | { op: "set_side"; id: Id; end: "from" | "to"; side: Side | null }
  | { op: "mark_port"; id: Id; flow: Flow | null }
  /** A value on a block. An edge has none to set — see `Relation`. */
  | { op: "set_value"; id: Id; field: Field }
  | { op: "drop_value"; id: Id; name: string }
  /** The order a block's values are listed in, by name. */
  | { op: "order_values"; id: Id; names: string[] }
  | { op: "set_arrangement"; layer: Id; arrangement: Arrangement }
  | { op: "set_tags"; id: Id; tags: string[] }
  /** Everything this element says about how it draws, given back at once. */
  | { op: "drop_settings"; id: Id }
  /** One property of one component on one element. */
  | { op: "set_setting"; id: Id; key: string; name: string; value: unknown };

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

export const SCHEMA = "4.0";
