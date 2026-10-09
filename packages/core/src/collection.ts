/** A collection: a folder of markdown usages, and the JSON definitions they point at, as one
 *  package.
 *
 *  `package.json`, where there is one, holds the definitions; every `.md` file under the folder is
 *  a usage — its frontmatter its identity and answers, the rest its body — and every folder a
 *  folder holder. A type or tag a usage names and nothing loaded holds is made here, its
 *  attributes the union of what its usages answer, each type read off the values. */

import { names_in, read_card, said_as, USAGE_KEYS } from "./card";
import { all_defs, def_at, package_of } from "./defs";
import { write } from "./file";
import { is_tag } from "./tags";
import type { Leaf } from "./ports";
import type { Attribute, Block, Graph, Id, Value } from "./types";

/** What a collection came to: the package file, and the definitions it had to make. */
export type Collected = { text: string; made: string[] };

/** The file a collection keeps its definitions in. */
export const DEFINITIONS = "package.json";

const MARKDOWN = /\.(md|mdx)$/i;


/** A collection's files as a package file, read against what `over` already holds. */
export function collect(name: string, leaves: readonly Leaf[], over: Graph): Collected {
  const slug = slug_of(name);
  const graph: Graph = { root: over.root, blocks: { ...over.blocks }, edges: { ...over.edges } };
  graph.blocks[slug] = { id: slug, parent: null, name };
  const own = leaves.find((l) => l.path === DEFINITIONS);
  if (own) defined(graph, slug, own.text);

  const orders = new Map<Id, number>();
  const next = (parent: Id) => { orders.set(parent, (orders.get(parent) ?? 0) + 1);
                                 return orders.get(parent)!; };
  const made = new Map<string, Id>();
  const answers = new Map<Id, Value[][]>();

  for (const leaf of [...leaves].sort((a, z) => a.path.localeCompare(z.path))) {
    if (!MARKDOWN.test(leaf.path)) continue;
    const parts = leaf.path.split("/").filter(Boolean);
    const file = parts.pop()!;
    let parent = slug;
    for (const [n, part] of parts.entries()) {
      const id = `${slug}.dir.${parts.slice(0, n + 1).join(".")}`;
      graph.blocks[id] ??= { id, parent, name: part, type: "folder", order: next(parent) };
      parent = id;
    }
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
      ...(type ? { type } : {}), ...(tags.length ? { tags } : {}),
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
  return { text: write(graph, slug, slug), made: [...made.keys()] };
}


/** A package's definitions, laid under the collection's root: its root becomes this one, and
 *  every id it wrote keeps its own prefix or takes this one. */
function defined(graph: Graph, slug: Id, text: string): void {
  let file: { graph?: Graph };
  try { file = JSON.parse(text) as { graph?: Graph }; }
  catch { return; }
  const from = file.graph;
  if (!from?.blocks || !from.root) return;
  const ids = new Map<Id, Id>([[from.root, slug]]);
  for (const id of Object.keys(from.blocks)) {
    if (id === from.root) continue;
    ids.set(id, id.startsWith(`${slug}.`) ? id
      : id.startsWith(`${from.root}.`) ? `${slug}.${id.slice(from.root.length + 1)}`
      : `${slug}.${id}`);
  }
  const at = (id: Id | undefined) => (id === undefined ? undefined : ids.get(id) ?? id);
  for (const b of Object.values(from.blocks)) {
    if (b.id === from.root) continue;
    const id = at(b.id)!;
    graph.blocks[id] = { ...b, id, parent: at(b.parent ?? undefined) ?? slug,
                         ...(b.type ? { type: at(b.type) } : {}), ...(b.of ? { of: at(b.of) } : {}),
                         ...(b.tags ? { tags: b.tags.map((t) => at(t)!) } : {}),
                         ...(b.traits ? { traits: b.traits.map((t) => at(t)!) } : {}),
                         ...(b.def?.attributes ? { def: { attributes: b.def.attributes
                           .map((a) => (a.type ? { ...a, type: at(a.type) } : a)) } } : {}) };
  }
  for (const e of Object.values(from.edges ?? {})) {
    const id = `${slug}.${e.id}`;
    graph.edges[id] = { ...e, id, from: at(e.from)!, to: at(e.to)!,
                        ...(e.type ? { type: at(e.type) } : {}) };
  }
}

/** The definition a word names: this package's, or the one loaded package's that holds it.
 *  Nothing, or more than one, and it is made here. */
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
    const holder = `${slug}.${kind === "tag" ? "tags" : "types"}`;
    graph.blocks[holder] ??= { id: holder, parent: slug, name: kind === "tag" ? "tags" : "types",
                               type: "folder", order: 0 };
    graph.blocks[id] = { id, parent: holder, name: word, def: {},
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
