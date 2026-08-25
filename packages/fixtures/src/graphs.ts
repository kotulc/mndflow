/** Sample **files**, as graphs rather than logs.
 *
 *  A log fixture proves the engine agrees with itself: it folds what this build
 *  wrote, through the door this build owns. That is the wrong shape for the one
 *  thing the outside world can do — hand over a file **this engine never
 *  wrote** — so these are hand-written, and most of them are wrong on purpose.
 *
 *  They are text, not graphs, because the seam takes text: a file that does not
 *  parse is one of the things `open` has to answer for. */

import { SCHEMA } from "@mnd/core";

const file = (graph: unknown, schema = SCHEMA, id = "sample"): string =>
  JSON.stringify({ schema, id, graph }, null, 2) + "\n";

const ROOT_BLOCK = { id: "ws", parent: null, label: "workspace", type: "folder" };

/** What a well-formed file looks like: a root, a tree under it, one relation. */
export function clean(): string {
  return file({
    root: "ws",
    defs: {},
    blocks: {
      ws: ROOT_BLOCK,
      block_loop: { id: "block_loop", parent: "ws", label: "Coolant Loop", num: 1 },
      block_pump: { id: "block_pump", parent: "block_loop", label: "Pump", num: 1 },
      block_hx: { id: "block_hx", parent: "block_loop", label: "Heat Exchanger", num: 2 },
    },
    edges: {
      edge_a: { id: "edge_a", from: "block_pump", to: "block_hx", module: "directed" },
    },
  });
}

/** A block whose parent is not in the file. **Repaired** to the root, because a
 *  block nobody holds is still a block somebody wrote down. */
export function orphaned(): string {
  return file({
    root: "ws",
    defs: {},
    blocks: {
      ws: ROOT_BLOCK,
      block_lost: { id: "block_lost", parent: "block_gone", label: "Lost", num: 1 },
    },
    edges: {},
  });
}

/** A relation with an end that is not there. **Dropped** — a line to nowhere
 *  cannot be drawn, and there is nothing to guess. */
export function dangling(): string {
  return file({
    root: "ws",
    defs: {},
    blocks: {
      ws: ROOT_BLOCK,
      block_pump: { id: "block_pump", parent: "ws", label: "Pump", num: 1 },
    },
    edges: {
      edge_a: { id: "edge_a", from: "block_pump", to: "block_gone", module: "line" },
    },
  });
}

/** No root block at all. **Repaired**, since every other block needs somewhere
 *  to hang and the root is the one thing the engine can supply itself. */
export function rootless(): string {
  return file({
    root: "ws",
    defs: {},
    blocks: {
      block_pump: { id: "block_pump", parent: "ws", label: "Pump", num: 1 },
    },
    edges: {},
  });
}

/** A definition extending one that did not travel, and another filed under a
 *  block that is not there. **Both repaired** rather than dropped: a definition
 *  still names and presents its usages without its parent. */
export function unmoored(): string {
  return file({
    root: "ws",
    defs: {
      def_valve: { id: "def_valve", home: "block_gone", name: "Valve" },
      def_ball: { id: "def_ball", home: "ws", name: "Ball Valve", extends: "def_missing" },
    },
    blocks: { ws: ROOT_BLOCK },
    edges: {},
  });
}

/** A higher **minor** schema. Readable: what this build does not know about is
 *  carried rather than refused. */
export function ahead(): string {
  const [major] = SCHEMA.split(".");
  return file({
    root: "ws",
    defs: {},
    blocks: { ws: ROOT_BLOCK, block_new: { id: "block_new", parent: "ws", label: "New", num: 1 } },
    edges: {},
  }, `${major}.99`);
}

/** A higher **major** schema. **Dropped** — the shapes are not the same shapes. */
export function future(): string {
  return file({ root: "ws", defs: {}, blocks: { ws: ROOT_BLOCK }, edges: {} }, "99.0");
}

/** Not JSON at all, which is the first thing a reader has to survive. */
export function garbage(): string {
  return "{ this is not a file";
}

/** Definitions saying things their own components cannot read, and one saying
 *  something no component in this build claims at all.
 *
 *  **Each key is dropped alone and the rest of the definition stands** — a
 *  misspelt shape costs a card, never a definition. The `sketch` key belongs to
 *  no component here, so it is carried untouched: unvalidated rather than
 *  wrong, which is how this build opens a package a later one wrote. */
export function muddled(): string {
  return file({
    root: "ws",
    defs: {
      def_valve: { id: "def_valve", home: "ws", group: "block", name: "Valve",
                   components: { card: { layout: "type", shape: "blob" },
                                 block: { module: "structure" } } },
      def_pipe: { id: "def_pipe", home: "ws", group: "block", name: "Pipe",
                  components: { block: { module: "sprocket" },
                                sketch: { hatching: "cross" } } },
      def_feeds: { id: "def_feeds", home: "ws", group: "relation", name: "feeds",
                   components: { rules: { ends: { from: "def_valve" } } } },
    },
    blocks: {
      ws: ROOT_BLOCK,
      block_valve: { id: "block_valve", parent: "ws", label: "Valve", type: "def_valve", num: 1 },
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
