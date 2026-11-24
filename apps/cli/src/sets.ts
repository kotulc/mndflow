/** **Model sets** (sets-plan.md, 2026-11-23): a set is a recipe of models and diagrams, each fed
 *  by one fact family; `apply` runs the whole pipeline on a project — facts, the library opened
 *  by density, each diagram drawn, the tours drafted — and reports each diagram filled or
 *  skipped with why. The agent writes a brief (what the system and each model are about) and
 *  the words; everything mechanical is here. Sets are data files in `apps/cli/sets/`. */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";
import type { Graph } from "@mnd/core";
import { opened, shown_count, thinned, type Unit } from "./depth";
import { define, source_of, write_defined } from "./define";
import { held_in, selection_from, type Held } from "./from_facts";
import { is_python, python_fact } from "./python";
import { DENSE, diagram_file, tour, type Describe } from "./tools";

/** One diagram of a set's model: its kind, the facts feeding it, what it answers. */
type Slot = { name: string; kind: string; from: string; intent: string; unless?: string };

/** One model of a set: what it holds, what it answers, its diagrams; `each: path` one per
 *  main path picked, up to `count`. */
type Recipe = { name: string; holds: "top" | "reached" | "classes"; intent: string;
                each?: "path"; count?: number; diagrams: Slot[] };

/** A set as its file says it. */
export type ModelSet = { name: string; description: string; models: Recipe[] };

/** **The brief** (the agent's part): what the system is, the scope, and per model (by the
 *  set's name for it) a new name and what it illustrates and how it fits. */
export type Brief = { system?: string; scope?: string;
                      models?: Record<string, string | { name?: string; description?: string }>;
                      externals?: Record<string, string | { at: string; description?: string;
                                                           type?: string }>;
                      parts?: Record<string, string | { name?: string; description?: string }>;
                      actors?: Record<string, string> };

/** The dials `apply` takes; the defaults fit most projects. */
export type Asked = { brief?: Brief; budget?: number; wide?: number; focus?: string[];
                      pick?: string[]; force?: boolean; dry?: boolean };

/** A way in, as `entries` lists it. */
type Entry = { name: string; kind: string; runs?: string; via?: string; ways?: number;
               reach?: number; touches?: string[] };

/** A model planned: its name, file, what it says, its blocks and diagrams to draw. */
type Planned = { recipe: Recipe; name: string; said: string; file: string; description: string;
                 entry?: Entry; calls?: unknown };

/** How the folder collects, handed in by the command (`folders.ts`). */
export type Collect = (folder: string) => Graph;

/** Where the set files live. */
const SETS = resolve(dirname(fileURLToPath(import.meta.url)), "../sets");

/** The most data classes a data model draws, the referenced first. */
const CLASSES = 10;

/** How deep a path's calls are followed. */
const CALL_DEPTH = 4;

/** The least own functions a path reaches to earn a model (core `LEAST`). */
const LEAST = 3;

/** Who comes in by each kind of way in, named plainly; the brief renames them. */
const CALLER: Record<string, string> = { process: "Operator", script: "Operator",
                                         main: "Operator", registered: "Client",
                                         decorated: "Caller" };

/** Method names that say nothing of a path: its class is named instead. */
const PLAIN = ["handle", "run", "main", "get", "post", "dispatch", "__call__", "execute"];


/** **`set list`**: each set, what it is for, and its models and diagrams. */
export function set_list(): string {
  return readdirSync(SETS).filter((f) => f.endsWith(".yaml")).sort().map((f) => {
    const s = load_set(f.replace(/\.yaml$/, ""));
    return [`${s.name}: ${s.description}`, ...s.models.map((m) => `  ${m.name}${m.each
      ? ` (one per main path, up to ${m.count ?? 1})` : ""}: ${m.diagrams.map((d) => d.kind)
      .join(", ") || "its treemap"}`)].join("\n");
  }).join("\n\n");
}

/** A set by name. */
export function load_set(name: string): ModelSet {
  const file = join(SETS, `${name}.yaml`);
  if (!existsSync(file)) {
    const have = readdirSync(SETS).filter((f) => f.endsWith(".yaml")).map((f) => f.slice(0, -5));
    throw new Error(`no set ${name}: ${have.join(", ")}`);
  }
  return parse(readFileSync(file, "utf8")) as ModelSet;
}

/** **`set apply`**: the set's models written into `folder` from the project's facts; answers
 *  the report. Dry, only the plan is said and nothing written. */
