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
  // Loosely, so a node from a log written before the field existed reads as
  // "not set" rather than as something it never was.
  return Boolean(node && node.side != null);
}

/** Whether a node stands in for one that lives somewhere else. */
export function isRef(node: Node | undefined): boolean {
  return Boolean(node && node.ref != null);
}

/** What a node really is: itself, or whatever it stands in for.
 *
 *  One hop and no more. A reference is made one way — dragging a row out of the
 *  object explorer — and the explorer does not list references, so a reference
 *  always points at a real node and a chain of them cannot be built. */
export function actual(graph: Graph, id: string | null): Node | undefined {
  const node = id ? graph.nodes[id] : undefined;

  return node?.ref != null ? graph.nodes[node.ref] : node;
}

/** The reference in one layer standing in for a given node, if there is one. */
export function refIn(graph: Graph, layer: string | null, target: string): Node | undefined {
  return Object.values(graph.nodes).find(
    (n) => n.ref === target && (n.parent ?? null) === layer,
  );
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
 *  ports on its edge is still a block, and draws as one. Neither does a
 *  reference ever hold anything — its contents live where it points. */
export function isContainer(graph: Graph, id: string): boolean {
  if (isRef(graph.nodes[id])) return false;

  return Object.values(graph.nodes).some((n) => n.parent === id && !isPort(n));
}

/** Whether a relationship attaches to this interface. What tells a port that
 *  is wired to something from one that is only describing the shape. */
export function isLinked(graph: Graph, id: string): boolean {
  return Object.values(graph.edges).some((e) => e.from === id || e.to === id);
}

/** The number a new interface on this node takes: the lowest not already in
 *  use among its siblings. A gap left by a deleted interface is filled by the
 *  next one made, and no interface that already exists is renumbered. */
export function nextPortNum(graph: Graph, parent: string | null): number {
  const taken = new Set(portsOf(graph, parent).map((p, at) => p.num ?? at + 1));

  let num = 1;
  while (taken.has(num)) num += 1;

  return num;
}

/** What an unnamed interface is called: its number among the interfaces of the
 *  node it sits on.
 *
 *  Numbered rather than left all sharing one word, because a relationship puts
 *  an interface at each of its ends and a node soon has several — five rows in
 *  the explorer all reading "interface" name nothing. Per parent, since that is
 *  where the names are seen together; two nodes each having an `interface 1` is
 *  no more a clash than two folders each holding a `notes`.
 *
 *  The number is fixed when the interface is made, so a diagram being rewired
 *  never renames what it is not touching. Anything wanting a name of its own
 *  can be given one, and a name given replaces the number entirely. */
export function portName(graph: Graph, port: Node): string {
  // Logs written before numbers were stored fall back to counting.
  if (port.num != null) return `interface ${port.num}`;

  const at = portsOf(graph, port.parent).findIndex((p) => p.id === port.id);

  return `interface ${at + 1}`;
}

/** What to call a node. Something unnamed falls back to its role, so it still
 *  says what it is rather than reading as a gap — and a name given later
 *  simply replaces it. */
export function nameOf(graph: Graph, node: Node | undefined): string {
  if (!node) return "";
  // A reference has no name of its own: it shows whatever it stands in for,
  // which is also what renaming it renames.
  if (node.ref != null) {
    const real = actual(graph, node.ref);

    return real ? nameOf(graph, real) : "missing";
  }
  if (node.label) return node.label;
  if (isPort(node)) return portName(graph, node);

  return isContainer(graph, node.id) ? "container" : "block";
}

/** Attributes an object carries, whether it holds them alone or shares them. */
export function attrsOf(graph: Graph, holder: string) {
  return Object.values(graph.attrs).filter((a) => a.holders.includes(holder));
}

/** The groups drawn on one layer: shared attributes whose members are blocks
 *  sitting directly in it.
 *
 *  One member is enough. A boundary round a single block is a way of marking
 *  it, which is a thing worth being able to do; what is refused is a group
 *  *decaying* into one, and that is refused where the member leaves rather than
 *  here. */
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
    .filter((g) => g.here.length > 0);
}

/** The notes drawn on one layer. A note is placed in a layer rather than
 *  derived from what it is tied to, because it may be tied to nothing. */
export function notesIn(graph: Graph, layer: string | null) {
  return Object.values(graph.attrs).filter((a) => a.note && a.note.layer === layer);
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

    case "set_dir": {
      const edge = graph.edges[mutation.id];
      if (edge) edge.dir = mutation.dir;
      break;
    }

    case "route_edge": {
      const edge = graph.edges[mutation.id];
      if (!edge) return;
      edge.route = mutation.route
        ? { layer: mutation.layer, corners: mutation.route.map((p) => ({ ...p })) }
        : null;
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

    case "place_attr": {
      const attr = graph.attrs[mutation.id];
      if (attr?.note) attr.note = { ...attr.note, x: mutation.x, y: mutation.y };
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
 *  groups left with nobody in them, and notes whose layer has gone.
 *
 *  Done here rather than in each mutation so that deleting a node cleans up
 *  after itself however it happened — by hand, by a workflow, or by an undo
 *  further back in the log putting the graph in a different shape.
 *
 *  A group down to one member is *not* swept up here. Deliberately grouping a
 *  single block is allowed, and this cannot tell that apart from a group that
 *  decayed — so decay is refused where it happens, in the action that takes the
 *  member out. This is the floor: a boundary round nothing at all. */
function tidy(graph: Graph): void {
  for (const [id, node] of Object.entries(graph.nodes)) {
    if (node.ref != null && !graph.nodes[node.ref]) delete graph.nodes[id];
  }

  for (const [id, attr] of Object.entries(graph.attrs)) {
    attr.holders = attr.holders.filter((h) => graph.nodes[h] || graph.edges[h]);
    if (attr.group && !attr.holders.length) delete graph.attrs[id];
    if (attr.note?.layer && !graph.nodes[attr.note.layer]) delete graph.attrs[id];
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
