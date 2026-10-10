/** Mutation replay: a log folded into a graph over the packages it starts from. */

import { DRAWN } from "./components";
import { ordered_by } from "./defs";
import { subtree } from "./tree";
import { empty_graph, type Block, type Graph, type Id, type Log, type Mutation,
         type Step } from "./types";

/** The shipped packages every fold starts from: their blocks, laid under whatever a log says. */
export type Floor = readonly Block[];

/** Every relation with an end on this block goes with it. */
function drop_edges(graph: Graph, id: Id): void {
  for (const [eid, e] of Object.entries(graph.edges)) {
    if (e.from === id || e.to === id) delete graph.edges[eid];
  }
}

/** The element an op names, block or relation. */
function element(graph: Graph, id: Id) {
  return graph.blocks[id] ?? graph.edges[id];
}

/** Replay one mutation onto a graph, in place. */
function apply(graph: Graph, m: Mutation): void {
  switch (m.op) {
    case "checkpoint":
      graph.root = m.graph.root;
      graph.blocks = structuredClone(m.graph.blocks);
      graph.edges = structuredClone(m.graph.edges);
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
      /** A block goes with everything under it, holders included. */
      for (const id of subtree(graph, m.id)) {
        delete graph.blocks[id];
        drop_edges(graph, id);
      }
      return;
    }
    case "move_block": {
      const b = graph.blocks[m.id];
      if (!b) return;
      /** Leaving a parent drops the place and the cell it had there. */
      if (b.parent !== m.parent) {
        delete b.x; delete b.y; delete b.cell;
      }
      b.parent = m.parent;
      return;
    }
    case "order_block": {
      const b = graph.blocks[m.id];
      if (b) b.order = m.order;
      return;
    }
    case "set_alias": {
      const held = element(graph, m.id);
      if (held) held.alias = m.alias;
      return;
    }
    /** Counters live on the workspace and only ever rise. */
    case "set_counter": {
      const ws = graph.blocks[graph.root];
      if (ws) ws.counters = { ...(ws.counters ?? {}), [m.kind]: m.n };
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
    case "set_attributes": {
      const d = graph.blocks[m.id];
      if (!d?.def) return;
      if (m.attributes.length) {
        d.def = { ...d.def, attributes: m.attributes.map((a) => ({ ...a })) };
      }
      else { const { attributes: _gone, ...rest } = d.def; d.def = rest; }
      return;
    }
    case "set_source": {
      const b = graph.blocks[m.id];
      if (!b) return;
      if (m.source) b.source = m.source; else delete b.source;
      return;
    }
    case "seat_cell": {
      const b = graph.blocks[m.id];
      if (!b) return;
      if (m.cell === null) delete b.cell;
      else b.cell = { ...m.cell };
      return;
    }
    case "set_grid": {
      const b = graph.blocks[m.id];
      if (!b) return;
      if (m.grid === null) delete b.grid;
      else b.grid = structuredClone(m.grid);
      return;
    }
    case "link_blocks":
      graph.edges[m.edge.id] = { ...m.edge };
      return;
    case "update_edge": {
      const e = graph.edges[m.id];
      if (!e) return;
      if (m.name !== undefined) {
        if (m.name) e.name = m.name; else delete e.name;
      }
      /** Null clears the type; absent leaves it alone. */
      if (m.type === null) delete e.type;
      else if (m.type !== undefined) e.type = m.type;
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
      return;
    }
    case "set_end": {
      const e = graph.edges[m.id];
      if (!e) return;
      e[m.end] = m.port;
      const key = m.end === "from" ? "fromPart" : "toPart";
      if (m.part) e[key] = m.part; else delete e[key];
      return;
    }
    case "set_port": {
      const b = graph.blocks[m.id];
      if (!b) return;
      if (m.seat) { b.side = m.seat.side; b.at = m.seat.at; }
      else { delete b.side; delete b.at; }
      return;
    }
    case "mark_port": {
      const b = graph.blocks[m.id];
      if (!b) return;
      if (m.flow === null) delete b.flow;
      else b.flow = m.flow;
      return;
    }
    /** Set in place where the answer exists, else appended. */
    case "set_value": {
      const b = graph.blocks[m.id];
      if (!b) return;
      const said = { name: m.name, value: m.value };
      const had = (b.values ?? []).some((v) => v.name === m.name);
      b.values = had ? b.values!.map((v) => (v.name === m.name ? said : v))
        : [...(b.values ?? []), said];
      return;
    }
    case "drop_value": {
      const b = graph.blocks[m.id];
      if (b?.values) b.values = b.values.filter((f) => f.name !== m.name);
      return;
    }
    case "order_values": {
      const b = graph.blocks[m.id];
      if (b?.values) b.values = ordered_by(b.values, m.names);
      return;
    }
    case "set_tags": {
      const b = element(graph, m.id);
      if (!b) return;
      /** Trimmed, deduplicated and in the order they were given. */
      const kept = [...new Set(m.tags.map((t) => t.trim()).filter(Boolean))];
      if (kept.length) b.tags = kept; else delete b.tags;
      return;
    }
    case "set_traits": {
      /** A definition's alone: a usage or a line carries none. */
      const b = graph.blocks[m.id];
      if (!b?.def) return;
      /** Null gives the set back to the chain; an empty list says none. */
      if (m.traits === null) delete b.traits;
      else b.traits = [...new Set(m.traits.filter(Boolean))];
      return;
    }
    /** Gives back the drawing settings of whichever element the id names. */
    case "drop_settings": {
      const it = element(graph, m.id);
      if (!it?.settings) return;
      const settings = { ...it.settings };
      for (const key of DRAWN) delete settings[key];
      if (Object.keys(settings).length) it.settings = settings; else delete it.settings;
      return;
    }
    case "set_setting": {
      const it = element(graph, m.id);
      if (!it) return;
      const held = { ...(it.settings?.[m.key] ?? {}) };
      if (m.value === null || m.value === undefined) delete held[m.name];
      else held[m.name] = m.value;
      const settings = { ...(it.settings ?? {}) };
      if (Object.keys(held).length) settings[m.key] = held; else delete settings[m.key];
      if (Object.keys(settings).length) it.settings = settings; else delete it.settings;
      return;
    }
  }
}

/** Rebuild the graph by replaying every applied step over the floor. */
export function fold(log: Log, floor: Floor = []): Graph {
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
  return graph;
}

/** The shipped packages, over whatever is there. Copied, so no fold can write into them. */
function lay(graph: Graph, floor: Floor): void {
  for (const b of floor) graph.blocks[b.id] = structuredClone(b);
}

/** A graph with these mutations applied over a copy of it: what a step would make, without a log. */
export function replay(graph: Graph, mutations: readonly Mutation[]): Graph {
  const out = structuredClone(graph);
  for (const m of mutations) apply(out, m);
  return out;
}

/** One step, applied. */
export function step(id: Id, action: string, at: number, mutations: Mutation[]): Step {
  return { id, action, at, status: "applied", mutations };
}
