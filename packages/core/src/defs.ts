/** Definitions: blocks carrying `def`. Chains, bases, packages, and what an element resolves
 *  through. */

import type { Settings } from "./components";
import { BASE_BLOCKS, BASE_PACKAGE, BASE_RELATIONS, BLOCK_MODULES, type Block, type BlockModule,
         type Definition, type FieldDef, type Graph, type Id } from "./types";

/** A definition's domain: what its usages are. Read off its base, never stored. */
export type Domain = "block" | "relation";


/** The definition with this id, where a block is one. */
export function def_at(graph: Graph, id: Id | undefined): Definition | undefined {
  const b = id ? graph.blocks[id] : undefined;
  return b?.def ? (b as Definition) : undefined;
}

/** Every definition in the graph, every package's. */
export function all_defs(graph: Graph): Definition[] {
  return Object.values(graph.blocks).filter((b): b is Definition => !!b.def);
}

/** A definition and the chain it extends, nearest first. */
export function isa(graph: Graph, type: Id | undefined): Definition[] {
  const out: Definition[] = [];
  const seen = new Set<Id>();
  for (let d = def_at(graph, type); d && !seen.has(d.id); d = def_at(graph, d.type)) {
    seen.add(d.id);
    out.push(d);
  }
  return out;
}

/** What one component reads for a usage of this definition: the chain, base first. */
export function config_of(graph: Graph, type: Id | undefined, key: string): Settings {
  const out: Settings = {};
  for (const d of isa(graph, type).reverse()) Object.assign(out, d.settings?.[key]);
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
    for (const f of d.def.schema ?? []) {
      const at = out.findIndex((x) => x.name === f.name);
      if (at < 0) out.push({ ...f, from: d.id });
      else out[at] = { ...f, from: d.id };
    }
  }
  return out;
}

/** Whether an id names a base: a definition the kit ships with nothing above it. */
export function is_base(id: Id | undefined): boolean {
  return !!id && (BASE_BLOCKS.includes(id) || BASE_RELATIONS.includes(id));
}

/** The base a definition descends from, which is what its kind is. A type naming a base directly
 *  answers before the base package is laid. */
export function base_named(graph: Graph, type: Id | undefined): Id | undefined {
  const hit = isa(graph, type).find((d) => is_base(d.id))?.id;
  return hit ?? (is_base(type) ? type : undefined);
}

/** A definition's domain: a relation where it descends from `line` or `tie`. */
export function domain_of(graph: Graph, type: Id | undefined): Domain {
  return BASE_RELATIONS.includes(base_named(graph, type) ?? "") ? "relation" : "block";
}

/** A block's base: what its own shape says, else what its chain descends from. A definition's
 *  chain starts at itself. */
export function base_of(graph: Graph, id: Id): Id {
  const b = graph.blocks[id];
  if (!b) return "block";
  if (b.of) return "reference";
  if (b.side !== undefined) return "interface";
  return base_named(graph, b.def ? b.id : b.type) ?? "block";
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
  return module_named(graph, b.def ? b.id : b.type);
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
  const base = base_named(graph, type);
  return base && !BASE_RELATIONS.includes(base) ? base : "block";
}

/** What a relation definition descends from, defaulting to a plain line. */
export function relation_base(graph: Graph, type: Id | undefined): Id {
  const base = base_named(graph, type);
  return base && BASE_RELATIONS.includes(base) ? base : "line";
}

/** The definition an element resolves through: a definition itself, a usage its type, else the
 *  base its shape says. */
export function def_of(graph: Graph, id: Id): Id | undefined {
  const b = graph.blocks[id];
  if (b) {
    if (b.def) return b.id;
    if (b.type && def_at(graph, b.type)) return b.type;
    const base = base_of(graph, id);
    return def_at(graph, base) ? base : undefined;
  }
  const e = graph.edges[id];
  if (!e) return undefined;
  if (e.type && def_at(graph, e.type)) return e.type;
  const base = edge_base(graph, id);
  return def_at(graph, base) ? base : undefined;
}

