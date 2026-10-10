/** Definitions: blocks carrying `def`. Chains, bases, packages, and what an element resolves
 *  through. */

import { FORMS, type Settings } from "./components";
import { organizes } from "./holders";
import { BASE_BLOCKS, BASE_PACKAGE, BASE_RELATIONS, BLOCK_MODULES, DIRS, type Block,
         type BlockModule, type Attribute, type Components, type Definition, type Dir, type Graph,
         type Id } from "./types";

/** A definition's domain: what its usages are. Read off its base, never stored. */
export type Domain = "block" | "relation";

/** How a value is edited. */
export type Form = (typeof FORMS)[number];


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

/** A definition's chain, nearest first, ending at a base: one extending nothing extends the base
 *  its kind names, so it reads as that kind does. */
export function chain_of(graph: Graph, def: Id | undefined): Definition[] {
  const chain = isa(graph, def);
  const last = chain[chain.length - 1];
  const base = last && !is_base(last.id) ? def_at(graph, block_base(graph, def)) : undefined;
  return base ? [...chain, base] : chain;
}

/** The kinds of tag under `tag`: a trait gives settings, a label names a line. Each is a tag by its
 *  chain, as an interface is an interface by its. */
export const TRAIT = "trait";
export const LABEL = "label";

/** What one link of a chain says: the element itself, or a definition along it. */
type Link = { id: Id; settings?: Components; tags?: string[] };

/** A tag an element carries, and the link of its chain that adds it. */
export type Carried = { id: Id; from: Id };

/** One entry of a `tags` list read: `-id` drops the tag the chain carries. */
export function entry(said: string): { id: Id; drop: boolean } {
  return said.startsWith("-") ? { id: said.slice(1), drop: true } : { id: said, drop: false };
}

/** A `tags` entry with its tag's id mapped, a drop kept a drop. */
export function remap(said: string, at: (id: Id) => Id): string {
  const { id, drop } = entry(said);
  return `${drop ? "-" : ""}${at(id)}`;
}

/** Whether a definition is a trait: a tag giving settings, by its chain. */
export function is_trait(graph: Graph, def: Id | undefined): boolean {
  return !!def && def !== TRAIT && isa(graph, def).some((d) => d.id === TRAIT);
}

/** Whether a definition is a label: a tag naming lines, by its chain. */
export function is_label(graph: Graph, def: Id | undefined): boolean {
  return !!def && def !== LABEL && isa(graph, def).some((d) => d.id === LABEL);
}

/** The links an element reads through, nearest first: a definition's chain starts at itself; a
 *  usage's and a line's at themselves, then their definition's. */
function links_of(graph: Graph, id: Id | undefined): Link[] {
  const it = id ? graph.blocks[id] ?? graph.edges[id] : undefined;
  if (!it) return [];
  if ("def" in it && it.def) return chain_of(graph, it.id);
  return [it, ...chain_of(graph, def_of(graph, it.id))];
}

/** What an element carries — tags, traits and labels — **added up down its chain**: each link adds
 *  its own, nearest first, unless a nearer link dropped it (`-id`). Each tag once, from the nearest
 *  link adding it. */
export function carried_tags(graph: Graph, id: Id | undefined): Carried[] {
  const out: Carried[] = [];
  const dropped = new Set<Id>();
  for (const link of links_of(graph, id)) {
    const said = (link.tags ?? []).map(entry);
    for (const t of said) {
      if (!t.drop && !dropped.has(t.id) && !out.some((c) => c.id === t.id)) {
        out.push({ id: t.id, from: link.id });
      }
    }
    for (const t of said) if (t.drop) dropped.add(t.id);
  }
  return out;
}

/** The traits an element carries, nearest first. */
export function traits_of(graph: Graph, id: Id | undefined): Id[] {
  return carried_tags(graph, id).map((c) => c.id).filter((t) => is_trait(graph, t));
}

/** What a trait gives: its own settings and those of the traits it extends, never its kind's. */
function conferred(graph: Graph, trait: Id): Components[] {
  const out: Components[] = [];
  for (const d of isa(graph, trait)) {
    if (d.id === TRAIT || is_base(d.id)) break;
    if (d.settings) out.push(d.settings);
  }
  return out;
}

/** What states settings over an element, nearest first: per link, its own word, then the traits
 *  that link adds. **Nearest wins.** */
export function stated(graph: Graph, id: Id | undefined): Components[] {
  const traits = carried_tags(graph, id).filter((c) => is_trait(graph, c.id));
  const out: Components[] = [];
  for (const link of links_of(graph, id)) {
    if (link.settings) out.push(link.settings);
    for (const t of traits) if (t.from === link.id) out.push(...conferred(graph, t.id));
  }
  return out;
}

/** What one component reads for an element or a definition: every statement over it merged per
 *  property, nearest first. */
