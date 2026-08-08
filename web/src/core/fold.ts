/** Replay of mutations into a graph.
 *
 *  The step log is the source of truth; a graph is only ever derived by
 *  folding applied mutations in order. Undo therefore needs no inverse
 *  operations — it flips a status and the graph is rebuilt from empty, by the
 *  same code that built the original. */

import {
  EMPTY, ROOT, edge as newEdge, element as newElement, step as makeStep, type Attr, type Axis,
  type Element, type Graph, type Mutation, type Step,
} from "./types";

/** Whether an element sits on its parent's frame edge. That, and only that, is
 *  what makes a block an interface. */
export function isPort(node: Element | undefined): boolean {
  // Loosely, so an element from a log written before the field existed reads
  // as "not set" rather than as something it never was.
  return Boolean(node && node.side != null);
}

/** Whether an element stands in for a block living somewhere else. */
export function isProxy(node: Element | undefined): boolean {
  return node?.element === "proxy";
}

/** What a proxy stands in for. */
export function refOf(graph: Graph, id: string): string | null {
  return graph.elements[id]?.of ?? null;
}

/** Whether a relationship crosses a structural boundary: one of its ends is a
 *  proxy, so it reaches something living in another layer.
 *
 *  Derived, and never stored — it follows from where the ends are, so drawing a
 *  line to a proxy makes a reference without anybody saying so. It says nothing
 *  about the relationship's own kind, which is still plain, flow or assoc. */
export function isReference(graph: Graph, edge: { source: string; target: string }): boolean {
  return isProxy(graph.elements[edge.source]) || isProxy(graph.elements[edge.target]);
}

/** What an element really is: itself, or whatever it stands in for.
 *
 *  One hop and no more. A proxy is made one way — dragging a row out of the
 *  object explorer — and the explorer does not list proxies, so a proxy always
 *  points at a real block and a chain of them cannot be built. */
export function actual(graph: Graph, id: string | null): Element | undefined {
  const node = id ? graph.elements[id] : undefined;
  if (!node || !isProxy(node)) return node;

  const target = refOf(graph, node.id);

  return target ? graph.elements[target] : undefined;
}

/** The proxy in one layer standing in for a given block, if there is one.
 *
 *  At most one: a second appearance of the same block in the same layer says
 *  nothing the first did not. */
export function proxyIn(graph: Graph, layer: string | null, target: string): Element | undefined {
  return Object.values(graph.elements).find(
    (n) => isProxy(n) && (n.parent ?? null) === layer && n.of === target,
  );
}

/** Whether an element sits under an ancestor — the guard against a move that
 *  would make the tree a cycle. */
export function descendsFrom(graph: Graph, id: string | null, ancestor: string): boolean {
  let cursor = id;

  while (cursor) {
    if (cursor === ancestor) return true;
    cursor = graph.elements[cursor]?.parent ?? null;
  }

  return false;
}

/** Direct children of an element, or the root layer for null. An element whose
 *  parent was undone counts as top level rather than disappearing.
 *
 *  Root is skipped by id: it carries `parent: null` like everything in the root
 *  layer, and this is the one place that has to tell it from its own children. */
export function childrenOf(graph: Graph, parent: string | null): Element[] {
  return Object.values(graph.elements).filter((n) => {
    if (n.id === ROOT) return false;
    const held = n.parent && graph.elements[n.parent] ? n.parent : null;

    return held === parent;
  });
}

/** Children that sit inside the frame — everything the treemap shows. Blocks
 *  and proxies only: a note or a group is drawn in the layer, not held by it. */
export function blocksOf(graph: Graph, parent: string | null): Element[] {
  return childrenOf(graph, parent).filter(
    (n) => !isPort(n) && (n.element === "block" || n.element === "proxy"),
  );
}

/** Children that sit on the frame edge. Only the ones somebody made by hand:
 *  a relationship's own ends are worked out where the layer is drawn and are
 *  never elements until they are promoted. */
