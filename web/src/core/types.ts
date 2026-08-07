/** Every shared shape in one place: the graph, the changes that build it, and
 *  the steps that record them.
 *
 *  The graph is **elements** and **relationships**, and nothing else. An
 *  element is placed and drawn; a relationship joins two of them. Everything
 *  else describes one of the two.
 *
 *  An element *is* a document — its text lives on it, and the object explorer
 *  is the tree of blocks. There is no second representation to fall out of
 *  step. */

/** Which frame edge an interface sits on. */
export type Side = "top" | "right" | "bottom" | "left";
/** Decorative marking on an interface. Constrains nothing. */
export type Flow = "in" | "out" | "both";
/** Which way a relationship reads. Undirected by default. */
export type Dir = "none" | "forward" | "back" | "both";

/** Which of the four an element is.
 *
 *  Closed and engine-level: it decides what draws an element and which rules
 *  reach it. `block` is the base and the default — the discrete structural
 *  thing the tree is built from. `note` and `group` describe rather than
 *  structure. `proxy` stands in for a block living in another layer.
 *
 *  A user's own subtypes go in `type` and subtype **within** one of these,
 *  never across one, so this set stays closed and no rule has to branch on
 *  user data. Container and interface are not here: both are derived, from
 *  what a block holds and from whether it sits on a frame edge. */
export type Elem = "block" | "note" | "group" | "proxy";

/** What a relationship's ends are, and how it draws.
 *
 *  `untyped` is the default and says nothing beyond "these two are related":
 *  its ends are plain seats and the layer puts them wherever the path wants.
 *  `flow` says the relationship carries something one way, so its ends read as
 *  in and out and take the sides the layer's axis gives them. `assoc` is a
 *  weaker mention, drawn lighter. `tie` joins a note to what it describes. The
 *  kind decides the ends; `dir` still decides which way the arrows point.
 *
 *  **`reference` is not among them.** A relationship is a reference when one of
 *  its ends is a proxy, which is a fact about where its ends live rather than a
 *  kind it was given — so it is derived, and a reference is still plain, flow
 *  or assoc in its own right.
 *
 *  A kind may draw as something other than a routed line — a tie is a leader,
 *  taking no pointer and no seats — but that is a rule about drawing, not about
 *  what it is. Anything joining two elements is a relationship, so that there
 *  is one way to join things, one cascade when an end is deleted, and one list
 *  to read them from. */
export type Kind = "untyped" | "flow" | "assoc" | "tie";

/** Which way a layer reads, and nothing else.
 *
 *  A setting, held per layer, because a pipeline and a hierarchy can sit in one
 *  project. It decides which sides a `flow` relationship attaches to and how
 *  its line is drawn. It says nothing about where cards go — that is what an
 *  arrangement does, and an arrangement is an action rather than a setting. */
export type Axis = "none" | "across" | "down";

/** What one run of an arrangement does. Never stored: picking one lays the
 *  layer out and writes down where everything landed. */
export type Layout = "grid" | "radial" | "across" | "down";

/** The block that holds every other.
 *
 *  A reserved id rather than a shape of its own, so root is an ordinary
 *  element carrying the project's name, axis, body and attributes. `parent:
 *  null` still means "in the root layer" everywhere it is written; root is
 *  told from its own children by this id alone, which is the one place any
 *  listing has to know about it. */
export const ROOT = "root";

/** A descriptive value carried by an element or a relationship.
 *
 *  No identity of its own — an attribute is a name and a value on the thing
 *  that carries it, addressed by that name. Never structural: an attribute
 *  never appears in the explorer and never changes what contains what. */
export type Attr = { name: string; value: string; tags: string[] };

