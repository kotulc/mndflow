/** Definitions: chains, kinds, defaults, and what an element resolves through. */

import type { Settings } from "./components";
import { BLOCK_MODULES, RELATION_MODULES, type BlockModule, type Definition, type FieldDef,
         type Graph, type Id, type RelationModule } from "./types";


/** A definition and the chain it extends, nearest first. */
export function isa(graph: Graph, type: Id | undefined): Definition[] {
  const out: Definition[] = [];
  let at = type;
  const seen = new Set<Id>();
  while (at && !seen.has(at)) {
    seen.add(at);
    const d = graph.defs[at];
    if (!d) break;
    out.push(d);
    at = d.extends;
  }
  return out;
}

/** What one component reads for a usage of this definition: the chain, base first. */
export function config_of(graph: Graph, type: Id | undefined, key: string): Settings {
  const out: Settings = {};
  for (const d of isa(graph, type).reverse()) Object.assign(out, d.components?.[key]);
  return out;
}

/** A field list put in the order these names give. */
export function ordered_by<T extends { name: string }>(fields: readonly T[],
                                                         names: readonly string[]): T[] {
  const named = names.map((n) => fields.find((f) => f.name === n)).filter((f): f is T => !!f);
  return [...named, ...fields.filter((f) => !names.includes(f.name))];
}

/** A definition's field schema down its chain, nearer fields replacing farther ones. */
export function schema_of(graph: Graph, type: Id | undefined): (FieldDef & { from: Id })[] {
  const out: (FieldDef & { from: Id })[] = [];
  for (const d of isa(graph, type).reverse()) {
    for (const f of d.fields ?? []) {
      const at = out.findIndex((x) => x.name === f.name);
      if (at < 0) out.push({ ...f, from: d.id });
      else out[at] = { ...f, from: d.id };
    }
  }
  return out;
}

/** Which block module interprets this block. */
export function module_of(graph: Graph, id: Id): BlockModule {
  const b = graph.blocks[id];
  if (!b) return "block";
  if (b.of) return "reference";
  if (b.side !== undefined) return "interface";
  return module_named(graph, b.type);
}

/** The kind a definition belongs to: the nearest link in its chain that says what kind it is. */
export function module_named(graph: Graph, type: Id | undefined): BlockModule {
  const named = config_of(graph, type, "block")["module"];
  if (typeof named === "string" && BLOCK_MODULES.includes(named as BlockModule)) {
    return named as BlockModule;
  }
  /** The type field can name the module directly. */
  if (type && BLOCK_MODULES.includes(type as BlockModule)) return type as BlockModule;
  return "block";
}

/** Whether a block is a note. */
export function is_note(graph: Graph, id: Id): boolean {
  return !!graph.blocks[id] && module_of(graph, id) === "note";
}

/** What a relation between these ends is: a tie where an end is a note, a line otherwise. */
export function derived_module(graph: Graph, from: Id, to: Id): RelationModule {
  return is_note(graph, from) || is_note(graph, to) ? "tie" : "line";
}

/** What a relation is, read from its ends. */
export function edge_module(graph: Graph, id: Id): RelationModule {
  const e = graph.edges[id];
  return e ? derived_module(graph, e.from, e.to) : "line";
}

/** The relation module a definition refines, down its chain. */
export function relation_named(graph: Graph, type: Id | undefined): RelationModule {
  const named = config_of(graph, type, "relation")["module"];
  return RELATION_MODULES.includes(named as RelationModule) ? named as RelationModule : "line";
}

/** The definition a thing resolves through. */
export function def_of(graph: Graph, id: Id): Id | undefined {
  /** A shipped base resolves to its kind's default. */
  const named = (type: Id | undefined) =>
    type && !(graph.defs[type] && shipped(graph.defs[type]!)) ? type : undefined;
  const b = graph.blocks[id];
  if (b) {
    const kind = module_of(graph, id);
    return named(b.type) ?? default_for(graph, kind) ?? (graph.defs[kind] ? kind : undefined);
  }
  const e = graph.edges[id];
  if (!e) return undefined;
  const kind = edge_module(graph, id);
  return named(e.type) ?? default_for(graph, kind, "relation")
    ?? (graph.defs[kind] ? kind : undefined);
}

