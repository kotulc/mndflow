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

/** How a layer places what it draws: by hand, laid out for you, or as a page of full-width
 *  boxes. A setting (`layout.kind`), said by a definition and overridable
 *  by the layer. */
export type Layout = "free" | "auto" | "page";

export const LAYOUTS: readonly Layout[] = ["free", "auto", "page"];

export type Dir = "none" | "forward" | "back" | "both";

/** What a definition declares its usages answer. Its `type` is a value type, or a block
 *  definition, which makes it a link; absent, it is text. Anything else said of it is kept as
 *  written, in `extra`. */
export type Attribute = {
  name: string;
  type?: Id;
  /** Whether its value names what carries it: the key. */
  key?: boolean;
  /** What a usage answers where it says nothing. */
  default?: string;
  unit?: string;
  /** Whether a usage may answer it with several values. */
  many?: boolean;
  /** Whether a usage may leave it unanswered. */
  optional?: boolean;
  note?: string;
  extra?: Record<string, string>;
};

/** A usage's answer to an attribute, by name. Typed by the attribute, never by itself. */
export type Value = { name: string; value: string };

/** An address inside a grid. */
export type Cell = { r: number; c: number };

/** A merged region: a cell's extent, stated on the grid and never on a cell. */
export type Span = { r: number; c: number; rows: number; cols: number };

/** Which line a header heads. Derived from where it sits, never stored — see `head_of`. */
export type HeaderRole = "row" | "col" | "both";

/** The two holders that draw what they hold inline: a boundary round it, or a lattice of cells.
 *  Which one a block is comes from its base. */
export type Shape = "group" | "grid";

/** A grid's lattice, held on the block that is one: allocation, and nothing else. Its top row
 *  heads columns and its left column heads rows; what sits in a cell is a block. */
export type Grid = {
  rows: number;
  cols: number;
  /** Cells with an extent of their own. */
  merges?: Span[];
};

/** What makes a block a definition: explicit, and holding what only a definition says. */
export type DefBody = {
  /** What its usages answer. */
  attributes?: Attribute[];
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
  /** A reference: the block it stands for — a usage, a definition or a package. */
  of?: Id;
  /** Where its content lives outside the workspace: one uri, whatever locator syntax the thing
   *  it names spells. **Provenance rather than a link** — nothing syncs to it, so it may go stale
   *  without anything breaking, and nothing here parses it. A within-part and a revision are the
   *  uri's own business (`#heading`, `@v2`): they were fields once, and nothing ever read them. */
  source?: string;
  /** Where in its parent grid: replaces `x`/`y` for a seated block. */
  cell?: Cell;
  /** Its lattice, where its definition makes it a grid. */
  grid?: Grid;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  side?: Side;
  at?: number;
  order?: number;
  /** A handle serial, minted once and never rewritten. */
  alias?: number;
  /** Handle counters per kind, held on the workspace. */
  counters?: Record<string, number>;
  /** How it draws and what it may do, by component: a definition's own word, or a usage's
   *  override of its definition's. Inherited down the `type` chain, nearest first. */
  settings?: Components;
  /** The tag definitions it carries, by id. */
  tags?: string[];
  /** A definition's capability tags, by id, in order: tags carrying settings. Stated, they
   *  replace the chain's set. A usage carries none. */
  traits?: Id[];
  flow?: Flow;
  /** A usage's answers, in order. */
  values?: Value[];
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
  "block", "folder", "reference", "interface", "group", "grid", "note", "tag", "value",
];

/** The shipped relation bases. `tie` is a definition — a dashed run with no heads — chosen like
 *  any other type. */
export const BASE_RELATIONS: readonly Id[] = ["line", "tie"];


export type Components = Record<string, Record<string, unknown>>;

/** A definition: a block carrying `def`, always named. */
export type Definition = Block & { def: DefBody; name: string };

export type Graph = {
  root: Id;
  blocks: Record<Id, Block>;
  edges: Record<Id, Relation>;
};

/** A fresh workspace: its package root and `main`. Groupings are the user's. */
export function empty_graph(): Graph {
  const blocks: Block[] = [
    { id: ROOT, parent: null, name: "workspace" },
    { id: MAIN, parent: ROOT, name: "main", def: {}, order: 1 },
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
  | { op: "size_block"; id: Id; w: number; h: number }
  | { op: "set_body"; id: Id; body: string }
  /** A definition's attributes, written whole. */
  | { op: "set_attributes"; id: Id; attributes: Attribute[] }
  /** Where a block came from; null gives it back. */
  | { op: "set_source"; id: Id; source: string | null }
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
  /** A seat places an interface; none lets it place itself again. */
  | { op: "set_port"; id: Id; seat: { side: Side; at: number } | null }
  | { op: "mark_port"; id: Id; flow: Flow | null }
  /** An answer on a block. An edge has none to set — see `Relation`. */
  | { op: "set_value"; id: Id; name: string; value: string }
  | { op: "drop_value"; id: Id; name: string }
  /** The order a block's values are listed in, by name. */
  | { op: "order_values"; id: Id; names: string[] }
  | { op: "set_tags"; id: Id; tags: string[] }
  /** The traits an element carries, in order; null gives the set back to its chain. */
  | { op: "set_traits"; id: Id; traits: Id[] | null }
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

export const SCHEMA = "1.0";