export function apply(name: string, project: string, folder: string, asked: Asked,
                      collect: Collect): string[] {
  const set = load_set(name);
  const root = resolve(project);
  if (!is_python(root)) {
    throw new Error(`${project} is not a Python project; sets read Python facts today (the `
      + "TypeScript translator follows, iteration-plan.md Next 5)");
  }
  // The folder's own brief (this set's model names its own), added to by the one given
  const kept = manifest(folder);
  const brief = merged({ ...kept.brief, models: kept.sets[name]?.models ?? {} },
                       asked.brief ?? {});
  const scope = brief.scope ? ["--unit", brief.scope] : [];
  const fact = (what: string, args: string[]) =>
    JSON.parse(python_fact(what, root, [...args])) as unknown;
  const report: string[] = asked.brief || !kept.brief ? [] : [`brief: the folder's own (${MANIFEST})`];

  // The library: the units tree opened by density
  const units = fact("units", [...scope, "--depth", "8"]) as Unit[];
  const library = opened(units, { budget: asked.budget, wide: asked.wide, focus: asked.focus });
  report.push(...described(library, brief.parts ?? {}));
  refuse_externals(library, brief.externals ?? {});
  report.push(`library: ${shown_count(library)} blocks; closed: ${closed_of(library)
    .slice(0, 8).join(", ") || "none"}`);
  report.push(`  parts (the brief's \`parts\` keys): ${tops_of(library).map((t) => t.name).join(", ")}`);

  // The data: classes with fields, the referenced first; what a main path is about
  const needs = (h: Recipe["holds"]) => set.models.some((m) => m.holds === h);
  const data = data_classes(fact("classes", scope) as Cls[]);
  const classes = needs("classes") ? data : [];
  if (needs("classes")) report.push(`data: ${classes.map((c) => c.name).join(", ") || "none"}`);
  const central = new Set(data.map((c) => c.name));

  // The paths: those picked, else the ways in most lead to, touching the most data
  const entries = fact("entries", scope) as Entry[];
  const want = Math.max(0, ...set.models.filter((m) => m.each).map((m) => m.count ?? 1));
  const part = part_of(library);
  const paths = want ? ranked(entries, asked.pick ?? [], want, central, part,
    (e) => fact("calls", ["--from", e.runs!, "--depth", String(CALL_DEPTH)])) : [];
  if (want) {
    report.push(`paths: ${paths.map((p) => `${p.entry.name} (${p.entry.kind}, runs `
      + `${p.entry.runs}, reaches `
      + `${p.reach}${p.twin ? `; mostly what ${p.twin} reaches: pick another?` : ""})`).join("; ") || "none reaching enough"}; ${entries.length} ways in`);
    // The next candidates, so the brief's paths can be picked by name instead
    const taken = new Set(paths.map((p) => p.entry.runs));
    const more = candidates(entries, [], central, part).filter((e) => !taken.has(e.runs)).slice(0, 6);
    if (more.length) report.push(`  others (--pick a name): ${more.map((e) => `${e.name} `
      + `(${e.runs!.split(".").slice(-2).join(".")})`).join(", ")}`);
    report.push(`  callers (the brief's \`actors\` keys): ${[...new Set(paths
      .map((p) => caller_of(p.entry, library)))].join(", ")}`);
  }


  const imports = fact("imports", [...scope, "--depth", "8"]) as {
    imports: { from: string; to: string }[]; outside: { package: string; by: string[] }[] };
  const planned = plan(set, brief, paths);
  refuse_clashes(kept, set.name, planned);
  for (const p of planned) {
    report.push(`model ${p.name} (brief key: ${p.said}) `
      + `(${basename(p.file)}): ${p.recipe.diagrams.map((d) => d.kind)
      .join(", ") || "its treemap"}`);
  }
  if (asked.dry) return report;

  // Written: the package, the library, then each model and its diagrams
  write_package(folder, brief, set);
  const lines = thinned(imports.imports, library);
  report.push(`relations: ${lines.length} kept of ${imports.imports.length} imports, the strongest `
    + "in each view");
  const defined = define({ units: library, imports: lines,
                           classes: classes as never }, () => "");
  for (const n of defined.notes.slice(0, 6)) report.push(`  note: ${n}`);
  if (asked.force) report.push(...moved(folder, defined.files));
  write_defined(folder, defined, !!asked.force);
  report.push(...stale(folder, set.name, planned, brief, !!asked.force));
  const held = held_in(collect(folder));
  for (const p of planned) {
    report.push(...write_model(folder, p, { held, library, imports, classes,
                                            ways: paths.map((x) => x.entry),
                                            externals: brief.externals ?? {},
                                            actors: brief.actors ?? {}, force: !!asked.force }));
  }

  // The tours, drafted from what was written
  // Kept tours stay as written; a model without one is drafted, its parts said by the library
  for (const f of tour(folder, false, describer(library, classes))) writeFileSync(f.file, f.text);
  report.push("tours drafted: rewrite their words (`presentation list`), then `check`");
  return report;
}

/** The top part of the library a dotted name lies in, by its unit. */
function part_of(library: Unit[]): (runs: string) => string {
  const tops = top_units(library);
  return (runs) => tops.map((t) => t.unit ?? t.name)
    .find((u) => runs === u || runs.startsWith(`${u}.`)) ?? "";
}

/** **What each library block says of itself**, by the path a model's block names it with
 *  (`hc.api`, a data class by its name): its description, from its docstring or the brief. */
