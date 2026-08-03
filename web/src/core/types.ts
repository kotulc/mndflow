/** Every shared shape in one place: the graph, the changes that build it, and
 *  the steps that record them.
 *
 *  A node *is* a document — its text lives on it, and the object explorer is
 *  the node hierarchy. There is no second representation to fall out of step.
 *
 *  Structure is nodes and nothing else. Attributes describe nodes and draw on
 *  the canvas, but never change what contains what. */

/** Which frame edge an interface sits on. */
export type Side = "top" | "right" | "bottom" | "left";
/** Decorative marking on an interface. Constrains nothing. */
export type Flow = "in" | "out" | "both";
/** Which way a relationship reads. Undirected by default. */
export type Dir = "none" | "forward" | "back" | "both";

export type Node = {
  id: string;
  label: string;
  /** Vocabulary from the active template — "Character", "Service", "Page". */
  type: string;
  parent: string | null;
  body: string;
  /** Set only once the user drags it; null means lay it out automatically. */
  x: number | null;
  y: number | null;
  /** Set when this node sits on its parent's frame edge, which is what makes
   *  it an interface. An interface's x/y mean nothing — side and how far along
   *  the edge take their place, so the port survives the frame resizing.
   *
   *  Set once, at creation. An interface stays an interface: it slides along
   *  the edge and around corners, but never steps off it to become a child
   *  block, and no child block ever steps onto it. */
  side: Side | null;
  at: number | null;
  flow: Flow | null;
  /** An interface's number among its parent's, fixed when it is made. Stored
   *  rather than counted, so deleting one renames none of the others: the gap
   *  it leaves is simply what the next interface takes. */
  num: number | null;
  /** The node this stands in for, when it is a reference — a placeholder in
   *  one layer for something that lives in another. It is an ordinary node in
   *  every other way: it sits in a layer, it moves, it relates, it carries
   *  attributes. What it does not have is contents of its own. */
  ref: string | null;
};

/** One end of a relationship as it is drawn: the node it lands on, and either
 *  the interface it landed on or the seat on that node's border to put a new
 *  one at. Every drawn relationship ends up with an interface at each end. */
export type End = { node: string; port?: string; seat?: { side: Side; at: number } };

/** A point on the canvas. */
export type Spot = { x: number; y: number };

export type Edge = {
  id: string;
  source: string;
  target: string;
  relation: string;
  /** The interface node each end is tied to. A relationship has one at each
   *  end always; absent only means it was never placed anywhere in particular,
   *  so it is implied at the side of the card facing the other end rather than
   *  stored. Drawing a relationship by hand places both. */
  from?: string;
  to?: string;
  dir: Dir;
  /** A route the user has laid out by hand: the corners between the two
   *  interfaces, in order, and the layer they were dragged in.
   *
   *  Absent leaves the routing to the canvas, which is where most relationships
   *  stay — a route is only ever the user's. The layer is recorded because a
   *  relationship reaching through a reference can be drawn in two of them, and
   *  each places its nodes independently, so corners right in one are meaningless
   *  in the other. Drawn anywhere else, the line routes itself. */
  route?: { layer: string | null; corners: Spot[] } | null;
};

/** A descriptive property of a node or a relationship. Held by one object or
 *  shared across many; sharing is what makes an attribute a grouping.
 *
 *  Non-structural throughout — an attribute never appears in the explorer and
 *  never changes what contains what. */
export type Attr = {
  id: string;
  name: string;
  value: string;
  tags: string[];
  /** Node or relationship ids carrying this. More than one makes it shared. */
  holders: string[];
  /** A shared attribute drawn as a boundary around its holders — a group. */
  group: boolean;
  color: string;
};

export type Graph = {
  nodes: Record<string, Node>;
  edges: Record<string, Edge>;
  attrs: Record<string, Attr>;
  /** The kinds of relation this project uses. Seeded from the domain and
   *  edited freely — a relation may be named anything, but the list is what
   *  gets offered and what can be renamed across every edge at once. */
  relations: string[];
  template: string;
  title: string;
};

export type Mutation =
  | { op: "add_node"; node: Node }
  | { op: "update_node"; id: string; label?: string; type?: string }
  | { op: "move_node"; id: string; parent: string | null }
  | { op: "place_node"; id: string; x: number; y: number }
  | { op: "delete_node"; id: string }
  | { op: "set_body"; id: string; body: string }
  /** Slide an interface along its parent's frame edge, and around its corners.
   *  It never comes off: an interface is one for as long as it exists. */
  | { op: "set_port"; id: string; side: Side; at: number }
  | { op: "mark_port"; id: string; flow: Flow | null }
  | { op: "link_nodes"; edge: Edge }
  | { op: "update_edge"; id: string; relation: string }
  | { op: "set_dir"; id: string; dir: Dir }
  /** A hand-laid route and the layer it was laid out in; null hands it back. */
  | { op: "route_edge"; id: string; layer: string | null; route: Spot[] | null }
  /** Turn a relation around; what it says stays the same. */
  | { op: "flip_edge"; id: string }
  | { op: "delete_edge"; id: string }
  | { op: "set_template"; template: string }
  | { op: "set_title"; title: string }
  | { op: "add_relation"; name: string }
  /** Renames the kind and every edge already using it, together. */
  | { op: "rename_relation"; from: string; to: string }
  /** Drops the kind; edges using it survive, unnamed. */
  | { op: "drop_relation"; name: string }
  | { op: "add_attr"; attr: Attr }
  | { op: "update_attr"; id: string; name?: string; value?: string; tags?: string[];
      color?: string }
  | { op: "attach_attr"; id: string; holder: string }
  | { op: "detach_attr"; id: string; holder: string }
  | { op: "delete_attr"; id: string };

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

export const EMPTY: Graph = {
  nodes: {}, edges: {}, attrs: {}, relations: [], template: "", title: "",
};

let counter = 0;

/** Short readable id. Monotonic within a session, which keeps the action log
 *  and the canvas stable across a refold. */
export function newId(prefix: string): string {
  counter += 1;

  return `${prefix}_${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** A node with the defaults filled in, so callers only state what differs. */
export function node(label: string, extra: Partial<Node> = {}): Node {
  return {
    id: newId("n"),
    label,
    type: "",
    parent: null,
    body: "",
    x: null,
    y: null,
    side: null,
    at: null,
    flow: null,
    num: null,
    ref: null,
    ...extra,
  };
}

/** A relationship with the defaults filled in. Undirected unless said. */
export function edge(source: string, target: string, extra: Partial<Edge> = {}): Edge {
  return { id: newId("e"), source, target, relation: "", dir: "none", ...extra };
}

/** An attribute with the defaults filled in. */
export function attr(name: string, extra: Partial<Attr> = {}): Attr {
  return {
    id: newId("a"),
    name,
    value: "",
    tags: [],
    holders: [],
    group: false,
    color: "#d9a441",
    ...extra,
  };
}

export function step(input: string, action: string, mutations: Mutation[],
                     question = "", prompt = ""): Step {
  return { id: newId("s"), question, prompt, input, action, mutations, status: "applied" };
}