/** What an element stores to name this definition. */
export function stored_type(graph: Graph, type: Id | undefined): Id | undefined {
  const d = type ? graph.defs[type] : undefined;
  if (!d || !(shipped(d) || d.default)) return type || undefined;
  if (d.group === "relation") return undefined;
  return plain_type(module_named(graph, type)) ?? undefined;
}

/** What a plain block of this kind stores as its type: nothing, or the kind. */
export function plain_type(kind: BlockModule): Id | null {
  return STRUCTURAL.includes(kind) ? null : kind;
}

/** Kinds an element's own shape says, so a plain one names nothing. */
const STRUCTURAL: readonly BlockModule[] = ["block", "reference", "interface"];

/** The workspace's default for a base kind: the one editable definition its plain elements follow. */
export function default_for(graph: Graph, kind: BlockModule | RelationModule,
                            group: "block" | "relation" = "block"): Id | undefined {
  for (const d of Object.values(graph.defs)) {
    if (d.default === kind && !d.from && d.group === group) return d.id;
  }
  return undefined;
}

/** The relation definitions the base ships: one per relation module. */
export const BASE_RELATIONS: readonly string[] = ["line", "tie"];

/** What the shipped floor calls itself. */
export const BASE_PACKAGE = "base";

/** Whether this definition is one the app ships rather than one anybody wrote. */
export function shipped(d: Definition): boolean {
  return d.from === BASE_PACKAGE
    || (BLOCK_MODULES as readonly string[]).includes(d.id)
    || BASE_RELATIONS.includes(d.id);
}

/** Whether a definition is the workspace's to write out: not shipped, and not an untouched default. */
export function touched(d: Definition): boolean {
  if (shipped(d)) return false;
  if (d.default === undefined) return true;
  return Object.keys(d).some((k) => !LAID.includes(k) && (d as Record<string, unknown>)[k] !== undefined);
}

/** The keys a default is laid with. */
const LAID = ["id", "group", "name", "extends", "default"];

/** One package's block definitions, as the vocabulary section lists them. */
export type Vocabulary = {
  /** The package these came from. Null is the workspace's own. */
  from: string | null;
  defs: Definition[];
};

/** Every relation definition except the shipped floor. */
export function relations(graph: Graph): Definition[] {
  return Object.values(graph.defs)
    .filter((d) => d.group === "relation" && !shipped(d))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** A definition by what it is called. */
export function def_named(graph: Graph, name: string, group?: "block" | "relation"): Definition | undefined {
  const want = name.trim();
  if (!want) return undefined;
  /** The workspace's own first: one may share a name with a shipped kind. */
  const hits = Object.values(graph.defs)
    .filter((d) => d.name === want && (!group || d.group === group));
  return hits.find((d) => !d.from) ?? hits[0];
}

/** Pinned definitions of one group, in pin order. */
export function pinned_defs(graph: Graph, group: "block" | "relation"): Definition[] {
  const ws = graph.blocks[graph.root];
  return (ws?.pinned ?? [])
    .map((id) => graph.defs[id])
    .filter((d): d is Definition => !!d && d.group === group);
}

/** Block definitions grouped by package, the workspace's own first. */
export function vocabulary(graph: Graph): Vocabulary[] {
  const groups = new Map<string | null, Definition[]>();
  for (const d of Object.values(graph.defs)) {
    if (d.group !== "block") continue;
    const held = groups.get(d.from ?? null) ?? [];
    held.push(d);
    groups.set(d.from ?? null, held);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === null ? -1 : b === null ? 1 : a.localeCompare(b)))
    .map(([from, defs]) => ({ from,
                              defs: defs.sort((a, b) => a.name.localeCompare(b.name)) }));
}

/** Every package the workspace draws on, named, with all it brought — of either group. The
 *  shipped floor is nobody's package. */
export function packages(graph: Graph): { from: string; defs: Definition[] }[] {
  const groups = new Map<string, Definition[]>();
  for (const d of Object.values(graph.defs)) {
    if (!d.from || shipped(d)) continue;
    groups.set(d.from, [...(groups.get(d.from) ?? []), d]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([from, defs]) => ({ from, defs: defs.sort((a, b) => a.name.localeCompare(b.name)) }));
}

/** Whether this block may be told to name that definition. */
export function may_retype(graph: Graph, id: Id, type: Id | undefined): boolean {
  return module_of(graph, id) === module_named(graph, type);
}