function describer(library: Unit[], classes: Cls[]): Describe {
  const said = new Map<string, string>();
  const walk = (u: Unit, at: string) => {
    const path = at ? `${at}.${u.name}` : u.name;
    if (typeof u.description === "string") said.set(path, u.description);
    (u.parts ?? []).forEach((p) => walk(p, path));
  };
  library.forEach((u) => walk(u, ""));
  for (const c of classes) if (c.description) said.set(c.name, c.description);
  return (b) => (b.of ? said.get(b.of) ?? said.get(last(b.of)) : undefined);
}

/** **The brief's externals, checked before anything is written** (review: a wrong part threw
 *  halfway, the folder left half-written): each must be reached from an overview part. */
function refuse_externals(library: Unit[], externals: NonNullable<Brief["externals"]>): void {
  const names = top_units(library).map((u) => u.name);
  for (const [name, said] of Object.entries(externals)) {
    const at = typeof said === "string" ? said : said.at;
    if (!names.includes(at)) {
      throw new Error(`the brief's external ${name} is reached from ${at}, which is no part of `
        + `the overview: ${names.join(", ")}`);
    }
  }
}

/** The hidden file a folder keeps of its brief and the models each set wrote (collect skips
 *  it). */
const MANIFEST = ".set.json";

/** What a folder's sets were applied with: the brief all share (its library), and per set the
 *  brief's `models` and the models it wrote, by file and name. */
type Manifest = { brief?: Omit<Brief, "models">;
                  sets: Record<string, { models?: Brief["models"];
                                         wrote: { file: string; name: string }[] }> };

/** A folder's manifest, empty where none is. */
function manifest(folder: string): Manifest {
  const file = join(folder, MANIFEST);
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) as Manifest : { sets: {} };
}

/** A brief added to another: a plain key replaced, each map's entries added to. */
function merged(was: Brief, now: Brief): Brief {
  const maps = ["models", "externals", "parts", "actors"] as const;
  return { ...was, ...now, ...Object.fromEntries(maps.map((k) => [k, { ...was[k], ...now[k] }])) };
}

/** **One name, one model** (review: two sets each wrote a model called Data): a planned model
 *  named as another set's model in the folder is refused before anything is written. */
function refuse_clashes(kept: Manifest, set: string, planned: Planned[]): void {
  for (const [other, models] of Object.entries(kept.sets)) {
    if (other === set) continue;
    const hit = planned.find((p) => models.wrote.some((m) => m.name === p.name));
    if (hit) {
      throw new Error(`the ${other} set already wrote a model called ${hit.name} here: rename `
        + `this one in the brief (\`models: {${hit.said}: {name: …}}\`)`);
    }
  }
}

/** **A model no longer planned** (round 7: a renamed model's old file stayed, its stop still in
 *  the top tour): under `--force`, each model file this set wrote before (its manifest) that the
 *  plan no longer writes, and its folder of diagrams, removed and said; another set's models and
 *  models written by hand are never touched (review). The manifest then says the new plan. */
function stale(folder: string, set: string, planned: Planned[], brief: Brief,
               force: boolean): string[] {
  const kept = manifest(folder);
  const now = planned.map((p) => p.file);
  const gone = force ? (kept.sets[set]?.wrote ?? []).map((m) => m.file).filter((f) => !now.includes(f)
    && existsSync(join(folder, f))) : [];
  for (const f of gone) {
    rmSync(join(folder, f));
    rmSync(join(folder, f.replace(/\.ya?ml$/, "")), { recursive: true, force: true });
  }
  const { models, ...shared } = brief;
  const said: Manifest = { brief: shared, sets: { ...kept.sets,
    [set]: { ...(models ? { models } : {}),
             wrote: planned.map((p) => ({ file: p.file, name: p.name })) } } };
  writeFileSync(join(folder, MANIFEST), `${JSON.stringify(said, null, 2)}\n`);
  return gone.map((f) => `removed ${f}, a model this set no longer plans, and its diagrams`);
}

/** **The brief's words for the top parts** (round 8: package names said nothing): each named
 *  part of the overview takes its description and, where given, a plainer name; a name that
 *  is no top part is said. */
function described(library: Unit[], parts: NonNullable<Brief["parts"]>): string[] {
  const tops = top_units(library);
  return Object.entries(parts).flatMap(([name, said]) => {
    const u = tops.find((t) => t.name === name);
    if (!u) return [`  note: the brief's part ${name} is no top part: ${tops.map((t) => t.name).join(", ")}`];
    const { name: plain, description } = typeof said === "string" ? { name: undefined, description: said }
      : said;
    if (description) u.description = description;
    if (plain) u.name = plain;
    return [];
  });
}

/** **A library file the new library writes elsewhere** (round 8: a part renamed by the brief
 *  left its old file, the same source twice): under `--force`, each file whose source a new
 *  file says, at another path, removed and said. */
