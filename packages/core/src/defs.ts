/** Definitions: chains, kinds, defaults, and what an element resolves through. */

import type { Settings } from "./components";
import { BASE_BLOCKS, BASE_RELATIONS, BLOCK_MODULES, type BlockModule, type Definition,
         type FieldDef, type Graph, type Id, type Package } from "./types";


/** A definition and the chain it extends, nearest first. **The workspace's own word about a
 *  package's definition stands in front of it**, wherever that definition turns up — so editing
 *  what `block` or `«part»` means reaches everything below it, not only what named nothing. The
 *  floor is a package like any other, and is overridden the same way. */
export function isa(graph: Graph, type: Id | undefined): Definition[] {
  const out: Definition[] = [];
  let at = type;
  const seen = new Set<Id>();
  while (at && !seen.has(at)) {
    seen.add(at);
    const d = graph.defs[at];
    if (!d) break;
    if (outside(d)) {
      const over = default_for(graph, d.id, d.group);
      const said = over ? graph.defs[over] : undefined;
      if (said && !seen.has(said.id)) { seen.add(said.id); out.push(said); }
    }
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

/** The shipped base a definition descends from, which is what its kind is. */
export function base_named(graph: Graph, type: Id | undefined,
                           group: "block" | "relation" = "block"): Id | undefined {
  for (const d of isa(graph, type)) if (shipped(d) && d.group === group) return d.id;
  /** A type naming a base directly, before that package is under it. */
  const bases = group === "relation" ? BASE_RELATIONS : BASE_BLOCKS;
  return type && bases.includes(type) ? type : undefined;
}

/** A block's base: what its own shape says, else what its chain descends from. */
export function base_of(graph: Graph, id: Id): Id {
  const b = graph.blocks[id];
  if (!b) return "block";
  if (b.of) return "reference";
  if (b.side !== undefined) return "interface";
  return base_named(graph, b.type) ?? "block";
}

/** What a relation descends from, read from its ends: `tie` where an end is a note. */
export function edge_base(graph: Graph, id: Id): Id {
  const e = graph.edges[id];
  return e ? derived_base(graph, e.from, e.to) : "line";
}

/** Which block module interprets this block. A module is engine code; a kind is a definition. */
export function module_of(graph: Graph, id: Id): BlockModule {
  const b = graph.blocks[id];
  if (!b) return "block";
  if (b.of) return "reference";
  if (b.side !== undefined) return "interface";
  return module_named(graph, b.type);
}

/** The module a definition refines: the nearest link in its chain that names one. */
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
  return !!graph.blocks[id] && base_of(graph, id) === "note";
}

/** What a relation between these ends descends from: a tie where an end is a note. */
export function derived_base(graph: Graph, from: Id, to: Id): Id {
  return is_note(graph, from) || is_note(graph, to) ? "tie" : "line";
}

/** What a block definition descends from, defaulting to the plain block. */
export function block_base(graph: Graph, type: Id | undefined): Id {
  return base_named(graph, type) ?? "block";
}

/** What a relation definition descends from, defaulting to a plain line. */
export function relation_base(graph: Graph, type: Id | undefined): Id {
  return base_named(graph, type, "relation") ?? "line";
}

/** The definition a thing resolves through. */
export function def_of(graph: Graph, id: Id): Id | undefined {
  /** A shipped base resolves to its kind's default. */
  const named = (type: Id | undefined) =>
    type && !(graph.defs[type] && shipped(graph.defs[type]!)) ? type : undefined;
  const b = graph.blocks[id];
  if (b) {
    const base = base_of(graph, id);
    return named(b.type) ?? default_for(graph, base) ?? (graph.defs[base] ? base : undefined);
  }
  const e = graph.edges[id];
  if (!e) return undefined;
  const base = edge_base(graph, id);
  return named(e.type) ?? default_for(graph, base, "relation")
    ?? (graph.defs[base] ? base : undefined);
}

/** What an element stores to name this definition. */
export function stored_type(graph: Graph, type: Id | undefined): Id | undefined {
  const d = type ? graph.defs[type] : undefined;
  if (!d || !(shipped(d) || d.default)) return type || undefined;
  if (d.group === "relation") return undefined;
  return plain_type(base_named(graph, type) ?? "block") ?? undefined;
}

/** What a plain block of this base stores as its type: nothing, or the base's own name. */
export function plain_type(base: Id): Id | null {
  return STRUCTURAL.includes(base) ? null : base;
}

/** Bases an element's own shape says, so a plain one names nothing. */
const STRUCTURAL: readonly Id[] = ["block", "reference", "interface"];

/** The workspace's own word about a package's definition: the one it wrote to override that one.
 *  Named `default` on the record because a word about a base is what a plain element follows. */
export function default_for(graph: Graph, base: Id,
                            group: "block" | "relation" = "block"): Id | undefined {
  for (const d of Object.values(graph.defs)) {
    if (d.default === base && !d.from && d.group === group) return d.id;
  }
  return undefined;
}

/** What a definition would stand in for if it were made the default: the nearest definition from
 *  outside the workspace at or above what it extends. Nothing, where its chain is all its own. */
export function stands_in_for(graph: Graph, id: Id): Id | undefined {
  const d = graph.defs[id];
  if (!d || outside(d)) return undefined;
  return isa(graph, d.extends).find(outside)?.id;
}

/** What the shipped floor calls itself. */
export const BASE_PACKAGE = "base";

/** Whether this definition is one the app ships rather than one anybody wrote. */
export function shipped(d: Definition): boolean {
  return d.from === BASE_PACKAGE
    || BASE_BLOCKS.includes(d.id)
    || BASE_RELATIONS.includes(d.id);
}

/** Whether a definition came from outside the workspace — a package's, and the shipped floor's
 *  with it. **Never written**: an edit to one mints the workspace's word about it instead. */
export function outside(d: Definition | undefined): boolean {
  return !!d && (!!d.from || shipped(d));
}

/** Whether a definition is the workspace's to write out: not shipped, and not an untouched default. */
export function touched(d: Definition): boolean {
  if (shipped(d)) return false;
  if (d.default === undefined) return true;
  return Object.keys(d).some((k) => !LAID.includes(k) && (d as Record<string, unknown>)[k] !== undefined);
}

/** The keys a definition is laid with, which alone are not worth writing. **`default` is not one
 *  of them**: it is a choice somebody made, so it travels even where nothing else was said. */
const LAID = ["id", "group", "name", "extends"];

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

/** Pinned definitions in pin order — of one group, or of both where none is named. */
export function pinned_defs(graph: Graph, group?: "block" | "relation"): Definition[] {
  const ws = graph.blocks[graph.root];
  return (ws?.pinned ?? [])
    .map((id) => graph.defs[id])
    .filter((d): d is Definition => !!d && (!group || d.group === group));
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

/** A package by id, or by the name somebody calls it. */
export function package_of(graph: Graph, id: Id | undefined): Package | undefined {
  if (!id) return undefined;
  return graph.packages[id] ?? package_named(graph, id);
}

/** A package by what it is called. Names are unique within a workspace. */
export function package_named(graph: Graph, name: string): Package | undefined {
  const want = name.trim();
  return want ? Object.values(graph.packages).find((p) => p.name === want) : undefined;
}

/** Every package the workspace draws on, named, with all it brought — of either group. **The
 *  shipped floor is one of them**: every workspace stands on `base`, and hiding it only made the
 *  list lie about where the kinds came from. */
export function packages(graph: Graph): { from: Id; name: string; defs: Definition[] }[] {
  const groups = new Map<Id, Definition[]>();
  for (const d of Object.values(graph.defs)) {
    if (!d.from) continue;
    groups.set(d.from, [...(groups.get(d.from) ?? []), d]);
  }
  return [...groups.entries()]
    .map(([from, defs]) => ({ from, name: graph.packages[from]?.name ?? from,
                              defs: defs.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The bases a block moves among freely; every other base is fixed when it is made. */
const OPEN: readonly Id[] = ["block", "folder", "note"];

/** Whether this block may be told to name that definition. */
export function may_retype(graph: Graph, id: Id, type: Id | undefined): boolean {
  /** A block never names a relation definition. */
  if (type && graph.defs[type]?.group === "relation") return false;
  const from = base_of(graph, id);
  const to = block_base(graph, type);
  return from === to || (OPEN.includes(from) && OPEN.includes(to));
}
