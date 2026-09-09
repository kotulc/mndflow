/** The envelope, and the canonical layout.
 *
 *  A file is the graph; the log is a working copy. A file exists to be read,
 *  compared and kept, so it is the size of the model rather than the size of
 *  the effort. Importing one is a checkpoint, so there is no second format and
 *  no second reader.
 *
 *  Exporting changes nothing, so re-exporting an unchanged workspace is
 *  byte-identical — which is what the canonical layout is for. */

import { inspect, type Fault } from "./door";
import { def_of, fold, subtree } from "./fold";
import { new_id } from "./ids";
import { empty_graph, SCHEMA, type File, type Graph, type Id, type Log, type Step }
  from "./types";

/** Nothing still at its default is written — a file the size of the choices in it.
 *
 *  `null` stays: `parent: null` is what makes a block a root, which is a value
 *  somebody chose rather than a default nobody set. */
function trim<T extends object>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o).sort(by_key)) {
    if (v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as T;
}

/** **What a record says about itself, before what it holds.** Key order was
 *  whatever order the graph happened to be built in, so one graph reached two
 *  ways — pinned and unpinned, say — wrote the same model as different bytes.
 *  Alphabetical alone would open every block with its fields, which is the one
 *  thing a reader scanning a file does not want first. */
const FIRST = ["id", "parent", "label", "name", "home", "from", "group", "module",
               "type", "extends", "default", "of", "side", "dir"];

const by_key = ([a]: [string, unknown], [b]: [string, unknown]): number => {
  const x = FIRST.indexOf(a), y = FIRST.indexOf(b);
  return (x < 0 ? FIRST.length : x) - (y < 0 ? FIRST.length : y) || a.localeCompare(b);
};

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

/** A subtree plus every definition it reaches, and everything those extend.
 *
 *  **Collected through `def_of`, never off the field.** A block naming nothing
 *  still resolves to a definition — its base kind, or the workspace's override
 *  of it — so reading `b.type` contributed `undefined` and dropped `ws.block`
 *  out of the export, which is exactly the definition making every plain block
 *  in the project look the way it does. A whole-workspace export writes all of
 *  `graph.defs` and was never affected. */
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
  const want = [...Object.keys(blocks).map((id) => def_of(graph, id)),
                ...Object.keys(edges).map((id) => def_of(graph, id))].filter(Boolean) as Id[];
  for (let i = 0; i < want.length; i++) {
    const d = graph.defs[want[i]!];
    if (!d || defs[d.id]) continue;
    defs[d.id] = d;
    if (d.extends) want.push(d.extends);
  }
  return write({ root, blocks, edges, defs }, root);
}

export type Parsed = { graph: Graph | null; faults: Fault[] };

/** The envelope, opened and no more. **Parsed, never checked** — what makes a
 *  graph readable depends on what it is joining, so a package that extends the
 *  workspace's own definitions is whole once it is there and broken on its own.
 *  Every caller runs the door; this is what they run it over. */
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

/** Read a file in, as the log a session works in — a single checkpoint step,
 *  so importing costs no new mechanism.
 *
 *  **A log is not a file.** What a file holds is state, and nothing may hand
 *  the engine a history it did not write itself. `open` is the same journey
 *  stopping one step later, and is the one offered outward. */
export function read(text: string, floor: Graph["defs"] = {}): Read {
  const got = parse(text);
  if (!got.graph) return { log: [], faults: got.faults };

  const graph = got.graph;
  /** **Inspected over the floor, not over the file.** A file need not carry the
   *  shipped package to be whole — the floor is laid under every fold — so
   *  checking the bare graph reported every base kind as missing. */
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

/** A file in, as a graph. **The reader anything outside the engine gets.**
 *
 *  State arrives, the door validates it, what can be repaired is, and a graph
 *  comes back — no log, no steps, and nothing that has to agree with this
 *  engine's history to be understood. An unreadable file is the empty graph
 *  and a fault saying why. */
export function open(text: string, floor: Graph["defs"] = {}): Opened {
  const got = read(text, floor);
  return { graph: fold(got.log, floor), faults: got.faults };
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