function moved(folder: string, files: Map<string, string>): string[] {
  const at = new Map([...files].flatMap(([f, text]) => {
    const src = source_of(text);
    return src ? [[src, f] as const] : [];
  }));
  return (readdirSync(folder, { recursive: true }) as string[])
    .map((f) => f.split(sep).join("/"))
    .filter((f) => /\.ya?ml$/.test(f) && existsSync(join(folder, f)))
    .flatMap((f) => {
      const src = source_of(readFileSync(join(folder, f), "utf8"));
      const now = src ? at.get(src) : undefined;
      if (!now || now === f) return [];
      rmSync(join(folder, f));
      return [`removed ${f}: the library writes it as ${now} now`];
    });
}

/** The units a library left closed, largest first. */
function closed_of(units: Unit[]): string[] {
  const out: { name: string; n: number; lines: number }[] = [];
  const walk = (u: Unit) => {
    if (u.holds) out.push({ name: u.unit ?? u.name, n: u.holds, lines: u.lines ?? 0 });
    for (const p of u.parts ?? []) walk(p);
  };
  units.forEach(walk);
  return out.sort((a, z) => z.lines - a.lines).map((c) => `${c.name} (${c.n})`);
}

/** A path picked: its way in, its calls and how many own functions they reach. */
type Path = { entry: Entry; calls: unknown; reach: number; twin?: string };

/** **The ways in a path may start from, best first**: those picked by name (an entry's name, or
 *  the end of what it runs) in the order picked; else, reaching at least `LEAST`, the entered
 *  (by a caller) by how many ways run them, taking turns with the started (by an operator);
 *  ties, and the started, by how many of the `central` data classes they touch, then reach.
 *  A decorated hook starts a path only when picked. */
export function candidates(entries: Entry[], pick: string[], central: Set<string>,
                           part: (runs: string) => string): Entry[] {
  const runnable = entries.filter((e) => e.runs);
  if (pick.length) {
    // A pick is an entry's name, its last word (`sendalerts`), or the end of what it runs
    return pick.map((p) => {
      const hit = runnable.find((e) => e.name === p || e.name.split(/\s+/).pop() === p
        || e.runs === p || e.runs!.endsWith(`.${p}`));
      if (!hit) throw new Error(`--pick ${p} names no way in: give an entry's name, its last `
        + "word or the function it runs, as the dry run lists them");
      return hit;
    });
  }
  const big = runnable.filter((e) => (e.reach ?? 0) >= LEAST);
  const touched = (e: Entry) => (e.touches ?? []).filter((c) => central.has(c)).length;
  const weight = (a: Entry, z: Entry) => touched(z) - touched(a) || (z.reach ?? 0) - (a.reach ?? 0);
  // One per part first (round 9: three paths into api left the dashboard out), then the rest
  const sorted = big.filter((e) => e.kind === "registered")
    .sort((a, z) => (z.ways ?? 1) - (a.ways ?? 1) || weight(a, z));
  const firsts = [...new Map([...sorted].reverse().map((e) => [part(e.runs!), e])).values()];
  const entered = [...sorted.filter((e) => firsts.includes(e)),
                   ...sorted.filter((e) => !firsts.includes(e))];
  const started = big.filter((e) => ["process", "script", "main"].includes(e.kind)).sort(weight);
  const out: Entry[] = [];
  for (let i = 0; i < Math.max(entered.length, started.length); i++) {
    out.push(...[entered[i], started[i]].filter((e): e is Entry => !!e));
  }
  return out;
}

/** **The main paths**: the candidates in turn, each skipped where most of what it reaches a
 *  path already taken reaches (two routes into one view), up to `want`; one picked is kept,
 *  that path named as its `twin`. */
function ranked(entries: Entry[], pick: string[], want: number, central: Set<string>,
                part: (runs: string) => string, calls_of: (e: Entry) => unknown): Path[] {
  const out: (Path & { reached: Set<string> })[] = [];
  for (const entry of candidates(entries, pick, central, part)) {
    if (out.length >= want) break;
    let calls: unknown;
    try { calls = calls_of(entry); } catch { continue; }
    const reached = new Set(functions_in(calls));
    const shared = (p: { reached: Set<string> }) =>
      [...reached].filter((f) => p.reached.has(f)).length > reached.size / 2;
    const twin = out.find(shared)?.entry.name;
    if (!pick.length && twin) continue;
    out.push({ entry, calls, reach: reached.size, reached, ...(twin ? { twin } : {}) });
  }
  return out;
}

/** The own functions a call tree reaches. */
function functions_in(tree: unknown): string[] {
  const kids = ((tree as { calls?: unknown[] })?.calls ?? []) as { function: string }[];
  return kids.flatMap((c) => [c.function, ...functions_in(c)]);
}

/** A class as `classes` lists it. */
type Cls = { name: string; unit: string; description?: string;
             fields?: { name: string; type: string; to?: string }[] };

/** **The data classes**: those with two or more fields, the most referenced first (a field
 *  keyed to it, or keyed from it), up to `CLASSES`; a name said twice kept once. */