/** What an element stores to name this definition: a structural base stores as nothing. */
export function stored_type(graph: Graph, type: Id | undefined): Id | undefined {
  if (!type) return undefined;
  if (!is_base(type)) return type;
  if (BASE_RELATIONS.includes(type)) return undefined;
  return plain_type(base_named(graph, type) ?? "block") ?? undefined;
}

/** What a plain block of this base stores as its type: nothing, or the base's own name. */
export function plain_type(base: Id): Id | null {
  return STRUCTURAL.includes(base) ? null : base;
}

/** Bases an element's own shape says, so a plain one names nothing. */
const STRUCTURAL: readonly Id[] = ["block", "reference", "interface"];

/** The package root a block sits under. */
export function package_of(graph: Graph, id: Id): Id {
  let at = id;
  const seen = new Set<Id>();
  while (!seen.has(at)) {
    seen.add(at);
    const up = graph.blocks[at]?.parent;
    if (!up) return at;
    at = up;
  }
  return at;
}

/** Whether a block is read only: under any package but the workspace's. */
export function frozen(graph: Graph, id: Id): boolean {
  return !!graph.blocks[id] && package_of(graph, id) !== graph.root;
}

/** Whether this definition is one the kit ships. */
export function shipped(graph: Graph, id: Id): boolean {
  return !!graph.blocks[id] && package_of(graph, id) === BASE_PACKAGE;
}

/** Every relation definition except the bases. */
export function relations(graph: Graph): Definition[] {
  return all_defs(graph)
    .filter((d) => domain_of(graph, d.id) === "relation" && !is_base(d.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** A definition by what it is called: the workspace's own first. Tags name in their own
 *  namespace (`tag_named`), so a tag and a block definition may share a name. */
export function def_named(graph: Graph, name: string, domain?: Domain): Definition | undefined {
  const want = name.trim();
  if (!want) return undefined;
  const hits = all_defs(graph).filter((d) => d.name === want
    && (!domain || domain_of(graph, d.id) === domain) && block_base(graph, d.id) !== "tag");
  return hits.find((d) => !frozen(graph, d.id)) ?? hits[0];
}

/** Pinned definitions in pin order — of one domain, or of both where none is named. */
export function pinned_defs(graph: Graph, domain?: Domain): Definition[] {
  return (graph.blocks[graph.root]?.pinned ?? [])
    .map((id) => def_at(graph, id))
    .filter((d): d is Definition => !!d && (!domain || domain_of(graph, d.id) === domain));
}

/** Every package root, the workspace's last. */
export function packages(graph: Graph): Block[] {
  return Object.values(graph.blocks).filter((b) => b.parent === null)
    .sort((a, z) => Number(a.id === graph.root) - Number(z.id === graph.root)
      || (a.name ?? a.id).localeCompare(z.name ?? z.id));
}

/** A package root by id, or by the name somebody calls it. */
export function package_named(graph: Graph, said: string | undefined): Block | undefined {
  const want = said?.trim();
  if (!want) return undefined;
  const roots = packages(graph);
  return roots.find((p) => p.id === want) ?? roots.find((p) => p.name === want);
}

/** The packages that depend on this one, by root. */
export function dependents(graph: Graph, pkg: Id): Block[] {
  return packages(graph).filter((p) => p.uses?.includes(pkg));
}

/** The bases a block moves among freely; every other base is fixed when it is made. A group or a
 *  grid is a plain block that holds, so it is retyped as freely — what it held waits, dormant. */
const OPEN: readonly Id[] = ["block", "folder", "note", "group", "grid"];

/** Whether this block may be told to name that definition. */
export function may_retype(graph: Graph, id: Id, type: Id | undefined): boolean {
  /** A block never names a relation definition. */
  if (type && domain_of(graph, type) === "relation") return false;
  const from = base_of(graph, id);
  const to = block_base(graph, type);
  return from === to || (OPEN.includes(from) && OPEN.includes(to));
}
