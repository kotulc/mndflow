/** Replay of mutations into a graph.
 *
 *  The step log is the source of truth; a graph is only ever derived by
 *  folding applied mutations in order. Undo therefore needs no inverse
 *  operations — it flips a status and the graph is rebuilt from empty, by the
 *  same code that built the original. */

import { EMPTY, type Graph, type Mutation, type Node, type Step } from "./types";

/** Whether a node sits on its parent's frame edge. That, and only that, is
 *  what makes a node an interface. */
export function isPort(node: Node | undefined): boolean {
  return Boolean(node && node.side !== null);
}

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

/** Direct children of a node, or the top level for null. A node whose parent
 *  was undone counts as top level rather than disappearing. */
export function childrenOf(graph: Graph, parent: string | null): Node[] {
  return Object.values(graph.nodes).filter((n) => {
    const actual = n.parent && graph.nodes[n.parent] ? n.parent : null;

    return actual === parent;
  });
}

/** Children that sit inside the frame — everything the treemap shows. */
export function blocksOf(graph: Graph, parent: string | null): Node[] {
  return childrenOf(graph, parent).filter((n) => !isPort(n));
}

/** Children that sit on the frame edge. */
export function portsOf(graph: Graph, parent: string | null): Node[] {
  return childrenOf(graph, parent).filter(isPort);
}

/** Whether a node holds child blocks. Interfaces do not count: a block with
 *  ports on its edge is still a block, and draws as one. */
export function isContainer(graph: Graph, id: string): boolean {
  return Object.values(graph.nodes).some((n) => n.parent === id && !isPort(n));
}

/** Attributes an object carries, whether it holds them alone or shares them. */
export function attrsOf(graph: Graph, holder: string) {
  return Object.values(graph.attrs).filter((a) => a.holders.includes(holder));
}

/** The groups drawn on one layer: shared attributes whose members are blocks
 *  sitting directly in it. */
export function groupsIn(graph: Graph, layer: string | null) {
  return Object.values(graph.attrs)
    .filter((a) => a.group)
    .map((a) => ({
      attr: a,
      here: a.holders.filter((id) => {
        const node = graph.nodes[id];

        return node && !isPort(node) && (node.parent ?? null) === layer;
      }),
    }))
    .filter((g) => g.here.length > 1);
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

    case "set_port": {
      const node = graph.nodes[mutation.id];
      if (!node) return;
      node.side = mutation.side;
      node.at = mutation.at;
      // Coming off the edge, it needs somewhere on the canvas to land; going
      // onto it, its old position stops meaning anything.
      if (mutation.side === null) node.x = node.y = null;
      break;
    }

    case "mark_port": {
      const node = graph.nodes[mutation.id];
      if (node) node.flow = mutation.flow;
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

    case "set_dir": {
      const edge = graph.edges[mutation.id];
      if (edge) edge.dir = mutation.dir;
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

    case "add_attr":
      graph.attrs[mutation.attr.id] = { ...mutation.attr, holders: [...mutation.attr.holders] };
      break;

    case "update_attr": {
      const attr = graph.attrs[mutation.id];
      if (!attr) return;
      if (mutation.name !== undefined) attr.name = mutation.name;
      if (mutation.value !== undefined) attr.value = mutation.value;
      if (mutation.tags !== undefined) attr.tags = [...mutation.tags];
      if (mutation.color !== undefined) attr.color = mutation.color;
      break;
    }

    case "attach_attr": {
      const attr = graph.attrs[mutation.id];
      if (attr && !attr.holders.includes(mutation.holder)) attr.holders.push(mutation.holder);
      break;
    }

    case "detach_attr": {
      const attr = graph.attrs[mutation.id];
      if (attr) attr.holders = attr.holders.filter((h) => h !== mutation.holder);
      break;
    }

    case "delete_attr":
      delete graph.attrs[mutation.id];
      break;
  }
}

/** Drop what the graph can no longer support: holders that have been deleted,
 *  and groups left with fewer than the two members a boundary needs.
 *
 *  Done here rather than in each mutation so that deleting a node cleans up
 *  after itself however it happened — by hand, by a workflow, or by an undo
 *  further back in the log putting the graph in a different shape. */
function tidy(graph: Graph): void {
  for (const [id, attr] of Object.entries(graph.attrs)) {
    attr.holders = attr.holders.filter((h) => graph.nodes[h] || graph.edges[h]);
    if (attr.group && attr.holders.length < 2) delete graph.attrs[id];
  }
}

/** Rebuild the graph from every applied step, in order. */
export function fold(steps: Step[]): Graph {
  const graph: Graph = structuredClone(EMPTY);

  for (const step of steps) {
    if (step.status !== "applied") continue;
    for (const mutation of step.mutations) apply(graph, mutation);
  }

  tidy(graph);

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
      case "set_port":
        ids.add(mutation.id);
        break;
      case "link_nodes":
        ids.add(mutation.edge.source);
        ids.add(mutation.edge.target);
        break;
      case "attach_attr":
      case "detach_attr":
        ids.add(mutation.holder);
        break;
    }
  }

  return [...ids];
}
