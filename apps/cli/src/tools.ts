/** **Diagram and model tools** (docs/tools/): plain commands a person or an agent composes models
 *  with. `draw` writes one diagram file of one kind from a selection; `presentation` lists, drafts
 *  and checks a model file's presentations. Nothing written records who made it. Fact tools are
 *  apps/ts `facts.ts`; the commands are `main.ts`'s. */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { parseDocument, stringify } from "yaml";
import { attributes_of, BLOCK_KEYS, DIAGRAMS, fold, LEAST, long_form, setting_of,
         type FileSpec } from "@mnd/core";
import { FLOOR } from "@mnd/defs";

/** The kinds `draw` writes: every diagram kind, and `overview`, a model's tree. */
export const DRAWN = [...DIAGRAMS, "overview"] as const;

/** **The floor** (docs/diagrams/README.md *Sub diagrams*): a diagram holds at least this many
 *  steps, messages, states, rows or parts; below it its owner's chip says it. A default. */
export const FLOOR_OF = LEAST;

/** **The ceiling** (2026-11-21: paths readable in a presentation): past this many lines and
 *  this many lines a part, both, a laid-out diagram is too dense to follow. A default. */
export const DENSE = { lines: 8, per: 1.5 };

/** The kinds laid out by their lines, where density tangles them. */
const LAID = ["context", "flow", "dataflow", "state"];

/** A diagram file written: its text, and what it is warned of. */
export type Drawn = { text: string; warnings: string[] };


/** **`draw <kind>`**: a selection — a diagram file's map, as JSON — written as that kind's YAML.
 *  Read back through the file syntax first, so what it writes always reads; refused without a
 *  description or below the floor, naming the owner whose card would say it. */
