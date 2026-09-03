/** Mutation replay, and the derived readings of a graph.
 *
 *  The graph is thrown away and rebuilt rather than edited, so it can never
 *  drift from the log that produced it — and undo is a refold, so no mutation
 *  needs an inverse. */

import type { Settings } from "./components";
import { empty_graph, type Arrangement, type Block, type BlockModule, type Definition,
         type Graph, type Id, type Log, type Mutation, type Relation, type Step } from "./types";

/** Replay one mutation onto a graph, in place. The graph is always a fresh one
 *  owned by `fold`, so mutating it here is safe and cheap. */
function apply(graph: Graph, m: Mutation): void {
  switch (m.op) {
    case "checkpoint":
      graph.root = m.graph.root;
      graph.blocks = structuredClone(m.graph.blocks);
      graph.edges = structuredClone(m.graph.edges);
      graph.defs = structuredClone(m.graph.defs);
      return;
    case "add_block":
      graph.blocks[m.block.id] = { ...m.block };
      return;
    case "update_block": {
      const b = graph.blocks[m.id];
      if (!b) return;
      if (m.label !== undefined) b.label = m.label;
      if (m.type !== undefined) b.type = m.type;
      return;
    }
    case "delete_block": {
      for (const id of subtree(graph, m.id)) {
        delete graph.blocks[id];
        for (const [eid, e] of Object.entries(graph.edges)) {
          if (e.from === id || e.to === id) delete graph.edges[eid];
        }
      }
      for (const b of Object.values(graph.blocks)) {
        if (b.groups?.includes(m.id)) b.groups = b.groups.filter((g) => g !== m.id);
      }
      return;
    }
    case "move_block": {
      const b = graph.blocks[m.id];
      if (b) { b.parent = m.parent; delete b.x; delete b.y; }
      return;
    }
    case "order_block": {
      const b = graph.blocks[m.id];
      if (b) b.num = m.num;
      return;
    }
    case "place_block": {
      const b = graph.blocks[m.id];
      if (b) { b.x = m.x; b.y = m.y; }
      return;
    }
    case "size_block": {
      const b = graph.blocks[m.id];
      if (b) { b.w = m.w; b.h = m.h; }
      return;
    }
    case "set_body": {
      const b = graph.blocks[m.id];
      if (b) b.body = m.body;
      return;
    }
    case "join_group": {
      const b = graph.blocks[m.id];
      if (b) b.groups = [...new Set([...(b.groups ?? []), m.group])];
      return;
    }
    case "leave_group": {
      const b = graph.blocks[m.id];
      if (b?.groups) b.groups = b.groups.filter((g) => g !== m.group);
      return;
    }
    case "link_blocks":
      graph.edges[m.edge.id] = { ...m.edge };
      return;
    case "update_edge": {
      const e = graph.edges[m.id];
      if (e) e.type = m.type;
      return;
    }
    case "delete_edge":
      delete graph.edges[m.id];
      return;
    case "set_dir": {
      const e = graph.edges[m.id];
      if (e) e.dir = m.dir;
      return;
    }
    case "set_form": {
      const e = graph.edges[m.id];
      if (e) e.module = m.module;
      return;
    }
    case "flip_edge": {
      const e = graph.edges[m.id];
      if (!e) return;
      [e.from, e.to] = [e.to, e.from];
      [e.fromSide, e.toSide] = [e.toSide, e.fromSide];
      return;
    }
    case "set_end": {
      const e = graph.edges[m.id];
      if (e) e[m.end] = m.port;
      return;
    }
    case "set_port": {
      const b = graph.blocks[m.id];
      if (b) { b.side = m.side; b.at = m.at; }
      return;
    }
    case "set_side": {
      const e = graph.edges[m.id];
      if (!e) return;
      const key = m.end === "from" ? "fromSide" : "toSide";
      const along = m.end === "from" ? "fromAt" : "toAt";
      if (m.side === null) { delete e[key]; delete e[along]; return; }
      e[key] = m.side;
      if (m.at === undefined) delete e[along];
      else e[along] = m.at;
      return;
    }
    case "mark_port": {
      const b = graph.blocks[m.id];
      if (!b) return;
      if (m.flow === null) delete b.flow;
      else b.flow = m.flow;
      return;
    }
    case "set_field": {
      const holder = graph.blocks[m.id] ?? graph.edges[m.id];
      if (!holder) return;
      const rest = (holder.fields ?? []).filter((f) => f.name !== m.field.name);
      holder.fields = [...rest, { ...m.field }];
      return;
    }
    case "drop_field": {
      const holder = graph.blocks[m.id] ?? graph.edges[m.id];
      if (holder?.fields) holder.fields = holder.fields.filter((f) => f.name !== m.name);
      return;
    }
    case "set_def":
      graph.defs[m.def.id] = { ...m.def };
      return;
    case "drop_def":
      delete graph.defs[m.id];
      return;
    case "set_arrangement": {
      const b = graph.blocks[m.layer];
      if (b) b.arrangement = m.arrangement;
      return;
    }
  }
}

