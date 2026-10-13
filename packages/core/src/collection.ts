/** A collection: a folder of markdown usages, and the JSON definitions they point at, as one
 *  package. **Read one way**: a folder becomes a package file, never the reverse.
 *
 *  `package.json`, where there is one, holds the package's graph; every other `.json` file under
 *  the folder is **one definition**, filed under the folder its directory names; every `.md` file
 *  is a usage — its frontmatter its identity and answers, the rest its body — and every directory
 *  a folder holder. A definition said twice is a clash, and refused. A type or tag a usage names
 *  and nothing loaded holds is made here, its attributes the union of what its usages answer,
 *  each type read off the values. */

import { names_in, read_card, said_as, USAGE_KEYS } from "./card";
import { all_defs, def_at, package_of } from "./defs";
import { write } from "./file";
import { is_tag } from "./tags";
import type { Leaf } from "./ports";
import type { Attribute, Block, Graph, Id, Value } from "./types";

/** What a collection came to: the package file, the definitions it had to make, and the files
 *  saying a definition already said, which it refused. */
export type Collected = { text: string; made: string[]; clashes: string[] };

/** The file a collection keeps its definitions in. */
export const DEFINITIONS = "package.json";

const MARKDOWN = /\.(md|mdx)$/i;
const JSON_FILE = /\.json$/i;


/** A collection's files as a package file, read against what `over` already holds. */
export function collect(name: string, leaves: readonly Leaf[], over: Graph,
                        { bare = false }: { bare?: boolean } = {}): Collected {
  const slug = slug_of(name);
  /** Collected again, a package replaces what was loaded of it, relationships and all. */
  const mine = (id: Id) => package_of(over, id) === slug;
  const graph: Graph = { root: over.root,
    blocks: Object.fromEntries(Object.entries(over.blocks).filter(([id]) => !mine(id))),
    edges: Object.fromEntries(Object.entries(over.edges)
      .filter(([, e]) => !mine(e.from) && !mine(e.to))) };
  graph.blocks[slug] = { id: slug, parent: null, name };
  const sorted = [...leaves].sort((a, z) => a.path.localeCompare(z.path));
  const files = sorted.filter((l) => l.path !== DEFINITIONS && JSON_FILE.test(l.path));
  const { filed, clashes } = defined(graph, slug,
                                     sorted.find((l) => l.path === DEFINITIONS)?.text, files, bare);

  const orders = new Map<Id, number>();
  const next = (parent: Id) => { orders.set(parent, (orders.get(parent) ?? 0) + 1);
                                 return orders.get(parent)!; };
  /** The folder a directory names, made the first time it is met: in the definitions tree, since
   *  it files definitions. */
  const folder = (parts: readonly string[]): Id => {
    let parent = slug;
    for (const [n, part] of parts.entries()) {
      const id = `${slug}.dir.${parts.slice(0, n + 1).join(".")}`;
      graph.blocks[id] ??= { id, parent, name: part, type: "folder", order: next(parent),
                             ...(n === 0 ? { tree: "definitions" as const } : {}) };
      parent = id;
    }
    return parent;
  };
  /** A definition file sits in its directory's folder, after what is there. */
  for (const [path, id] of filed) {
    const parent = folder(path.split("/").filter(Boolean).slice(0, -1));
    graph.blocks[id] = { ...graph.blocks[id]!, parent, order: next(parent) };
  }
  const made = new Map<string, Id>();
  const answers = new Map<Id, Value[][]>();

  for (const leaf of sorted) {
    if (!MARKDOWN.test(leaf.path)) continue;
    const parts = leaf.path.split("/").filter(Boolean);
    const file = parts.pop()!;
    const parent = folder(parts);
    let card: ReturnType<typeof read_card>;
    try { card = read_card(leaf.text); }
    catch { card = { front: {}, body: leaf.text }; }
    const { front, body } = card;
    const values = Object.entries(front)
      .filter(([k]) => !(USAGE_KEYS as readonly string[]).includes(k))
      .map(([k, v]): Value => ({ name: k, value: said_as(v) }));
    const said = said_as(front["type"]).trim();
    const type = said ? named(graph, slug, said, "block", made) : undefined;
    if (type) answers.set(type, [...(answers.get(type) ?? []), values]);
    const tags = names_in(front["tags"]).map((t) => named(graph, slug, t, "tag", made));
    const id = `${slug}.md.${[...parts, file.replace(MARKDOWN, "")].join(".")}`;
    graph.blocks[id] = {
      id, parent, name: said_as(front["name"]).trim() || file.replace(MARKDOWN, ""),
      ...(type ? { type } : {}), ...("tags" in front ? { tags } : {}),
      source: said_as(front["source"]).trim() || leaf.path, order: next(parent),
      ...(values.length ? { values } : {}), ...(body ? { body } : {}),
    };
  }

  /** A made definition declares what its usages answer. */
  for (const [type, sets] of answers) {
    const d = graph.blocks[type];
    if (!d?.def || ![...made.values()].includes(type)) continue;
    d.def = { attributes: inferred(sets) };
  }
  return { text: write(graph, slug, slug), made: [...made.keys()], clashes };
}