export function diagram_file(kind: string, selection: Record<string, unknown>): Drawn {
  if (!(DRAWN as readonly string[]).includes(kind)) {
    throw new Error(`no diagram kind ${kind}: ${DRAWN.join(", ")}`);
  }
  const type = kind === "overview" ? "model" : kind;
  refuse_unread(kind, type, selection);
  refuse_shared(selection);
  const map: Record<string, unknown> = { ...selection, type: selection["type"] ?? type };
  if (kind === "sequence" && Array.isArray(map["participants"])) {
    map["participants"] = participants_in_order(map);
  }
  long_form(map, undefined, spec_of(type));
  const counted = count(kind, map);
  /** **A diagram earns its place** (the user, 2026-11-21: no useless diagrams): it says what
   *  it answers, and holds at least the floor; below it, its owner's card says it instead. */
  if (typeof map["description"] !== "string" || !map["description"].trim()) {
    throw new Error(`${map["name"] ?? "this diagram"} says nothing of what it answers: give it a `
      + "--description (one sentence: the question it answers for whoever reads the model)");
  }
  if (counted.n < FLOOR_OF) {
    throw new Error(`${map["name"] ?? "this diagram"} holds ${counted.n} ${counted.of}, below the `
      + `floor of ${FLOOR_OF}: not worth a diagram — say it in `
      + `${selection["owner"] ? `${String(selection["owner"])}'s` : "its owner's"} description`);
  }
  const warnings: string[] = [];
  const pieces = pieces_of(map);
  if (["flow", "dataflow"].includes(kind) && pieces.length > 1) {
    warnings.push(`${map["name"] ?? "this diagram"} draws ${pieces.length} separate chains, `
      + `starting at ${pieces.map((p) => p[0]).join(", ")}: one story reads best; --keep one `
      + "chain, or join them where the story does");
  }
  const lines = lines_in(map["relations"]);
  if (LAID.includes(kind) && lines > DENSE.lines && lines > counted.n * DENSE.per) {
    warnings.push(`${map["name"] ?? "this diagram"} draws ${lines} lines among ${counted.n} `
      + `${counted.of}, too many to follow in a presentation: draw it at a coarser --depth, or `
      + "--keep the parts one story needs, and draw the rest as a diagram of its own");
  }
  const { owner: _owner, ...kept } = map;
  return { text: stringify(kept, { lineWidth: 0 }), warnings };
}

/** **A selection says only what its kind reads** (2026-11-19): a key no diagram file knows,
 *  nor the kind's own lists nor its attributes, is refused, as is a grid's `rows` or `cols` on a
 *  kind that is no grid, and a block named with a `.`. */
function refuse_unread(kind: string, type: string, selection: Record<string, unknown>): void {
  const spec = spec_of(type);
  const grid = Object.values(spec).some((s) => s.as === "rows" || s.as === "cols");
  const own = new Set([...Object.keys(spec), ...attributes_of(fold([], FLOOR), type)
    .map((a) => a.name), "owner"]);
  const known = (k: string) => own.has(k) || ((BLOCK_KEYS as readonly string[]).includes(k)
    && (grid || !["rows", "cols", "cell", "grid"].includes(k)));
  const unknown = Object.keys(selection).filter((k) => !known(k));
  if (unknown.length) {
    throw new Error(`a ${kind} reads no ${unknown.join(", ")}; its own keys: `
      + `${[...own].filter((k) => k !== "owner").join(", ") || "none"}, beside name, `
      + "description, blocks, relations, note, tags, settings (docs/diagrams/" + `${kind}.md)`);
  }
  const dotted = (Array.isArray(selection["blocks"]) ? selection["blocks"] : [])
    .map((b) => (typeof b === "object" && b ? (b as Record<string, unknown>)["name"] : b))
    .filter((n): n is string => typeof n === "string" && n.includes("."));
  if (dotted.length) {
    throw new Error(`a block's name never holds a "." (${dotted.slice(0, 3).join(", ")}): name `
      + "it plainly and give its definition as `type`, or write `-` for the dot");
  }
}

/** **A cell holds one block** (the user, 2026-11-20): two steps in one cell are refused, the
 *  phase to be split finer so each step has its own. */
function refuse_shared(selection: Record<string, unknown>): void {
  const seen = new Map<string, string>();
  for (const b of Array.isArray(selection["blocks"]) ? selection["blocks"] : []) {
    const m = b as Record<string, unknown>;
    if (!Array.isArray(m["cell"])) continue;
    const at = (m["cell"] as unknown[]).join(" · ");
    const had = seen.get(at);
    if (had) {
      throw new Error(`${had} and ${String(m["name"])} share the cell ${at}: a cell holds one `
        + "step; split the phase into finer phases, one step each, or merge the two steps");
    }
    seen.set(at, String(m["name"]));
  }
}

/** **A sequence's participants in order** (docs/diagrams/sequence.md, agreed 1 and 8): actors
 *  first, then each by the first message it sends or receives; one no message reaches keeps its
 *  place at the end. Read off the selection: a step's cell names its participant. */
function participants_in_order(map: Record<string, unknown>): unknown[] {
  const said = map["participants"] as unknown[];
  const name = (p: unknown) => (typeof p === "string" ? p
    : String((p as Record<string, unknown>)["name"] ?? ""));
  const actor = (p: unknown) => typeof p === "object" && p !== null
    && (p as Record<string, unknown>)["type"] === "actor";
  const steps = new Map((Array.isArray(map["blocks"]) ? map["blocks"] : []).flatMap((b) => {
    const m = b as Record<string, unknown>;
    return Array.isArray(m["cell"]) ? [[String(m["name"]), String(m["cell"][1])] as const] : [];
  }));
  const ends = (Array.isArray(map["relations"]) ? map["relations"] : []).flatMap((r) => {
    const text = typeof r === "string" ? r : Object.keys(r as object)[0] ?? "";
    return ends_of(text);
  });
  const first = (p: unknown) => {
    const at = ends.findIndex((s) => s === name(p) || steps.get(s) === name(p));
    return at < 0 ? Infinity : at;
  };
  return said.map((p, i) => ({ p, i })).sort((a, z) => Number(actor(z.p)) - Number(actor(a.p))
    || first(a.p) - first(z.p) || a.i - z.i).map((x) => x.p);
}

/** How a kind says its file is written (`diagram.file`), read off base. */
function spec_of(kind: string): FileSpec {
  const graph = fold([], FLOOR);
  return (setting_of(graph, kind, "diagram")["file"] ?? {}) as FileSpec;
}

/** **The pieces a diagram falls into**: its blocks joined by its lines, each piece listed from
 *  its first block. A block no line meets is a piece of its own. */
function pieces_of(map: Record<string, unknown>): string[][] {
  const names = (Array.isArray(map["blocks"]) ? map["blocks"] : [])
    .map((b) => (typeof b === "string" ? b : (b as { name?: string; type?: string })))
    .filter((b) => typeof b === "string" || b.type !== "group")
    .map((b) => (typeof b === "string" ? b : String(b.name)));
  const up = new Map(names.map((n) => [n, n]));
  const root = (n: string): string => (up.get(n) === n || !up.has(n) ? n : root(up.get(n)!));
  /** A line is written plain, as a map keyed by itself, or listed under its type. */
  const said = (r: unknown): string[] => (typeof r === "string" ? [r]
    : Object.entries(r as object).flatMap(([k, v]) => (Array.isArray(v) ? v.map(String) : [k])));
  for (const line of (Array.isArray(map["relations"]) ? map["relations"] : []).flatMap(said)) {
    const [a, b] = ends_of(line);
    if (a && b && up.has(a) && up.has(b)) up.set(root(a), root(b));
  }
  const by = new Map<string, string[]>();
  for (const n of names) by.set(root(n), [...by.get(root(n)) ?? [], n]);
  return [...by.values()];
}

/** A written line's two ends: `a -> b: what` gives `a`, `b`. */
function ends_of(line: string): string[] {
  return line.split(":")[0]!.split(/\s*(?:<->|->|<-|--)\s*/).map((s) => s.trim());
}

/** How many lines a selection's relations hold, plain or listed under a type. */
export function lines_in(relations: unknown): number {
  if (!Array.isArray(relations)) return 0;
  return relations.reduce((n: number, r) => n + (typeof r === "string" ? 1
    : Object.values(r as object).reduce((k: number, v) => k + (Array.isArray(v) ? v.length : 1), 0)), 0);
}

/** What a kind's floor counts in a selection: messages, rows, or blocks. */
function count(kind: string, map: Record<string, unknown>): { n: number; of: string } {
  const list = (key: string) => (Array.isArray(map[key]) ? (map[key] as unknown[]).length : 0);
  if (kind === "sequence") return { n: list("relations"), of: "messages" };
  if (kind === "mapping") return { n: list("records"), of: "rows" };
  if (kind === "state") return { n: list("blocks"), of: "states" };
  /** A group is no part: it holds them. */
  const parts = Array.isArray(map["blocks"]) ? (map["blocks"] as { type?: string }[])
    .filter((b) => b?.type !== "group").length : 0;
  if (kind === "overview" || kind === "context") return { n: parts, of: "parts" };
  return { n: list("blocks"), of: "steps" };
}

/** A model file's presentations and their stops, as its file says them. */
type Said = Record<string, unknown> & { name?: string; title?: string; at?: string; show?: string;
                                       into?: string; summary?: string; text?: string;
                                       relation?: string; mark?: string; steps?: unknown[];
                                       stops?: Said[] };

/** **`presentation list`**: each presentation of a model file, its stops as said. */
export function presentations(model: string): { name: string; stops: Said[] }[] {
  const doc = parseDocument(readFileSync(model, "utf8")).toJS() as { presentations?: Said[] };
  return (doc.presentations ?? []).map((p) => ({ name: p.name ?? "", stops: p.stops ?? [] }));
}

/** **A model's tours as played** (round 6: titles alone left the YAML to be read): each stop's
 *  place, what it is at, shows and leads into, its summary, and each step's sentence. */
export function played(model: string): string {
  return presentations(model).flatMap((p) => [`${p.name}`, ...p.stops.flatMap((s, i) => [
    `  ${i + 1}. ${s.title ?? ""}  (at ${s.at ?? "-"}${s.show ? `, shows ${s.show}` : ""}`
      + `${s.into ? `, into ${s.into}` : ""})`,
    ...(s.summary ? [`     ${s.summary}`] : []),
    ...((s.steps ?? []) as Said[]).map((t, k) => `     ${k + 1}) ${t.text ?? ""}`
      + `  [${t.relation ? `line ${t.relation}` : t.mark ? `mark ${t.mark}` : "-"}]`)]), ""])
    .join("\n");
}

/** **`presentation draft`**: a presentation seeded from a flow or sequence diagram file, one stop
 *  showing it and a step a relation, in its order, each sentence a draft to be rewritten; added
 *  to the model file's `presentations:`. `as` is the diagram's name as the model reaches it. */
export function draft(model: string, diagram: string, as?: string): string {
  const said = parseDocument(readFileSync(diagram, "utf8")).toJS() as Record<string, unknown>;
  const name = String(said["name"] ?? basename(diagram).replace(/^\d+-|\.ya?ml$/g, ""));
  const at = as ?? name;
  const form = long_form(said, undefined, spec_of(String(said["type"] ?? "flow")));
  const steps = form.relations.map((e) => ({
    relation: `${at}.${e.from} -> ${at}.${e.to}`,
    text: `${e.from} ${e.name ? `${e.name} to` : "to"} ${e.to}.` }));
  const doc = parseDocument(existsSync(model) ? readFileSync(model, "utf8") : "");
  const list = (doc.get("presentations") as { toJSON?: () => unknown } | undefined)?.toJSON?.();
  const kept = Array.isArray(list) ? list : [];
  doc.set("presentations", [...kept, {
    name, description: String(said["description"] ?? `${name}, step by step.`),
    stops: [{ title: name, at, show: at, summary: String(said["description"] ?? name),
              steps }] }]);
  return doc.toString({ lineWidth: 0 });
}

/** One drafted step: a line lit, with its sentence. */
type Step = { relation: string; text: string } | { mark: string; text: string };

/** A file read for a tour: its path, map and long form. */
type Read = { file: string; said: Record<string, unknown>; form: ReturnType<typeof long_form> };

/** A drafted sentence for a line: its ends and its name, to be rewritten. */
const sentence = (e: { from: string; to: string; name?: string }) =>
  `${e.from} → ${e.to}${e.name ? `: ${e.name}` : ""}.`;

/** A file's map and long form, read by its own kind's spec. */
function read(file: string): Read {
  const said = parseDocument(readFileSync(file, "utf8")).toJS() as Record<string, unknown>;
  return { file, said, form: long_form(said, undefined, spec_of(String(said["type"] ?? "model"))) };
}

/** A file's name as the model reaches it: its `name`, else its file name less order and suffix. */
const name_of = (r: Read) => String(r.said["name"] ?? basename(r.file).replace(/^\d+-|\.ya?ml$/g, ""));

/** **The YAML files of a folder in the order collect reads them** (2026-11-21): `overview.yaml`
 *  first, then by order prefix, then by name. */
function ordered(dir: string): string[] {
  const rank = (f: string) => (f === "overview.yaml" ? -1 : Number(/^(\d+)-/.exec(f)?.[1] ?? 1e9));
  return readdirSync(dir).filter((f) => /\.ya?ml$/.test(f) && statSync(join(dir, f)).isFile())
    .sort((a, z) => rank(a) - rank(z) || a.localeCompare(z)).map((f) => join(dir, f));
}

/** The part a model's stops are about: the first part an actor reaches, else its first part
 *  that is neither actor nor external. */
function focus(r: Read): string {
  const kind = (n: string) => r.form.blocks.find((b) => b.name === n)?.type ?? "";
  const outer = (n: string) => ["actor", "external"].includes(kind(n));
  const parts = r.form.blocks.filter((b) => b.type !== "note" && !outer(b.name)).map((b) => b.name);
  return r.form.relations.find((e) => outer(e.from) && parts.includes(e.to))?.to
    ?? parts[0] ?? name_of(r);
}

/** What a model's block stands for says of itself, where it says nothing: read through its
 *  `of` (2026-11-23: drafted steps said bare names). Handed in by whoever knows the library. */
export type Describe = (b: { name: string; of?: string }) => string | undefined;

/** A part's drafted sentence: its name and what it is for, to be rewritten. */
const part_said = (b: { name: string; of?: string; description?: string }, describe?: Describe) => {
  const said = b.description ?? describe?.(b);
  return `${b.name}${said ? `: ${said}` : "."}`;
};

/** A model's own tour: **its treemap, each part marked** (2026-11-22: a treemap draws no
 *  lines, so its stop says what the model is made of), then each diagram in its folder shown and
 *  stepped through its lines in order. */
function model_tour(r: Read, at: string, describe?: Describe): Record<string, unknown>[] {
  const parts = r.form.blocks.filter((b) => b.type !== "note") as
    { name: string; description?: string }[];
  const own = { title: name_of(r), at, summary: String(r.said["description"] ?? name_of(r)),
                steps: parts.map((b): Step => ({ mark: b.name, text: part_said(b, describe) })) };
  const dir = r.file.replace(/\.ya?ml$/, "");
  const shown = existsSync(dir) ? ordered(dir).map(read)
    .filter((d) => String(d.said["type"] ?? "") !== "model") : [];
  return [own, ...shown.map((d) => {
    const n = name_of(d);
    /** An end the diagram holds is named in it; one it draws from the model, plainly. */
    const held = new Set(d.form.blocks.map((b) => b.name));
    const end = (x: string) => (held.has(x) ? `${n}.${x}` : x);
    const steps = d.form.relations.map((e): Step => ({
      relation: `${end(e.from)} -> ${end(e.to)}`, text: sentence(e) }));
    return { title: n, at: n, show: n, summary: String(d.said["description"] ?? n),
             ...(steps.length ? { steps } : {}) };
  })];
}

/** What a package folder says its system is: its `package.json` root's description. */
function system_of(folder: string): string {
  const file = join(folder, "package.json");
  if (!existsSync(file)) return "";
  const pkg = JSON.parse(readFileSync(file, "utf8")) as
    { graph?: { root?: string; blocks?: Record<string, { description?: string }> } };
  return pkg.graph?.blocks?.[pkg.graph.root ?? ""]?.description?.trim() ?? "";
}

/** **`presentation draft <folder>`: the whole model's tour** (the user, 2026-11-21): each model
 *  file of a package folder gets its own tour, named as the model; the first (the overview) also
 *  gets the **top tour**: its own stops, then a stop per other model — shown, its first lines
 *  from its actors stepped, leading `into` its first presentation. Saved drafts, the words to be
 *  rewritten and stops cut or added by whoever drafts it; a model's tour of that name is kept
 *  unless `force`. Answers each file's new text. */
export function tour(folder: string, force = false,
                     describe?: Describe): { file: string; text: string }[] {
  const models = ordered(folder).map(read).filter((r) => r.said["type"] === "model");
  if (!models.length) throw new Error(`${folder} holds no model file (type: model)`);
  /** The top tour leads into each other model's first presentation, drafted or its own. */
  const kept_of = (r: Read) => {
    const list = (parseDocument(readFileSync(r.file, "utf8")).get("presentations") as
      { toJSON?: () => unknown } | undefined)?.toJSON?.();
    return (Array.isArray(list) ? list : []) as Record<string, unknown>[];
  };
  /** A stop per other model, leading into its tour: shown as its treemap, so no line is
   *  stepped there (2026-11-22); its own tour steps its diagrams. */
  const leads = models.slice(1).map((r) => {
    const n = name_of(r);
    const first = String(kept_of(r)[0]?.["name"] ?? n);
    return { title: n, at: n, show: n, summary: String(r.said["description"] ?? n), into: first };
  });
  /** **The top tour opens on what the system is** (2026-11-22): the package's description. */
  const system = system_of(folder);
  const drafted = models.map((r, i) => {
    const name = name_of(r);
    const kept = kept_of(r);
    const [own, ...shown] = model_tour(r, focus(r), describe);
    /** Its summary says the system, never the model's description again (round 6). */
    const first = i === 0 && system ? { ...own!, summary: system } : own!;
    const stops = [first, ...shown, ...(i === 0 ? leads : [])];
    const tour = { name, description: String(r.said["description"] ?? `${name}, stop by stop.`),
                   stops };
    const has = kept.some((p) => p["name"] === name);
    const doc = parseDocument(readFileSync(r.file, "utf8"));
    return { r, doc, all: has && !force ? kept : [...kept.filter((p) => p["name"] !== name), tour] };
  });
  return drafted.map(({ r, doc, all }) => {
    doc.set("presentations", all);
    return { file: r.file, text: doc.toString({ lineWidth: 0 }) };
  });
}

