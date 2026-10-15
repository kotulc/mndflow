/** A diagram file, or a card source's frontmatter — the same thing with a body — spelled out in
 *  its long form: one block and its single layer, names in place of ids.
 *
 *  Syntax only. Short forms become the long form here; what a name stands for is the
 *  collection's to say. A key a block does not say itself with is a value. */

import { BLOCK_KEYS, names_in, said_as } from "./card";
import type { Dir, Value } from "./types";

/** A block as a file states it: the schema's fields, named rather than identified. */
export type Entry = {
  name: string;
  type?: string;
  def?: { attributes?: Record<string, unknown>[] };
  tags?: string[];
  traits?: string[];
  settings?: Record<string, unknown>;
  description?: string;
  body?: string;
  source?: string;
  of?: string;
  /** A block in the same file it sits in, by name or path; unsaid, the file's block. */
  parent?: string;
  /** Where it was written inside another entry: that entry's place in `blocks`. */
  under?: number;
  /** A note written on another entry is tied to it: that entry's place in `blocks`. */
  tied?: number;
  /** Its cell: row and column, each a header's name or a number. */
  cell?: [string | number, string | number];
  grid?: { merges?: unknown[] };
  values: Value[];
  w?: number;
  h?: number;
  side?: string;
  at?: number;
  flow?: string;
};

/** A relation as a file states it: its ends by name or path. */
export type Edge = {
  from: string;
  to: string;
  type?: string;
  name?: string;
  /** The way an arrow said it points; the collection stores it where the type says otherwise. */
  dir?: Dir;
  tags?: string[];
  settings?: Record<string, unknown>;
  values: Value[];
};

/** A file, spelled out: its block, the blocks it holds in file order, its relations, and the
 *  packages it uses. */
export type LongForm = { top: Entry; blocks: Entry[]; relations: Edge[]; packages: string[] };

/** The keys a relation says itself with. Any other key is a value. */
const EDGE_KEYS = ["from", "to", "type", "name", "dir", "tags", "settings", "values"] as const;

/** The arrows an edge is written with, and the way each points. */
const ARROWS: readonly [string, Dir][] = [["<->", "both"], ["->", "forward"], ["<-", "back"],
                                          ["--", "none"]];

type Map = Record<string, unknown>;


/** A file's map spelled out. `body`, where the file has one after its frontmatter, is the file
 *  block's. Throws, with what is wrong, where a short form cannot be read. */
export function long_form(front: Map, body?: string): LongForm {
  const top = entry(front);
  if (body) top.body = body;
  const blocks: Entry[] = [];
  const said = typeof front["note"] === "string" ? front["note"].trim() : "";
  /** A note on the file is about its whole layer: untied, it floats beside all of it. */
  if (said) blocks.push({ name: said, type: "note", values: [] });
  held(front, undefined, blocks);
  const relations = listed(front["relations"], "relations").flatMap(edges);
  const packages = listed(front["packages"], "packages").map((p) => said_as(p).trim())
    .filter(Boolean);
  return { top, blocks, relations, packages };
}

/** Whether a word is an edge: two names either side of an arrow. */
export function is_edge(word: string): boolean {
  return ARROWS.some(([arrow]) => word.includes(arrow));
}


/** The blocks a map holds, in file order: its header row and column, then its `blocks`, each
 *  followed by what it holds in turn. `under` is the entry the map is, where it is not the
 *  file's block. */
function held(map: Map, under: number | undefined, out: Entry[]): void {
  const heads = (key: "rows" | "cols") => listed(map[key], key).map((item, i) => {
    const e = typeof item === "string" ? { name: item, values: [] } as Entry : entry(item as Map);
    e.cell = key === "rows" ? [i + 1, 0] : [0, i + 1];
    return e;
  });
  for (const e of [...heads("cols"), ...heads("rows")]) out.push({ ...e, under });
  for (const item of listed(map["blocks"], "blocks")) {
    for (const [e, inner] of blocks_of(item)) {
      const at = out.length;
      out.push(e.parent ? e : { ...e, under });
      const said = typeof inner?.["note"] === "string" ? inner["note"].trim() : "";
      if (said) out.push({ ...note_on(said, e.parent ? undefined : under, at),
                           ...(e.parent ? { parent: e.parent } : {}) });
      if (inner) held(inner, at, out);
    }
  }
}

/** A note written on an entry: beside it, where it sits, and tied to it. */
function note_on(text: string, under: number | undefined, tied: number): Entry {
  return { name: text, type: "note", values: [], tied, ...(under !== undefined ? { under } : {}) };
}

/** One item of `blocks`: a name, `type: [names]`, or the long form — any other map. Each comes
 *  with the map it was read from, where it may hold blocks of its own. */
function blocks_of(item: unknown): [Entry, Map | null][] {
  if (typeof item === "string") return [[{ name: item, values: [] }, null]];
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error(`a block is a name or a map: ${said_as(item)}`);
  }
  const map = item as Map;
  const keys = Object.keys(map);
  const [type] = keys;
  const grouped = keys.length === 1 && Array.isArray(map[type!])
    && !(BLOCK_KEYS as readonly string[]).includes(type!);
  if (!grouped) return [[entry(map), map]];
  return (map[type!] as unknown[]).flatMap((one) => blocks_of(one))
    .map(([e, inner]) => [{ ...e, type: e.type ?? type }, inner]);
}

