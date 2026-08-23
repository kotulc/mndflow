/** The envelope, and the canonical layout.
 *
 *  A file is the graph; the log is a working copy. A file exists to be read,
 *  compared and kept, so it is the size of the model rather than the size of
 *  the effort. Importing one is a checkpoint, so there is no second format and
 *  no second reader.
 *
 *  Exporting changes nothing, so re-exporting an unchanged workspace is
 *  byte-identical — which is what the canonical layout is for. */

import { check, inspect, type Fault } from "./door";
import { fold, subtree } from "./fold";
import { new_id } from "./ids";
import { empty_graph, SCHEMA, type File, type Graph, type Id, type Log, type Step }
  from "./types";

/** Nothing still at its default is written — a file the size of the choices in it.
 *
 *  `null` stays: `parent: null` is what makes a block a root, which is a value
 *  somebody chose rather than a default nobody set. */
function trim<T extends object>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as T;
}

function ordered<T extends { id: Id }>(all: Record<Id, T>): Record<Id, T> {
  const out: Record<Id, T> = {};
  for (const id of Object.keys(all).sort()) out[id] = trim(all[id]!);
  return out;
}

/** The graph, laid out for reading: definitions first, then blocks, then relations. */
export function write(graph: Graph, id = "workspace"): string {
  const file: File = {
    schema: SCHEMA,
    id,
    graph: { root: graph.root, defs: ordered(graph.defs), blocks: ordered(graph.blocks),
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
  const defs: Record<Id, Graph["defs"][string]> = {};
  const want = [...Object.values(blocks).map((b) => b.type),
                ...Object.values(edges).map((e) => e.type)].filter(Boolean) as Id[];
  for (let i = 0; i < want.length; i++) {
    const d = graph.defs[want[i]!];
    if (!d || defs[d.id]) continue;
    defs[d.id] = d;
    if (d.extends) want.push(d.extends);
  }
  return write({ root, blocks, edges, defs }, root);
}

export type Read = { log: Log; faults: Fault[] };

/** Read a file in. It becomes a log holding a single checkpoint step, so there
 *  is no second reader and importing costs no new mechanism. */
export function read(text: string): Read {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { log: [], faults: [{ kind: "dropped", what: "a file that is not JSON" }] };
  }
  if (Array.isArray(raw)) return check(raw);

  const file = raw as Partial<File>;
  if (!file.graph || typeof file.graph !== "object") {
    return { log: [], faults: [{ kind: "dropped", what: "a file with no graph" }] };
  }
  if (typeof file.schema === "string" && major(file.schema) !== major(SCHEMA)) {
    return { log: [], faults: [{ kind: "dropped",
      what: `a file written for schema ${file.schema}` }] };
  }
  const graph: Graph = { ...empty_graph(), ...file.graph };
  const mend = inspect(graph);
  const log: Log = [{ id: new_id("step"), action: "import", at: 0, status: "applied",
                      mutations: [{ op: "checkpoint", graph }] }];
  if (mend.repairs.length) {
    log.push({ id: new_id("step"), action: "repair", at: 1, status: "applied",
               mutations: mend.repairs });
  }
  return { log, faults: mend.faults };
}

function major(v: string): string {
  return v.split(".")[0] ?? "";
}

/** The content hash is computed, never stored. A derived value written down
 *  lies the moment anybody edits the file by hand. */
export function hash(graph: Graph): string {
  const text = write(graph);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Past the cap the oldest steps fold into one checkpoint and are dropped. The
 *  graph is unchanged; what is spent is reach. */
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
