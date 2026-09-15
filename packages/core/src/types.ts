/** Every shared shape: the graph, the mutations, the steps. */

export type Id = string;

export const ROOT = "ws";

/** A place on a layer. */
export type Point = { x: number; y: number };

/** Which edge of a frame something sits on. */
export type Side = "top" | "right" | "bottom" | "left";

/** An interface's decorative mark. */
export type Flow = "in" | "out" | "both";

/** How a layer places what it holds. */
export type Arrangement = "free" | "grid";

export const ARRANGEMENTS: readonly Arrangement[] = ["free", "grid"];

/** A relation's kind: `tie` where an end is a note or a line, `line` otherwise. */
export type RelationModule = "line" | "tie";

export const RELATION_MODULES: readonly RelationModule[] = ["line", "tie"];

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

/** A merged region: a cell's extent, stated on the group and never on a cell. */
export type Span = { r: number; c: number; rows: number; cols: number };

/** Which line a header heads. Derived from where it sits, never stored — see `would_head`. */
export type HeaderRole = "row" | "col" | "both";

/** The one element; what it is comes from its definition. */
export type Block = {
  id: Id;
  parent: Id | null;
  type?: Id;
  name?: string;
  body?: string;
  /** A reference: the block it stands for. */
  of?: Id;
  /** The group or grid this block sits in. */
  group?: Id;
  /** Where in that group: replaces `x`/`y` for a gridded block. */
  cell?: Cell;
  /** Whether this block heads the line it sits in. */
  header?: boolean;
  /** Only meaningful on a group: its extent, which is what lets an empty grid draw. */
  rows?: number;
  cols?: number;
  /** Merged regions of this group's grid. */
  merges?: Span[];
  /** A grid's corner and size; a boundary derives its bounds from its members. */
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
  /** What this one block says about how it draws, over whatever its definition said. */
  looks?: Components;
  /** Words put on this block to say what it is like. */
  tags?: string[];
  flow?: Flow;
  fields?: Field[];
};

export type Relation = {
  id: Id;
  /** Blocks, except a tie, whose end may be a line. */
  from: Id;
  to: Id;
  module: RelationModule;
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

/** Which block module the engine dispatches on. */
export type BlockModule =
  | "block" | "folder" | "resource"
  | "reference" | "interface" | "group" | "grid" | "note";

export const BLOCK_MODULES: readonly BlockModule[] = [
  "block", "folder", "resource",
  "reference", "interface", "group", "grid", "note",
];


export type Components = Record<string, Record<string, unknown>>;

export type Definition = {
  id: Id;
  /** The package this came from; absent means the workspace made it. */
  from?: string;
  /** The kind this stands in for wherever an element names no definition. */
  default?: BlockModule | RelationModule;
  group: "block" | "relation";
  name: string;
  /** What a line naming this draws, exactly as typed — a stereotype such as `<<relates>>`. */
  label?: string;
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
  return { root: ROOT, blocks: { [ROOT]: { id: ROOT, parent: null, name: "workspace", type: "folder" } },
           edges: {}, defs: {} };
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
  | { op: "set_group"; id: Id; group: Id | null }
  | { op: "seat_cell"; id: Id; cell: Cell | null }
  | { op: "set_header"; id: Id; header: boolean }
  | { op: "set_grid"; id: Id; rows?: number | null; cols?: number | null }
  | { op: "merge_cells"; id: Id; span: Span }
  | { op: "split_cells"; id: Id; r: number; c: number }
  | { op: "link_blocks"; edge: Relation }
  | { op: "update_edge"; id: Id; type: Id | null }
  | { op: "delete_edge"; id: Id }
  | { op: "set_dir"; id: Id; dir: Dir }
  | { op: "set_form"; id: Id; module: RelationModule }
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

export const SCHEMA = "2.0";
