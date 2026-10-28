/** Every shared shape: the graph, the mutations, the steps. */

export type Id = string;

/** The workspace package's root: everything the user can edit sits under it. */
export const ROOT = "workspace";

/** The shipped package's root. */
export const BASE_PACKAGE = "base";

/** A place on a layer. */
export type Point = { x: number; y: number };

/** Which edge of a frame something sits on. */
export type Side = "top" | "right" | "bottom" | "left";

/** Which way an interface carries: in, out, or both, which is what absent says. */
export type Flow = "in" | "out" | "both";

/** How a layer places what it draws — **always automatically**: by its relations (`layered`),
 *  or as a treemap, each block as large as what it holds. A setting (`layout.kind`), said by a
 *  definition and overridable by the layer; unsaid, it is packed (`auto`). `page` is the
 *  package view's own, for the boxes down its page, and never said by a layer. */
export type Layout = "auto" | "page" | "layered" | "treemap";

/** The layouts a layer may say. */
export const LAYOUTS: readonly Layout[] = ["layered", "treemap"];

/** Which way a line points: a setting, `line.dir`, said by its definition and overridable on the
 *  line, like any other. */
export const DIRS = ["none", "forward", "back", "both"] as const;

export type Dir = (typeof DIRS)[number];

/** What a definition declares its usages answer. Its `type` names a form, a type, or a block
 *  definition, which makes it a link; absent, it is text. Anything else said of it is kept as
 *  written, in `extra`. */