function data_classes(all: Cls[]): Cls[] {
  const data = all.filter((c) => (c.fields?.length ?? 0) >= 2);
  const names = new Set(data.map((c) => c.name));
  const refs = (c: Cls) => (c.fields ?? []).filter((f) => f.to && names.has(last(f.to))).length
    + data.filter((d) => (d.fields ?? []).some((f) => f.to && last(f.to) === c.name)).length;
  const sorted = [...data].sort((a, z) => refs(z) - refs(a)
    || (z.fields?.length ?? 0) - (a.fields?.length ?? 0));
  const once = [...new Map(sorted.map((c) => [c.name, c])).values()];
  return once.slice(0, CLASSES).filter((c, _, kept) => refs(c) > 0 || kept.every((k) => refs(k) === 0));
}

/** A dotted name's last step. */
const last = (s: string) => s.split(".").pop()!;

/** **The library's top units**: each top unit's parts where it is open, else itself. */
function top_units(library: Unit[]): Unit[] {
  return library.flatMap((u) => (u.parts?.length ? u.parts : [u]));
}

/** **A dotted name lifted** to the nearest unit a held map has: its library path, else none. */
function lifted(held: Held, name: string): string | undefined {
  const steps = name.split(".");
  for (let k = steps.length; k > 0; k--) {
    const at = held.get(steps.slice(0, k).join("."));
    if (at) return at;
  }
  return undefined;
}

/** **The models planned**: each recipe once, or once per path; named by the set, the brief
 *  renaming; the first the overview. */
function plan(set: ModelSet, brief: Brief, paths: Path[]): Planned[] {
  const out: Planned[] = [];
  for (const r of set.models) {
    const each = r.each ? paths.slice(0, r.count ?? 1) : [undefined];
    for (const p of each) {
      if (r.each && !p) continue;
      const way = p?.entry.name ?? "";
      const said = filled(r.name, way, p);
      const told = brief.models?.[said];
      const name = (typeof told === "object" ? told.name : undefined) ?? said;
      const description = (typeof told === "string" ? told : told?.description)
        ?? filled(r.intent, way, p);
      out.push({ recipe: r, name, said, description, file: "",
                 ...(p ? { entry: p.entry, calls: p.calls } : {}) });
    }
  }
  return out.map((p, i) => ({ ...p, file: i === 0 && p.recipe.holds === "top"
    ? "overview.yaml" : `${i}-${slug(p.name)}.yaml` }));
}

/** A recipe's text with its path's names filled in. */
function filled(text: string, way: string, p?: Path): string {
  return text.replace(/\{path\}/g, p ? label(p.entry) : "").replace(/\{way\}/g, way);
}

/** **A path's name**: the subcommand a process runs, else the function it runs — its class
 *  where the method says nothing (`handle`) — capitalised. */
function label(e: Entry): string {
  const steps = (e.runs ?? e.name).split(".");
  const word = e.kind === "process" || e.kind === "script" ? e.name.split(/\s+/).pop()!
    : PLAIN.includes(steps.at(-1)!) && steps.length > 1 ? steps.at(-2)! : steps.at(-1)!;
  const plain = word.replace(/[_-]+/g, " ").trim();
  return plain.charAt(0).toUpperCase() + plain.slice(1);
}

/** A name as a file name. */
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** **The package**: its `package.json` written where none is, importing `code`; the brief's
 *  system said as its root's description. */
function write_package(folder: string, brief: Brief, set: ModelSet): void {
  mkdirSync(folder, { recursive: true });
  const file = join(folder, "package.json");
  const id = slug(basename(resolve(folder))) || "model";
  const doc = existsSync(file) ? JSON.parse(readFileSync(file, "utf8"))
    : { schema: "1.0", id, imports: { code: "code" },
        graph: { root: id, edges: {}, blocks: { [id]: { id, parent: null, name: id } } } };
  const root = doc.graph.blocks[doc.graph.root];
  if (brief.system) root.description = brief.system;
  if (!root.description) {
    root.description = `What the system is, what it does and for whom: say it in the brief `
      + `(\`system:\`). Modelled with the ${set.name} set.`;
  }
  writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
}

/** What a model is drawn from. */
type Fed = { held: Held; library: Unit[]; classes: Cls[]; force: boolean; ways: Entry[];
             externals: NonNullable<Brief["externals"]>; actors: Record<string, string>;
             imports: { imports: { from: string; to: string }[] } };

/** **One model written**: its diagrams drawn from the facts into its folder (each one
 *  skipped with why where it cannot be), then its file with its blocks; answers its report. */
