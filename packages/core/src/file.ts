/** The envelope, and the canonical layout. */

import { inspect, type Fault } from "./door";
import { package_of, packages, uses_of } from "./defs";
import { fold, type Floor } from "./fold";
import { new_id } from "./ids";
import { is_tag } from "./library";
import { empty_graph, BASE_PACKAGE, SCHEMA, type Block, type File, type Graph, type Id, type Log,
         type Relation, type Step } from "./types";

/** Nothing still at its default is written — a file the size of the choices in it. An empty
 *  `tags` or `traits` is a choice: it says none over what its chain carries. */
function trim<T extends object>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o).sort(by_key)) {
    if (v === undefined) continue;
    if (Array.isArray(v) && v.length === 0 && !STATED.includes(k)) continue;
    out[k] = v;
  }
  return out as T;
}

/** Lists whose being said is itself a choice, even empty. */
const STATED = ["tags", "traits"];

/** Keys a record writes first; the rest follow alphabetically. */
const FIRST = ["id", "parent", "name", "type", "def", "of", "side"];

const by_key = ([a]: [string, unknown], [b]: [string, unknown]): number => {
  const x = FIRST.indexOf(a), y = FIRST.indexOf(b);
  return (x < 0 ? FIRST.length : x) - (y < 0 ? FIRST.length : y) || a.localeCompare(b);
};

function ordered<T extends { id: Id }>(all: Record<Id, T>, keep = (_: T) => true): Record<Id, T> {
  const out: Record<Id, T> = {};
  for (const id of Object.keys(all).sort()) if (keep(all[id]!)) out[id] = trim(all[id]!);
  return out;
}

/** What an export of this workspace is called, without its extension: **the name somebody gave
 *  it**, so renaming the workspace renames the file it writes. Falls back to the word a fresh one
 *  wears, and drops what a filename may not carry. */
export function file_name(graph: Graph): string {
  const said = (graph.blocks[graph.root]?.name ?? "").replace(/[\\/:*?"<>|]/g, " ");
  return said.replace(/\s+/g, " ").trim() || "workspace";
}

/** The packages a package needs to open, every one it reaches through what it uses. */
function closure(graph: Graph, pkg: Id): Id[] {
  const out = [pkg];
  for (let n = 0; n < out.length; n++) {
    for (const next of uses_of(graph, out[n]!)) if (!out.includes(next)) out.push(next);
  }
  return out;
}

/** A package as a file, laid out for reading: the package, and every package it uses but `base`,
 *  which ships with every build — **so a file is whole**. The workspace carries every package
 *  brought in beside it, used yet or not. `base` is written only as itself. */
export function write(graph: Graph, id = "workspace", pkg: Id = graph.root): string {
  const reached = pkg === graph.root ? packages(graph).map((p) => p.id) : closure(graph, pkg);
  const kept = new Set(reached.filter((p) => p !== BASE_PACKAGE || p === pkg));
  const inside = (b: Id) => kept.has(package_of(graph, b));
  const file: File = {
    schema: SCHEMA,
    id,
    graph: { root: pkg,
             blocks: ordered(graph.blocks, (b) => inside(b.id)),
             edges: ordered(graph.edges, (e) => inside(e.from) && inside(e.to)) },
  };
  return JSON.stringify(file, null, 2) + "\n";
}

/** What a graph names that it does not carry: definitions and tags. A reference to something
 *  gone is kept and reads missing, so `of` is not asked. */
export function unmet(graph: Graph): Id[] {
  const out = new Set<Id>();
  const need = (id: Id | undefined) => { if (id && !graph.blocks[id]) out.add(id); };
  const tagged = (ids: Id[] | undefined) => {
    for (const t of ids ?? []) if (!is_tag(graph, t)) out.add(t);
  };
  for (const b of Object.values(graph.blocks)) {
    need(b.type);
    tagged(b.tags);
  }
  for (const e of Object.values(graph.edges)) {
    need(e.type);
    tagged(e.tags);
  }
  return [...out].sort();
}

/** The workspace written as a package called `name`: its root renamed to the name's slug and every
 *  id under it prefixed with it, so it opens beside any workspace without a clash. */
export function write_package(graph: Graph, name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "package";
  const ids = new Map<Id, Id>();
  for (const b of Object.values(graph.blocks)) {
    if (package_of(graph, b.id) !== graph.root) continue;
    ids.set(b.id, b.id === graph.root ? slug : `${slug}.${b.id}`);
  }
  /** The workspace's named components are prefixed as its blocks are. */
  const lib = graph.blocks[graph.root]?.library;
  for (const c of [...lib?.types ?? [], ...lib?.tags ?? []]) ids.set(c.id, `${slug}.${c.id}`);
  const blocks: Graph["blocks"] = { ...graph.blocks };
  for (const [was, now] of ids) {
    const b = graph.blocks[was];
    if (!b) continue;
    delete blocks[was];
    blocks[now] = { ...renamed(b, ids), id: now, ...(b.id === graph.root ? { name } : {}) };
    delete blocks[now]!.counters;
  }
  const edges: Graph["edges"] = {};
  for (const e of Object.values(graph.edges)) {
    const id = ids.has(e.from) || ids.has(e.to) ? `${slug}.${e.id}` : e.id;
    edges[id] = { ...renamed(e, ids), id };
  }
  return write({ root: slug, blocks, edges }, slug, slug);
}

/** A block or a relation with every id it names read through `ids`, its own apart. */
export function renamed<T extends Block | Relation>(it: T, ids: ReadonlyMap<Id, Id>): T {
  const at = (id: Id | undefined) => (id === undefined ? id : ids.get(id) ?? id);
  const all = (list: Id[] | undefined) => list?.map((id) => at(id)!);
  const out: Block & Relation = { ...it } as Block & Relation;
  for (const key of ["parent", "type", "of", "from", "to", "fromPart", "toPart"] as const) {
    if (out[key]) out[key] = at(out[key] as Id)!;
  }
  if (out.tags) out.tags = all(out.tags);
  if (out.def) {
    out.def = { ...out.def,
      ...(out.def.attributes ? { attributes: out.def.attributes
        .map((a) => (a.type ? { ...a, type: at(a.type) } : a)) } : {}) };
  }
  if (out.library) {
    out.library = { ...(out.library.types ? { types: out.library.types
                      .map((t) => ({ ...t, id: at(t.id)! })) } : {}),
                    ...(out.library.tags ? { tags: out.library.tags
                      .map((t) => ({ ...t, id: at(t.id)! })) } : {}) };
  }
  return out as T;
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
  const graph = file.graph as Partial<Graph>;
  return { graph: { root: graph.root ?? empty_graph().root, blocks: graph.blocks ?? {},
                    edges: graph.edges ?? {} }, faults: [] };
}

export type Read = { log: Log; faults: Fault[] };

/** A file in, as a one-checkpoint log. **A file naming a definition it does not carry is
 *  refused**: a workspace travels with the packages it uses. */
export function read(text: string, floor: Floor = []): Read {
  const got = parse(text);
  if (!got.graph) return { log: [], faults: got.faults };

  const graph = got.graph;
  const missing = unmet(fold([{ id: "read", action: "import", at: 0, status: "applied",
                                mutations: [{ op: "checkpoint", graph }] }], floor));
  if (missing.length) {
    return { log: [], faults: [{ kind: "dropped",
      what: `a file naming what it does not carry: ${missing.slice(0, 3).join(", ")}` }] };
  }
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
export function open(text: string, floor: Floor = []): Opened {
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