export type Attribute = {
  name: string;
  type?: Id;
  /** Whether its value names what carries it: `primary`, the key, or `unique` beside it. A
   *  foreign key is an attribute typed by a definition. */
  key?: Key;
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

/** Which key an attribute is. */
export const KEYS = ["primary", "unique"] as const;

export type Key = (typeof KEYS)[number];

/** Who owns whom at one end of a relation: nobody, shared (aggregation), or whole (composition).
 *  Said at the owner's end. */
export const OWNERSHIPS = ["none", "shared", "composite"] as const;

export type Ownership = (typeof OWNERSHIPS)[number];

/** What one end of a relation means: how many meet it, in what role, who owns whom, and whether
 *  the other end can reach it. **Meaning, never drawing**: a view draws from it. */
export type End = {
  /** `1`, `0..1`, `*`, `1..*` or `m..n`. */
  multiplicity?: string;
  role?: string;
  ownership?: Ownership;
  /** Whether this end can be reached from the other; unsaid is unspecified, read as both ways. */
  navigable?: boolean;
};

/** A relation's two ends. */
export type Ends = { from?: End; to?: End };

/** A usage's answer to an attribute, by name. Typed by the attribute, never by itself. */
export type Value = { name: string; value: string };

/** An address inside a grid. */
export type Cell = { r: number; c: number };

/** A merged region: a cell's extent, stated on the grid and never on a cell. */
export type Span = { r: number; c: number; rows: number; cols: number };

/** Which line a header heads. Derived from where it sits, never stored — see `head_of`. */
export type HeaderRole = "row" | "col" | "both";

/** The holders that draw what they hold inline: a boundary round it, a band across the layer, or
 *  a lattice of cells. Which one a block is comes from its traits. */
export type Shape = "group" | "grid" | "region";

/** A grid's lattice, held on the block that is one: allocation, and nothing else. Its top row
 *  heads columns and its left column heads rows; what sits in a cell is a block. */
export type Grid = {
  rows: number;
  cols: number;
  /** Cells with an extent of their own. */
  merges?: Span[];
};

/** The tree a folder at a package's root belongs to, where it is not structure. */
export type Tree = "definitions";

/** How a value is edited: the engine's, closed. A form is named by its own word wherever a type
 *  is named. */
export const FORMS = ["text", "number", "flag", "choice", "link"] as const;

export type Form = (typeof FORMS)[number];

/** A component definition: an entry in its package's library, defined, extended and styled as a
 *  block definition is, and read by the same resolver. */
export type LibraryEntry = {
  id: Id;
  name: string;
  description?: string;
  /** What it extends: another entry of its kind; unsaid, its kind's base. */
  type?: Id;
  /** How it draws, as a definition's settings: nearest first down its chain. */
  settings?: Components;
};

/** A named, reusable data shape: an enum (`choice` and its options) or an alias (one form). A
 *  component, stored as data in its package and never drawn on a layer. */
export type Type = LibraryEntry & {
  form: Form;
  /** An enum's options. */
  choices?: string[];
  /** What a number counts in. */
  unit?: string;
  /** How its values are written: a pattern its form reads, such as `0.00` or `YYYY-MM-DD`. */
  format?: string;
};

/** A word to find things by: a component, stored as data in its package. */
export type Tag = LibraryEntry;

/** What a port carries, defined once: an interface definition, a port's type. */
export type Interface = LibraryEntry;

/** A rule a block or a line is held to, defined once and applied by id: the values it must answer,
 *  and, on a line, the values both ends must agree on. Advice: it never refuses an edit. */
export type Constraint = LibraryEntry & {
  /** Values it must answer, by name. */
  required?: string[];
  /** On a line: values both its ends must answer alike, by name. */
  match?: string[];
};

/** A package's named components, held on its root. */
export type Library = { types?: Type[]; tags?: Tag[]; interfaces?: Interface[];
                        constraints?: Constraint[] };

/** The kinds a library holds, in the order they list. */
export const KINDS: readonly (keyof Library)[] = ["types", "tags", "interfaces", "constraints"];

/** Each library kind's base: what an entry extending nothing extends. */
export const KIND_BASE: Record<keyof Library, Id> = {
  types: "attribute", tags: "tag", interfaces: "interface", constraints: "constraint",
};

/** What makes a block a definition: explicit, and holding what only a definition says. */
export type DefBody = {
  /** What its usages answer. */
  attributes?: Attribute[];
  /** A relation definition's ends: what each means, for every line it types. */
  ends?: Ends;
};

/** A port: a block's boundary, data on any block that *has ports*, keyed by id so a line's end
 *  can name it. A usage wears its definition's, read through. */
export type Port = {
  id: Id;
  name?: string;
  /** Its interface definition, in a library: what it carries. Unsaid, the base `interface`. */
  type?: Id;
  description?: string;
  /** Which way it carries: in, out, or both, which is what absent says. */
  flow?: Flow;
  /** Where it sits on its block's wall; unsaid, it places itself. */
  side?: Side;
  at?: number;
  /** A handle serial, as a block carries. */
  alias?: number;
};

/** The one element. **A definition is a block too**: one carrying `def`, sitting in a package's
 *  domain. Its `type` is what it extends; a usage's `type` is the definition it uses. */
export type Block = {
  id: Id;
  /** The block it sits under; null only for a package's root. */
  parent: Id | null;
  type?: Id;
  name?: string;
  /** What a block holds as text. */
  body?: string;
  /** What it is for, in a line: shown beside it and on hover. */
  description?: string;
  /** Present on a definition, and only there. */
  def?: DefBody;
  /** A folder at its package's root: the tree it belongs to, which what it holds follows. Unset,
   *  structure. */
  tree?: Tree;
  /** A reference: the block it stands for — a usage, a definition or a package. */
  of?: Id;
  /** A package root's named components: its types and tags. */
  library?: Library;
  /** A collection's records: rows of answers to its `records.of` attributes, by name. Values,
   *  never blocks. */
  records?: Record<string, string>[];
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
  /** What a definition can do: engine traits, by name, in order. **Stated, the list replaces
   *  its chain's**; unsaid, it carries its chain's. A definition's alone. */
  traits?: Id[];
  /** The tag definitions it carries, by id, in order: an index for finding it. **Stated, the list
   *  replaces its definition's**; unsaid, it carries its definition's. An empty list says none. */
  tags?: Id[];
  /** The constraints it is held to, by id, in order: stated, the list replaces its definition's,
   *  as tags do. */
  constraints?: Id[];
  /** **The groups it is in**, by the group block's id, each on its own layer: membership, never
   *  enclosure. Each gives it the group's name as a tag (`given_of`). */
  groups?: Id[];
  /** Its ports, in order: its boundary, where relations and flows enter and leave. */
  ports?: Port[];
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
  /** The port on the `from` block the run leaves from: its own, or one its definition's chain
   *  declares, which a usage reads through. */
  fromPort?: Id;
  /** The port on the `to` block the run arrives at. */
  toPort?: Id;
  /** A handle serial, as a block carries. */
  alias?: number;
  /** Its place in the list it was read from, as a block's `order`. */
  order?: number;
  /** Its tags, as a block's: stated, they replace its definition's. */
  tags?: Id[];
  /** Its constraints, as a block's. */
  constraints?: Id[];
  /** What this one line says about how it draws, over whatever its definition said. */
  settings?: Components;
  /** Its answers to its definition's attributes, as a usage's. */
  values?: Value[];
  /** What its ends say over its definition's: a line narrows multiplicity and role only. */
  ends?: Ends;
};

/** Which block module the engine dispatches on. Three: every other kind is the plain block,
 *  configured. */
export type BlockModule = "block" | "reference" | "interface";

export const BLOCK_MODULES: readonly BlockModule[] = ["block", "reference", "interface"];

/** The shipped block bases: only the kinds the engine treats differently. A kind is a definition,
 *  not a module. **There is no `resource`**: every block may point at external content through
 *  `source`, so a kind for it said nothing the slot does not. */
export const BASE_BLOCKS: readonly Id[] = [
  "block", "model", "reference", "folder", "grid", "note", "label", "group", "region",
];

/** The shipped diagram kinds: blocks extending `block`, each fixing its view, layout and icon. A
 *  block of one holding parts is retyped only within its family; a plain block is none of them. */
export const DIAGRAMS: readonly Id[] = [
  "internal", "flow", "state", "sequence", "swimlane", "class", "entity", "treemap",
];

/** The one question each diagram kind answers, as every surface words it. */
export const DIAGRAM_QUESTIONS: Readonly<Record<string, string>> = {
  internal: "what it is made of", flow: "what moves through it", state: "how one thing changes",
  sequence: "who talks to whom, in what order", swimlane: "who does what, in which phase",
  class: "what its types are", entity: "how its data is stored", treemap: "where the weight is",
};

/** The base notation: what a diagram draws with beside its parts — the annotations on every kind,
 *  and the marks a flow or state machine adds. It lives on its layer, never in the explorer. */
export const NOTATION: readonly Id[] = ["note", "label", "group", "region", "start", "end",
                                        "decision"];

/** The annotations every diagram kind draws with: notation that is no mark. */
export const ANNOTATIONS: readonly Id[] = ["note", "label", "group", "region"];

/** The marks a diagram kind draws with beside its parts. Every kind draws the `ANNOTATIONS`; a
 *  kind not named here draws no marks. */
export const KIND_MARKS: Readonly<Record<Id, readonly Id[]>> = {
  flow: ["start", "decision", "end"],
  state: ["start", "end"],
};

/** The diagram kinds that hold alike, so a block holding parts moves freely among them: parts
 *  and lines; references to definitions. Each grid kind is its own: its cells carry over to the
 *  other, but not their meaning. */
export const KIND_FAMILIES: readonly (readonly Id[])[] = [
  ["internal", "flow", "state", "treemap"], ["class", "entity"], ["sequence"], ["swimlane"],
];

/** The shipped relation bases. `tie` is a definition — a dashed run with no heads — chosen like
 *  any other type. */
export const BASE_RELATIONS: readonly Id[] = ["line", "tie"];

/** The shipped component bases a library entry extends: carried by blocks as data, never a block
 *  of their own. A port's seat is drawn by the `interface` module. */
export const BASE_COMPONENTS: readonly Id[] = ["attribute", "constraint", "interface", "tag"];


export type Components = Record<string, Record<string, unknown>>;

/** Traits: what the engine does, one capability each. **A fixed table, not definitions** — a
 *  definition lists them by name in `traits`, and each grants the setting the engine reads. */
/** One engine capability: its name, what it does, and the settings it grants. */
export type Trait = { id: Id; description: string; settings: Components };

/** Every trait the engine supports: *has X* for a capability granted, *is X* for what sort of
 *  thing it is. */
export const TRAITS: readonly Trait[] = [
  { id: "has_head", description: "Its first member heads it.",
    settings: { allows: { heads: true } } },
  { id: "has_parts", description: "Holds blocks of its own, which it opens onto as a layer.",
    settings: { allows: { holds: true } } },
  { id: "has_ports", description: "Has ports: interfaces may sit on its walls.",
    settings: { allows: { ports: true } } },
  { id: "has_records", description: "Holds many records of one type (`records.of`), drawn as a "
      + "table on its card.",
    settings: { allows: { records: true } } },
  { id: "has_tie", description: "Made from, or dropped on, a block, it is tied to it.",
    settings: { tie: { type: "tie" } } },
  { id: "has_values", description: "Holds values of its own: answers to its definition's attributes.",
    settings: { allows: { values: true } } },
  { id: "is_behaviour", description: "Is a behaviour: a method of what holds it, its layer the flow, "
      + "state machine, swimlane or sequence that does it; its interfaces its parameters and return.",
    settings: { block: { behaviour: true } } },
  { id: "is_grid", description: "Seats text and blocks in the cells of a grid, drawn when it is opened.",
    settings: { holder: { matrix: true } } },
  { id: "is_group", description: "Draws as a panel round its members, on the layer it sits on; "
      + "it holds nothing, its members carry it.",
    settings: { holder: { panel: true } } },
  { id: "is_region", description: "Draws as a band across the layer it sits on, under its "
      + "heading, holding what lies in it.",
    settings: { holder: { inline: true, band: true } } },
  { id: "is_interface", description: "Is an interface: a block's boundary, seated on its owner's "
      + "wall, where relationships and flows enter and leave. Never a card, a layer or a row.",
    settings: { block: { module: "interface" } } },
  { id: "is_reference", description: "Stands for another block, definition or package (`of`): "
      + "draws as it, opens onto it, owns nothing.",
    settings: { block: { module: "reference" } } },
  { id: "is_tie", description: "Is a tie: a straight run between the nearest corners of the two "
      + "cards. No anchor, no end mark, and never routed.",
    settings: { line: { module: "tie" } } },
];


/** A definition: a block carrying `def`, always named. */
export type Definition = Block & { def: DefBody; name: string };

export type Graph = {
  root: Id;
  blocks: Record<Id, Block>;
  edges: Record<Id, Relation>;
};

/** A fresh workspace: its package root, and nothing else. Every grouping is the user's. */
export function empty_graph(): Graph {
  const root: Block = { id: ROOT, parent: null, name: "workspace" };
  return { root: ROOT, blocks: { [ROOT]: root }, edges: {} };
}

/** The closed mutation set. A new sort of thing is a definition, not an op. */
export type Mutation =
  | { op: "checkpoint"; graph: Graph }
  | { op: "add_block"; block: Block }
  /** `type: null` and `tree: null` clear them. */
  | { op: "update_block"; id: Id; name?: string; type?: Id | null; tree?: Tree | null }
  | { op: "delete_block"; id: Id }
  | { op: "move_block"; id: Id; parent: Id | null }
  | { op: "place_block"; id: Id; x: number; y: number }
  | { op: "order_block"; id: Id; order: number }
  | { op: "set_alias"; id: Id; alias: number }
  | { op: "set_counter"; kind: string; n: number }
  /** The whole shortlist, in order. */
  | { op: "size_block"; id: Id; w: number; h: number }
  | { op: "set_body"; id: Id; body: string }
  | { op: "set_description"; id: Id; description: string }
  /** A definition's attributes, written whole. */
  | { op: "set_attributes"; id: Id; attributes: Attribute[] }
  /** A relation's ends, or a relation definition's, written whole; null gives them back. */
  | { op: "set_ends"; id: Id; ends: Ends | null }
  /** A package's named components, written whole; null gives them back. */
  | { op: "set_library"; id: Id; library: Library | null }
  /** A collection's records, written whole; null gives them back. */
  | { op: "set_records"; id: Id; records: Record<string, string>[] | null }
  /** Where a block came from; null gives it back. */
  | { op: "set_source"; id: Id; source: string | null }
  | { op: "seat_cell"; id: Id; cell: Cell | null }
  /** A block's lattice, written whole: its shape is one thing. Null gives it back. */
  | { op: "set_grid"; id: Id; grid: Grid | null }
  | { op: "link_blocks"; edge: Relation }
  /** As `update_block`: only what is said changes, and `type: null` clears it. */
  | { op: "update_edge"; id: Id; name?: string; type?: Id | null }
  | { op: "delete_edge"; id: Id }
  | { op: "flip_edge"; id: Id }
  /** An end moved onto a block, and optionally onto one of its ports. */
  | { op: "set_end"; id: Id; end: "from" | "to"; block: Id; port?: Id | null }
  /** A block's ports, written whole; null gives them back. */
  | { op: "set_ports"; id: Id; ports: Port[] | null }
  /** An answer on a block or a line. */
  | { op: "set_value"; id: Id; name: string; value: string }
  | { op: "drop_value"; id: Id; name: string }
  /** The order a block's values are listed in, by name. */
  | { op: "order_values"; id: Id; names: string[] }
  /** An element's tags, in order; null gives the list back to its definition. */
  | { op: "set_tags"; id: Id; tags: Id[] | null }
  | { op: "set_groups"; id: Id; groups: Id[] | null }
  /** An element's constraints, in order; null gives the list back to its definition. */
  | { op: "set_constraints"; id: Id; constraints: Id[] | null }
  /** A definition's traits, in order; null gives the list back to its chain. */
  | { op: "set_traits"; id: Id; traits: Id[] | null }
  /** Everything this element says about how it draws, given back at once. */
  | { op: "drop_settings"; id: Id }
  /** One property of one component on one element. */
  | { op: "set_setting"; id: Id; key: string; name: string; value: unknown };

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