function write_model(folder: string, p: Planned, fed: Fed): string[] {
  const report: string[] = [];
  const dir = join(folder, p.file.replace(/\.yaml$/, ""));
  const done = new Set<string>();
  const way = p.entry?.name ?? "";
  const actor = p.entry ? caller(p.entry, fed) : undefined;
  const path = p.entry ? { entry: p.entry, calls: p.calls, reach: 0 } : undefined;
  for (const slot of p.recipe.diagrams) {
    const named = filled(slot.name, way, path).replace(/\{model\}/g, p.name);
    const intent = filled(slot.intent, way, path);
    if (slot.unless && done.has(slot.unless)) {
      report.push(`  ${named}: skipped, ${slot.unless.replace(/\{model\}/g, p.name)} draws it`);
      continue;
    }
    try {
      const { selection, left } = selected(slot, p, fed, actor);
      const out = diagram_file(slot.kind, { name: named, description: intent, ...selection });
      const file = join(dir, `${slot.kind}.yaml`);
      if (existsSync(file) && !fed.force) {
        report.push(`  ${named}: kept (${file} exists; --force redraws)`);
      } else {
        mkdirSync(dir, { recursive: true });
        writeFileSync(file, out.text);
        const hint = left.length && !Object.keys(fed.externals).length
          ? `; ${left.length} ends lie outside the library (${left.slice(0, 4).join(", ")}`
            + `${left.length > 4 ? ", …" : ""}): name the outside systems that matter as the `
            + "brief's `externals`" : "";
        report.push(`  ${named}: drawn${hint}`);
      }
      for (const w of out.warnings) report.push(`    warning: ${w}`);
      done.add(slot.name);
    } catch (e) {
      report.push(`  ${named}: skipped, ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const file = join(folder, p.file);
  if (existsSync(file) && !fed.force) {
    report.push(`  ${p.name}: kept (${p.file} exists; --force rewrites)`);
    return report;
  }
  // A model rewritten keeps its tours as written (the user, 2026-11-23: no merge, kept whole)
  const tours = existsSync(file)
    ? (parse(readFileSync(file, "utf8")) as { presentations?: unknown[] } | null)?.presentations
    : undefined;
  const blocks = model_blocks(p, fed, actor);
  const relations = p.recipe.holds === "top" ? callers_of(fed).lines
    : actor && p.entry ? [`${actor} -> ${first_part(blocks, actor)}: ${p.entry.name}`] : [];
  writeFileSync(file, stringify({ name: p.name, type: "model", description: p.description,
    blocks, ...(relations.length && blocks.length > 1 ? { relations } : {}),
    ...(tours?.length ? { presentations: tours } : {}) }, { lineWidth: 0 }));
  if (tours?.length) report.push(`  ${p.name}: its tours kept as written; \`check\` says a name they no `
    + "longer reach");
  if (!done.size) report.push(`  ${p.name}: no diagram drawn; its treemap of parts stands in`);
  return report;
}

/** The most steps a flow drawn function by function holds: deeper calls are cut first. */
const FLOW_STEPS = 10;

/** **One diagram's selection, at its level** (the user, 2026-11-23: a diagram shows the blocks
 *  at its level): a context among the overview's parts; a sequence among the library's blocks,
 *  started by its caller, a call inside one block left to it; a flow function by function,
 *  cut to `FLOW_STEPS`; class and entity from the data classes. */
function selected(slot: Slot, p: Planned, fed: Fed, actor?: string):
    { selection: Record<string, unknown>; left: string[] } {
  if (slot.from === "imports") {
    // Among the overview's parts, those too small to matter at this level left to it
    const top = new Set(big(tops_of(fed.library)).map((t) => t.of));
    const held: Held = new Map([...fed.held].filter(([, at]) => top.has(at)));
    // Who comes in, and only the strongest pairs, so all stays under the drawing ceiling
    const callers = callers_of(fed);
    const most = Math.max(DENSE.lines, Math.floor(DENSE.per * (top.size + callers.actors.length)))
      - callers.lines.length;
    const got = selection_from(slot.kind, { ...fed.imports,
      imports: strongest(fed.imports.imports, held, most) }, held);
    got.selection["blocks"] = [...callers.actors, ...(got.selection["blocks"] as unknown[])];
    got.selection["relations"] = [...callers.lines, ...(got.selection["relations"] as unknown[])];
    return got;
  }
  if (slot.from === "calls" && slot.kind === "flow") {
    // Function by function: the call tree cut shallower until it fits
    for (let depth = CALL_DEPTH; depth > 0; depth--) {
      const got = selection_from(slot.kind, cut(p.calls, depth), undefined);
      const steps = (got.selection["blocks"] ?? []) as { name: string }[];
      if (steps.length <= FLOW_STEPS || depth === 1) {
        got.selection["blocks"] = steps.map((b) => ({ name: b.name }));
        return got;
      }
    }
  }
  if (slot.from === "calls") {
    const got = selection_from(slot.kind, p.calls, fed.held);
    distinct(got.selection, fed);
    if (actor && p.entry) at_level(got.selection, actor, p.entry, helpers_of(fed));
    return got;
  }
  const keyed = fed.classes.filter((c) => (c.fields ?? []).some((f) => f.to));
  return selection_from(slot.kind, slot.from === "keyed" ? keyed : fed.classes, fed.held);
}

/** **The strongest pairs** of imports among the parts a map holds: each end lifted, a pair
 *  either way summed by how many imports make it, the `most` strongest kept. */
function strongest(imports: { from: string; to: string; n?: number }[], held: Held,
                   most: number): { from: string; to: string }[] {
  const pair = (i: { from: string; to: string }) => {
    const [a, b] = [lifted(held, i.from), lifted(held, i.to)];
    return a && b && a !== b ? [a, b].sort().join("|") : undefined;
  };
  const sum = new Map<string, number>();
  for (const i of imports) {
    const k = pair(i);
    if (k) sum.set(k, (sum.get(k) ?? 0) + (i.n ?? 1));
  }
  const kept = new Set([...sum].sort((a, z) => z[1] - a[1]).slice(0, Math.max(0, most))
    .map(([k]) => k));
  return imports.filter((i) => kept.has(pair(i) ?? ""));
}

/** **Names that say which** (round 7: `views` read as api's or front's): a participant named as
 *  more than one block of the library (its units and data classes, never a model's) is named
 *  with its holder (`api views`), its lines too. */
function distinct(selection: Record<string, unknown>, fed: Fed): void {
  // Each block once by its unit: a class part and its definition are one
  const units = new Set<string>(fed.classes.map((c) => c.unit));
  const walk = (u: Unit) => {
    units.add(u.unit ?? u.name);
    (u.parts ?? []).forEach(walk);
  };
  fed.library.forEach(walk);
  const lasts = new Map<string, number>();
  for (const u of units) lasts.set(last(u), (lasts.get(last(u)) ?? 0) + 1);
  const renamed = new Map<string, string>();
  const parts = ((selection["participants"] ?? []) as { name: string; of?: string }[]).map((x) => {
    // Named from what it stands for (a clash inside one diagram was joined `api-models`)
    if (typeof x !== "object" || !x.of) return x;
    const [holder, base] = x.of.split(".").slice(-2);
    const name = (lasts.get(base!) ?? 0) >= 2 && holder ? `${holder} ${base}` : base!;
    if (name === x.name) return x;
    renamed.set(x.name, name);
    return { ...x, name };
  });
  if (!renamed.size) return;
  const end = (e: string) => renamed.get(e.trim()) ?? e.trim();
  selection["participants"] = parts;
  selection["relations"] = ((selection["relations"] ?? []) as unknown[]).map((r) => {
    const [line, ...what] = String(r).split(": ");
    const [a, b] = line!.split(" -> ");
    return `${end(a!)} -> ${end(b!)}${what.length ? `: ${what.join(": ")}` : ""}`;
  });
}

/** A call tree cut to a depth. */
function cut(tree: unknown, depth: number): unknown {
  const t = tree as { calls?: unknown[] };
  if (depth <= 1 || !t?.calls) return { ...t, calls: undefined };
  return { ...t, calls: t.calls.map((c) => cut(c, depth - 1)) };
}

/** **A sequence at its level**: a call inside one participant left out (it is that block's
 *  detail), its caller first, sending the way in to the first participant, and a participant
 *  no message reaches dropped. */
function at_level(selection: Record<string, unknown>, actor: string, entry: Entry,
                  helpers: string[] = []): void {
  const ends = (r: unknown) => String(r).split(":")[0]!.split(" -> ").map((s) => s.trim());
  // A message named as the class it reaches makes one
  const helper = new Set(((selection["participants"] ?? []) as { name: string; of?: string }[])
    .filter((x) => x.of && helpers.some((h) => x.of === h || x.of!.startsWith(`${h}.`)))
    .map((x) => x.name));
  const said = ((selection["relations"] ?? []) as unknown[]).filter((r) => {
    const [a, b] = ends(r);
    return a !== b && !helper.has(b!);
  }).map((r) => String(r).replace(/^(.+) -> (.+): (.+)$/, (all, a, b, w) =>
    (w === b ? `${a} -> ${b}: creates` : all)));
  const used = new Set(said.flatMap(ends));
  const parts = ((selection["participants"] ?? []) as { name: string }[])
    .filter((x) => used.has(typeof x === "string" ? x : x.name));
  const first = parts[0];
  const name = typeof first === "string" ? first : first?.name;
  if (!name) return;
  selection["participants"] = [{ name: actor, type: "actor" }, ...parts];
  selection["relations"] = [`${actor} -> ${name}: ${entry.name}`, ...said];
}

/** **The overview's parts**: each top unit's parts where it is open, else itself; each with its
 *  library path and size. */
function tops_of(library: Unit[]): { name: string; of: string; lines: number }[] {
  const holder = new Map(library.flatMap((u) => (u.parts ?? []).map((x) => [x, u.name] as const)));
  return top_units(library).map((x) => ({ name: x.name, lines: x.lines ?? 0,
    of: [holder.get(x), x.name].filter(Boolean).join(".") }));
}

/** A part's least share of the scope's lines to stand at the top: smaller ones stay in the
 *  library, left out of the overview and the context. */
const SMALL = 0.03;

/** **Who comes in by a way in**: an operator for a process or script; for a route, a client of
 *  the part it enters (the user, 2026-11-23: one `Client` was both the job pinging and the
 *  person on the dashboard), `api client`; renamed by the brief's `actors`. */
function caller(e: Entry, fed: Fed): string {
  const plain = caller_of(e, fed.library);
  return fed.actors[plain] ?? plain;
}

/** A way in's caller before the brief renames it. */
function caller_of(e: Entry, library: Unit[]): string {
  if (e.kind !== "registered" || !e.runs) return CALLER[e.kind] ?? "Caller";
  const unit = part_of(library)(e.runs);
  const top = top_units(library).find((u) => (u.unit ?? u.name) === unit);
  return top ? `${top.name} client` : "Client";
}

/** **The shared helpers** (round 9: a sequence's calls into `lib` were noise): the overview
 *  parts nearly every other leans on, leaning on none of them; a sequence leaves calls to them
 *  to the parts making them. */
function helpers_of(fed: Fed): string[] {
  const tops = big(tops_of(fed.library)).map((t) => t.of);
  const held: Held = new Map([...fed.held].filter(([, at]) => tops.includes(at)));
  const pairs = new Set(fed.imports.imports.flatMap((i) => {
    const [a, b] = [lifted(held, i.from), lifted(held, i.to)];
    return a && b && a !== b ? [`${a}|${b}`] : [];
  }));
  return tops.filter((t) => tops.length > 2
    && tops.filter((o) => o !== t && pairs.has(`${o}|${t}`)).length >= (tops.length - 1) * 0.75
    && !tops.some((o) => pairs.has(`${t}|${o}`)));
}

/** The parts big enough to stand at the top. */
function big<T extends { lines: number }>(parts: T[]): T[] {
  const total = parts.reduce((n, t) => n + t.lines, 0);
  return parts.filter((t) => t.lines >= total * SMALL);
}

/** **The world around the parts**: a caller per kind of way in the paths start from, each with
 *  a line to the overview part holding what it runs, named by the ways in; and each outside
 *  system the brief names (`externals`), with a line from the part it says reaches it. */
function callers_of(fed: Fed): { actors: { name: string; type: string; description?: string }[];
                                  lines: string[] } {
  const top = new Map(tops_of(fed.library).map((t) => [t.of, t.name]));
  const held: Held = new Map([...fed.held].filter(([, at]) => top.has(at)));
  const part = (runs: string) => top.get(lifted(held, runs) ?? "");
  const by = new Map<string, string[]>();
  for (const e of fed.ways) {
    const to = e.runs ? part(e.runs) : undefined;
    if (!to) continue;
    const key = `${caller(e, fed)} -> ${to}`;
    by.set(key, [...(by.get(key) ?? []), e.name]);
  }
  const actors = [...new Set([...by.keys()].map((k) => k.split(" -> ")[0]!))]
    .map((name): { name: string; type: string; description?: string } => ({ name, type: "actor" }));
  const lines = [...by].map(([k, names]) => `${k}: ${names.join(", ")}`);
  for (const [name, said] of Object.entries(fed.externals)) {
    /** An external may name what it is (`type: database`), a definition extending external. */
    const { at, description, type } = typeof said === "string" ? { at: said } : said;
    actors.push({ name, type: type ?? "external", ...(description ? { description } : {}) });
    lines.push(`${at} -> ${name}`);
  }
  return { actors, lines };
}

/** **A model's blocks**: the overview the library's top parts, a path what its diagrams
 *  reached, the data its classes; a path's caller beside them. */
function model_blocks(p: Planned, fed: Fed, actor?: string): unknown[] {
  const of = (b: unknown) => (typeof b === "string" ? { name: b, of: b }
    : { name: (b as { name: string }).name, of: (b as { of?: string; name: string }).of
        ?? (b as { name: string }).name });
  let parts: { name: string; of: string }[];
  if (p.recipe.holds === "top") {
    const callers = callers_of(fed);
    return [...callers.actors, ...big(tops_of(fed.library)).map(({ name, of }) => ({ name, of }))];
  } else if (p.recipe.holds === "classes") {
    parts = fed.classes.map((c) => ({ name: c.name, of: c.name }));
  } else {
    // The library blocks its calls reach, as a sequence lifts them, drawn or not
    let seen: { name: string; of: string }[] = [];
    try {
      const lifted = selection_from("sequence", p.calls, fed.held).selection;
      distinct(lifted, fed);
      seen = ((lifted["participants"] ?? []) as unknown[]).map(of);
    } catch { /* nothing the library holds: the caller alone */ }
    parts = [...new Map(seen.filter((b) => b.name !== actor).map((b) => [b.name, b])).values()];
  }
  return [...(actor ? [{ name: actor, type: "actor" }] : []), ...parts];
}

/** The first part a model's caller reaches. */
function first_part(blocks: unknown[], actor: string): string {
  const b = blocks.find((x) => (x as { name: string }).name !== actor) as { name: string } | undefined;
  return b?.name ?? actor;
}