/** Rebuild the graph from empty by replaying every applied step in order. */
export function fold(log: Log): Graph {
  const graph = empty_graph();
  for (const step of log) {
    if (step.status !== "applied") continue;
    for (const m of step.mutations) apply(graph, m);
  }
  return graph;
}


/** Every block under this one, itself included. */
export function subtree(graph: Graph, id: Id): Id[] {
  const out: Id[] = [id];
  for (let i = 0; i < out.length; i++) {
    const here = out[i]!;
    for (const b of Object.values(graph.blocks)) {
      if (b.parent === here) out.push(b.id);
    }
  }
  return out;
}

/** **A null layer is the root layer.** One reading, everywhere: nothing else
 *  has `parent: null`, so taking it literally would hand back the root as its
 *  own child. */
export function layer_id(graph: Graph, layer: Id | null): Id {
  return layer ?? graph.root;
}

/** The direct children of a layer, in a stable order.
 *
 *  By `num` then id. **The number is where it sits**: it is given at the end
 *  of the list when a block is made and rewritten when somebody puts one
 *  somewhere else, so this reads as the order they were made until you move
 *  one. The id is the tie-break that keeps it deterministic when two carry the
 *  same number. */
export function children(graph: Graph, layer: Id | null): Block[] {
  const here = layer_id(graph, layer);
  return Object.values(graph.blocks)
    .filter((b) => b.parent === here)
    .sort((a, b) => (a.num ?? 0) - (b.num ?? 0) || a.id.localeCompare(b.id));
}

/** The chain from root down to this block, itself last. */
export function path(graph: Graph, id: Id): Block[] {
  const out: Block[] = [];
  let at: Id | null = id;
  const seen = new Set<Id>();
  while (at && !seen.has(at)) {
    seen.add(at);
    const b: Block | undefined = graph.blocks[at];
    if (!b) break;
    out.unshift(b);
    at = b.parent;
  }
  return out;
}

export function is_interface(b: Block): boolean {
  return b.side !== undefined;
}

export function is_reference(b: Block): boolean {
  return b.of !== undefined;
}

/** A block holding blocks draws as a container. Derived, never declared. */
export function is_container(graph: Graph, id: Id): boolean {
  return Object.values(graph.blocks).some((b) => b.parent === id && !is_interface(b));
}

/** A block no other block contains.
 *
 *  Read from position and stored nowhere. There is no project type — a
 *  top-level block is informally a *project*, the way a block with children is
 *  informally a container. */
export function is_top_block(graph: Graph, id: Id): boolean {
  const b = graph.blocks[id];
  return !!b && b.parent === graph.root;
}

/** What a reference stands for, followed to the end. */
export function stands_for(graph: Graph, id: Id): Block | null {
  let b: Block | undefined = graph.blocks[id];
  const seen = new Set<Id>();
  while (b?.of && !seen.has(b.id)) {
    seen.add(b.id);
    b = graph.blocks[b.of];
  }
  return b ?? null;
}