export function setting_of(graph: Graph, id: Id | undefined, key: string): Settings {
  const out: Settings = {};
  for (const c of stated(graph, id).reverse()) Object.assign(out, c[key]);
  return out;
}

/** What one component reads for a usage of this definition: its chain and traits, base first. */
export function config_of(graph: Graph, type: Id | undefined, key: string): Settings {
  return def_at(graph, type) ? setting_of(graph, type, key) : {};
}

/** A field list put in the order these names give. */
export function ordered_by<T extends { name: string }>(fields: readonly T[],
                                                         names: readonly string[]): T[] {
  const named = names.map((n) => fields.find((f) => f.name === n)).filter((f): f is T => !!f);
  return [...named, ...fields.filter((f) => !names.includes(f.name))];
}

/** A definition's attributes down its chain, nearer ones replacing farther ones by name. */
export function attributes_of(graph: Graph, type: Id | undefined): (Attribute & { from: Id })[] {
  const out: (Attribute & { from: Id })[] = [];
  for (const d of isa(graph, type).reverse()) {
    for (const a of d.def.attributes ?? []) {
      const at = out.findIndex((x) => x.name === a.name);
      if (at < 0) out.push({ ...a, from: d.id });
      else out[at] = { ...a, from: d.id };
    }
  }
  return out;
}

/** Whether a definition is a value type: what an attribute holds, never placed. */
export function is_value_type(graph: Graph, id: Id | undefined): boolean {
  return !!def_at(graph, id) && base_named(graph, id) === "value";
}

/** How a value of this type is edited: its value type's form, a link where the type is a block
 *  definition — a foreign key — and text where it names nothing. */
export function form_of(graph: Graph, type: Id | undefined): Form {
  if (!def_at(graph, type)) return "text";
  if (!is_value_type(graph, type)) return "link";
  const said = setting_of(graph, type, "value")["form"];
  return FORMS.includes(said as Form) ? said as Form : "text";
}