/** A block's long form: the keys it says itself with, and every other key a value. */
function entry(map: Map): Entry {
  const e: Entry = { name: said_as(map["name"]).trim(), values: values_of(map, BLOCK_KEYS) };
  const word = (key: string) => (map[key] === undefined ? undefined : said_as(map[key]).trim());
  const num = (key: string) => (typeof map[key] === "number" ? map[key] as number : undefined);
  const set = <K extends keyof Entry>(key: K, value: Entry[K] | undefined) => {
    if (value !== undefined && value !== "") e[key] = value;
  };
  set("type", word("type"));
  set("description", word("description"));
  set("body", map["body"] === undefined ? undefined : said_as(map["body"]));
  set("source", word("source"));
  set("of", word("of"));
  set("parent", word("parent"));
  set("side", word("side"));
  set("flow", word("flow"));
  set("w", num("w"));
  set("h", num("h"));
  set("at", num("at"));
  if ("def" in map) {
    e.def = (map["def"] && typeof map["def"] === "object" ? map["def"] : {}) as Entry["def"];
  }
  if ("tags" in map) e.tags = names_in(map["tags"]);
  if ("traits" in map) e.traits = names_in(map["traits"]);
  if (map["settings"] && typeof map["settings"] === "object") e.settings = map["settings"] as Map;
  if (map["grid"] && typeof map["grid"] === "object") e.grid = map["grid"] as Entry["grid"];
  set("cell", cell_of(map["cell"]));
  return e;
}

/** A cell: `[row, col]`, or `{ r, c }` as the schema stores it. */
function cell_of(value: unknown): Entry["cell"] {
  if (Array.isArray(value) && value.length === 2) {
    return value.map((v) => (typeof v === "number" ? v : said_as(v).trim())) as Entry["cell"];
  }
  if (value && typeof value === "object") {
    const { r, c } = value as { r?: unknown; c?: unknown };
    if (typeof r === "number" && typeof c === "number") return [r, c];
  }
  return undefined;
}

/** The edges one item of `relations` says: `A -> B`, `A -> B: name`, `type: [edges]`, or the
 *  long form (it says `from`). */
function edges(item: unknown): Edge[] {
  if (typeof item === "string") return [edge_of(item)];
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error(`a relation is an edge or a map: ${said_as(item)}`);
  }
  const map = item as Map;
  if ("from" in map) {
    const e: Edge = { from: said_as(map["from"]).trim(), to: said_as(map["to"]).trim(),
                      values: values_of(map, EDGE_KEYS) };
    if (map["type"] !== undefined) e.type = said_as(map["type"]).trim();
    if (map["name"] !== undefined) e.name = said_as(map["name"]).trim();
    const dir = said_as(map["dir"]).trim();
    if (ARROWS.some(([, d]) => d === dir)) e.dir = dir as Dir;
    if ("tags" in map) e.tags = names_in(map["tags"]);
    if (map["settings"] && typeof map["settings"] === "object") e.settings = map["settings"] as Map;
    return [e];
  }
  const keys = Object.keys(map);
  if (keys.length !== 1) throw new Error(`a relation says from and to: ${keys.join(", ")}`);
  const key = keys[0]!;
  if (is_edge(key)) {
    const name = said_as(map[key]).trim();
    return [{ ...edge_of(key), ...(name ? { name } : {}) }];
  }
  if (!Array.isArray(map[key])) throw new Error(`a relation type lists edges: ${key}`);
  return (map[key] as unknown[]).flatMap(edges).map((e) => ({ ...e, type: e.type ?? key }));
}

/** `A -> B`: its two ends and the way its arrow points. */
function edge_of(word: string): Edge {
  for (const [arrow, dir] of ARROWS) {
    const at = word.indexOf(arrow);
    if (at < 0) continue;
    return { from: word.slice(0, at).trim(), to: word.slice(at + arrow.length).trim(), dir,
             values: [] };
  }
  throw new Error(`an edge is two names and an arrow (->, <-, <->, --): ${word}`);
}

/** Every key a map does not say itself with, as a value; a `values` map or list added after. */
function values_of(map: Map, keys: readonly string[]): Value[] {
  const out: Value[] = Object.entries(map).filter(([k]) => !keys.includes(k))
    .map(([name, value]) => ({ name, value: said_as(value) }));
  const listed_values = map["values"];
  if (Array.isArray(listed_values)) {
    for (const v of listed_values as { name?: unknown; value?: unknown }[]) {
      if (v?.name !== undefined) out.push({ name: said_as(v.name), value: said_as(v.value) });
    }
  }
  else if (listed_values && typeof listed_values === "object") {
    for (const [name, value] of Object.entries(listed_values)) {
      out.push({ name, value: said_as(value) });
    }
  }
  return out;
}

/** A list a key holds; nothing said is an empty one. */
function listed(value: unknown, key: string): unknown[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(`${key} is a list`);
  return value;
}
