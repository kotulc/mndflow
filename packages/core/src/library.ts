/** Named components: the types and tags a package holds as data on its root, beside its blocks.
 *  Never blocks, never drawn on a layer; elements carry them by id. */

import { base_of, def_at, def_named, is_tie, packages, tags_stated } from "./defs";
import { holders_over, is_group, is_region } from "./holders";
import { FORMS, type Form, type Graph, type Id, type Library, type Mutation, type Tag,
         type Type } from "./types";

/** A named component and the package holding it. */
export type Named<T> = T & { pkg: Id };


/** A package's library, empty where it holds none. */
export function library_of(graph: Graph, pkg: Id): Library {
  return graph.blocks[pkg]?.library ?? {};
}

/** Every tag of every package, the workspace's first. */
export function all_tags(graph: Graph): Named<Tag>[] {
  return held(graph, "tags");
}

/** Every type of every package, the workspace's first. */
export function all_types(graph: Graph): Named<Type>[] {
  return held(graph, "types");
}

/** One kind of named component across every package, the workspace's first. */
function held<K extends "tags" | "types">(graph: Graph, kind: K): Named<NonNullable<Library[K]>[number]>[] {
  const roots = packages(graph).sort((a, z) => Number(z.id === graph.root) - Number(a.id === graph.root));
  return roots.flatMap((p) => (p.library?.[kind] ?? []).map((c) => ({ ...c, pkg: p.id })));
}

/** The tag with this id. */
export function tag_at(graph: Graph, id: Id | undefined): Named<Tag> | undefined {
  return id ? all_tags(graph).find((t) => t.id === id) : undefined;
}

/** Whether an id names a tag. */
export function is_tag(graph: Graph, id: Id | undefined): boolean {
  return !!tag_at(graph, id);
}

/** The tag a word names: by id, or by name, the workspace's own first. */
export function tag_named(graph: Graph, word: string): Named<Tag> | undefined {
  const want = word.trim();
  return tag_at(graph, want) ?? all_tags(graph).find((t) => t.name === want);
}

/** The type with this id. */
export function type_at(graph: Graph, id: Id | undefined): Named<Type> | undefined {
  return id ? all_types(graph).find((t) => t.id === id) : undefined;
}

/** The type a word names: by id, or by name, the workspace's own first. */
export function type_named(graph: Graph, word: string): Named<Type> | undefined {
  const want = word.trim();
  return type_at(graph, want) ?? all_types(graph).find((t) => t.name === want);
}

/** Whether a word is one of the engine's forms. */
export function is_form(word: string | undefined): word is Form {
  return (FORMS as readonly unknown[]).includes(word);
}

/** What a word names as a type: a form, a type, or a block definition — by id or by name, the
 *  workspace's own first. */
export function typed_as(graph: Graph, word: string): Id | undefined {
  const want = word.trim();
  if (is_form(want)) return want;
  if (def_at(graph, want)) return want;
  return type_named(graph, want)?.id ?? def_named(graph, want, "block")?.id;
}

/** What a type id reads as: its type's name, a definition's, or the form itself. */
export function type_name(graph: Graph, id: Id | undefined): string {
  if (!id) return "text";
  return type_at(graph, id)?.name ?? def_at(graph, id)?.name ?? id;
}

/** The package a named component is held in. */
export function library_home(graph: Graph, id: Id): Id | undefined {
  return (tag_at(graph, id) ?? type_at(graph, id))?.pkg;
}

/** The tags an element carries, in order: the nearest list its chain states. */
export function tags_of(graph: Graph, id: Id): Id[] {
  return tags_stated(graph, id).ids;
}

/** Whether a name is held in a package's library, by anything but `except`. */
export function library_names(graph: Graph, pkg: Id, name: string, except?: Id): boolean {
  const lib = library_of(graph, pkg);
  return [...lib.types ?? [], ...lib.tags ?? []].some((c) => c.id !== except && c.name === name);
}

/** A package's library with one tag put in, or replaced by id. */
export function put_tag(graph: Graph, pkg: Id, tag: Tag): Mutation {
  const lib = library_of(graph, pkg);
  return { op: "set_library", id: pkg, library: { ...lib, tags: put(lib.tags, tag) } };
}

/** A package's library with one type put in, or replaced by id. */
export function put_type(graph: Graph, pkg: Id, type: Type): Mutation {
  const lib = library_of(graph, pkg);
  return { op: "set_library", id: pkg, library: { ...lib, types: put(lib.types, type) } };
}

/** Each library holding one of these components, with them taken out. */
export function drop_named(graph: Graph, ids: readonly Id[]): Mutation[] {
  const pkgs = new Set(ids.map((id) => library_home(graph, id)).filter((p): p is Id => !!p));
  const keep = <T extends { id: Id }>(list: T[] | undefined) => list?.filter((c) => !ids.includes(c.id));
  return [...pkgs].map((pkg) => {
    const lib = library_of(graph, pkg);
    return { op: "set_library", id: pkg, library: { types: keep(lib.types), tags: keep(lib.tags) } };
  });
}

/** A list with one entry put in, or replaced where its id is there. */
function put<T extends { id: Id }>(list: T[] | undefined, one: T): T[] {
  const had = (list ?? []).some((c) => c.id === one.id);
  return had ? list!.map((c) => (c.id === one.id ? one : c)) : [...list ?? [], one];
}

/** What uses a named component: blocks and lines carrying a tag, and blocks with an attribute
 *  typed by a type. */
export function users_of(graph: Graph, id: Id): Id[] {
  const blocks = Object.values(graph.blocks).filter((b) => b.tags?.includes(id)
    || b.def?.attributes?.some((a) => a.type === id));
  const lines = Object.values(graph.edges).filter((e) => e.tags?.includes(id));
  return [...blocks, ...lines].map((x) => x.id);
}

/** Whether a package holds anything named, so the explorer lists its library. */
export function has_library(graph: Graph, pkg: Id): boolean {
  const lib = library_of(graph, pkg);
  return !!(lib.types?.length || lib.tags?.length);
}

/** A tag an annotation gives a block by its name: a group's or a region's, to what it encloses; a
 *  label's, to what it is tied to. Derived, never stored on the member. */
export type Given = { name: string; from: Id; tie?: Id };

/** The tags annotations give a block, nearest enclosure first, then its labels. */
export function given_of(graph: Graph, id: Id): Given[] {
  const out: Given[] = [];
  for (const h of holders_over(graph, id)) {
    const name = h.name?.trim();
    if (name && (is_group(graph, h.id) || is_region(graph, h.id))) out.push({ name, from: h.id });
  }
  for (const e of Object.values(graph.edges)) {
    const other = e.from === id ? e.to : e.to === id ? e.from : null;
    const name = other ? graph.blocks[other]?.name?.trim() : "";
    if (other && name && is_tie(graph, e.id) && base_of(graph, other) === "label") {
      out.push({ name, from: other, tie: e.id });
    }
  }
  return out;
}
