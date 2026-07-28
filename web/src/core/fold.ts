/** Replay of mutations into a graph.
 *
 *  The step log is the source of truth; a graph is only ever derived by
 *  folding applied mutations in order. Undo therefore needs no inverse
 *  operations — it flips a status and the graph is rebuilt from empty, by the
 *  same code that built the original. */

import { EMPTY, type Graph, type Mutation, type Node, type Step } from "./types";

/** Whether a node sits under an ancestor — the guard against a move that would
 *  make the hierarchy a cycle. */
export function descendsFrom(graph: Graph, id: string | null, ancestor: string): boolean {
  let cursor = id;

  while (cursor) {
    if (cursor === ancestor) return true;
    cursor = graph.nodes[cursor]?.parent ?? null;
  }

  return false;
}

/** Direct children of a group, or the top level for null. A node whose parent
 *  was undone counts as top level rather than disappearing. */
export function childrenOf(graph: Graph, parent: string | null): Node[] {
  return Object.values(graph.nodes).filter((n) => {
    const actual = n.parent && graph.nodes[n.parent] ? n.parent : null;

    return actual === parent;
  });
}

/** Whether a node contains anything. There is no separate kind of thing: a
 *  group is simply a node that has children, so emptying one stops it being a
 *  group and filling one starts it. */
export function isGroup(graph: Graph, id: string): boolean {
  return Object.values(graph.nodes).some((n) => n.parent === id);
}

/** Apply one mutation in place. Unknown targets are skipped rather than
 *  thrown: an undone parent can legitimately strand a later step. */
function apply(graph: Graph, mutation: Mutation): void {
  switch (mutation.op) {
    case "add_node":
      graph.nodes[mutation.node.id] = { ...mutation.node };
      break;

    case "update_node": {
      const node = graph.nodes[mutation.id];
      if (!node) return;
      if (mutation.label) node.label = mutation.label;
      if (mutation.type !== undefined) node.type = mutation.type;
      break;
    }

    case "move_node": {
      const node = graph.nodes[mutation.id];
      if (node && !descendsFrom(graph, mutation.parent, mutation.id)) {
        node.parent = mutation.parent;
      }
      break;
    }

    case "place_node": {
      const node = graph.nodes[mutation.id];
      if (node) {
        node.x = mutation.x;
        node.y = mutation.y;
      }
      break;
    }

    case "delete_node": {
      const gone = Object.keys(graph.nodes).filter((id) =>
        descendsFrom(graph, id, mutation.id),
      );
      for (const id of gone) delete graph.nodes[id];
      for (const [id, edge] of Object.entries(graph.edges)) {
        if (gone.includes(edge.source) || gone.includes(edge.target)) delete graph.edges[id];
      }
      break;
    }

    case "set_body": {
      const node = graph.nodes[mutation.id];
      if (node) node.body = mutation.body;
      break;
    }

    case "link_nodes": {
      const { edge } = mutation;
      if (graph.nodes[edge.source] && graph.nodes[edge.target]) {
        graph.edges[edge.id] = { ...edge };
      }
      break;
    }

    case "update_edge": {
      const edge = graph.edges[mutation.id];
      if (edge) edge.relation = mutation.relation;
      break;
    }

    case "reanchor_edge": {
      const edge = graph.edges[mutation.id];
      if (edge) {
        if (mutation.from !== undefined) edge.from = mutation.from;
        if (mutation.to !== undefined) edge.to = mutation.to;
      }
      break;
    }

    case "flip_edge": {
      const edge = graph.edges[mutation.id];
      if (edge) {
        [edge.source, edge.target] = [edge.target, edge.source];
        [edge.from, edge.to] = [edge.to, edge.from];
      }
      break;
    }

    case "delete_edge":
      delete graph.edges[mutation.id];
      break;

    case "set_template":
      graph.template = mutation.template;
      break;

    case "set_title":
      graph.title = mutation.title;
      break;

    case "add_relation":
      if (!graph.relations.includes(mutation.name)) graph.relations.push(mutation.name);
      break;

    case "rename_relation": {
      graph.relations = graph.relations.map((r) => (r === mutation.from ? mutation.to : r));
      for (const edge of Object.values(graph.edges)) {
        if (edge.relation === mutation.from) edge.relation = mutation.to;
      }
      break;
    }

    case "drop_relation": {
      graph.relations = graph.relations.filter((r) => r !== mutation.name);
      for (const edge of Object.values(graph.edges)) {
        if (edge.relation === mutation.name) edge.relation = "";
      }
      break;
    }
  }
}

/** Rebuild the graph from every applied step, in order. */
export function fold(steps: Step[]): Graph {
  const graph: Graph = structuredClone(EMPTY);

  for (const step of steps) {
    if (step.status !== "applied") continue;
    for (const mutation of step.mutations) apply(graph, mutation);
  }

  return graph;
}

/** Node ids a step created or changed — what the canvas highlights. */
export function touched(step: Step | null): string[] {
  if (!step) return [];

  const ids = new Set<string>();
  for (const mutation of step.mutations) {
    switch (mutation.op) {
      case "add_node":
        ids.add(mutation.node.id);
        break;
      case "update_node":
      case "move_node":
      case "place_node":
      case "delete_node":
      case "set_body":
        ids.add(mutation.id);
        break;
      case "link_nodes":
        ids.add(mutation.edge.source);
        ids.add(mutation.edge.target);
        break;
    }
  }

  return [...ids];
}
