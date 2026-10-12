/** Sample files, as graphs rather than logs. */

import { SCHEMA } from "@mnd/core";

const file = (graph: unknown, schema = SCHEMA, id = "sample"): string =>
  JSON.stringify({ schema, id, graph }, null, 2) + "\n";

/** The workspace's root and the definition its structure is built in. */
const FRAME = {
  workspace: { id: "workspace", parent: null, name: "workspace" },
  main: { id: "main", parent: "workspace", name: "main", def: {} },
};

/** What a well-formed file looks like: a root, a tree under `main`, one relation. */
export function clean(): string {
  return file({
    root: "workspace",
    blocks: {
      ...FRAME,
      block_loop: { id: "block_loop", parent: "main", name: "Coolant Loop", order: 1 },
      block_pump: { id: "block_pump", parent: "block_loop", name: "Pump", order: 1 },
      block_hx: { id: "block_hx", parent: "block_loop", name: "Heat Exchanger", order: 2 },
    },
    edges: {
      edge_a: { id: "edge_a", from: "block_pump", to: "block_hx",
                settings: { line: { dir: "forward" } } },
    },
  });
}

/** A block whose parent is not in the file. */
export function orphaned(): string {
  return file({
    root: "workspace",
    blocks: {
      ...FRAME,
      block_lost: { id: "block_lost", parent: "block_gone", name: "Lost", order: 1 },
    },
    edges: {},
  });
}

/** A relation with an end that is not there. */
export function dangling(): string {
  return file({
    root: "workspace",
    blocks: {
      ...FRAME,
      block_pump: { id: "block_pump", parent: "main", name: "Pump", order: 1 },
    },
    edges: {
      edge_a: { id: "edge_a", from: "block_pump", to: "block_gone" },
    },
  });
}

/** No root block at all; repaired. */
export function rootless(): string {
  return file({
    root: "workspace",
    blocks: {
      block_pump: { id: "block_pump", parent: "workspace", name: "Pump", order: 1 },
    },
    edges: {},
  });
}

/** A definition extending one that did not travel. */
export function unmoored(): string {
  return file({
    root: "workspace",
    blocks: {
      ...FRAME,
      def_valve: { id: "def_valve", parent: "workspace", name: "Valve", def: {} },
      def_ball: { id: "def_ball", parent: "workspace", name: "Ball Valve", type: "def_missing",
                  def: {} },
    },
    edges: {},
  });
}

/** A higher minor schema; readable. */
export function ahead(): string {
  const [major] = SCHEMA.split(".");
  return file({
    root: "workspace",
    blocks: { ...FRAME, block_new: { id: "block_new", parent: "main", name: "New", order: 1 } },
    edges: {},
  }, `${major}.99`);
}

/** A higher major schema; dropped. */
export function future(): string {
  return file({ root: "workspace", blocks: { ...FRAME }, edges: {} }, "99.0");
}

/** Not JSON at all, which is the first thing a reader has to survive. */
export function garbage(): string {
  return "{ this is not a file";
}

/** Definitions saying things their components cannot read, or no component claims. */
export function muddled(): string {
  return file({
    root: "workspace",
    blocks: {
      ...FRAME,
      def_valve: { id: "def_valve", parent: "workspace", name: "Valve", def: {},
                   settings: { card: { layout: "type", shape: "blob" },
                               block: { module: "block" } } },
      def_pipe: { id: "def_pipe", parent: "workspace", name: "Pipe", def: {},
                  settings: { block: { module: "sprocket" }, sketch: { hatching: "cross" } } },
      def_feeds: { id: "def_feeds", parent: "workspace", name: "feeds", type: "line", def: {},
                   settings: { allows: { ends: { from: "def_valve" } } } },
      block_valve: { id: "block_valve", parent: "main", name: "Valve", type: "def_valve",
                     order: 1 },
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