export function portsOf(graph: Graph, parent: string | null): Element[] {
  return childrenOf(graph, parent).filter(isPort);
}

/** The root block, which every project has. */
export function rootOf(graph: Graph): Element {
  return graph.elements[ROOT] ?? newElement("", { id: ROOT });
}

/** The project's name. Root's label, like any other element's. */
export function titleOf(graph: Graph): string {
  return rootOf(graph).label;
}

/** Which way a layer reads. None until somebody says otherwise.
 *
 *  Older logs stored the arrangement here as well, back when the two were one
 *  setting; anything that was an arrangement rather than a direction reads as
 *  no direction, which is what it meant. */
export function axisOf(graph: Graph, layer: string | null): Axis {
  const held = (layer === null ? rootOf(graph).axis : graph.elements[layer]?.axis) ?? "none";

  if (held === "across" || held === "down") return held;

  return (held as string) === "right" ? "across" : "none";
}

/** Whether a block holds children of its own. Interfaces do not count: a block
 *  with ports on its edge is still a block, and draws as one. Neither does a
 *  proxy ever hold anything — its contents live where it points. */
export function isContainer(graph: Graph, id: string): boolean {
  if (isProxy(graph.elements[id])) return false;

  return blocksOf(graph, id).length > 0;
}

/** Whether a relationship attaches to this interface. What tells a port that
 *  is wired to something from one that is only describing the shape. */
export function isLinked(graph: Graph, id: string): boolean {
  return Object.values(graph.edges).some((e) => e.from === id || e.to === id);
}

/** The number a new element takes among its siblings of the same element type:
 *  the lowest not already in use. A gap left by a deletion is filled by the
 *  next one made, and nothing that already exists is renumbered. */
export function nextNum(graph: Graph, parent: string | null, kind: Element["element"],
                        port = false): number {
  const siblings = childrenOf(graph, parent)
    .filter((n) => n.element === kind && isPort(n) === port);
  const taken = new Set(siblings.map((n, at) => n.num ?? at + 1));

  let num = 1;
  while (taken.has(num)) num += 1;

  return num;
}

/** What an unnamed element is called: its element type and its number among
 *  its siblings of that type.
 *
 *  Numbered rather than left all sharing one word, because a relationship puts
 *  an interface at each of its ends and a block soon has several — five rows
 *  in the explorer all reading "interface" name nothing. Per parent, since that
 *  is where the names are seen together; two blocks each having an `interface
 *  1` is no more a clash than two folders each holding a `notes`.
 *
 *  The number is fixed when the element is made, so a diagram being rewired
 *  never renames what it is not touching. Anything wanting a name of its own
 *  can be given one, and a name given replaces the number entirely. */
export function numberedName(graph: Graph, node: Element): string {
  const word = isPort(node) ? "interface" : node.element;

  // Logs written before numbers were stored fall back to counting.
  if (node.num != null) return `${word} ${node.num}`;

  const at = childrenOf(graph, node.parent)
    .filter((n) => n.element === node.element && isPort(n) === isPort(node))
    .findIndex((n) => n.id === node.id);

  return `${word} ${at + 1}`;
}

/** What to call an element. Something unnamed falls back to its element type
 *  and number, so it still says what it is rather than reading as a gap — and
 *  a name given later simply replaces it.
 *
 *  Container-ness is not in the name: it is derived from what a block holds, so
 *  a name that tracked it would change the moment a child was added. The icon
 *  says it instead. */
export function nameOf(graph: Graph, node: Element | undefined): string {
  if (!node) return "";
  // A proxy has no name of its own: it shows whatever it stands in for, which
  // is also what renaming it renames.
  if (isProxy(node)) {
    const real = actual(graph, node.id);

    return real ? nameOf(graph, real) : "missing";
  }
  if (node.label) return node.label;

  return numberedName(graph, node);
}

/** Whether a name is free among an element's siblings.
 *
 *  Unique locally, so that where something sits in the tree is what makes it
 *  unique in the project. Only stored labels are compared: a fallback is a
 *  number nobody chose, and blank is not a name. */
