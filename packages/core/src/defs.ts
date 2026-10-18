/** Definitions: blocks carrying `def`. Chains, bases, packages, and what an element resolves
 *  through. */

import { ARRANGES, type Settings } from "./components";
import { is_folder, organizes } from "./holders";
import { entry_at, is_form, library_home, library_names, type_at } from "./library";
import { is_container } from "./tree";
import { BASE_BLOCKS, BASE_COMPONENTS, BASE_PACKAGE, BASE_RELATIONS, BLOCK_MODULES, DIAGRAMS, DIRS,
         KIND_BASE,
         TRAITS, type Block,
         type BlockModule, type Attribute, type Components, type Definition, type Dir, type Form,
         type Graph, type Id, type Trait } from "./types";

/** A definition's domain: what its usages are. Read off its base, never stored. */
export type Domain = "block" | "relation" | "component";

/** How a card sits in its parent's `auto` layer. */
export type Arrange = (typeof ARRANGES)[number];


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

/** What one link of a chain says: the element itself, or a definition along it. */
type Link = { id: Id; settings?: Components; tags?: Id[]; constraints?: Id[]; traits?: Id[] };

/** A list in force over an element, and the link of its chain that states it. */
export type Stated = { ids: Id[]; from: Id | null };

/** **The one resolver's chain**: what a definition — a block definition or a library entry —
 *  reads through, nearest first. An entry extends another of its kind, then its kind's base, which
 *  is a block definition and reads on as one. */
function chain_by(graph: Graph, type: Id | undefined): Link[] {
  const out: Link[] = [];
  const seen = new Set<Id>();
  for (let id = type; id && !seen.has(id);) {
    seen.add(id);
    if (def_at(graph, id)) return [...out, ...chain_of(graph, id)];
    const e = entry_at(graph, id);
    if (!e) break;
    out.push(e);
    id = e.type ?? KIND_BASE[e.kind];
  }
  return out;
}

/** The links an element reads through, nearest first: a definition's chain — a block's or an
 *  entry's — starts at itself; a usage's and a line's at themselves, then their definition's. */
function links_of(graph: Graph, id: Id | undefined): Link[] {
  const it = id ? graph.blocks[id] ?? graph.edges[id] : undefined;
  if (!it) return entry_at(graph, id) ? chain_by(graph, id) : [];
  if ("def" in it && it.def) return chain_of(graph, it.id);
  const up = it.type && entry_at(graph, it.type) ? it.type : def_of(graph, it.id);
  return [it, ...chain_by(graph, up)];
}

/** The tags in force over an element: **the nearest list stated** down its chain, whole. */
export function tags_stated(graph: Graph, id: Id | undefined): Stated {
  const link = links_of(graph, id).find((l) => l.tags);
  return { ids: link?.tags ?? [], from: link?.id ?? null };
}

/** The constraints in force over an element: the nearest list stated down its chain, whole. */
export function constraints_stated(graph: Graph, id: Id | undefined): Stated {
  const link = links_of(graph, id).find((l) => l.constraints);
  return { ids: link?.constraints ?? [], from: link?.id ?? null };
}

/** The traits in force over an element: **the nearest list a definition states** down its chain,
 *  whole. A usage and a line carry their definition's. */
export function traits_stated(graph: Graph, id: Id | undefined): Stated {
  const link = links_of(graph, id).find((l) => "def" in l && l.traits);
  return { ids: link?.traits ?? [], from: link?.id ?? null };
}

/** The traits an element carries, in order. */
export function traits_of(graph: Graph, id: Id | undefined): Id[] {
  return traits_stated(graph, id).ids;
}

/** Whether an element carries this trait: what the engine asks to know what a kind does. */
export function has_trait(graph: Graph, id: Id | undefined, trait: Id): boolean {
  return traits_of(graph, id).includes(trait);
}

/** The trait a name says, where the engine has one. */
export function trait_at(name: string | undefined): Trait | undefined {
  const want = name?.trim();
  return TRAITS.find((t) => t.id === want);
}

