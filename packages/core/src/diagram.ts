/** A diagram file, or a card source's frontmatter — the same thing with a body — spelled out in
 *  its long form: one block and its single layer, names in place of ids.
 *
 *  Syntax only. Short forms become the long form here; what a name stands for is the
 *  source folder's to say. A block's answers are under `values`; a key nothing reads is dropped,
 *  and named in `dropped` so the source folder can say so. */

import { BLOCK_KEYS, is_block_key, names_in, said_as, values_in } from "./card";
import type { Dir, Ends, Fragment, Value } from "./types";

/** A block as a file states it: the schema's fields, named rather than identified. */
export type Entry = {
  name: string;
  type?: string;
  def?: { attributes?: Record<string, unknown>[]; ends?: Ends };
  tags?: string[];
  /** The groups on its layer it is in, by name: membership, apart from its tags. */
  groups?: string[];
  constraints?: string[];
  traits?: string[];
  settings?: Record<string, unknown>;
  description?: string;
  body?: string;
  source?: string;
  of?: string;
  /** A dataflow's datum: the definition it traces, by name. */
  datum?: string;
  /** A sequence's fragments, as written. */
  fragments?: Fragment[];
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
  grid?: { merges?: unknown[]; labels?: { r: number; c: number; text: string }[] };
  values: Value[];
  /** The keys it said that nothing reads, dropped. */
  dropped?: string[];
  /** A collection's records: rows of answers, by attribute name. */
  records?: Record<string, string>[];
  w?: number;
  h?: number;
  /** Its ports, in order. */
  ports?: PortEntry[];
  /** What it stands for is a definition, looked for among definitions alone (`FileSpec`). */
  defs?: boolean;
  /** A model's overview, as its file says it: boxes open, About's groups, presentations. */
  open?: string[];
  about?: { name: string; items?: string[] }[];
  presentations?: PresentationSaid[];
};

/** A presentation as a file says it: names where the graph holds ids (types `Presentation`). */
export type PresentationSaid = { name: string; description?: string; pace?: number;
                                 stops: StopSaid[] };

/** A stop as a file says it; a step's `relation` is written as in `relations:`, `A -> B`. */
export type StopSaid = { title: string; at: string; summary: string; open?: string[];
                         fit?: string[]; show?: string; into?: string; pace?: number;
                         steps: { text: string; relation?: string; mark?: string }[] };

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
  /** The keys it said that nothing reads, dropped. */
  dropped?: string[];
};

/** The keys a relation's long form says itself with. */
const EDGE_KEYS = ["from", "to", "type", "name", "dir", "tags", "constraints", "settings", "values",
                   "ends"] as const;

/** A file, spelled out: its block, the blocks it holds in file order, and its relations. A file
 *  uses its package's definitions and defines none: definitions are the package's JSON. */
export type LongForm = { top: Entry; blocks: Entry[]; relations: Edge[] };

/** **What a diagram kind says of the files that write it** (`diagram.file`), by key: the schema's
 *  key it spells (`as`: a sequence's `participants` are its `cols`), the type a bare item under it
 *  takes (`type`), whether what such an item stands for is a definition (`defs`), and, for
 *  `records`, the answers a record written as a relation fills (`ends`: a mapping's `reads`,
 *  `writes` and `info`, from `reads -> writes: info`). */
export type FileSpec = Record<string, { as?: string; type?: string; defs?: boolean;
                                        ends?: string[] }>;

/** The lists a file's map holds items in, each taking its kind's default type. */
const LISTS = ["blocks", "cols", "rows", "relations"] as const;
type Defaults = Partial<Record<(typeof LISTS)[number], { type?: string; defs?: boolean }>>;

/** The arrows an edge is written with, and the way each points. */
const ARROWS: readonly [string, Dir][] = [["<->", "both"], ["->", "forward"], ["<-", "back"],
                                          ["--", "none"]];

type Map = Record<string, unknown>;


/** A file's map spelled out, as its kind's `spec` says to read it. `body`, where the file has one
 *  after its frontmatter, is the file block's. Throws, with what is wrong, where a short form
 *  cannot be read. */
export function long_form(map: Map, body?: string, spec: FileSpec = {}): LongForm {
  const { front, defaults } = respelled(map, spec);
  const top = entry(front, spec["records"]?.ends);
  if (body) top.body = body;
  const blocks: Entry[] = [];
  const said = typeof front["note"] === "string" ? front["note"].trim() : "";
  /** A note on the file is about its whole layer: untied, it floats beside all of it. */
  if (said) blocks.push({ name: said, type: "note", values: [] });
  noted(top, -1, undefined, blocks);
  held(front, undefined, blocks, top, defaults);
  const kind = defaults.relations?.type;
  const relations = listed(front["relations"], "relations").flatMap(edges)
    .map((e) => (kind && !e.type ? { ...e, type: kind } : e));
  return { top, blocks, relations };
}

