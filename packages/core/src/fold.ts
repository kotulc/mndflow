/** Mutation replay, and the derived readings of a graph.
 *
 *  The graph is thrown away and rebuilt rather than edited, so it can never
 *  drift from the log that produced it — and undo is a refold, so no mutation
 *  needs an inverse. */

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
      if (m.side === null) delete e[key];
      else e[key] = m.side;
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
 *  By `num` then id: `num` is fixed at creation, so this reads as the order
 *  things were made, and the id is the tie-break that keeps it deterministic
 *  when two carry the same number. */
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

/** A top-level block is a project. Read from position, stored nowhere. */
export function is_project(graph: Graph, id: Id): boolean {
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
  return derived_name(graph, b.id) ?? fallback(graph, b);
}

/** A block that says nothing itself and **stands for exactly one thing** is
 *  named after what it stands for, with its definition's verb in front.
 *
 *  This is what gives an inferred action `do Pump` without storing anything: a
 *  structure block is a noun and an action wants a verb, and no reliable
 *  transformation turns one into the other — so nothing is transformed. Typing
 *  over it stores a real name, and that is the only way one gets one.
 *
 *  Null where the block names itself, or stands for more than one thing. */
export function derived_name(graph: Graph, id: Id): string | null {
  const b = graph.blocks[id];
  if (!b || b.label?.trim()) return null;
  const kids = children(graph, id);
  const refs = kids.filter((k) => k.of !== undefined);
  if (kids.length !== 1 || refs.length !== 1) return null;
  const stood = shown_name(graph, refs[0]!.id);
  const verb = word_of(graph, b.type);
  return verb ? `${verb} ${stood}` : stood;
}

/** The verb a definition calls its usages by. Vocabulary, so a SysML reading
 *  and a plain one can differ without either being stored. */
export function word_of(graph: Graph, type: Id | undefined): string {
  for (const d of isa(graph, type)) {
    const said = d.components?.["card"]?.["word"];
    if (typeof said === "string") return said;
  }
  return "";
}

/** The lowest number not in use among siblings. */
export function next_num(graph: Graph, parent: Id | null): number {
  const taken = new Set(children(graph, parent).map((b) => b.num ?? 0));
  let n = 1;
  while (taken.has(n)) n++;
  return n;
}

/** What an end is **drawn on**. An interface is drawn on its owner, and
 *  everything else on itself — so promoting a relationship's seat to an
 *  interface moves where the line lands without moving which layer it is in. */
export function owner_of(graph: Graph, id: Id): Id {
  const b = graph.blocks[id];
  return b && is_interface(b) && b.parent ? b.parent : id;
}

/** Relations with both ends drawn in this layer, an end seated on a child
 *  counting as that child. */
export function edges_in(graph: Graph, layer: Id | null): Relation[] {
  const here = new Set(children(graph, layer).map((b) => b.id));
  const drawn = (id: Id) => here.has(owner_of(graph, id));
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

/** Which block module interprets this block.
 *
 *  `of` and `side` win because they are what the block *is* doing, whatever it
 *  names; otherwise the nearest definition in the chain that says. */
export function module_of(graph: Graph, id: Id): BlockModule {
  const b = graph.blocks[id];
  if (!b) return "structure";
  if (b.of) return "reference";
  if (b.side !== undefined) return "interface";
  for (const d of isa(graph, b.type)) {
    const named = d.components?.["block"]?.["module"];
    if (typeof named === "string") return named as BlockModule;
  }
  return "structure";
}

/** One step, applied. */
export function step(id: Id, action: string, at: number, mutations: Mutation[]): Step {
  return { id, action, at, status: "applied", mutations };
}