function fallback(graph: Graph, b: Block): string {
  /** **A boundary needs no name.** It says *these belong together*, and the
   *  band round them already says it — a number nobody chose is a caption on
   *  every group saying nothing. Named where somebody names one. */
  if (module_of(graph, b.id) === "group") return "";
  const role = is_interface(b) ? "interface" : is_container(graph, b.id) ? "container" : "block";
  return `${role} ${b.num ?? 1}`;
}

/** The name to show.
 *
 *  A reference reads its target and a gone target reads *missing*. **A note is
 *  its text**, so it reads its body — there is nothing else on it to name.
 *  **Blank is not a name**: an empty label falls back like an absent one. */
export function shown_name(graph: Graph, id: Id): string {
  const b = graph.blocks[id];
  if (!b) return "missing";
  if (b.of) {
    const target = stands_for(graph, id);
    if (!target || target.id === b.id) return "missing";
    return named(graph, target);
  }
  return named(graph, b);
}

function named(graph: Graph, b: Block): string {
  const label = b.label?.trim();
  if (label) return label;
  const body = b.body?.trim();
  if (body && module_of(graph, b.id) === "note") return body;
  return fallback(graph, b);
}

/** Everything a word matches: the name it is shown by, its body, and the name
 *  of the definition it uses.
 *
 *  **Substring, and the whole workspace** — narrowing is about finding a thing
 *  wherever it lives, so it is not asked of a layer. Ranking what comes back by
 *  meaning is a host's, through the `score` port; this is what is there to rank.
 *  The root is never a match: everything is inside it. */
export function matches(graph: Graph, want: string): Id[] {
  const text = want.trim().toLowerCase();
  if (!text) return [];
  const holds = (said: string | undefined) => !!said?.toLowerCase().includes(text);
  return Object.values(graph.blocks)
    .filter((b) => b.id !== graph.root)
    .filter((b) => holds(shown_name(graph, b.id)) || holds(b.body)
                || holds(b.type ? graph.defs[b.type]?.name : undefined))
    .sort((a, b) => (a.num ?? 0) - (b.num ?? 0) || a.id.localeCompare(b.id))
    .map((b) => b.id);
}

/** The number a new sibling takes: one past the last.
 *
 *  **Appended, never inserted.** The lowest free number filled the gap a
 *  deleted sibling left, which put the newest block in the middle of a list
 *  whose whole meaning is the order things were added. */
export function next_num(graph: Graph, parent: Id | null): number {
  return children(graph, parent).reduce((n, b) => Math.max(n, b.num ?? 0), 0) + 1;
}

/** The siblings of a layer, renumbered so `moved` sits in front of `before` —
 *  or last, where nothing is named. **Only what actually shifts**: a move
 *  inside a list is one step, and every sibling saying its number again would
 *  bury what happened.
 *
 *  The block being moved may be arriving from another layer, so it is taken
 *  out of the list before it is put back. */
export function reorder(graph: Graph, parent: Id | null, moved: Id,
                        before?: Id | null): { id: Id; num: number }[] {
  const rest = children(graph, parent).filter((b) => b.id !== moved).map((b) => b.id);
  const at = before ? rest.indexOf(before) : -1;
  const order = at < 0 ? [...rest, moved] : [...rest.slice(0, at), moved, ...rest.slice(at)];
  return order
    .map((id, i) => ({ id, num: i + 1 }))
    .filter(({ id, num }) => (graph.blocks[id]?.num ?? 0) !== num);
}

/** What an end is **drawn on**. An interface is drawn on its owner, and
 *  everything else on itself — so promoting a relationship's seat to an
 *  interface moves where the line lands without moving which layer it is in. */
export function owner_of(graph: Graph, id: Id): Id {
  const b = graph.blocks[id];
  return b && is_interface(b) && b.parent ? b.parent : id;
}

