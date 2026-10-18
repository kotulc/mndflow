/** A diagram file, or a card source's frontmatter — the same thing with a body — spelled out in
 *  its long form: one block and its single layer, names in place of ids.
 *
 *  Syntax only. Short forms become the long form here; what a name stands for is the
 *  source folder's to say. A key a block does not say itself with is a value. */

import { BLOCK_KEYS, names_in, said_as } from "./card";
import type { Dir, Ends, Value } from "./types";

/** A block as a file states it: the schema's fields, named rather than identified. */
export type Entry = {
  name: string;
  type?: string;
  def?: { attributes?: Record<string, unknown>[]; ends?: Ends };
  tags?: string[];
  constraints?: string[];
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
  /** A note written on another entry is tied to it: that entry's place in `blocks`, or -1 for the
   *  file's block. */
  tied?: number;
  /** A note written on a port: the port's name, on the entry it is tied to. */
  port?: string;
  /** Its cell: row and column, each a header's name or a number. */
  cell?: [string | number, string | number];
  grid?: { merges?: unknown[] };
  values: Value[];
  /** A collection's records: rows of answers, by attribute name. */
  records?: Record<string, string>[];
  w?: number;
  h?: number;
  /** Its ports, in order. */
  ports?: PortEntry[];
};

/** A port as a file states it: its name, and its interface definition by name. */
export type PortEntry = { name: string; type?: string; description?: string; flow?: string;
                          side?: string; at?: number; note?: string };

/** A relation as a file states it: its ends by name or path. */
export type Edge = {
  from: string;
  to: string;
  type?: string;
  name?: string;
  /** The way an arrow said it points; the source folder stores it where the type says otherwise. */
  dir?: Dir;
  tags?: string[];
  constraints?: string[];
  settings?: Record<string, unknown>;
  values: Value[];
  /** What its ends mean: multiplicity and role, as a line may say them. */
  ends?: Ends;
};

/** A file, spelled out: its block, the blocks it holds in file order, its relations, the packages
 *  it uses, and the named components it adds to its package's library. */
export type LongForm = { top: Entry; blocks: Entry[]; relations: Edge[]; packages: string[];
                         library: LibrarySaid };

/** The named components a file adds to its package's library, by kind. */
export type LibrarySaid = { types: Record<string, unknown>[]; tags: Record<string, unknown>[];
                            interfaces: Record<string, unknown>[];
                            constraints: Record<string, unknown>[] };

/** The keys a relation says itself with. Any other key is a value. */
const EDGE_KEYS = ["from", "to", "type", "name", "dir", "tags", "constraints", "settings", "values",
                   "ends"] as const;

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
  noted(top, -1, undefined, blocks);
  held(front, undefined, blocks);
  const relations = listed(front["relations"], "relations").flatMap(edges);
  const packages = listed(front["packages"], "packages").map((p) => said_as(p).trim())
    .filter(Boolean);
  const lib = (front["library"] ?? {}) as Map;
  const named = (key: string) => listed(lib[key], `library.${key}`)
    .map((item) => (typeof item === "string" ? { name: item } : item as Map));
  return { top, blocks, relations, packages,
           library: { types: named("types"), tags: named("tags"), interfaces: named("interfaces"),
                      constraints: named("constraints") } };
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
      noted(e, at, e.parent ? undefined : under, out);
      if (inner) held(inner, at, out);
    }
  }
}

/** The notes written on an entry's ports, each tied to its port. */
function noted(e: Entry, at: number, under: number | undefined, out: Entry[]): void {
  for (const p of e.ports ?? []) {
    if (p.note) out.push({ ...note_on(p.note, under, at), port: p.name });
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
  set("w", num("w"));
  set("h", num("h"));
  if ("ports" in map) e.ports = listed(map["ports"], "ports").map(port_of);
  if ("def" in map) {
    e.def = (map["def"] && typeof map["def"] === "object" ? map["def"] : {}) as Entry["def"];
  }
  if ("tags" in map) e.tags = names_in(map["tags"]);
  if ("constraints" in map) e.constraints = names_in(map["constraints"]);
  if ("traits" in map) e.traits = names_in(map["traits"]);
  if (map["settings"] && typeof map["settings"] === "object") e.settings = map["settings"] as Map;
  if (map["grid"] && typeof map["grid"] === "object") e.grid = map["grid"] as Entry["grid"];
  if (Array.isArray(map["records"])) {
    e.records = (map["records"] as unknown[]).filter((r) => r && typeof r === "object")
      .map((r) => Object.fromEntries(Object.entries(r as Map).map(([k, v]) => [k, said_as(v)])));
  }
  set("cell", cell_of(map["cell"]));
  return e;
}

/** One item of `ports`: a name, or a map of what it says. */
function port_of(item: unknown): PortEntry {
  if (typeof item === "string") return { name: item.trim() };
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error(`a port is a name or a map: ${said_as(item)}`);
  }
  const map = item as Map;
  const word = (key: string) => (map[key] === undefined ? undefined : said_as(map[key]).trim());
  const out: PortEntry = { name: word("name") ?? "" };
  for (const key of ["type", "description", "flow", "side", "note"] as const) {
    const said = word(key);
    if (said) out[key] = said;
  }
  if (typeof map["at"] === "number") out.at = map["at"];
  return out;
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
    if (map["ends"] && typeof map["ends"] === "object") e.ends = map["ends"] as Ends;
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
