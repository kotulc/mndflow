/** Every shared shape in one place: the graph, the changes that build it, and
 *  the steps that record them.
 *
 *  A node *is* a document — its text lives on it, and the object explorer is
 *  the node hierarchy. There is no second representation to fall out of step. */

export type Kind = "object" | "group";

export type Node = {
  id: string;
  label: string;
  /** A group holds other objects and can be opened; an object cannot. */
  kind: Kind;
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
};

export type Graph = {
  nodes: Record<string, Node>;
  edges: Record<string, Edge>;
  template: string;
  title: string;
};

export type Mutation =
  | { op: "add_node"; node: Node }
  | { op: "update_node"; id: string; label?: string; type?: string; kind?: Kind }
  | { op: "move_node"; id: string; parent: string | null }
  | { op: "place_node"; id: string; x: number; y: number }
  | { op: "delete_node"; id: string }
  | { op: "set_body"; id: string; body: string }
  | { op: "link_nodes"; edge: Edge }
  | { op: "update_edge"; id: string; relation: string }
  | { op: "delete_edge"; id: string }
  | { op: "set_template"; template: string }
  | { op: "set_title"; title: string };

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

export const EMPTY: Graph = { nodes: {}, edges: {}, template: "", title: "" };

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
    kind: "object",
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