/** Whether a name is a trait the engine supports. */
export function is_trait(name: string | undefined): boolean {
  return !!trait_at(name);
}

/** One statement of settings over an element, and the link or trait making it. */
export type Statement = { from: Id; settings: Components };

/** What a trait gives: the settings the engine table grants it. */
function conferred(trait: Id): Statement[] {
  const t = trait_at(trait);
  return t ? [{ from: t.id, settings: t.settings }] : [];
}

/** What states settings over an element, nearest first, each with who says it: per link, its own
 *  word, then the traits in force where that link states them. **Nearest wins.** */
export function statements(graph: Graph, id: Id | undefined): Statement[] {
  const traits = traits_stated(graph, id);
  const out: Statement[] = [];
  for (const link of links_of(graph, id)) {
    if (link.settings) out.push({ from: link.id, settings: link.settings });
    if (link.id === traits.from) for (const t of traits.ids) out.push(...conferred(t));
  }
  return out;
}

/** What states settings over an element, nearest first. */
export function stated(graph: Graph, id: Id | undefined): Components[] {
  return statements(graph, id).map((s) => s.settings);
}

/** Every property in force over an element, once each, with who says it: nearest wins. */
export function said_of(graph: Graph, id: Id | undefined):
    { key: string; name: string; value: unknown; from: Id }[] {
  const out: { key: string; name: string; value: unknown; from: Id }[] = [];
  for (const { from, settings } of statements(graph, id)) {
    for (const [key, props] of Object.entries(settings)) {
      for (const [name, value] of Object.entries(props ?? {})) {
        if (!out.some((p) => p.key === key && p.name === name)) out.push({ key, name, value, from });
      }
    }
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
  return def_at(graph, type) || entry_at(graph, type) ? setting_of(graph, type, key) : {};
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

/** How a value of this type is edited: a form itself, a type's form, a link where the type is a
 *  block definition — a foreign key — and text where it names nothing. */
export function form_of(graph: Graph, type: Id | undefined): Form {
  if (is_form(type)) return type;
  const named = type_at(graph, type);
  if (named) return named.form;
  return def_at(graph, type) ? "link" : "text";
}

/** What a type's chain says of its unit or format: its own, else what it extends, nearest first. */
function type_says(graph: Graph, type: Id | undefined, key: "unit" | "format"): string | undefined {
  const seen = new Set<Id>();
  for (let t = type_at(graph, type); t && !seen.has(t.id); t = type_at(graph, t.type)) {
    seen.add(t.id);
    if (t[key]) return t[key];
  }
  return undefined;
}

/** What an attribute's values count in: its own unit, else its type's, read down the type's chain.
 *  **A type is the attribute's definition**: it carries the unit, format and look its fields wear. */
export function unit_of(graph: Graph, attribute: Attribute): string | undefined {
  return attribute.unit || type_says(graph, attribute.type, "unit");
}

/** How an attribute's values are written: its type's format, read down the type's chain. */
export function format_of(graph: Graph, attribute: Attribute): string | undefined {
  return type_says(graph, attribute.type, "format");
}

/** Whether an attribute links to a block definition: a foreign key. */
export function links_to(graph: Graph, attribute: Attribute): Id | null {
  return def_at(graph, attribute.type) && domain_of(graph, attribute.type) === "block"
    ? attribute.type! : null;
}

/** Whether an id names a base: a definition the kit ships with nothing above it. */
export function is_base(id: Id | undefined): boolean {
  return !!id && (BASE_BLOCKS.includes(id) || BASE_RELATIONS.includes(id)
    || BASE_COMPONENTS.includes(id));
}

/** The base a definition descends from, which is what its kind is. A type naming a base directly
 *  answers before the base package is laid. */
export function base_named(graph: Graph, type: Id | undefined): Id | undefined {
  const hit = isa(graph, type).find((d) => is_base(d.id))?.id;
  return hit ?? (is_base(type) ? type : undefined);
}

/** A definition's domain: a relation where it descends from `line` or `tie`, a component where
 *  from `attribute` or `tag`. */
export function domain_of(graph: Graph, type: Id | undefined): Domain {
  const base = base_named(graph, type) ?? "";
  return BASE_RELATIONS.includes(base) ? "relation"
    : BASE_COMPONENTS.includes(base) ? "component" : "block";
}

/** Whether a definition may change kind — block to relation, or back — by what it extends:
 *  nothing is typed by it, extends it or sits in it, so nothing it shaped would break. */
export function kind_free(graph: Graph, id: Id): boolean {
  return !Object.values(graph.blocks).some((b) => b.type === id || b.parent === id)
    && !Object.values(graph.edges).some((e) => e.type === id);
}

/** A block's base: what its chain descends from. A definition's chain starts at itself. */
export function base_of(graph: Graph, id: Id): Id {
  const b = graph.blocks[id];
  if (!b) return "block";
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

/** The bases that annotate a layer: they explain or organize it, and never list in the explorer. */
const ANNOTATIONS: readonly Id[] = ["note", "label", "group", "region"];

/** Whether a block is an annotation: a note, a label, a group or a region, by its base. */
export function is_annotation(graph: Graph, id: Id): boolean {
  const b = graph.blocks[id];
  return !!b && !b.def && ANNOTATIONS.includes(base_of(graph, id));
}

/** Whether a block is a note. */
export function is_note(graph: Graph, id: Id): boolean {
  return !!graph.blocks[id] && base_of(graph, id) === "note";
}

/** How a block sits in its parent's `auto` layer: its `card.arrange`, a column unsaid. A
 *  definition's says how its usages sit; it is a card in its folder, so a column. */
export function arrange_of(graph: Graph, id: Id | undefined): Arrange {
  if (id && graph.blocks[id]?.def) return "column";
  const said = setting_of(graph, id, "card")["arrange"];
  return ARRANGES.includes(said as Arrange) ? said as Arrange : "column";
}

/** Whether a block floats beside what it is tied to: it arranges aside. */
export function is_aside(graph: Graph, id: Id | undefined): boolean {
  return arrange_of(graph, id) === "aside";
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
const STRUCTURAL: readonly Id[] = ["block"];

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
  if (!graph.blocks[id]) return (library_home(graph, id) ?? graph.root) !== graph.root;
  return package_of(graph, id) !== graph.root;
}

/** Whether a line is a tie: its `line.module` is tie, which *is tie* grants. */
export function is_tie(graph: Graph, id: Id): boolean {
  return setting_of(graph, id, "line")["module"] === "tie";
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
 *  definitions, types and tags share it. */
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
  return library_names(graph, pkg, want, except) || all_defs(graph).some((d) => d.id !== except
    && d.name === want && package_of(graph, d.id) === pkg);
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

/** The packages a package uses: worked out from every definition, type and tag its blocks and
 *  relations name, and what those extend. Never stored. */
export function uses_of(graph: Graph, pkg: Id): Id[] {
  const out = new Set<Id>();
  const reach = (type: Id | undefined) => {
    const named = type ? library_home(graph, type) : undefined;
    if (named && named !== pkg) out.add(named);
    for (const d of isa(graph, type)) {
      const home = package_of(graph, d.id);
      if (home !== pkg) out.add(home);
    }
  };
  for (const b of Object.values(graph.blocks)) {
    if (package_of(graph, b.id) !== pkg) continue;
    reach(b.type);
    for (const t of b.tags ?? []) reach(t);
    for (const a of b.def?.attributes ?? []) reach(a.type);
    if (b.of && module_of(graph, b.id) === "reference") {
      const home = package_of(graph, b.of);
      if (home !== pkg) out.add(home);
    }
  }
  for (const e of Object.values(graph.edges)) {
    if (package_of(graph, e.from) !== pkg && package_of(graph, e.to) !== pkg) continue;
    for (const t of [e.type, ...(e.tags ?? [])]) reach(t);
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

/** Whether a block is on the definition side: a package root, a definition, or a folder in the
 *  definitions tree — under its package root through folders alone, the one at the root saying
 *  `tree: "definitions"`. */
export function is_domain(graph: Graph, id: Id): boolean {
  const b = graph.blocks[id];
  if (!b) return false;
  if (b.parent === null || b.def) return true;
  if (!is_folder(graph, id)) return false;
  const seen = new Set<Id>();
  for (let top = b; !seen.has(top.id); ) {
    seen.add(top.id);
    const up: Block | undefined = graph.blocks[top.parent ?? ""];
    if (!up) return false;
    if (up.parent === null) return top.tree === "definitions";
    if (!is_folder(graph, up.id)) return false;
    top = up;
  }
  return false;
}

/** Whether a block may hold definitions: a package root, or a folder in the definitions tree.
 *  A definition sits nowhere else — never in a structure, nor in another definition. */
export function holds_defs(graph: Graph, id: Id): boolean {
  return is_domain(graph, id) && !graph.blocks[id]!.def;
}

/** Whether a block is a folder in the definitions tree, which holds definitions and folders
 *  alone. */
export function in_definitions(graph: Graph, id: Id): boolean {
  return is_folder(graph, id) && is_domain(graph, id);
}

/** Whether a definition-side block holds structure directly: a child, interfaces apart, that is
 *  not on the definition side. */
export function holds_usages(graph: Graph, id: Id): boolean {
  if (!is_domain(graph, id)) return false;
  return Object.values(graph.blocks).some((c) => c.parent === id
    && module_of(graph, c.id) !== "interface" && !is_domain(graph, c.id));
}

/** Whether a block roots a structure. The workspace does, empty or not. A definition does when it
 *  holds structure directly. A folder never does, nor any other package root, nor a block already
 *  inside a structure. */
export function roots_structure(graph: Graph, id: Id): boolean {
  if (id === graph.root) return true;
  return !!graph.blocks[id]?.def && holds_usages(graph, id);
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

/** The bases a block moves among freely, in sets; every other base is fixed when it is made. A
 *  folder or grid is the plain block arranging what it holds another way, so it is retyped as
 *  freely; annotations move among themselves. **Never across**: a block never becomes an
 *  annotation, or back. */
const OPEN: readonly (readonly Id[])[] = [["block", "folder", "grid"],
                                          ["note", "label", "group", "region"]];

/** Whether this block may be told to name that definition. */
export function may_retype(graph: Graph, id: Id, type: Id | undefined): boolean {
  /** A block never names a relation definition. */
  if (type && domain_of(graph, type) === "relation") return false;
  const from = base_of(graph, id);
  const to = block_base(graph, type);
  return (from === to || OPEN.some((set) => set.includes(from) && set.includes(to)))
    && kind_fits(graph, id, type);
}


/** Which diagram kind a block is: the nearest its chain names; else `internal` where a plain
 *  block holds parts, its own or its definition's; else null — a plain block, free to become
 *  any kind. */
export function diagram_kind(graph: Graph, id: Id): Id | null {
  const b = graph.blocks[id];
  return b ? kind_typed(graph, id, b.def ? b.id : b.type) : null;
}

/** The diagram kind a block is, or would be, typed by `type`. */
function kind_typed(graph: Graph, id: Id, type: Id | undefined): Id | null {
  const named = isa(graph, type).find((d) => DIAGRAMS.includes(d.id))?.id
    ?? (type && DIAGRAMS.includes(type) ? type : undefined);
  if (named) return named;
  if (block_base(graph, type) !== "block" || module_named(graph, type) !== "block") return null;
  const held = is_container(graph, id) || (!!def_at(graph, type) && type !== id
    && is_container(graph, type!));
  return held ? "internal" : null;
}

/** Whether a block keeps its diagram kind typed by `type`: **a diagram is fixed to its branch**,
 *  retyped only to what extends the same kind; a plain block may become any. */
export function kind_fits(graph: Graph, id: Id, type: Id | undefined): boolean {
  const kind = diagram_kind(graph, id);
  return !kind || kind === kind_typed(graph, id, type);
}