/** A file's map with its kind's keys spelled as the schema's (`participants` as `cols`), and the
 *  default each list's bare items take. */
function respelled(said: Map, spec: FileSpec): { front: Map; defaults: Defaults } {
  const front = { ...said };
  const defaults: Defaults = {};
  for (const [key, one] of Object.entries(spec)) {
    const to = (one.as ?? key) as (typeof LISTS)[number];
    if (one.as && key in front) {
      front[one.as] = front[key];
      delete front[key];
    }
    if (LISTS.includes(to)) defaults[to] = { type: one.type, defs: one.defs };
  }
  return { front, defaults };
}

/** Whether a word is an edge: two names either side of an arrow. */
export function is_edge(word: string): boolean {
  return ARROWS.some(([arrow]) => word.includes(arrow));
}


/** The blocks a map holds, in file order: its header row and column, then its `blocks`, each
 *  followed by what it holds in turn. `under` is the entry the map is, where it is not the
 *  file's block; `owner` is that entry. **A header said as a word is a label**, plain data on
 *  the owner's grid; said as a block, it is a block standing for a concept (2026-11-05). */
function held(map: Map, under: number | undefined, out: Entry[], owner: Entry,
              defaults: Defaults = {}): void {
  const labels: { r: number; c: number; text: string }[] = [];
  /** A header said as a word is a label, unless its kind types its headers. */
  const heads = (key: "rows" | "cols") => listed(map[key], key).flatMap((item, i) => {
    const cell: [number, number] = key === "rows" ? [i + 1, 0] : [0, i + 1];
    if (typeof item === "string" && !defaults[key]?.type) {
      labels.push({ r: cell[0], c: cell[1], text: item.trim() });
      return [];
    }
    return blocks_of(item, defaults[key]).map(([e]) => ({ ...e, cell }));
  });
  for (const e of [...heads("cols"), ...heads("rows")]) out.push({ ...e, under });
  if (labels.length) {
    owner.grid = { ...owner.grid, labels: [...labels, ...(owner.grid?.labels ?? [])] };
  }
  for (const item of listed(map["blocks"], "blocks")) {
    for (const [e, inner] of blocks_of(item, under === undefined ? defaults.blocks : {})) {
      const at = out.length;
      out.push(e.parent ? e : { ...e, under });
      const said = typeof inner?.["note"] === "string" ? inner["note"].trim() : "";
      if (said) out.push({ ...note_on(said, e.parent ? undefined : under, at),
                           ...(e.parent ? { parent: e.parent } : {}) });
      noted(e, at, e.parent ? undefined : under, out, e.parent);
      if (inner) held(inner, at, out, out[at]!);
    }
  }
}

/** The notes written on an entry's ports, each tied to its port, beside the entry: under the
 *  same entry, or the same `parent` where one is said. */
function noted(e: Entry, at: number, under: number | undefined, out: Entry[],
               parent?: string): void {
  for (const p of e.ports ?? []) {
    if (!p.note) continue;
    out.push({ ...note_on(p.note, under, at), port: p.name, ...(parent ? { parent } : {}) });
  }
}

/** A note written on an entry: beside it, where it sits, and tied to it. */
function note_on(text: string, under: number | undefined, tied: number): Entry {
  return { name: text, type: "note", values: [], tied, ...(under !== undefined ? { under } : {}) };
}

/** One item of `blocks`: a name, `type: name`, `type: [names]`, or the long form — any other
 *  map. Each comes with the map it was read from, where it may hold blocks of its own. An item
 *  saying no type takes the one its kind says (`fallback`). */
function blocks_of(item: unknown, fallback: Defaults["blocks"] = {}): [Entry, Map | null][] {
  const typed = ([e, inner]: [Entry, Map | null]): [Entry, Map | null] => [
    { ...e, ...(!e.type && fallback.type ? { type: fallback.type } : {}),
      ...(fallback.defs ? { defs: true } : {}) }, inner];
  if (typeof item === "string") return [typed([{ name: item.trim(), values: [] }, null])];
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error(`a block is a name or a map: ${said_as(item)}`);
  }
  const map = item as Map;
  const keys = Object.keys(map);
  const [type] = keys;
  /** One key that is no block key, over a name or a list: blocks of that type. */
  const one = keys.length === 1 && !is_block_key(type!);
  if (one && typeof map[type!] === "string") {
    return [[{ name: (map[type!] as string).trim(), type, values: [] }, null]];
  }
  if (!one || !Array.isArray(map[type!])) return [typed([entry(map), map])];
  return (map[type!] as unknown[]).flatMap((x) => blocks_of(x))
    .map(([e, inner]) => [{ ...e, type: e.type ?? type }, inner]);
}

