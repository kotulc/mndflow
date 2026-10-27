/** A source folder: a package on disk — definitions, diagram files and card sources — collected
 *  into one package, or into the workspace. **Read one way**: a folder becomes a package file,
 *  never the reverse.
 *
 *  `package.json`, where there is one, holds the package's graph, its library on its root; every
 *  other `.json` file under the folder is **one definition**, filed under the folder its
 *  directory names. Every `.yaml` file is a **diagram file** and every `.md` file a **card
 *  source** — one schema, a card source a diagram file with a body — each one block and its layer,
 *  named rather than identified: its ids are minted in file order and its names read here. Every
 *  directory is a folder, but one named as a file beside it, which holds that file's parts; a top
 *  folder holding only definitions files them. A definition said twice
 *  is a clash, and refused. A definition, type or tag a file names and nothing loaded holds is
 *  made here — a definition's attributes the union of what its usages answer, each type read off
 *  the values. */

import { parse } from "yaml";
import { read_card } from "./card";
import { all_defs, block_base, def_at, dir_of, is_notation, package_of } from "./defs";
import { long_form, type Edge, type Entry, type LongForm, type LibrarySaid } from "./diagram";
import { renamed, write } from "./file";
import { is_grid } from "./holders";
import { all_constraints, all_interfaces, all_tags, all_types, is_form,
         library_map } from "./library";
import { def_ref, fits_domain, is_path, path_to, STEP } from "./refs";
import { children, ports_on } from "./tree";
import type { Leaf } from "./ports";
import { FORMS, type Attribute, type Block, type Components, type Constraint, type Flow,
         type Form, type Graph,
         type Id, type Interface, type Relation, type Side, type Tag, type Type,
         type Value } from "./types";
import { forget } from "./memo";

/** What collecting came to: the package file, what it had to make, the files saying a definition
 *  already said, which it refused, and what it could not read or find. */
export type Collected = { text: string; made: string[]; clashes: string[]; notes: string[] };

/** How a source folder is read: `bare` keeps definition files' ids as written, as `base`'s are;
 *  `root` collects into that root — the workspace's — rather than a package of its own. */
export type Collecting = { bare?: boolean; root?: Id };

/** The file a source folder keeps its package's graph in. */
export const DEFINITIONS = "package.json";

const MARKDOWN = /\.(md|mdx)$/i;
const YAML_FILE = /\.ya?ml$/i;
const JSON_FILE = /\.json$/i;

/** One file read: where it lands, its block's id, and what it says spelled out. */
type Read = { path: string; dir: string[]; id: Id; form: LongForm };

/** What a file's names are read against. */
type Ctx = { graph: Graph; slug: Id; pre: string; made: Map<string, Id>; notes: string[];
             file: Read; within: Id[] };


