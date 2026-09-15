/** Sample files, as graphs rather than logs. */

import { SCHEMA } from "@mnd/core";

const file = (graph: unknown, schema = SCHEMA, id = "sample"): string =>
  JSON.stringify({ schema, id, graph }, null, 2) + "\n";

const ROOT_BLOCK = { id: "ws", parent: null, name: "workspace", type: "folder" };

/** What a well-formed file looks like: a root, a tree under it, one relation. */
export function clean(): string {
  return file({
    root: "ws",
    defs: {},
    blocks: {
      ws: ROOT_BLOCK,
      block_loop: { id: "block_loop", parent: "ws", name: "Coolant Loop", order: 1 },
      block_pump: { id: "block_pump", parent: "block_loop", name: "Pump", order: 1 },
      block_hx: { id: "block_hx", parent: "block_loop", name: "Heat Exchanger", order: 2 },
    },
    edges: {
      edge_a: { id: "edge_a", from: "block_pump", to: "block_hx", module: "line",
                dir: "forward" },
    },
  });
}

/** A block whose parent is not in the file. */
export function orphaned(): string {
  return file({
    root: "ws",
    defs: {},
    blocks: {
      ws: ROOT_BLOCK,
      block_lost: { id: "block_lost", parent: "block_gone", name: "Lost", order: 1 },
    },
    edges: {},
  });
}

/** A relation with an end that is not there. */
export function dangling(): string {
  return file({
    root: "ws",
    defs: {},
    blocks: {
      ws: ROOT_BLOCK,
      block_pump: { id: "block_pump", parent: "ws", name: "Pump", order: 1 },
    },
    edges: {
      edge_a: { id: "edge_a", from: "block_pump", to: "block_gone", module: "line" },
    },
  });
}

/** No root block at all; repaired. */
export function rootless(): string {
  return file({
    root: "ws",
    defs: {},
    blocks: {
      block_pump: { id: "block_pump", parent: "ws", name: "Pump", order: 1 },
    },
    edges: {},
  });
}

/** A definition extending one that did not travel. */
export function unmoored(): string {
  return file({
    root: "ws",
    defs: {
      def_valve: { id: "def_valve", name: "Valve" },
      def_ball: { id: "def_ball", name: "Ball Valve", extends: "def_missing" },
    },
    blocks: { ws: ROOT_BLOCK },
    edges: {},
  });
}

/** A higher minor schema; readable. */
export function ahead(): string {
  const [major] = SCHEMA.split(".");
  return file({
    root: "ws",
    defs: {},
    blocks: { ws: ROOT_BLOCK, block_new: { id: "block_new", parent: "ws", name: "New", order: 1 } },
    edges: {},
  }, `${major}.99`);
}

/** A higher major schema; dropped. */
export function future(): string {
  return file({ root: "ws", defs: {}, blocks: { ws: ROOT_BLOCK }, edges: {} }, "99.0");
}

/** Not JSON at all, which is the first thing a reader has to survive. */
export function garbage(): string {
  return "{ this is not a file";
}

/** Definitions saying things their components cannot read, or no component claims. */
export function muddled(): string {
  return file({
    root: "ws",
    defs: {
      def_valve: { id: "def_valve", group: "block", name: "Valve",
                   components: { card: { layout: "type", shape: "blob" },
                                 block: { module: "block" } } },
      def_pipe: { id: "def_pipe", group: "block", name: "Pipe",
                  components: { block: { module: "sprocket" },
                                sketch: { hatching: "cross" } } },
      def_feeds: { id: "def_feeds", group: "relation", name: "feeds",
                   components: { rules: { ends: { from: "def_valve" } } } },
    },
    blocks: {
      ws: ROOT_BLOCK,
      block_valve: { id: "block_valve", parent: "ws", name: "Valve", type: "def_valve", order: 1 },
    },
    edges: {},
  });
}

export const GRAPHS = { clean, orphaned, dangling, rootless, unmoored, muddled,
                        ahead, future, garbage };

export type GraphName = keyof typeof GRAPHS;

export const GRAPH_NAMES = Object.keys(GRAPHS) as GraphName[];

/** A sample file, as the text `open` takes. */
export function graph_file(name: string): string {
  const make = GRAPHS[name as GraphName];
  if (!make) throw new Error(`no file called "${name}" — try ${GRAPH_NAMES.join(", ")}`);
  return make();
}