/** Relations with both ends drawn in this layer.
 *
 *  An end seated on a child counts as that child. **The layer itself counts
 *  too**, and so does an interface of its own: seen from within, the layer is
 *  the frame around you, and a relationship reaching it is drawn meeting that
 *  frame. Left out, a block wired to the layer's own interface had a
 *  relationship that existed in the model and was drawn in no layer at all. */
export function edges_in(graph: Graph, layer: Id | null): Relation[] {
  const here = new Set(children(graph, layer).map((b) => b.id));
  const room = layer_id(graph, layer);
  const drawn = (id: Id) => here.has(owner_of(graph, id)) || owner_of(graph, id) === room;
  return Object.values(graph.edges)
    .filter((e) => drawn(e.from) && drawn(e.to))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** The layer's arrangement. `free` is what a layer says nothing about. */
export function arrangement_of(graph: Graph, layer: Id | null): Arrangement {
  return graph.blocks[layer_id(graph, layer)]?.arrangement ?? "free";
}

/** Every definition this block may use: filed under any ancestor, nearest first. */
export function defs_in_scope(graph: Graph, id: Id): Definition[] {
  const homes = path(graph, id).map((b) => b.id).reverse();
  const out: Definition[] = [];
  for (const home of homes) {
    for (const d of Object.values(graph.defs)) {
      if (d.home === home) out.push(d);
    }
  }
  return out;
}

/** Resolve a definition by name from a block's ancestors — nearest wins. */
export function resolve_def(graph: Graph, from: Id, name: string): Definition | null {
  return defs_in_scope(graph, from).find((d) => d.name === name) ?? null;
}

/** A definition and the chain it extends, nearest first. */
export function isa(graph: Graph, type: Id | undefined): Definition[] {
  const out: Definition[] = [];
  let at = type;
  const seen = new Set<Id>();
  while (at && !seen.has(at)) {
    seen.add(at);
    const d = graph.defs[at];
    if (!d) break;
    out.push(d);
    at = d.extends;
  }
  return out;
}

/** What one component reads for a usage of this definition: the **nearest
 *  declaration of its key** in the chain.
 *
 *  Components merge per key and never inside one, so a subtype restating `card`
 *  replaces the whole of it and leaves every other key alone. What comes back
 *  is what the door let through — a key it could not validate is already gone,
 *  so nothing downstream guards for a shape this build cannot read. */
export function config_of(graph: Graph, type: Id | undefined, key: string): Settings {
  for (const d of isa(graph, type)) {
    const said = d.components?.[key];
    if (said) return said;
  }
  return {};
}

/** Which block module interprets this block.
 *
 *  `of` and `side` win because they are what the block *is* doing, whatever it
 *  names; otherwise the nearest definition in the chain that says. */
export function module_of(graph: Graph, id: Id): BlockModule {
  const b = graph.blocks[id];
  if (!b) return "structure";
  if (b.of) return "reference";
  if (b.side !== undefined) return "interface";
  const named = config_of(graph, b.type, "block")["module"];
  return typeof named === "string" ? named as BlockModule : "structure";
}

/** What a block is, as the one word every surface draws a mark for.
 *
 *  **The module, plus the one thing a module cannot say.** A structure block
 *  that holds a layer of its own is a container, which is a fact about what it
 *  holds rather than about what it is — and it is the difference a reader needs
 *  most, because it says whether there is anywhere to go. Behavior, resource
 *  and view have no mark of their own: what they are is said by the definition
 *  they name, and a second word for it would be one too many.
 *
 *  Asked here so the tree, the canvas and every other surface answer alike. */
export type Role = "block" | "container" | "folder" | "reference"
                 | "interface" | "group" | "note";

const MARKED: readonly string[] = ["folder", "reference", "interface", "group", "note"];

export function role_of(graph: Graph, id: Id): Role {
  const module = module_of(graph, id);
  if (MARKED.includes(module)) return module as Role;
  return is_container(graph, id) ? "container" : "block";
}

/** One step, applied. */
export function step(id: Id, action: string, at: number, mutations: Mutation[]): Step {
  return { id, action, at, status: "applied", mutations };
}
