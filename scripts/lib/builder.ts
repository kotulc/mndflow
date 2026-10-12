/** A workspace built by a generator: blocks, relations and the counters they take.
 *
 *  State lives on the builder, not in module globals, so two generators can run in one process.
 *  `emit` writes through core and refuses a file the door would fault. */

import { readFileSync } from "node:fs";
import { read, write, type Block, type Graph, type Id, type Relation } from "@mnd/core";
import { FLOOR } from "@mnd/defs";

const U = 24;

/** Extra fields a generator sets on a block or a line, spread over the ones the builder fills. */
type More = Record<string, unknown>;


/** A fresh builder. Blocks and relations are inserted in call order. */
export function builder() {
  const blocks: Record<Id, Block> = {};
  const edges: Record<Id, Relation> = {};
  const counters: Record<string, number> = {};
  const orders: Record<string, number> = {};

  /** The next serial for a kind, which is what an alias is. */
  function serial(kind: string): number {
    counters[kind] = (counters[kind] ?? 0) + 1;
    return counters[kind];
  }

  /** The next order under a parent. */
  function order(parent: Id): number {
    orders[parent] = (orders[parent] ?? 0) + 1;
    return orders[parent];
  }

  /** A block put exactly as given, for the workspace root and anything the helpers do not cover. */
  function place(block: Block): void {
    blocks[block.id] = block;
  }

  /** A folder of the workspace's definitions, named for what it holds, under a parent. */
  function shelf(id: Id, name: string, parent: Id = "workspace"): void {
    blocks[id] = { id, parent, name, type: "folder", order: order(parent) };
  }

  /** A workspace definition, in a folder. */
  function def(id: Id, name: string, type: Id | undefined, settings?: More,
               more: More = {}, parent: Id = "workspace"): void {
    blocks[id] = { id, parent, name, type, def: {}, order: order(parent),
                   ...(settings ? { settings } : {}), ...more } as Block;
  }

  /** A usage of some kind under a parent. Nothing is placed: every layer lays itself out. */
  function put(id: Id, parent: Id, kind: string, more: More = {}): void {
    blocks[id] = { id, parent, alias: serial(kind), order: order(parent), ...more } as Block;
  }

  /** A layer: a block on the root canvas, of the given type, opening onto its own drawing. */
  function layer(id: Id, name: string, type?: Id, more: More = {}): void {
    put(id, "main", "block", { name, ...(type ? { type } : {}), ...more });
  }

  /** The note heading a layer, saying what to look for: as tall as its text wraps to, at the
   *  face's measure (views `note_h`). */
  function note(layer_id: Id, text: string, w = 15): void {
    const lines = Math.ceil(text.length / Math.floor((w * U - 29) / 7.2));
    const h = Math.max(3, Math.ceil((12 + lines * 16) / U));
    put(`${layer_id}_note`, layer_id, "note",
        { name: text, type: "note", w: w * U, h: h * U });
  }

  /** A line; `dir` is said as its `line.dir` setting, as any line says which way it points. */
  function link(id: Id, from: Id, to: Id, more: More & { dir?: string } = {}): void {
    const { dir, ...rest } = more;
    const prior = rest["settings"] as { line?: More } | undefined;
    const settings = dir && dir !== "none"
      ? { ...prior, line: { ...prior?.line, dir } } : prior;
    edges[id] = { id, from, to, alias: serial("relation"), ...rest,
                  ...(settings ? { settings } : {}) } as Relation;
  }

  /** Merge a package file whole. An id already present is a mistake, not a quiet overwrite. */
  function merge(file_path: string): void {
    const file = JSON.parse(readFileSync(file_path, "utf8")) as {
      graph: { blocks: Record<Id, Block>; edges?: Record<Id, Relation> } };
    for (const [id, block] of Object.entries(file.graph.blocks)) {
      if (blocks[id]) throw new Error(`${file_path} repeats ${id}, already in the workspace`);
      blocks[id] = block;
    }
    for (const [id, edge] of Object.entries(file.graph.edges ?? {})) {
      if (edges[id]) throw new Error(`${file_path} repeats ${id}, already in the workspace`);
      edges[id] = edge;
    }
  }

  /** Merge fields onto a block already put. Settings merge one level deep. */
  function tune(id: Id, more: Partial<Block>): void {
    const at = blocks[id];
    if (!at) throw new Error(`there is no ${id} to tune`);
    blocks[id] = { ...at, ...more,
                   ...(more.settings ? { settings: { ...at.settings, ...more.settings } } : {}) };
  }

  /** The graph as built. The workspace carries the counters the aliases came from. */
  function graph(): Graph {
    const root = blocks["workspace"];
    if (root) root.counters = counters;
    return { root: "workspace", blocks, edges };
  }

  /** The file, through core's writer. Thrown when the door faults it. */
  function emit(): string {
    const text = write(graph());
    const got = read(text, FLOOR);
    if (got.faults.length) {
      throw new Error(got.faults.map((f) => f.what).join("; "));
    }
    return text;
  }

  return { serial, order, place, shelf, def, put, layer, note, link, merge, tune, graph, emit };
}

export type Builder = ReturnType<typeof builder>;
