/** Every shared shape in one place: the graph, the changes that build it, and
 *  the steps that record them.
 *
 *  A node *is* a document — its text lives on it, and the object explorer is
 *  the node hierarchy. There is no second representation to fall out of step. */

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
};

export type Edge = {
  id: string;
  source: string;
  target: string;
  relation: string;
  /** Which anchor each end is tied to. Empty means "wherever suits" — the
   *  right side of the source and the left of the target. */
  from?: string;
  to?: string;
};

/** A colored frame drawn around a set of nodes, for visual clustering only —
 *  it carries no meaning for the graph itself, unlike parent/child. Sized
 *  automatically from its members unless the user has resized it by hand. */
export type Region = {
  id: string;
  label: string;
  color: string;
  members: string[];
  x: number | null;
  y: number | null;
  w: number | null;
  h: number | null;
};

export type Graph = {
  nodes: Record<string, Node>;
  edges: Record<string, Edge>;
  regions: Record<string, Region>;
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
  | { op: "link_nodes"; edge: Edge }
  | { op: "update_edge"; id: string; relation: string }
  /** Move one end of a relation to a different anchor. */
  | { op: "reanchor_edge"; id: string; from?: string; to?: string }
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
  | { op: "add_region"; region: Region }
  | { op: "recolor_region"; id: string; color: string }
  | { op: "rename_region"; id: string; label: string }
  /** Manual size/position from dragging the frame's own resize handles;
   *  null in any field means "keep deriving it from the members instead". */
  | { op: "resize_region"; id: string; x: number; y: number; w: number; h: number }
  | { op: "delete_region"; id: string };

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
  nodes: {}, edges: {}, regions: {}, relations: [], template: "", title: "",
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
    ...extra,
  };
}

export function step(input: string, action: string, mutations: Mutation[],
                     question = "", prompt = ""): Step {
  return { id: newId("s"), question, prompt, input, action, mutations, status: "applied" };
}
