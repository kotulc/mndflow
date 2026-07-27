/** Client for the mndflow server. Every call returns the full app state, so
 *  the UI never has to reconcile a partial update against local guesses.
 *
 *  `scope` — the document selected in the tree — rides along on every call,
 *  because it is what decides which question comes back. */

const BASE = "http://localhost:8000";

export type Node = {
  id: string;
  label: string;
  kind: "module" | "group" | "external";
  parent: string | null;
  summary: string;
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
  specs: Record<string, string>;
  template: string;
  title: string;
};

export type WorkflowStep = {
  id: string;
  prompt: string;
  choices: string[];
  hint: string;
  action: string;
  placeholder: string;
};

export type HistoryEntry = {
  id: string;
  input: string;
  status: "applied" | "reverted";
  action: string;
  mutations: number;
};

export type State = {
  graph: Graph;
  scope: string | null;
  touched: string[];
  workflow_step: WorkflowStep | null;
  history: HistoryEntry[];
};

type Scope = string | null;

async function send(path: string, init: RequestInit = {}): Promise<State> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!response.ok) throw new Error(`${path} failed: ${response.status}`);

  return response.json();
}

/** Path with the current selection attached, as every endpoint expects. */
function at(path: string, scope: Scope): string {
  return scope ? `${path}?scope=${encodeURIComponent(scope)}` : path;
}

function post(path: string, scope: Scope, body: unknown = {}): Promise<State> {
  return send(at(path, scope), { method: "POST", body: JSON.stringify(body) });
}

export const api = {
  state: (scope: Scope) => send(at("/state", scope)),
  turn: (input: string, scope: Scope) => post("/turn", scope, { input }),
  undo: (scope: Scope) => post("/undo", scope),
  create: (label: string, parent: Scope, scope: Scope) =>
    post("/nodes", scope, { label, parent }),
  remove: (id: string, scope: Scope) =>
    send(at(`/nodes/${id}`, scope), { method: "DELETE" }),
  move: (id: string, parent: Scope, scope: Scope) =>
    post(`/nodes/${id}/move`, scope, { parent }),
  rename: (id: string, label: string, scope: Scope) =>
    post(`/nodes/${id}/rename`, scope, { label }),
  renameProject: (label: string, scope: Scope) => post("/project/rename", scope, { label }),
  save: (id: string, body: string, scope: Scope) =>
    post(`/nodes/${id}/body`, scope, { body }),
  place: (id: string, x: number, y: number, scope: Scope) =>
    post(`/nodes/${id}/place`, scope, { x, y }),
  link: (source: string, target: string, scope: Scope) =>
    post("/edges", scope, { source, target }),
  relation: (id: string, relation: string, scope: Scope) =>
    post(`/edges/${id}/relation`, scope, { relation }),
  unlink: (id: string, scope: Scope) => send(at(`/edges/${id}`, scope), { method: "DELETE" }),
};
