/** The envelope, and the canonical layout. */

import { inspect, type Fault } from "./door";
import { BASE_PACKAGE, def_of, touched } from "./defs";
import { fold } from "./fold";
import { subtree } from "./tree";
import { new_id } from "./ids";
import { empty_graph, SCHEMA, type File, type Graph, type Id, type Log, type Step }
  from "./types";

/** Nothing still at its default is written — a file the size of the choices in it. */
function trim<T extends object>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o).sort(by_key)) {
    if (v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as T;
}

/** Keys a record writes first; the rest follow alphabetically. */
const FIRST = ["id", "parent", "label", "name", "from", "group",
               "type", "extends", "default", "of", "side", "dir"];

const by_key = ([a]: [string, unknown], [b]: [string, unknown]): number => {
  const x = FIRST.indexOf(a), y = FIRST.indexOf(b);
  return (x < 0 ? FIRST.length : x) - (y < 0 ? FIRST.length : y) || a.localeCompare(b);
};

function ordered<T extends { id: Id }>(all: Record<Id, T>, keep = (_: T) => true): Record<Id, T> {
  const out: Record<Id, T> = {};
  for (const id of Object.keys(all).sort()) if (keep(all[id]!)) out[id] = trim(all[id]!);
  return out;
}

/** The packages the written definitions name. The shipped floor is nobody's package, so it never
 *  travels. */
function drawn_on(graph: Graph, defs: Record<Id, Graph["defs"][string]>): Graph["packages"] {
  const out: Graph["packages"] = {};
  for (const d of Object.values(defs)) {
    const pkg = d.from ? graph.packages[d.from] : undefined;
    if (pkg && pkg.id !== BASE_PACKAGE) out[pkg.id] = pkg;
  }
  return out;
}

/** The graph, laid out for reading: packages, then definitions, then blocks, then relations. */
export function write(graph: Graph, id = "workspace"): string {
  const defs = ordered(graph.defs, touched);
  const file: File = {
    schema: SCHEMA,
    id,
    graph: { root: graph.root, packages: ordered(drawn_on(graph, defs)), defs,
             blocks: ordered(graph.blocks), holders: ordered(graph.holders),
             edges: ordered(graph.edges) },
  };
  return JSON.stringify(file, null, 2) + "\n";
}

/** A subtree plus every definition it reaches, and everything those extend. */
export function write_subtree(graph: Graph, root: Id): string {
  const ids = new Set(subtree(graph, root));
  const blocks: Record<Id, Graph["blocks"][string]> = {};
  for (const id of ids) {
    const b = graph.blocks[id];
    if (b) blocks[id] = id === root ? { ...b, parent: null } : b;
  }
  const edges: Record<Id, Graph["edges"][string]> = {};
  for (const [eid, e] of Object.entries(graph.edges)) {
    if (ids.has(e.from) && ids.has(e.to)) edges[eid] = e;
  }
  const holders: Record<Id, Graph["holders"][string]> = {};
  for (const [hid, h] of Object.entries(graph.holders)) {
    if (ids.has(h.parent)) holders[hid] = h;
  }
  const defs: Record<Id, Graph["defs"][string]> = {};
  const want = [...Object.keys(blocks).map((id) => def_of(graph, id)),
                ...Object.keys(edges).map((id) => def_of(graph, id))].filter(Boolean) as Id[];
  for (let i = 0; i < want.length; i++) {
    const d = graph.defs[want[i]!];
    if (!d || defs[d.id]) continue;
    defs[d.id] = d;
    if (d.extends) want.push(d.extends);
  }
  return write({ ...graph, root, blocks, edges, defs, holders }, root);
}

export type Parsed = { graph: Graph | null; faults: Fault[] };

/** The envelope, opened and no more. */
export function parse(text: string): Parsed {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { graph: null, faults: [{ kind: "dropped", what: "a file that is not JSON" }] };
  }
  const file = raw as Partial<File>;
  if (!file.graph || typeof file.graph !== "object") {
    return { graph: null, faults: [{ kind: "dropped", what: "a file with no graph" }] };
  }
  if (typeof file.schema === "string" && major(file.schema) !== major(SCHEMA)) {
    return { graph: null,
             faults: [{ kind: "dropped", what: `a file written for schema ${file.schema}` }] };
  }
  return { graph: { ...empty_graph(), ...file.graph }, faults: [] };
}

export type Read = { log: Log; faults: Fault[] };

/** A file in, as a one-checkpoint log. */
export function read(text: string, floor: Graph["defs"] = {}): Read {
  const got = parse(text);
  if (!got.graph) return { log: [], faults: got.faults };

  const graph = got.graph;
  /** Inspected over the floor, which the file need not carry. */
  const log: Log = [{ id: new_id("step"), action: "import", at: 0, status: "applied",
                      mutations: [{ op: "checkpoint", graph }] }];
  const mend = inspect(fold(log, floor));
  if (mend.repairs.length) {
    log.push({ id: new_id("step"), action: "repair", at: 1, status: "applied",
               mutations: mend.repairs });
  }
  return { log, faults: mend.faults };
}

export type Opened = { graph: Graph; faults: Fault[] };

/** A file in, as a graph. The reader anything outside the engine gets. */
export function open(text: string, floor: Graph["defs"] = {}): Opened {
  const got = read(text, floor);
  return { graph: fold(got.log, floor), faults: got.faults };
}

function major(v: string): string {
  return v.split(".")[0] ?? "";
}

/** The content hash is computed, never stored. */
export function hash(graph: Graph): string {
  const text = write(graph);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Past the cap the oldest steps fold into one checkpoint and are dropped. */
export const CAP = 1000;
export const SLACK = 200;

export function compact(log: Log): Log {
  if (log.length <= CAP + SLACK) return log;
  const keep = log.slice(log.length - CAP);
  const shed = log.slice(0, log.length - CAP);
  const at = shed.length;
  const point: Step = { id: new_id("step"), action: "checkpoint", at, status: "applied",
                        mutations: [{ op: "checkpoint", graph: fold(shed) }] };
  return [point, ...keep];
}