export function nameFree(graph: Graph, parent: string | null, label: string,
                         except: string | null = null): boolean {
  const wanted = label.trim().toLowerCase();
  if (!wanted) return true;

  return !childrenOf(graph, parent).some(
    (n) => n.id !== except && n.label.trim().toLowerCase() === wanted,
  );
}

/** Descriptive values an element or a relationship carries. */
export function attrsOf(graph: Graph, holder: string): Attr[] {
  return graph.elements[holder]?.attrs ?? [];
}

/** The groups drawn on one layer, each with the members it has there.
 *
 *  A group is an element sitting in the layer; its members are whoever names
 *  it. Held one way round only, so the two can never disagree.
 *
 *  One member is enough. A boundary round a single block is a way of marking
 *  it, which is a thing worth being able to do; what is refused is a group
 *  *decaying* into one, and that is refused where the member leaves rather than
 *  here. */
export function groupsIn(graph: Graph, layer: string | null) {
  return childrenOf(graph, layer)
    .filter((n) => n.element === "group")
    .map((group) => ({
      attr: group,
      here: membersOf(graph, group.id).filter((n) => (n.parent ?? null) === layer).map((n) => n.id),
    }))
    .filter((g) => g.here.length > 0);
}

/** Everything naming a given group. Derived, never stored on the group. */
export function membersOf(graph: Graph, group: string): Element[] {
  return Object.values(graph.elements).filter((n) => n.groups.includes(group) && !isPort(n));
}

/** What a note describes: the far end of each of its ties. Derived from the
 *  relationships, because a tie is one. */
export function tiesOf(graph: Graph, note: string): string[] {
  return Object.values(graph.edges)
    .filter((e) => e.kind === "tie" && e.source === note)
    .map((e) => e.target);
}

/** The notes drawn on one layer. A note sits in a layer rather than being
 *  derived from what it is tied to, because it may be tied to nothing. */
export function notesIn(graph: Graph, layer: string | null): Element[] {
  return childrenOf(graph, layer).filter((n) => n.element === "note");
}

/** Set or drop a descriptive value on an element, addressed by its name. */
function setAttr(node: Element, name: string, value?: string, tags?: string[]): void {
  const at = node.attrs.findIndex((a) => a.name === name);
  const was = at >= 0 ? node.attrs[at] : { name, value: "", tags: [] };
  const next = { ...was, value: value ?? was.value, tags: tags ? [...tags] : was.tags };

  if (at >= 0) node.attrs[at] = next;
  else node.attrs.push(next);
}

/** Plain attributes seen in a retired `add_attr`, waiting for the
 *  `attach_attr` that says who carries them. They have no element of their own
 *  — an attribute is a value on its holder now — so the name has to be held
 *  until the holder is known. Fold-local, and empty again by the next fold. */
type Pending = Map<string, Attr>;

/** Apply one mutation in place. Unknown targets are skipped rather than
 *  thrown: an undone parent can legitimately strand a later step. */