/** A block's long form: the keys it says itself with, its answers under `values`; its records
 *  read as its kind says (`ends`, `record_of`). */
function entry(map: Map, ends?: readonly string[]): Entry {
  const e: Entry = { name: said_as(map["name"]).trim(), values: values_of(map),
                     ...unread(map, BLOCK_KEYS) };
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
  set("datum", word("datum"));
  if (Array.isArray(map["fragments"])) e.fragments = fragments_of(map["fragments"]);
  set("parent", word("parent"));
  set("w", num("w"));
  set("h", num("h"));
  if ("ports" in map) e.ports = ports_of(map["ports"]);
  /** **A file states no definition**: definitions are the package's JSON (a model, typed so, is
   *  the one a file makes). */
  if ("def" in map) e.dropped = [...e.dropped ?? [], "def"];
  if ("tags" in map) e.tags = names_in(map["tags"]);
  if ("groups" in map) e.groups = names_in(map["groups"]);
  /** A group holds nothing: its members say `groups:`. */
  if (e.type === "group" && "blocks" in map) {
    throw new Error(`group "${e.name}" lists blocks: its members say \`groups:\` instead`);
  }
  if ("constraints" in map) e.constraints = names_in(map["constraints"]);
  if ("traits" in map) e.traits = names_in(map["traits"]);
  if (map["settings"] && typeof map["settings"] === "object") e.settings = map["settings"] as Map;
  if (map["grid"] && typeof map["grid"] === "object") e.grid = map["grid"] as Entry["grid"];
  if (Array.isArray(map["records"])) {
    e.records = (map["records"] as unknown[]).map((r) => record_of(r, ends));
  }
  set("cell", cell_of(map["cell"]));
  if ("open" in map) e.open = names_in(map["open"]);
  if ("about" in map) e.about = listed(map["about"], "about").map(about_of);
  if ("presentations" in map) {
    e.presentations = listed(map["presentations"], "presentations").map(presentation_of);
  }
  return e;
}

/** One group of About: a name, or a name and the items it lists. */
function about_of(item: unknown): { name: string; items?: string[] } {
  if (typeof item === "string") return { name: item.trim() };
  const map = item as Map;
  if (!map || typeof map !== "object" || typeof map["name"] !== "string") {
    throw new Error(`an about group is a name, or a name and items: ${said_as(item)}`);
  }
  return { name: map["name"].trim(), ...("items" in map ? { items: names_in(map["items"]) } : {}) };
}

/** One presentation: a name, its stops in order, and what it says of its pace. */
function presentation_of(item: unknown): PresentationSaid {
  const map = item as Map;
  if (!map || typeof map !== "object" || typeof map["name"] !== "string") {
    throw new Error(`a presentation is a map with a name and stops: ${said_as(item)}`);
  }
  const pace = typeof map["pace"] === "number" ? { pace: map["pace"] } : {};
  const description = typeof map["description"] === "string"
    ? { description: map["description"].trim() } : {};
  return { name: map["name"].trim(), ...description, ...pace,
           stops: listed(map["stops"], "stops").map((s) => stop_of(s, map["name"] as string)) };
}

/** One stop: its title, the block it is about, its summary, and its steps. */
function stop_of(item: unknown, of: string): StopSaid {
  const map = item as Map;
  const word = (key: string) => (typeof map?.[key] === "string" ? (map[key] as string).trim() : "");
  if (!map || typeof map !== "object" || !word("title") || !word("at") || !word("summary")) {
    throw new Error(`a stop of ${of} says title, at and summary: ${said_as(item)}`);
  }
  const steps = listed(map["steps"], "steps").map((x) => {
    const step = x as Map;
    if (!step || typeof step !== "object" || typeof step["text"] !== "string") {
      throw new Error(`a step of ${word("title")} says its text: ${said_as(x)}`);
    }
    return { text: step["text"].trim(),
             ...(typeof step["relation"] === "string" ? { relation: step["relation"].trim() } : {}),
             ...(typeof step["mark"] === "string" ? { mark: step["mark"].trim() } : {}) };
  });
  const names = (key: string) => (key in map ? { [key]: names_in(map[key]) } : {});
  return { title: word("title"), at: word("at"), summary: word("summary"), steps,
           ...names("open"), ...names("fit"),
           ...(word("show") ? { show: word("show") } : {}),
           ...(word("into") ? { into: word("into") } : {}),
           ...(typeof map["pace"] === "number" ? { pace: map["pace"] } : {}) };
}