/** Whether an attribute links to a block definition: a foreign key. */
export function links_to(graph: Graph, attribute: Attribute): Id | null {
  return def_at(graph, attribute.type) && !is_value_type(graph, attribute.type)
    && domain_of(graph, attribute.type) === "block" ? attribute.type! : null;
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

/** Whether a definition may change kind — block to relation, or back — by what it extends:
 *  nothing is typed by it, extends it or sits in it, so nothing it shaped would break. */
export function kind_free(graph: Graph, id: Id): boolean {
  return !Object.values(graph.blocks).some((b) => b.type === id || b.parent === id)
    && !Object.values(graph.edges).some((e) => e.type === id);
}

/** A block's base: what its own shape says, else what its chain descends from. A definition's
 *  chain starts at itself. */
export function base_of(graph: Graph, id: Id): Id {
  const b = graph.blocks[id];
  if (!b) return "block";
  if (b.of) return "reference";
  return base_named(graph, b.def ? b.id : b.type) ?? "block";
}

/** Which way a line points, or a relation definition's lines: `line.dir` down its chain, none
 *  where nothing says. */
export function dir_of(graph: Graph, id: Id): Dir {
  const said = setting_of(graph, id, "line")["dir"];
  return (DIRS as readonly unknown[]).includes(said) ? said as Dir : "none";
}

/** What a relation descends from: its type's base, a plain `line` where it names none. */
export function edge_base(graph: Graph, id: Id): Id {
  return relation_base(graph, graph.edges[id]?.type);
}

/** Which block module interprets this block. A module is engine code; a kind is a definition. */
export function module_of(graph: Graph, id: Id): BlockModule {
  const b = graph.blocks[id];
  if (!b) return "block";
  if (b.of) return "reference";
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
  return def_at(graph, "line") ? "line" : undefined;
}

/** What an element stores to name this definition: a structural base stores as nothing. */
export function stored_type(graph: Graph, type: Id | undefined): Id | undefined {
  if (!type) return undefined;
  if (!is_base(type)) return type;
  if (type === "line") return undefined;
  if (BASE_RELATIONS.includes(type)) return type;
  return plain_type(base_named(graph, type) ?? "block") ?? undefined;
}

/** What a plain block of this base stores as its type: nothing, or the base's own name. */
export function plain_type(base: Id): Id | null {
  return STRUCTURAL.includes(base) ? null : base;
}

/** Bases an element's own shape says, so a plain one names nothing. */
const STRUCTURAL: readonly Id[] = ["block", "reference"];

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

/** A definition by what it is called: the workspace's own first. **One name space per package**:
 *  definitions, tags and traits share it. */
export function def_named(graph: Graph, name: string, domain?: Domain): Definition | undefined {
  const want = name.trim();
  if (!want) return undefined;
  const hits = all_defs(graph).filter((d) => d.name === want
    && (!domain || domain_of(graph, d.id) === domain));
  return hits.find((d) => !frozen(graph, d.id)) ?? hits[0];
}

/** Whether a name is taken in a package, by anything but `except`. */
export function name_taken(graph: Graph, pkg: Id, name: string, except?: Id): boolean {
  const want = name.trim();
  return all_defs(graph).some((d) => d.id !== except && d.name === want
    && package_of(graph, d.id) === pkg);
}

/** Every package root: `base` first, the workspace's last, the rest by name between. */
export function packages(graph: Graph): Block[] {
  const rank = (b: Block) => (b.id === BASE_PACKAGE ? 0 : b.id === graph.root ? 2 : 1);
  return Object.values(graph.blocks).filter((b) => b.parent === null)
    .sort((a, z) => rank(a) - rank(z) || (a.name ?? a.id).localeCompare(z.name ?? z.id));
}

/** A package root by id, or by the name somebody calls it. */
export function package_named(graph: Graph, said: string | undefined): Block | undefined {
  const want = said?.trim();
  if (!want) return undefined;
  const roots = packages(graph);
  return roots.find((p) => p.id === want) ?? roots.find((p) => p.name === want);
}

/** The packages a package uses: worked out from every type and tag its blocks and relations
 *  name, and what those extend. Never stored. */
export function uses_of(graph: Graph, pkg: Id): Id[] {
  const out = new Set<Id>();
  const reach = (type: Id | undefined) => {
    for (const d of isa(graph, type)) {
      const home = package_of(graph, d.id);
      if (home !== pkg) out.add(home);
    }
  };
  for (const b of Object.values(graph.blocks)) {
    if (package_of(graph, b.id) !== pkg) continue;
    reach(b.type);
    for (const t of b.tags ?? []) reach(entry(t).id);
    if (b.of) { const home = package_of(graph, b.of); if (home !== pkg) out.add(home); }
  }
  for (const e of Object.values(graph.edges)) {
    if (package_of(graph, e.from) !== pkg && package_of(graph, e.to) !== pkg) continue;
    for (const t of [e.type, ...(e.tags ?? []).map((t) => entry(t).id)]) reach(t);
  }
  return [...out].filter((id) => graph.blocks[id]).sort();
}

/** The packages that depend on this one, by root. */
export function dependents(graph: Graph, pkg: Id): Block[] {
  return packages(graph).filter((p) => p.id !== pkg && uses_of(graph, p.id).includes(pkg));
}

// ------------------------------------------------------------------- roles by position

/** The root of the tree a block is in: its first ancestor (or itself) that is not a holder, below
 *  its package. Null for a package root or a holder in a domain. */
export function tree_of(graph: Graph, id: Id): Id | null {
  let tree: Id | null = null;
  const seen = new Set<Id>();
  for (let at = graph.blocks[id]; at && at.parent !== null && !seen.has(at.id);
       at = graph.blocks[at.parent]) {
    seen.add(at.id);
    if (!organizes(graph, at.id)) tree = at.id;
  }
  return tree;
}

/** Whether a block sits in a domain: under its package through holders alone. */
export function in_domain(graph: Graph, id: Id): boolean {
  return tree_of(graph, id) === id || (!!graph.blocks[id] && tree_of(graph, id) === null);
}

/** The definition a block sits in the structure of, where one is above it. */
export function owner_def(graph: Graph, id: Id): Id | null {
  const seen = new Set<Id>();
  for (let at = graph.blocks[graph.blocks[id]?.parent ?? ""]; at && !seen.has(at.id);
       at = graph.blocks[at.parent ?? ""]) {
    seen.add(at.id);
    if (at.def) return at.id;
  }
  return null;
}

/** Whether placing a usage of `type` under `parent` would make a definition use itself. */
export function self_use(graph: Graph, parent: Id | null, type: Id | undefined): boolean {
  if (!parent || !type) return false;
  const seen = new Set<Id>();
  for (let at = graph.blocks[parent]; at && !seen.has(at.id); at = graph.blocks[at.parent ?? ""]) {
    seen.add(at.id);
    if (at.def && at.id === type) return true;
  }
  return false;
}

/** Whether `def` extending `type` would close a cycle: `type` is it, or extends it. */
export function closes_cycle(graph: Graph, def: Id, type: Id | undefined): boolean {
  return !!type && (type === def || isa(graph, type).some((d) => d.id === def));
}

/** The bases a block moves among freely; every other base is fixed when it is made. A folder,
 *  group or grid is the plain block drawing what it holds another way, so it is retyped as freely. */
const OPEN: readonly Id[] = ["block", "folder", "note", "group", "grid"];

/** Whether this block may be told to name that definition. */
export function may_retype(graph: Graph, id: Id, type: Id | undefined): boolean {
  /** A block never names a relation definition. */
  if (type && domain_of(graph, type) === "relation") return false;
  const from = base_of(graph, id);
  const to = block_base(graph, type);
  return from === to || (OPEN.includes(from) && OPEN.includes(to));
}
