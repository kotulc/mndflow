/** Mutation replay: a log folded into a graph over the shipped floor. */

import { DRAWN } from "./components";
import { default_for, ordered_by } from "./defs";
import { covers, is_group, members_of, overlaps } from "./holders";
import { default_id } from "./ids";
import { subtree } from "./tree";
import { empty_graph, type BlockModule, type Definition, type Graph, type Id, type Log,
         type Mutation, type RelationModule, type Step } from "./types";

/** A group whose last member just left is deleted, and so is a holder that empties. */
function emptied(graph: Graph, id: Id | undefined): void {
  const g = id ? graph.blocks[id] : undefined;
  if (!g || !is_group(graph, g.id) || members_of(graph, g.id).length) return;
  delete graph.blocks[g.id];
  drop_edges(graph, g.id);
  emptied(graph, g.group);
}

/** Every relation with an end on this block goes with it. */
function drop_edges(graph: Graph, id: Id): void {
  for (const [eid, e] of Object.entries(graph.edges)) {
    if (e.from === id || e.to === id) delete graph.edges[eid];
  }
}

/** Replay one mutation onto a graph, in place. */
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
      if (m.name !== undefined) b.name = m.name;
      if (m.type === null) delete b.type;
      else if (m.type !== undefined) b.type = m.type;
      return;
    }
    case "delete_block": {
      const holder = graph.blocks[m.id]?.group;
      for (const id of subtree(graph, m.id)) {
        delete graph.blocks[id];
        drop_edges(graph, id);
      }
      /** A deleted group frees its members. */
      for (const b of Object.values(graph.blocks)) {
        if (b.group === m.id) { delete b.group; delete b.cell; }
      }
      emptied(graph, holder);
      return;
    }
    case "move_block": {
      const b = graph.blocks[m.id];
      if (!b) return;
      /** Leaving a layer drops the block's place and group there. */
      const holder = b.group;
      if (b.parent !== m.parent) {
        delete b.x; delete b.y; delete b.group; delete b.cell;
      }
      b.parent = m.parent;
      if (holder !== b.group) emptied(graph, holder);
      return;
    }
    case "order_block": {
      const b = graph.blocks[m.id];
      if (b) b.order = m.order;
      return;
    }
    case "set_alias": {
      const held = graph.blocks[m.id] ?? graph.edges[m.id];
      if (held) held.alias = m.alias;
      return;
    }
    /** Counters live on the workspace and only ever rise. */
    case "set_counter": {
      const ws = graph.blocks[graph.root];
      if (ws) ws.counters = { ...(ws.counters ?? {}), [m.kind]: m.n };
      return;
    }
    case "set_pinned": {
      const ws = graph.blocks[graph.root];
      if (!ws) return;
      /** Deduplicated, in order, and dropped when empty. */
      const kept = [...new Set(m.ids.filter(Boolean))];
      if (kept.length) ws.pinned = kept; else delete ws.pinned;
      return;
    }
    case "set_shelf": {
      const ws = graph.blocks[graph.root];
      if (!ws) return;
      if (m.shelf.length) ws.shelf = m.shelf.map((s) => ({ ...s })); else delete ws.shelf;
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
    case "set_group": {
      const b = graph.blocks[m.id];
      if (!b) return;
      /** An address is the group's, so leaving one drops it. */
      const was = b.group;
      if (m.group === null) { delete b.group; delete b.cell; delete b.header; }
      else {
        if (b.group !== m.group) { delete b.cell; delete b.header; }
        b.group = m.group;
      }
      if (was !== b.group) emptied(graph, was);
      return;
    }
    case "seat_cell": {
      const b = graph.blocks[m.id];
      if (!b) return;
      if (m.cell === null) { delete b.cell; delete b.header; }
      else { b.cell = { ...m.cell }; }
      return;
    }
    case "set_header": {
      const b = graph.blocks[m.id];
      if (!b) return;
      if (m.header) b.header = true;
      else delete b.header;
      return;
    }
    case "set_grid": {
      const b = graph.blocks[m.id];
      if (!b) return;
      if (m.rows === null) delete b.rows;
      else if (m.rows !== undefined) b.rows = m.rows;
      if (m.cols === null) delete b.cols;
      else if (m.cols !== undefined) b.cols = m.cols;
      if (m.rows === null && m.cols === null) delete b.merges;
      return;
    }
    case "merge_cells": {
      const b = graph.blocks[m.id];
      if (!b) return;
      /** A merge replaces any merge it overlaps. */
      b.merges = [...(b.merges ?? []).filter((s) => !overlaps(s, m.span)), { ...m.span }];
      return;
    }
    case "split_cells": {
      const b = graph.blocks[m.id];
      if (b?.merges) b.merges = b.merges.filter((s) => !covers(s, m.r, m.c));
      return;
    }
    case "link_blocks":
      graph.edges[m.edge.id] = { ...m.edge };
      return;
    case "update_edge": {
      const e = graph.edges[m.id];
      if (!e) return;
      /** Null clears the type. */
      if (m.type === null) delete e.type;
      else e.type = m.type;
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
    /** Set in place where the field exists, else appended. */
    case "set_field": {
      const b = graph.blocks[m.id];
      if (!b) return;
      const had = (b.fields ?? []).some((f) => f.name === m.field.name);
      b.fields = had
        ? b.fields!.map((f) => (f.name === m.field.name ? { ...m.field } : f))
        : [...(b.fields ?? []), { ...m.field }];
      return;
    }
    case "drop_field": {
      const b = graph.blocks[m.id];
      if (b?.fields) b.fields = b.fields.filter((f) => f.name !== m.name);
      return;
    }
    case "order_fields": {
      const b = graph.blocks[m.id];
      if (b?.fields) b.fields = ordered_by(b.fields, m.names);
      return;
    }
    case "set_def":
      graph.defs[m.def.id] = { ...m.def };
      return;
    case "drop_def":
      delete graph.defs[m.id];
      return;
    case "set_tags": {
      const b = graph.blocks[m.id] ?? graph.edges[m.id];
      if (!b) return;
      /** Trimmed, deduplicated and in the order they were given. */
      const kept = [...new Set(m.tags.map((t) => t.trim()).filter(Boolean))];
      if (kept.length) b.tags = kept; else delete b.tags;
      return;
    }
    /** Gives back the drawing looks of whichever holder the id names. */
    case "drop_looks": {
      const it = graph.blocks[m.id] ?? graph.edges[m.id];
      if (!it?.looks) return;
      const looks = { ...it.looks };
      for (const key of DRAWN) delete looks[key];
      if (Object.keys(looks).length) it.looks = looks; else delete it.looks;
      return;
    }
    case "set_look": {
      const it = graph.blocks[m.id] ?? graph.edges[m.id];
      if (!it) return;
      const held = { ...(it.looks?.[m.key] ?? {}) };
      if (m.value === null || m.value === undefined) delete held[m.name];
      else held[m.name] = m.value;
      const looks = { ...(it.looks ?? {}) };
      if (Object.keys(held).length) looks[m.key] = held; else delete looks[m.key];
      if (Object.keys(looks).length) it.looks = looks; else delete it.looks;
      return;
    }
    case "set_arrangement": {
      const b = graph.blocks[m.layer];
      if (b) b.arrangement = m.arrangement;
      return;
    }
  }
}