/** One record: a map of answers by name, or — where its kind names the answers an arrow fills
 *  (`ends`) — written as a relation, `reads -> writes` or `reads -> writes: info`. */
function record_of(item: unknown, ends?: readonly string[]): Record<string, string> {
  const map = typeof item === "string" ? { [item]: "" } : item as Map;
  if (!map || typeof map !== "object" || Array.isArray(map)) {
    throw new Error(`a record is a map of answers: ${said_as(item)}`);
  }
  const [key] = Object.keys(map);
  if (ends?.length && Object.keys(map).length === 1 && is_edge(key!)) {
    const { from, to } = edge_of(key!);
    const said = [from, to, said_as(map[key!]).trim()];
    return Object.fromEntries(ends.map((name, i) => [name, said[i] ?? ""])
      .filter(([, value]) => value));
  }
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, said_as(v)]));
}

/** A block's ports: a list, or by flow — `{in: {content: md tree}, out: {dist: site}}`, each
 *  port's name to its type. */
function ports_of(value: unknown): PortEntry[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return listed(value, "ports").map(port_of);
  }
  return Object.entries(value as Map).flatMap(([flow, ports]) => {
    if (!["in", "out", "both"].includes(flow) || !ports || typeof ports !== "object") {
      throw new Error(`ports by flow are in, out or both, each a map of name to type: ${flow}`);
    }
    return Object.entries(ports as Map).map(([name, type]): PortEntry => ({
      name: name.trim(), flow, ...(type ? { type: said_as(type).trim() } : {}) }));
  });
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

/** The edges one item of `relations` says: `A -> B`, `A -> B: name` (bare or quoted),
 *  `type: [edges]`, or the long form (it says `from`). */
function edges(item: unknown): Edge[] {
  /** `A -> B: name` quoted reads as it does bare: the name after the second end's `: `. */
  if (typeof item === "string") {
    const [word, ...said] = item.split(": ");
    const name = said.join(": ").trim();
    return [{ ...edge_of(word!), ...(name ? { name } : {}) }];
  }
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error(`a relation is an edge or a map: ${said_as(item)}`);
  }
  const map = item as Map;
  if ("from" in map) {
    const e: Edge = { from: said_as(map["from"]).trim(), to: said_as(map["to"]).trim(),
                      values: values_of(map), ...unread(map, EDGE_KEYS) };
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
export function edge_of(word: string): Edge {
  for (const [arrow, dir] of ARROWS) {
    const at = word.indexOf(arrow);
    if (at < 0) continue;
    return { from: word.slice(0, at).trim(), to: word.slice(at + arrow.length).trim(), dir,
             values: [] };
  }
  throw new Error(`an edge is two names and an arrow (->, <-, <->, --): ${word}`);
}

/** The keys a map says that nothing reads, where it says any. */
function unread(map: Map, keys: readonly string[]): { dropped?: string[] } {
  const dropped = Object.keys(map).filter((k) => !keys.includes(k));
  return dropped.length ? { dropped } : {};
}

/** What a map answers, under `values`. */
function values_of(map: Map): Value[] {
  return values_in(map).map(([name, value]) => ({ name, value: said_as(value) }));
}

/** A list a key holds; nothing said is an empty one. */
function listed(value: unknown, key: string): unknown[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(`${key} is a list`);
  return value;
}

/** A sequence's fragments, each a repeat over a run of rows or alternatives over runs; one that
 *  is neither is left out. */
function fragments_of(list: unknown[]): Fragment[] {
  const run = (r: unknown): r is [number, number] => Array.isArray(r) && r.length === 2
    && r.every((n) => typeof n === "number");
  return list.flatMap((f): Fragment[] => {
    const m = (f ?? {}) as Map;
    if (typeof m["repeat"] === "string" && run(m["rows"])) {
      return [{ repeat: m["repeat"], rows: m["rows"] }];
    }
    if (Array.isArray(m["alt"]) && Array.isArray(m["rows"]) && m["rows"].every(run)) {
      return [{ alt: m["alt"].map(String), rows: m["rows"] as [number, number][] }];
    }
    return [];
  });
}