export type Element = {
  id: string;
  /** Which of the four this is. */
  element: Elem;
  label: string;
  /** The user's own subtype — a stereotype. Vocabulary from the domain
   *  ("Character", "Service", "Page") or a saved template. */
  type: string;
  parent: string | null;
  body: string;
  /** Set only once the user drags it; null means lay it out automatically. */
  x: number | null;
  y: number | null;
  /** The least room a note was asked for, from the rectangle its drag swept.
   *  A minimum and not a size: the text still grows it, so the box and what it
   *  says can never disagree. Null on everything else. */
  w: number | null;
  h: number | null;
  /** Set when this block sits on its parent's frame edge, which is what makes
   *  it an interface. An interface's x/y mean nothing — side and how far along
   *  the edge take their place, so the port survives the frame resizing.
   *
   *  Set once, at creation. An interface stays an interface: it slides along
   *  the edge and around corners, but never steps off it to become a child
   *  block, and no child block ever steps onto it. */
  side: Side | null;
  at: number | null;
  flow: Flow | null;
  /** This element's number among its siblings of the same kind, fixed when it
   *  is made. Stored rather than counted, so deleting one renames none of the
   *  others: the gap it leaves is simply what the next one takes. */
  num: number | null;
  /** How this element arranges its contents when it is the layer being looked
   *  at. Null reads as `none`. */
  axis: Axis | null;
  /** The groups this element belongs to — its membership.
   *
   *  Held here and nowhere else: a group's member list is derived by asking
   *  who names it, so the two can never disagree. Membership is descriptive,
   *  not structural — a group is never a parent. */
  groups: string[];
  /** What a proxy stands in for: the block it is a second appearance of.
   *
   *  Held here rather than as a relationship. A proxy standing for a block is
   *  not two things being joined — it is one thing appearing twice, which is a
   *  property of the appearance. The relationships that *reach* a proxy are the
   *  references, and they are ordinary relationships drawn by hand. */
  of: string | null;
  /** Descriptive values, addressed by name. */
  attrs: Attr[];
  color: string;
};

/** One end of a relationship as it is drawn: the element it lands on, the
 *  interface it landed on where it landed on one, and the wall the gesture
 *  named where it named one. Most ends have neither — where a line meets a card
 *  is worked out by the layer, not stored. */
export type End = { node: string; port?: string; side?: Side };

/** A point on the canvas. */
export type Spot = { x: number; y: number };

export type Edge = {
  id: string;
  source: string;
  target: string;
  /** What this relationship means — its stereotype. Free text, offered from
   *  the project's list and renameable across every edge at once. */
  type: string;
  /** The interface each end is tied to. A relationship has one at each end
   *  always; absent only means it was never placed anywhere in particular,
   *  so it is implied at the side of the card facing the other end rather than
   *  stored. Drawing a relationship by hand places both. */
  from?: string;
  to?: string;
  dir: Dir;
  /** What its ends are and how it draws. Absent reads as `untyped`, so a log
   *  written before kinds existed still folds to what it drew. */
  kind?: Kind;
  /** The wall an end was drawn through, where the gesture named one.
   *
   *  A choice, so it is kept — the same standing an element's own position has
   *  over automatic layout. Unlike a route it never goes stale: cards move, the
   *  frame is resized, the layer is rearranged, and "this leaves by the north
   *  wall" is still true and still drawable. The seat along that wall stays
   *  derived. `arrange` clears these along with hand placement. */
  fromSide?: Side;
  toSide?: Side;
};

export type Graph = {
  elements: Record<string, Element>;
  edges: Record<string, Edge>;
  /** The kinds of relation this project uses. Seeded from the domain and
   *  edited freely — a relation may be named anything, but the list is what
   *  gets offered and what can be renamed across every edge at once. */
  relations: string[];
  /** The project's vocabulary and starting relations. One per project. */
  domain: string;
};