/** A source folder's files as a package file, read against what `over` already holds. */
export function collect(name: string, leaves: readonly Leaf[], over: Graph,
                        { bare = false, root }: Collecting = {}): Collected {
  /** A package is called what its `package.json` says, else what its folder is called. */
  const slug = root ?? slug_of(declared(leaves) ?? name);
  /** Ids under the workspace go unprefixed, as a workspace's own do. */
  const pre = root ? "" : `${slug}.`;
  /** Collected again, a package replaces what was loaded of it, relationships and all. */
  const mine = (id: Id) => package_of(over, id) === slug;
  const graph: Graph = { root: over.root,
    blocks: Object.fromEntries(Object.entries(over.blocks).filter(([id]) => !mine(id))),
    edges: Object.fromEntries(Object.entries(over.edges)
      .filter(([, e]) => !mine(e.from) && !mine(e.to))) };
  forget(graph);
  graph.blocks[slug] = { id: slug, parent: null, name: over.blocks[slug]?.name ?? name };
  const sorted = [...leaves].sort((a, z) => a.path.localeCompare(z.path));
  const files = sorted.filter((l) => l.path !== DEFINITIONS && JSON_FILE.test(l.path));
  const { filed, clashes, named: called } = defined(graph, slug,
    sorted.find((l) => l.path === DEFINITIONS)?.text, files, bare);
  /** The package file names its root, the workspace's too. */
  if (called) graph.blocks[slug]!.name = called;
  const notes: string[] = [];

  const orders = new Map<Id, number>();
  const next = (parent: Id) => { orders.set(parent, (orders.get(parent) ?? 0) + 1);
                                 return orders.get(parent)!; };
  /** Every diagram file and card source, spelled out; a card a diagram file draws in by its
   *  `source` is read there, not on its own. */
  const reads = read_all(sorted, pre, notes);
  const drawn = sourced(reads);
  const own = reads.filter((r) => !drawn.has(r.path));
  /** A directory named as a file beside it is that file's block: what it holds are its parts.
   *  Under it, a directory may name a block the file writes at its top, by its name's slug. */
  const owners = new Map(own.map((r) => [[...r.dir, stem_of(r.path)].join("/"), r]));
  const owned = (r: Read, part: string): Id | undefined => {
    const i = r.form.blocks.findIndex((e) => e.under === undefined && !e.parent
      && slug_of(e.name) === slug_of(part));
    return i < 0 ? undefined : `${r.id}.${i + 1}`;
  };

  /** What lands in a block a file wrote, in path order: it is ordered after that file's parts. */
  const placed: Id[] = [];
  const in_block = (parent: Id) => parent !== slug && !parent.startsWith(`${pre}dir.`);

  /** The folder a directory names, made the first time it is met — or, for a usage, the block it
   *  is. A definition is never a part, so its directories are always folders. */
  const tops = new Set<Id>();
  const folder = (parts: readonly string[], blocks = true): Id => {
    let parent = slug;
    /** The file whose block the directory above is, if it is one. */
    let above: Read | undefined;
    for (const [n, part] of parts.entries()) {
      const file = blocks ? owners.get(parts.slice(0, n + 1).join("/")) : undefined;
      const block = file?.id ?? (above ? owned(above, part) : undefined);
      above = file;
      if (block) { parent = block; continue; }
      const id = `${pre}dir.${parts.slice(0, n + 1).join(".")}`;
      if (!graph.blocks[id] && in_block(parent)) placed.push(id);
      graph.blocks[id] ??= { id, parent, name: part, type: "folder", order: next(parent) };
      if (n === 0) tops.add(id);
      parent = id;
    }
    return parent;
  };
  /** A definition file sits in its directory's folder, after what is there. */
  for (const [path, id] of filed) {
    const parent = folder(path.split("/").filter(Boolean).slice(0, -1), false);
    forget(graph);
    graph.blocks[id] = { ...graph.blocks[id]!, parent, order: next(parent) };
  }

  const made = new Map<string, Id>();
  const answers = new Map<Id, Value[][]>();
  const counters: Record<string, number> = { ...over.blocks[slug]?.counters };
  const alias = (kind: string) => (counters[kind] = (counters[kind] ?? 0) + 1);

  /** Every block, interface and named component is laid first, so a name in one file finds what
   *  another says. */
  for (const r of own) {
    const parent = folder(r.dir);
    if (in_block(parent)) placed.push(r.id);
    lay(graph, r, parent, next(parent));
    library(graph, slug, pre, r.form.library);
  }
  const after = new Map<Id, number>();
  for (const id of placed) {
    const b = graph.blocks[id]!;
    const up = b.parent!;
    if (!after.has(up)) {
      after.set(up, Math.max(0, ...Object.values(graph.blocks)
        .filter((o) => o.parent === up && !placed.includes(o.id)).map((o) => o.order ?? 0)));
    }
    after.set(up, after.get(up)! + 1);
    b.order = after.get(up)!;
  }
  /** A file names its own package's definitions as well as those of the packages it lists. */
  const ctx_of = (r: Read): Ctx => ({ graph, slug, pre, made, notes, file: r,
                                      within: [slug, ...r.form.packages.map(pkg_of)] });
  /** What each definition extends comes first: whether a name is a relation is read off the chain
   *  it heads. */
  for (const r of own) {
    for (const [id, e] of entries_of(r)) {
      if (e.def && e.type) graph.blocks[id]!.type = extended(ctx_of(r), e.type);
    }
  }
  for (const r of own) {
    const ctx = ctx_of(r);
    const entries = entries_of(r);
    for (const [id, e] of entries) {
      const type = resolve_block(ctx, id, e);
      if (type && !e.def) answers.set(type, [...(answers.get(type) ?? []), e.values]);
      const b = graph.blocks[id]!;
      if (!b.def) b.alias ??= alias(block_base(graph, b.type));
    }
    for (const [id, e] of entries) seat(ctx, id, e);
    for (const [id, e] of entries) extent(graph, id, e);
  }
  /** Lines come once every block is typed, so an end names a port another file's block wears
   *  through its definition. */
  for (const r of own) {
    const ctx = ctx_of(r);
    for (const [i, e] of r.form.relations.entries()) {
      const edge = relation(ctx, `${r.id}.r${i + 1}`, e);
      if (edge) graph.edges[edge.id] = { ...edge, alias: alias("relation") };
    }
    /** A note written on a block is tied to it, or to the port it was written on. */
    for (const [i, e] of r.form.blocks.entries()) {
      if (e.tied === undefined) continue;
      const id = `${r.id}.t${i + 1}`;
      const to = e.tied < 0 ? r.id : `${r.id}.${e.tied + 1}`;
      const port = e.port ? graph.blocks[to]?.ports?.find((p) => p.name === e.port) : undefined;
      graph.edges[id] = { id, from: `${r.id}.${i + 1}`, to, ...(port ? { toPort: port.id } : {}),
                          type: "tie", alias: alias("relation") };
    }
  }
  if (root) graph.blocks[slug]!.counters = counters;

  /** A made definition declares what its usages answer. */
  for (const [type, sets] of answers) {
    const d = graph.blocks[type];
    if (!d?.def || ![...made.values()].includes(type)) continue;
    d.def = { attributes: inferred(sets) };
  }
  /** A top folder holding nothing but definitions files them. */
  for (const id of tops) {
    if (!holds_structure(graph, id)) graph.blocks[id]!.tree = "definitions";
  }
  return { text: write(graph, slug, slug), made: [...made.keys()], clashes, notes };
}