/** Rebuild the graph by replaying every applied step over the floor. */
export function fold(log: Log, floor: Graph["defs"] = {}): Graph {
  const graph = empty_graph();
  lay(graph, floor);
  for (const step of log) {
    if (step.status !== "applied") continue;
    for (const m of step.mutations) {
      apply(graph, m);
      /** A checkpoint replaces the floor too, so it is laid again. */
      if (m.op === "checkpoint") lay(graph, floor);
    }
  }
  lay_defaults(graph, floor);
  return graph;
}

/** The shipped package, over whatever is there. */
function lay(graph: Graph, floor: Graph["defs"]): void {
  for (const [id, def] of Object.entries(floor)) graph.defs[id] = def;
}

/** Lays an unfiled default for every base kind that has none. */
function lay_defaults(graph: Graph, floor: Graph["defs"]): void {
  for (const base of Object.values(floor)) {
    const kind = base_kind(base);
    if (!kind || default_for(graph, kind, base.group)) continue;
    const id = default_id(kind, base.group);
    graph.defs[id] = { id, group: base.group, name: kind, extends: base.id, default: kind };
  }
}

/** The kind a shipped base is the root of, or null. */
function base_kind(d: Definition): BlockModule | RelationModule | null {
  const said = d.components?.[d.group === "relation" ? "relation" : "block"]?.["module"];
  return said === d.id ? (said as BlockModule | RelationModule) : null;
}

/** One step, applied. */
export function step(id: Id, action: string, at: number, mutations: Mutation[]): Step {
  return { id, action, at, status: "applied", mutations };
}