function apply(graph: Graph, mutation: Mutation, waiting: Pending): void {
  switch (mutation.op) {
    case "checkpoint":
      // Everything a snapshot stands for, in place of replaying it.
      graph.elements = structuredClone(mutation.graph.elements);
      graph.edges = structuredClone(mutation.graph.edges);
      graph.relations = [...mutation.graph.relations];
      graph.domain = mutation.graph.domain;
      break;

    case "add_element":
      graph.elements[mutation.element.id] = { ...mutation.element };
      break;

    case "update_element": {
      const node = graph.elements[mutation.id];
      if (!node) return;
      if (mutation.label) node.label = mutation.label;
      if (mutation.type !== undefined) node.type = mutation.type;
      if (mutation.color !== undefined) node.color = mutation.color;
      break;
    }

    case "move_element": {
      const node = graph.elements[mutation.id];
      if (node && mutation.id !== ROOT && !descendsFrom(graph, mutation.parent, mutation.id)) {
        node.parent = mutation.parent;
      }
      break;
    }

    case "place_element": {
      const node = graph.elements[mutation.id];
      if (node) {
        node.x = mutation.x;
        node.y = mutation.y;
      }
      break;
    }

    case "size_element": {
      const node = graph.elements[mutation.id];
      if (node) {
        node.w = mutation.w;
        node.h = mutation.h;
      }
      break;
    }

    case "delete_element": {
      if (mutation.id === ROOT) return;
      const gone = Object.keys(graph.elements).filter((id) =>
        descendsFrom(graph, id, mutation.id),
      );
      for (const id of gone) delete graph.elements[id];
      for (const [id, edge] of Object.entries(graph.edges)) {
        if (gone.includes(edge.source) || gone.includes(edge.target)) delete graph.edges[id];
      }
      break;
    }

    case "set_body": {
      const node = graph.elements[mutation.id];
      if (node) node.body = mutation.body;
      break;
    }

    case "set_port": {
      const node = graph.elements[mutation.id];
      if (!node) return;
      node.side = mutation.side;
      node.at = mutation.at;
      break;
    }

    case "mark_port": {
      const node = graph.elements[mutation.id];
      if (node) node.flow = mutation.flow;
      break;
    }

    case "set_axis": {
      const node = graph.elements[mutation.layer ?? ROOT];
      if (node) node.axis = mutation.axis;
      break;
    }

    case "relax_layer": {
      for (const node of childrenOf(graph, mutation.layer)) {
        if (isPort(node)) continue;
        node.x = null;
        node.y = null;
      }

      // Walls are left alone. A wall is a hard constraint — honoured *by* an
      // arrangement rather than replaced by one — where a card's position is
      // merely retained until an arrangement asks for it back.
      break;
    }

    case "join_group": {
      const node = graph.elements[mutation.id];
      if (node && !node.groups.includes(mutation.group)) node.groups.push(mutation.group);
      break;
    }

    case "leave_group": {
      const node = graph.elements[mutation.id];
      if (node) node.groups = node.groups.filter((g) => g !== mutation.group);
      break;
    }

    case "set_attr": {
      const node = graph.elements[mutation.id];
      if (node) setAttr(node, mutation.name, mutation.value, mutation.tags);
      break;
    }

    case "drop_attr": {
      const node = graph.elements[mutation.id];
      if (node) node.attrs = node.attrs.filter((a) => a.name !== mutation.name);
      break;
    }

    case "link_elements": {
      const { edge } = mutation;
      if (graph.elements[edge.source] && graph.elements[edge.target]) {
        graph.edges[edge.id] = { ...edge };
      }
      break;
    }

    case "set_end": {
      const edge = graph.edges[mutation.id];
      if (edge && graph.elements[mutation.port]) edge[mutation.end] = mutation.port;
      break;
    }

    case "update_edge": {
      const edge = graph.edges[mutation.id];
      if (edge) edge.type = mutation.type;
      break;
    }

    case "set_dir": {
      const edge = graph.edges[mutation.id];
      if (edge) edge.dir = mutation.dir;
      break;
    }

    case "set_kind": {
      const edge = graph.edges[mutation.id];
      if (edge) edge.kind = mutation.kind;
      break;
    }

    case "set_side": {
      const edge = graph.edges[mutation.id];
      if (!edge) return;
      const field = mutation.end === "from" ? "fromSide" : "toSide";
      if (mutation.side) edge[field] = mutation.side;
      else delete edge[field];
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

    case "set_domain":
      graph.domain = mutation.domain;
      break;

    case "add_relation":
      if (!graph.relations.includes(mutation.name)) graph.relations.push(mutation.name);
      break;

    case "rename_relation": {
      graph.relations = graph.relations.map((r) => (r === mutation.from ? mutation.to : r));
      for (const edge of Object.values(graph.edges)) {
        if (edge.type === mutation.from) edge.type = mutation.to;
      }
      break;
    }

    case "drop_relation": {
      graph.relations = graph.relations.filter((r) => r !== mutation.name);
      for (const edge of Object.values(graph.edges)) {
        if (edge.type === mutation.name) edge.type = "";
      }
      break;
    }

    default:
      legacy(graph, mutation, waiting);
  }
}

/** Fold an operation no longer written, into what it drew at the time.
 *
 *  Kept separate so the live set above reads as the current schema and nothing
 *  else. Attributes are the substantial case: a group and a note are elements
 *  now, so an old `add_attr` becomes whichever element it was drawing, and its
 *  holders become membership, ties, or a plain value depending on which. */
function legacy(graph: Graph, mutation: Mutation, waiting: Pending): void {
  const old = mutation as Record<string, string | number | null | undefined> & { op: string };

  switch (old.op) {
    case "add_node": {
      const node = (mutation as { node: Record<string, unknown> }).node;
      const id = node.id as string;
      const stands = (node.ref as string | null | undefined) ?? null;
      graph.elements[id] = newElement((node.label as string) ?? "", {
        ...node,
        id,
        element: stands != null ? "proxy" : "block",
        of: stands,
      } as Partial<Element>);

      break;
    }

    case "update_node":
      apply(graph, { ...(mutation as object), op: "update_element" } as Mutation, waiting);
      break;

    case "move_node":
      apply(graph, { ...(mutation as object), op: "move_element" } as Mutation, waiting);
      break;

    case "place_node":
    case "place_attr":
      apply(graph, { ...(mutation as object), op: "place_element" } as Mutation, waiting);
      break;

    case "delete_node":
    case "delete_attr":
      apply(graph, { op: "delete_element", id: old.id as string }, waiting);
      break;

    case "link_nodes": {
      const edge = (mutation as { edge: Record<string, unknown> }).edge;
      apply(graph, {
        op: "link_elements",
        edge: { ...edge, type: (edge.relation as string) ?? "" },
      } as Mutation, waiting);
      break;
    }

    case "set_template":
      graph.domain = old.template as string;
      break;

    case "set_title":
      rootOf(graph).label = old.title as string;
      break;

    case "add_attr": {
      const attr = (mutation as { attr: Record<string, unknown> }).attr;
      const id = attr.id as string;
      const note = attr.note as { layer: string | null; x: number; y: number;
                                  w?: number; h?: number } | undefined;

      if (attr.group || note) {
        graph.elements[id] = newElement((attr.name as string) ?? "", {
          id,
          element: note ? "note" : "group",
          parent: note ? note.layer : null,
          x: note?.x ?? null,
          y: note?.y ?? null,
          w: note?.w ?? null,
          h: note?.h ?? null,
          color: (attr.color as string) ?? "#d9a441",
        });
      }
      else {
        // A plain attribute has no element of its own; it waits here for the
        // `attach_attr` that says who carries it.
        waiting.set(id, { name: (attr.name as string) ?? "", value: (attr.value as string) ?? "",
                          tags: (attr.tags as string[]) ?? [] });
      }
      for (const holder of ((attr.holders as string[]) ?? [])) {
        apply(graph, { op: "attach_attr", id, holder } as Mutation, waiting);
      }
      break;
    }

    case "update_attr": {
      const node = graph.elements[old.id as string];
      if (!node) return;
      if (old.name !== undefined) node.label = old.name as string;
      if (old.color !== undefined) node.color = old.color as string;
      break;
    }

    case "attach_attr": {
      const id = old.id as string;
      const holder = graph.elements[old.holder as string];
      const annotation = graph.elements[id];
      if (!holder) return;

      // A note's tie is a relationship now; a group's membership is not.
      if (annotation?.element === "group") {
        // A group used to take its layer from its members. It is an element in
        // one now, so the first member it gets is what says which.
        annotation.parent = holder.parent;
        apply(graph, { op: "join_group", id: holder.id, group: id }, waiting);
      } else if (annotation?.element === "note") {
        const tie = `tie_${id}_${holder.id}`;
        graph.edges[tie] = newEdge(id, holder.id, { id: tie, kind: "tie" });
      } else {
        const held = waiting.get(id);
        if (held) setAttr(holder, held.name, held.value, held.tags);
      }
      break;
    }

    case "detach_attr": {
      const id = old.id as string;
      const holder = old.holder as string;
      const annotation = graph.elements[id];

      if (annotation?.element === "group") {
        apply(graph, { op: "leave_group", id: holder, group: id }, waiting);
      } else if (annotation?.element === "note") {
        delete graph.edges[`tie_${id}_${holder}`];
      } else {
        const held = waiting.get(id);
        const on = graph.elements[holder];
        if (held && on) on.attrs = on.attrs.filter((a) => a.name !== held.name);
      }
      break;
    }

    // A line has no route of its own any more — it is planned from the layer it
    // is drawn in. Kept so a log written when routes were stored still folds:
    // the corners are simply not read.
    case "route_edge":
      break;
  }
}

/** Drop what the graph can no longer support: membership and ties pointing at
 *  things that have gone, groups left with nobody in them, and proxies whose
 *  block has been deleted.
 *
 *  Done here rather than in each mutation so that deleting an element cleans up
 *  after itself however it happened — by hand, by a workflow, or by an undo
 *  further back in the log putting the graph in a different shape.
 *
 *  A group down to one member is *not* swept up here. Deliberately grouping a
 *  single block is allowed, and this cannot tell that apart from a group that
 *  decayed — so decay is refused where it happens, in the action that takes the
 *  member out. This is the floor: a boundary round nothing at all. */
function tidy(graph: Graph): void {
  // A proxy is nothing without the block it stands for.
  for (const [id, node] of Object.entries(graph.elements)) {
    if (isProxy(node) && (!node.of || !graph.elements[node.of])) delete graph.elements[id];
  }

  for (const node of Object.values(graph.elements)) {
    node.groups = node.groups.filter((g) => graph.elements[g]);
  }

  for (const [id, node] of Object.entries(graph.elements)) {
    if (node.element === "group" && !membersOf(graph, id).length) delete graph.elements[id];
  }
}

/** How many steps survive a compaction, and the length that triggers one.
 *
 *  Slack between them so that compaction happens every `COMPACT_AT - KEEP`
 *  steps rather than on every commit once the cap is reached. */
export const KEEP = 1000;
export const COMPACT_AT = 1200;

/** Whether this step is a snapshot rather than something somebody did. */
export function isCheckpoint(step: Step | undefined): boolean {
  return step?.mutations.length === 1 && step.mutations[0].op === "checkpoint";
}

/** Fold the oldest steps into a single snapshot and drop them, so history stays
 *  bounded and old projects stop carrying retired ops.
 *
 *  **The graph is unchanged by this.** Folding the prefix and replaying the tail
 *  is the same replay in the same order — the snapshot is exactly what the
 *  dropped steps produced. What is lost is reach: undo cannot go back past a
 *  checkpoint, and a step reverted long ago can no longer be redone.
 *
 *  Steps are counted whatever their status, so the tail keeps its reverted run
 *  intact and redo still works over everything recent. */
export function compact(steps: Step[]): Step[] {
  if (steps.length <= COMPACT_AT) return steps;

  const cut = steps.length - KEEP;
  const graph = fold(steps.slice(0, cut));
  const mark = makeStep("checkpoint", "checkpoint", [{ op: "checkpoint", graph }]);

  return [mark, ...steps.slice(cut)];
}

/** Rebuild the graph from every applied step, in order. */
export function fold(steps: Step[]): Graph {
  const graph: Graph = structuredClone(EMPTY);
  const waiting: Pending = new Map();

  for (const step of steps) {
    if (step.status !== "applied") continue;
    for (const mutation of step.mutations) apply(graph, mutation, waiting);
  }

  tidy(graph);

  return graph;
}