/** What the files want loaded before they are read: every package a diagram file or a card
 *  source lists, a path said from the source folder's root. */
export function wanted(leaves: readonly Leaf[]): string[] {
  const out = new Set<string>();
  for (const r of read_all(leaves, "", [])) {
    for (const p of r.form.packages) out.add(/^\.\.?\//.test(p) ? `./${joined(r.dir, p)}` : p);
  }
  return [...out];
}


/** Every `.md` and `.yaml` leaf spelled out, in path order. One that cannot be read is said, and
 *  read as a card of its text alone. */
function read_all(leaves: readonly Leaf[], pre: string, notes: string[]): Read[] {
  const out: Read[] = [];
  for (const leaf of leaves) {
    const yaml = YAML_FILE.test(leaf.path);
    if (!yaml && !MARKDOWN.test(leaf.path)) continue;
    const parts = leaf.path.split("/").filter(Boolean);
    parts.pop();
    const stem = stem_of(leaf.path);
    let form: LongForm;
    try {
      const { front, body } = yaml ? { front: yaml_map(leaf.text), body: undefined }
                                   : read_card(leaf.text);
      form = long_form(front, body);
    }
    catch (e) {
      notes.push(`${leaf.path}: ${e instanceof Error ? e.message : String(e)}`);
      form = long_form({}, yaml ? undefined : leaf.text);
    }
    form.top.name ||= stem;
    form.top.source ??= leaf.path;
    out.push({ path: leaf.path, dir: parts, form,
               id: `${pre}${yaml ? "yaml" : "md"}.${[...parts, stem].join(".")}` });
  }
  return out;
}

/** A file's name without its directory or its `.yaml` or `.md`. */
function stem_of(path: string): string {
  return (path.split("/").pop() ?? "").replace(YAML_FILE, "").replace(MARKDOWN, "");
}

/** A YAML file's map. */
function yaml_map(text: string): Record<string, unknown> {
  const map: unknown = parse(text) ?? {};
  if (typeof map !== "object" || Array.isArray(map)) throw new Error("a diagram file is a map");
  return map as Record<string, unknown>;
}

/** The card sources diagram files draw in by `source`, each read into the entry naming it: what
 *  the entry says wins, the card says the rest. */
function sourced(reads: readonly Read[]): Set<string> {
  const by_path = new Map(reads.map((r) => [r.path, r]));
  const drawn = new Set<string>();
  for (const r of reads) {
    for (const e of r.form.blocks) {
      if (!e.source || !MARKDOWN.test(e.source)) continue;
      const path = joined(r.dir, e.source);
      const card = by_path.get(path)?.form.top;
      if (!card || path === r.path) continue;
      e.type ??= card.type;
      e.body ??= card.body;
      e.description ??= card.description;
      e.tags ??= card.tags;
      e.settings ??= card.settings;
      e.name ||= card.name;
      e.values = [...card.values.filter((v) => !e.values.some((x) => x.name === v.name)),
                  ...e.values];
      e.source = path;
      drawn.add(path);
    }
  }
  return drawn;
}

/** A path said relative to a file's directory, from the source folder's root. */
function joined(dir: readonly string[], path: string): string {
  const out = [...dir];
  for (const step of path.split("/")) {
    if (step === "..") out.pop();
    else if (step && step !== ".") out.push(step);
  }
  return out.join("/");
}

/** The package a file lists by name or by path — a folder, or a package file — as its root's id. */
function pkg_of(said: string): Id {
  return slug_of(said.replace(/\/+$/, "").split("/").pop()?.replace(/\.json$/i, "") ?? said);
}

/** A file's entries with the ids they take: its block's own, then one per block in file order. */
function entries_of(r: Read): [Id, Entry][] {
  return [[r.id, r.form.top], ...r.form.blocks.map((e, i): [Id, Entry] => [`${r.id}.${i + 1}`, e])];
}

/** A file's blocks laid under its folder, named and nested, before any name is read: a
 *  definition with the interfaces it declares, their types read later. */
function lay(graph: Graph, r: Read, parent: Id, order: number): void {
  const orders = new Map<Id, number>();
  for (const [id, e] of entries_of(r)) {
    const up = id === r.id ? parent : e.under !== undefined ? `${r.id}.${e.under + 1}` : r.id;
    orders.set(up, (orders.get(up) ?? 0) + 1);
    forget(graph);
    graph.blocks[id] = {
      id, parent: up, order: id === r.id ? order : orders.get(up)!,
      ...(e.name ? { name: e.name } : {}), ...(e.body !== undefined ? { body: e.body } : {}),
      ...(e.description ? { description: e.description } : {}),
      ...(e.source ? { source: e.source } : {}),
      ...(e.def ? { def: {} } : {}),
      ...(e.settings ? { settings: e.settings as Block["settings"] } : {}),
      ...(e.values.length ? { values: e.values } : {}),
      ...(e.records?.length ? { records: e.records } : {}),
      ...(e.w !== undefined ? { w: e.w } : {}), ...(e.h !== undefined ? { h: e.h } : {}),
      ...(e.ports?.length ? { ports: e.ports.map((p, at, all) => ({
        id: port_id(id, all, at), ...(p.name ? { name: p.name } : {}),
        ...(p.description ? { description: p.description } : {}),
        ...(p.flow ? { flow: p.flow as Flow } : {}), ...(p.side ? { side: p.side as Side } : {}),
        ...(p.at !== undefined ? { at: p.at } : {}) })) } : {}),
    };
  }
}

/** A port's id on its block, by its name; one whose name slugs as an earlier one's also says
 *  where it sits, so no two share an id. */
function port_id(block: Id, ports: readonly { name?: string }[], at: number): Id {
  const slug = (p: { name?: string }) => slug_of(p.name || "port");
  const id = `${block}.port.${slug(ports[at]!)}`;
  return ports.slice(0, at).some((p) => slug(p) === slug(ports[at]!)) ? `${id}.${at + 1}` : id;
}

/** A file's named components put in its package's library, each by its name; one already there
 *  is said again over it. */
function library(graph: Graph, slug: Id, pre: string, said: Partial<LibrarySaid>): void {
  const root = graph.blocks[slug]!;
  const lib = { types: [...root.library?.types ?? []], tags: [...root.library?.tags ?? []],
                interfaces: [...root.library?.interfaces ?? []],
                constraints: [...root.library?.constraints ?? []] };
  const text = (m: Record<string, unknown>, key: string) =>
    (typeof m[key] === "string" ? (m[key] as string).trim() : "");
  /** What every entry says: its description, what it extends in its own kind, and its settings. */
  const common = (m: Record<string, unknown>, id_of: (name: string) => Id) => ({
    ...(text(m, "description") ? { description: text(m, "description") } : {}),
    ...(text(m, "type") ? { type: id_of(text(m, "type")) } : {}),
    ...(m["settings"] && typeof m["settings"] === "object"
      ? { settings: m["settings"] as Components } : {}) });
  for (const t of said.types ?? []) {
    const name = text(t, "name");
    if (!name) continue;
    const form = (is_form(text(t, "form")) ? text(t, "form")
      : Array.isArray(t["choices"]) ? "choice" : "text") as Form;
    const type: Type = { id: type_id(pre, name), name, form,
      ...(Array.isArray(t["choices"]) ? { choices: (t["choices"] as unknown[]).map(String) } : {}),
      ...(text(t, "unit") ? { unit: text(t, "unit") } : {}),
      ...(text(t, "format") ? { format: text(t, "format") } : {}),
      ...common(t, (n) => type_id(pre, n)) };
    lib.types = [...lib.types.filter((x) => x.id !== type.id), type];
  }
  for (const t of said.tags ?? []) {
    const name = text(t, "name");
    if (!name) continue;
    const tag: Tag = { id: tag_id(pre, name), name, ...common(t, (n) => tag_id(pre, n)) };
    lib.tags = [...lib.tags.filter((x) => x.id !== tag.id), tag];
  }
  for (const t of said.constraints ?? []) {
    const name = text(t, "name");
    if (!name) continue;
    const words = (key: string) => (Array.isArray(t[key]) ? (t[key] as unknown[]).map(String) : []);
    const one: Constraint = { id: constraint_id(pre, name), name,
                              ...(words("required").length ? { required: words("required") } : {}),
                              ...(words("match").length ? { match: words("match") } : {}),
                              ...common(t, (n) => constraint_id(pre, n)) };
    lib.constraints = [...lib.constraints.filter((x) => x.id !== one.id), one];
  }
  for (const t of said.interfaces ?? []) {
    const name = text(t, "name");
    if (!name) continue;
    const one: Interface = { id: interface_id(pre, name), name,
                             ...common(t, (n) => interface_id(pre, n)) };
    lib.interfaces = [...lib.interfaces.filter((x) => x.id !== one.id), one];
  }
  const kept = library_map(lib, (list) => list);
  if (kept) root.library = kept;
}

/** A block's names read: a `parent` it names, what it is, what it carries, what it stands for,
 *  and the ids its attributes, interfaces and settings name. Gives back its type, where it has
 *  one. */
function resolve_block(ctx: Ctx, id: Id, e: Entry): Id | undefined {
  const { graph } = ctx;
  const b = graph.blocks[id]!;
  if (e.parent) {
    const up = local(ctx, e.parent);
    if (up) b.parent = up;
    else ctx.notes.push(`${ctx.file.path}: ${e.name || id} sits in ${e.parent}, which is not here`);
  }
  const type = e.def ? b.type : e.type ? named(ctx, e.type, "block") : undefined;
  if (type) b.type = type;
  /** A port's interface definition, by name. */
  for (const [i, p] of (e.ports ?? []).entries()) {
    if (p.type && b.ports?.[i]) b.ports[i]!.type = interface_of(ctx, p.type);
  }
  if (e.tags) b.tags = e.tags.map((t) => tag_of(ctx, t));
  if (e.constraints) b.constraints = e.constraints.map((c) => constraint_of(ctx, c));
  if (e.traits) b.traits = [...e.traits];
  if (e.of) b.of = ref(ctx, e.of, true, id) ?? e.of;
  if (e.def) {
    const attributes = (e.def.attributes ?? []).map((a) => (typeof a["type"] === "string"
      ? { ...a, type: type_of(ctx, a["type"]) } : a)) as unknown as Attribute[];
    /** On a definition, a value is an attribute's default. */
    for (const v of e.values) {
      const a = attributes.find((x) => x.name === v.name);
      if (a) a.default = v.value;
      else attributes.push({ name: v.name, default: v.value } as Attribute);
    }
    delete b.values;
    b.def = { ...(attributes.length ? { attributes } : {}),
              ...(e.def.ends ? { ends: e.def.ends } : {}) };
  }
  if (b.settings) b.settings = ided(ctx, b.settings);
  return type;
}

/** What a definition extends: any definition of that name, of any kind, else a plain one made. */
function extended(ctx: Ctx, word: string): Id {
  return def_ref(ctx.graph, word, { within: ctx.within }) ?? named(ctx, word, "block");
}

/** A block's cell: a number, or the name of the header heading that line. */
function seat(ctx: Ctx, id: Id, e: Entry): void {
  if (!e.cell) return;
  const { graph } = ctx;
  const b = graph.blocks[id]!;
  const heads = children(graph, b.parent);
  const at = (said: string | number, axis: "r" | "c") => (typeof said === "number" ? said
    : heads.find((h) => h.name === said && h.cell?.[axis === "r" ? "c" : "r"] === 0)?.cell?.[axis]);
  const r = at(e.cell[0], "r");
  const c = at(e.cell[1], "c");
  if (r !== undefined && c !== undefined) b.cell = { r, c };
  else ctx.notes.push(`${ctx.file.path}: ${e.name || id} names a cell no header heads`);
}

/** A grid's lattice: as far as its cells reach, header lines included, and the merges it says. */
function extent(graph: Graph, id: Id, e: Entry): void {
  const b = graph.blocks[id]!;
  if (!is_grid(graph, id) && !e.grid) return;
  const cells = children(graph, id).flatMap((m) => (m.cell ? [m.cell] : []));
  b.grid = { rows: Math.max(2, ...cells.map((c) => c.r + 1)),
             cols: Math.max(2, ...cells.map((c) => c.c + 1)),
             ...(e.grid?.merges ? { merges: e.grid.merges as never } : {}) };
}

/** A relation's names read: its ends, its type, and the way it points, kept where its arrow says
 *  otherwise than its type. */
function relation(ctx: Ctx, id: Id, e: Edge): Relation | undefined {
  const from = end_of(ctx, e.from);
  const to = end_of(ctx, e.to);
  if (!from || !to) {
    ctx.notes.push(`${ctx.file.path}: ${e.from} to ${e.to} names a block that is not here`);
    return undefined;
  }
  const type = e.type ? named(ctx, e.type, "relation") : undefined;
  const settings = e.settings ? ided(ctx, e.settings) : undefined;
  const dir = e.dir && e.dir !== dir_of(ctx.graph, type ?? "line") ? e.dir : undefined;
  const line = { ...(settings?.["line"] as object | undefined), ...(dir ? { dir } : {}) };
  const all = { ...settings, ...(Object.keys(line).length ? { line } : {}) };
  return { id, from: from.at, to: to.at, ...(from.part ? { fromPort: from.part } : {}),
           ...(to.part ? { toPort: to.part } : {}), ...(type && type !== "line" ? { type } : {}),
           ...(e.name ? { name: e.name } : {}),
           ...(e.tags ? { tags: e.tags.map((t) => tag_of(ctx, t)) } : {}),
           ...(e.constraints ? { constraints: e.constraints.map((c) => constraint_of(ctx, c)) } : {}),
           ...(Object.keys(all).length ? { settings: all as Relation["settings"] } : {}),
           ...(e.values.length ? { values: e.values } : {}),
           ...(e.ends ? { ends: e.ends } : {}) };
}

/** A relation's end a word names: a block, else `block::port` — a block and a port it wears,
 *  its own or read through its definition — else a port of this file's block. */
function end_of(ctx: Ctx, word: string): { at: Id; part?: Id } | undefined {
  const at = ref(ctx, word, false);
  if (at) return { at };
  const steps = word.split(STEP).map((s) => s.trim());
  const port = steps.pop();
  const on = steps.length ? ref(ctx, steps.join(STEP), false) : ctx.file.id;
  const hit = on ? ports_on(ctx.graph, on).find((p) => p.name === port) : undefined;
  return on && hit ? { at: on, part: hit.id } : undefined;
}

/** A block a word names, other than the one asking: one in this file, by name or path; else a
 *  path from the package's root; else, where `defs`, a definition. */
function ref(ctx: Ctx, word: string, defs: boolean, asking?: Id): Id | undefined {
  return local(ctx, word, asking) ?? on_layer(ctx, word, asking)
    ?? path_to(ctx.graph, word, ctx.slug)
    ?? (defs ? def_ref(ctx.graph, word, { within: ctx.within }) : undefined);
}

/** A block another file placed on this file's layer — a directory under it holds that file — by
 *  its one name there, looked for through the notation that holds it; or a path down from it. */
function on_layer(ctx: Ctx, word: string, asking?: Id): Id | undefined {
  const [first, ...rest] = word.split(STEP).map((s) => s.trim());
  const hits: Id[] = [];
  const look = (at: Id) => {
    for (const c of children(ctx.graph, at)) {
      if (c.id !== asking && (c.name ?? "").trim() === first) hits.push(c.id);
      if (is_notation(ctx.graph, c.id)) look(c.id);
    }
  };
  look(ctx.file.id);
  if (hits.length !== 1) return undefined;
  return rest.length ? path_to(ctx.graph, rest.join(STEP), hits[0]) : hits[0];
}

/** A block of this file a word names: its one block of that name, or a path down from it. */
function local(ctx: Ctx, word: string, asking?: Id): Id | undefined {
  const [first, ...rest] = word.split(STEP).map((s) => s.trim());
  const hits = entries_of(ctx.file).map(([id]) => id)
    .filter((id) => id !== asking && ctx.graph.blocks[id]?.name === first);
  if (hits.length !== 1) return undefined;
  return is_path(word) ? path_to(ctx.graph, rest.join(STEP), hits[0]) : hits[0];
}

/** Settings naming definitions by id — what a usage may hold, what a relation's ends may join,
 *  the type a tie is, what a collection's records are — each name read as the definition it
 *  names. */
function ided(ctx: Ctx, settings: Record<string, unknown>): Block["settings"] {
  const id = (word: unknown) => (typeof word === "string"
    ? def_ref(ctx.graph, word, { within: ctx.within }) ?? word : word);
  const ids = (list: unknown) => (Array.isArray(list) ? list.map(id) : list);
  const out = structuredClone(settings) as Record<string, Record<string, unknown>>;
  const allows = out["allows"];
  if (allows) {
    for (const key of ["holds", "ports", "heads"]) if (key in allows) allows[key] = ids(allows[key]);
    const ends = allows["ends"] as Record<string, unknown> | undefined;
    if (ends) for (const key of ["from", "to"]) if (key in ends) ends[key] = ids(ends[key]);
  }
  if (out["tie"]?.["type"]) out["tie"]["type"] = id(out["tie"]["type"]);
  if (out["records"]?.["of"]) out["records"]["of"] = id(out["records"]["of"]);
  return out as Block["settings"];
}

/** Whether a folder holds anything but definitions and folders. */
function holds_structure(graph: Graph, id: Id): boolean {
  return children(graph, id).some((b) => (b.type === "folder" && !b.def
    ? holds_structure(graph, b.id) : !b.def));
}


/** A package's graph and its definition files, laid under the source folder's root: its root
 *  becomes this one, its library comes with it, and every id they wrote keeps its own prefix or
 *  takes this one — or stays bare, where asked, as `base`'s do. A file saying a definition already
 *  said is a clash, and skipped; one that is a package file, not a definition, is not read. Gives
 *  back which block each file came to, by path, the clashes, and the name the package file gives
 *  its root. */
function defined(graph: Graph, slug: Id, text: string | undefined, files: readonly Leaf[],
                 bare: boolean): { filed: Map<string, Id>; clashes: string[]; named?: string } {
  let from: Graph = { root: slug, blocks: {}, edges: {} };
  try {
    const read = text ? (JSON.parse(text) as { graph?: Graph }).graph : undefined;
    if (read?.blocks && read.root) from = { ...read, edges: read.edges ?? {} };
  } catch { /* an unreadable package file says nothing */ }
  const blocks = { ...from.blocks };
  const said = new Map<string, Id>();
  const clashes: string[] = [];
  for (const leaf of files) {
    let b: Block | null = null;
    try { b = JSON.parse(leaf.text) as Block; } catch { /* not a definition */ }
    if (!b?.id || !b.name || "graph" in b || b.id === from.root) continue;
    if (blocks[b.id]) { clashes.push(leaf.path); continue; }
    blocks[b.id] = { ...b, parent: from.root, def: b.def ?? {} };
    said.set(leaf.path, b.id);
  }
  const lib = from.blocks[from.root]?.library;
  const ids = new Map<Id, Id>([[from.root, slug]]);
  const prefixed = (id: Id) => (bare || id.startsWith(`${slug}.`) ? id
    : id.startsWith(`${from.root}.`) ? `${slug}.${id.slice(from.root.length + 1)}` : `${slug}.${id}`);
  for (const id of Object.keys(blocks)) if (id !== from.root) ids.set(id, prefixed(id));
  for (const c of [...lib?.types ?? [], ...lib?.tags ?? []]) ids.set(c.id, prefixed(c.id));
  for (const b of Object.values(blocks)) {
    const id = ids.get(b.id)!;
    const kept = renamed(b, ids);
    if (b.id === from.root) {
      if (kept.library) graph.blocks[slug]!.library = kept.library;
      continue;
    }
    forget(graph);
    graph.blocks[id] = { ...kept, id, parent: kept.parent ?? slug };
  }
  for (const e of Object.values(from.edges)) {
    const id = `${slug}.${e.id}`;
    graph.edges[id] = { ...renamed(e, ids), id };
  }
  return { filed: new Map([...said].map(([path, id]) => [path, ids.get(id)!])), clashes,
           named: from.blocks[from.root]?.name };
}

/** The definition a word names: an id or `pkg.name`; this package's; or the one the file's
 *  packages — else anything loaded — hold. Nothing, or more than one, and it is made here, at the
 *  package's root — a relation definition as a plain line — and said. */
function named(ctx: Ctx, word: string, kind: "block" | "relation"): Id {
  const { graph, slug, made } = ctx;
  const said = word.trim();
  const of_kind = fits_domain(graph, kind);
  /** A package never leans on the workspace, which it would have to carry. */
  const fits = (id: Id) => of_kind(id)
    && (slug === graph.root || package_of(graph, id) !== graph.root);
  const here = all_defs(graph).filter((d) => d.name === said && fits(d.id)
    && package_of(graph, d.id) === slug);
  if (here.length === 1) return here[0]!.id;
  const hit = def_ref(graph, said, { within: ctx.within, fits });
  if (hit) return hit;
  /** Each kind its own id, so a made block type and a made relation of one name stay apart. */
  const id = `${ctx.pre}${kind === "block" ? "type" : kind}.${slug_of(said)}`;
  if (!def_at(graph, id)) {
    forget(graph);
    graph.blocks[id] = { id, parent: slug, name: said, def: {},
                         ...(kind === "relation" ? { type: "line" } : {}) } as Block;
    made.set(said, id);
  }
  return id;
}

/** The tag a word names: this package's, or one the file's packages hold. Nothing, and it is
 *  made in this package's library. */
function tag_of(ctx: Ctx, word: string): Id {
  const said = word.trim();
  const hit = in_scope(ctx, all_tags(ctx.graph), said);
  if (hit) return hit;
  const id = tag_id(ctx.pre, said);
  library(ctx.graph, ctx.slug, ctx.pre, { tags: [{ name: said }] });
  ctx.made.set(said, id);
  return id;
}

/** What an attribute or an interface carries, by name: a form, a type of this package or the
 *  file's packages, or a block definition. Nothing, and an alias of text is made in this
 *  package's library. */
function type_of(ctx: Ctx, word: string): Id {
  const said = word.trim();
  if (is_form(said)) return said;
  const hit = in_scope(ctx, all_types(ctx.graph), said)
    ?? def_ref(ctx.graph, said, { within: ctx.within, fits: fits_domain(ctx.graph, "block") });
  if (hit) return hit;
  library(ctx.graph, ctx.slug, ctx.pre, { types: [{ name: said, form: "text" }] });
  ctx.made.set(said, type_id(ctx.pre, said));
  return type_id(ctx.pre, said);
}

/** A library type's id: its own kind, so a made block definition of one name (`type.`) and a
 *  made type stay apart. */
function type_id(pre: string, name: string): Id {
  return `${pre}datatype.${slug_of(name)}`;
}

/** A library tag's id. */
function tag_id(pre: string, name: string): Id {
  return `${pre}tag.${slug_of(name)}`;
}

/** A library constraint's id. */
function constraint_id(pre: string, name: string): Id {
  return `${pre}constraint.${slug_of(name)}`;
}

/** A constraint, by name: one of this package or the file's packages. Nothing, and an empty one
 *  is made in this package's library. */
function constraint_of(ctx: Ctx, word: string): Id {
  const said = word.trim();
  const hit = in_scope(ctx, all_constraints(ctx.graph), said);
  if (hit) return hit;
  library(ctx.graph, ctx.slug, ctx.pre, { constraints: [{ name: said }] });
  return constraint_id(ctx.pre, said);
}

/** A library interface definition's id. */
function interface_id(pre: string, name: string): Id {
  return `${pre}interface.${slug_of(name)}`;
}

/** What a port carries, by name: an interface definition of this package or the file's
 *  packages. Nothing, and one is made in this package's library. */
function interface_of(ctx: Ctx, word: string): Id {
  const said = word.trim();
  const hit = in_scope(ctx, all_interfaces(ctx.graph), said);
  if (hit) return hit;
  library(ctx.graph, ctx.slug, ctx.pre, { interfaces: [{ name: said }] });
  return interface_id(ctx.pre, said);
}

/** The one named component of this name the file may see: its own package's, else its packages'
 *  and `base`'s, else any loaded. */
function in_scope(ctx: Ctx, held: readonly { id: Id; name: string; pkg: Id }[],
                  name: string): Id | undefined {
  const hits = held.filter((c) => c.id === name || c.name === name);
  const own = hits.filter((c) => c.pkg === ctx.slug);
  if (own.length) return own[0]!.id;
  const seen = hits.filter((c) => ctx.within.includes(c.pkg));
  const pick = seen.length ? seen : hits;
  return pick.length === 1 ? pick[0]!.id : undefined;
}

/** Attributes from what usages answered: every name said, in the order first said, each typed
 *  by what all its values read as. */
function inferred(sets: readonly Value[][]): Attribute[] {
  const names = [...new Set(sets.flatMap((s) => s.map((v) => v.name)))];
  return names.map((name) => {
    const said = sets.flatMap((s) => s.filter((v) => v.name === name && v.value).map((v) => v.value));
    const type: (typeof FORMS)[number] = !said.length ? "text"
      : said.every((v) => /^-?\d+(\.\d+)?$/.test(v)) ? "number"
      : said.every((v) => v === "true" || v === "false") ? "flag"
      : said.every((v) => /^https?:\/\/\S+$/.test(v)) ? "link" : "text";
    return type === "text" ? { name } : { name, type };
  });
}

/** The id a source folder's `package.json` gives its package, where it says one. */
function declared(leaves: readonly Leaf[]): string | undefined {
  const text = leaves.find((l) => l.path === "package.json")?.text;
  try {
    const id = text ? (JSON.parse(text) as { id?: unknown }).id : undefined;
    return typeof id === "string" && id.trim() ? id : undefined;
  } catch { return undefined; }
}

/** A name as an id part: lower case, words joined by dashes. */
function slug_of(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "package";
}