export type Mutation =
  | { op: "add_element"; element: Element }
  | { op: "update_element"; id: string; label?: string; type?: string; color?: string }
  | { op: "move_element"; id: string; parent: string | null }
  | { op: "place_element"; id: string; x: number; y: number }
  /** The least room a note was asked for, from the rectangle its drag swept. */
  | { op: "size_element"; id: string; w: number; h: number }
  | { op: "delete_element"; id: string }
  | { op: "set_body"; id: string; body: string }
  /** Slide an interface along its parent's frame edge, and around its corners.
   *  It never comes off: an interface is one for as long as it exists. */
  | { op: "set_port"; id: string; side: Side; at: number }
  | { op: "mark_port"; id: string; flow: Flow | null }
  /** How a layer arranges its contents. Null names the root. */
  | { op: "set_axis"; layer: string | null; axis: Axis }
  /** Hand a layer's blocks back to automatic placement, so a new arrangement
   *  has something to arrange. */
  | { op: "relax_layer"; layer: string | null }
  /** Join or leave a group. Membership is held on the member, and is not a
   *  relationship: a group draws a boundary round its members rather than a
   *  line to each. */
  | { op: "join_group"; id: string; group: string }
  | { op: "leave_group"; id: string; group: string }
  /** Set or drop a descriptive value, addressed by its name. */
  | { op: "set_attr"; id: string; name: string; value?: string; tags?: string[] }
  | { op: "drop_attr"; id: string; name: string }
  | { op: "link_elements"; edge: Edge }
  /** Tie one end of a relationship to an interface that now exists for it. */
  | { op: "set_end"; id: string; end: "from" | "to"; port: string }
  | { op: "update_edge"; id: string; type: string }
  | { op: "set_dir"; id: string; dir: Dir }
  | { op: "set_kind"; id: string; kind: Kind }
  /** Pin one end of a relationship to a wall, or hand it back to the layer. */
  | { op: "set_side"; id: string; end: "from" | "to"; side: Side | null }
  /** Turn a relation around; what it says stays the same. */
  | { op: "flip_edge"; id: string }
  | { op: "delete_edge"; id: string }
  | { op: "set_domain"; domain: string }
  | { op: "add_relation"; name: string }
  /** Renames the kind and every edge already using it, together. */
  | { op: "rename_relation"; from: string; to: string }
  /** Drops the kind; edges using it survive, unnamed. */
  | { op: "drop_relation"; name: string }
  | Legacy;

/** Operations no longer written, still folded so that a log recorded before a
 *  rename or a merge replays to what it drew at the time. */
export type Legacy =
  | { op: "add_node"; node: Record<string, unknown> }
  | { op: "update_node"; id: string; label?: string; type?: string }
  | { op: "move_node"; id: string; parent: string | null }
  | { op: "place_node"; id: string; x: number; y: number }
  | { op: "delete_node"; id: string }
  | { op: "link_nodes"; edge: Record<string, unknown> }
  | { op: "set_template"; template: string }
  | { op: "set_title"; title: string }
  | { op: "add_attr"; attr: Record<string, unknown> }
  | { op: "update_attr"; id: string; name?: string; value?: string; tags?: string[];
      color?: string }
  | { op: "place_attr"; id: string; x: number; y: number }
  | { op: "attach_attr"; id: string; holder: string }
  | { op: "detach_attr"; id: string; holder: string }
  | { op: "delete_attr"; id: string }
  | { op: "route_edge"; id: string; layer: string | null; route: Spot[] | null };

/** One user action and everything it changed. Undo flips the status and the
 *  graph is refolded, so no mutation needs an inverse. */
export type Step = {
  id: string;
  /** Id of the workflow question this answered, "" for a direct edit. */
  question: string;
  /** The question as it was asked, so the terminal can show the exchange. */
  prompt: string;
  /** What the user said or did, for the action log. */
  input: string;
  action: string;
  mutations: Mutation[];
  status: "applied" | "reverted";
};

let counter = 0;

/** Short readable id. Monotonic within a session, which keeps the action log
 *  and the canvas stable across a refold. */
export function newId(prefix: string): string {
  counter += 1;

  return `${prefix}_${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** An element with the defaults filled in, so callers only state what differs. */
export function element(label: string, extra: Partial<Element> = {}): Element {
  return {
    id: newId("n"),
    element: "block",
    label,
    type: "",
    parent: null,
    body: "",
    x: null,
    y: null,
    w: null,
    h: null,
    side: null,
    at: null,
    flow: null,
    num: null,
    axis: null,
    groups: [],
    of: null,
    attrs: [],
    color: "#d9a441",
    ...extra,
  };
}

/** The root block: the one element every project starts with. */
export function rootElement(title = ""): Element {
  return element(title, { id: ROOT, axis: "none" });
}

export const EMPTY: Graph = {
  elements: { [ROOT]: rootElement() }, edges: {}, relations: [], domain: "",
};

/** A relationship with the defaults filled in. Undirected unless said. */
export function edge(source: string, target: string, extra: Partial<Edge> = {}): Edge {
  return { id: newId("e"), source, target, type: "", dir: "none", ...extra };
}

/** A descriptive value with the defaults filled in. */
export function attr(name: string, extra: Partial<Attr> = {}): Attr {
  return { name, value: "", tags: [], ...extra };
}

export function step(input: string, action: string, mutations: Mutation[],
                     question = "", prompt = ""): Step {
  return { id: newId("s"), question, prompt, input, action, mutations, status: "applied" };
}