/** A package's graph and its definition files, laid under the collection's root: its root
 *  becomes this one, and every id they wrote keeps its own prefix or takes this one — or stays
 *  bare, where asked, as `base`'s do. A file saying a definition already said is a clash, and
 *  skipped; one that is a package file, not a definition, is not read. Gives back which block each
 *  file came to, by path, and the clashes. */
function defined(graph: Graph, slug: Id, text: string | undefined, files: readonly Leaf[],
                 bare: boolean): { filed: Map<string, Id>; clashes: string[] } {
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
  const ids = new Map<Id, Id>([[from.root, slug]]);
  for (const id of Object.keys(blocks)) {
    if (id === from.root) continue;
    ids.set(id, bare || id.startsWith(`${slug}.`) ? id
      : id.startsWith(`${from.root}.`) ? `${slug}.${id.slice(from.root.length + 1)}`
      : `${slug}.${id}`);
  }
  const at = (id: Id | undefined) => (id === undefined ? undefined : ids.get(id) ?? id);
  const all = (list: Id[] | undefined) => list?.map((x) => at(x)!);
  for (const b of Object.values(blocks)) {
    if (b.id === from.root) continue;
    const id = at(b.id)!;
    graph.blocks[id] = { ...b, id, parent: at(b.parent ?? undefined) ?? slug,
                         ...(b.type ? { type: at(b.type) } : {}), ...(b.of ? { of: at(b.of) } : {}),
                         ...(b.tags ? { tags: all(b.tags) } : {}),
                         ...(b.traits ? { traits: all(b.traits) } : {}),
                         ...(b.def?.attributes ? { def: { attributes: b.def.attributes
                           .map((a) => (a.type ? { ...a, type: at(a.type) } : a)) } } : {}) };
  }
  for (const e of Object.values(from.edges)) {
    const id = `${slug}.${e.id}`;
    graph.edges[id] = { ...e, id, from: at(e.from)!, to: at(e.to)!,
                        ...(e.type ? { type: at(e.type) } : {}),
                        ...(e.tags ? { tags: all(e.tags) } : {}) };
  }
  return { filed: new Map([...said].map(([path, id]) => [path, at(id)!])), clashes };
}

/** The definition a word names: this package's, or the one loaded package's that holds it.
 *  Nothing, or more than one, and it is made here, at the package's root: how a package is
 *  arranged is its own file's to say. */
function named(graph: Graph, slug: Id, word: string, kind: "block" | "tag",
               made: Map<string, Id>): Id {
  const fits = (id: Id) => (kind === "tag") === is_tag(graph, id);
  if (def_at(graph, word) && fits(word) && package_of(graph, word) !== graph.root) return word;
  /** A package never leans on the workspace, which it would have to carry. */
  const hits = all_defs(graph).filter((d) => d.name === word && fits(d.id)
    && package_of(graph, d.id) !== graph.root);
  const here = hits.find((d) => package_of(graph, d.id) === slug);
  const hit = here ?? (hits.length === 1 ? hits[0] : undefined);
  if (hit) return hit.id;
  const id = `${slug}.${kind === "tag" ? "tag" : "type"}.${slug_of(word)}`;
  if (!graph.blocks[id]) {
    graph.blocks[id] = { id, parent: slug, name: word, def: {},
                         ...(kind === "tag" ? { type: "tag" } : {}) } as Block;
    made.set(word, id);
  }
  return id;
}

/** Attributes from what usages answered: every name said, in the order first said, each typed
 *  by what all its values read as. */
function inferred(sets: readonly Value[][]): Attribute[] {
  const names = [...new Set(sets.flatMap((s) => s.map((v) => v.name)))];
  return names.map((name) => {
    const said = sets.flatMap((s) => s.filter((v) => v.name === name && v.value).map((v) => v.value));
    const type = !said.length ? "text"
      : said.every((v) => /^-?\d+(\.\d+)?$/.test(v)) ? "number"
      : said.every((v) => v === "true" || v === "false") ? "flag"
      : said.every((v) => /^https?:\/\/\S+$/.test(v)) ? "link" : "text";
    return type === "text" ? { name } : { name, type };
  });
}

/** A name as an id part: lower case, words joined by dashes. */
function slug_of(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "package";
}
