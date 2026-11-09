/** A project's structure written as a source folder, in the `ts` package's kinds, for `collect`.
 *  **The library is the system; a model is one path's story** (2026-11-08):
 *
 *  - `<pkg>/<unit>.yaml`: every unit a definition, filed by package (`parts` for a lone one) — an entry module (tagged
 *    `entry`), a component, a shared module (tagged `shared`), in reading order. A component's
 *    modules are its parts, with the lines between them, or its own components where it splits
 *    again, each a file under `<pkg>/<component>/`
 *  - `<n>-<entry>.yaml`: a model per entry path of two steps or more, `n` its reading order, the
 *    most salient path first: uses of the units the path passes through in first-visit order, then
 *    the shared modules they lean on; a line a step, in order, named by what is called
 *  - `types/<pkg>/<owner>/<Type>.yaml`: the shared types, each a definition in the folder of the
 *    unit owning it
 *  - `outside/<actor>.yaml`: the system's edge — the file system, the commands it runs, the
 *    framework hosting it — each touched by the units that reach it
 *  - `package.json`: the project's package
 *
 *  **Where code runs is the first split** (2026-11-08): a package running in more than one place
 *  files its units in a folder per container. **A unit says what it is for and what it
 *  touches**: its header, its API (the exports used outside it), the files and config keys it
 *  reads, what it writes, the outside it reaches, its tests; an API function calling three or more
 *  of the project's in order is a `flow`. Ids follow paths and names, so translating again keeps
 *  them while the structure holds. */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { stringify } from "yaml";
import type { Code, Field, Flow, Mod, Pkg } from "./read";
import { stem_of, units_of, values_of, type Comp, type Levels, type Path,
         type Shape } from "./structure";

/** What the files are written in: the `ts` package's kinds. */
const KIND = { component: "ts.component", module: "ts.module", function: "ts.function",
               value: "ts.value", actor: "ts.actor" } as const;

/** The root folder of the system's edge, and what each kind of actor is. */
const OUTSIDE = "outside";
const ACTORS: Record<string, string> = {
  "file system": "The disk the code reads and writes.",
  processes: "Programs the code starts.", network: "What the code reaches over the network.",
  terminal: "The terminal the code reads from.", environment: "The environment variables the code reads.",
};

/** Exports used outside their unit, by module path: a module's API. */
type Api = Map<string, Set<string>>;

/** How many items a list attribute says before counting the rest. */
const LISTED = 4;

/** Every unit, by key: its name, its package folder's, and its definition's path, read from the
 *  project's package so it is never taken for another. */
type Refs = Map<string, { name: string; pkg: string; ref: string }>;

/** The ts package's tags for a package's entry points and its shared modules, the most names a
 *  line says before counting the rest, and the fewest steps a path tells as a model. */
const TAGS = { entry: "ts.entry", shared: "ts.shared" } as const;
const SAID = 2;
const READS = 6;
const LEAST = 2;

/** The root folders the shared types are written in, and a lone package's units. */
const TYPES = "types";
const PARTS = "parts";



/** Every file of the source folder, by its path from the folder. */
export function files_of(code: Code, shapes: Shape[], system: Levels): Map<string, string> {
  const out = new Map<string, string>();
  /** The shared types' names said more than once across the packages: read by path, never bare. */
  const said = shapes.flatMap((x) => x.vocab.map((w) => x.pkg.modules.flatMap((m) => m.defs)
    .find((d) => d.id === w.id)!.name));
  const twice = new Set(said.filter((n, i) => said.indexOf(n) !== i));
  /** The packages in reading order: by level, entries first. */
  const order = system.ranks.flat();
  const sorted = [...shapes].sort((a, z) => order.indexOf(a.pkg.dir) - order.indexOf(z.pkg.dir));
  /** Each package's folder, by its name; a lone package's is `parts`, or none where its
   *  containers are the top folders. */
  const lone = sorted.length === 1;
  const names = new Map([...named(sorted.map((x) => [x.pkg.dir, slug(x.pkg.name)]))]
    .map(([dir, n]) => [dir, lone ? (sorted[0]!.containers.length ? "" : PARTS) : n]));
  /** Where a unit is filed: its package's folder, then its container's. */
  const filed = (x: Shape, key: string) => [names.get(x.pkg.dir)!,
    x.containers.find((c) => c.modules.includes(key))?.name ?? ""].filter(Boolean);
  const refs: Refs = new Map(sorted.flatMap((x) => [...unit_names(x)].map(([key, name]) => {
    const at = filed(x, key);
    return [key, { name, pkg: at.join("-"), ref: [code.name, ...at, name].join(".") }];
  })));
  const api = api_of(sorted);
  for (const shape of sorted) {
    unit_files(shape, (key) => filed(shape, key).map(slug).join("/"), api, out);
    vocab_files(shape, names.get(shape.pkg.dir)!, unit_names(shape), twice, out);
  }
  const actors = [...new Set(code.packages.flatMap((p) => p.modules.flatMap((m) => m.touches)))];
  /** The frameworks running the code: what declared its entries by convention. */
  const hosts = new Set(code.packages.flatMap((p) => p.modules.flatMap((m) => m.entered ?? [])));
  for (const a of actors) {
    out.set(`${OUTSIDE}/${slug(a)}.yaml`, yaml({
      name: a, type: KIND.actor, def: {},
      description: ACTORS[a] ?? (hosts.has(a) ? `The framework running the code: ${a}.`
        : `A command the code runs: ${a}.`) }));
  }
  model_files(sorted, refs, new Set(names.values()), `${code.name}.${OUTSIDE}`, out);
  out.set("package.json", `${JSON.stringify({
    schema: "1.0", id: code.name,
    graph: { root: code.name, edges: {}, blocks: { [code.name]: {
      id: code.name, parent: null, name: code.name,
      ...(code.description ? { description: code.description } : {}) } } },
  }, null, 2)}\n`);
  return out;
}

/** The files written under a folder, every directory made. */
export function write_all(folder: string, files: Map<string, string>): void {
  for (const [path, text] of files) {
    const full = join(folder, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
}

/** **Each module's API**: the names other units read from it, by import or by call. */
function api_of(shapes: Shape[]): Api {
  const unit = new Map(shapes.flatMap((x) => [...units_of(x)]));
  const out: Api = new Map();
  const add = (from: string, to: string, names: readonly string[]) => {
    if (unit.get(from) === unit.get(to)) return;
    out.set(to, new Set([...out.get(to) ?? [], ...names]));
  };
  for (const m of shapes.flatMap((x) => x.pkg.modules)) {
    for (const i of m.imports) add(m.path, i.path, i.names);
    for (const c of m.calls) add(m.path, c.to, [c.name]);
  }
  return out;
}

/** **A package's units as definitions**, each in its folder (`at`, its container's where the
 *  package has them), in reading order there: its entry modules, its components by level, then
 *  its shared modules. */
function unit_files(shape: Shape, at: (key: string) => string, api: Api,
                    out: Map<string, string>): void {
  const mod = new Map(shape.pkg.modules.map((m) => [m.path, m]));
  const names = unit_names(shape);
  const tag = (path: string) => (shape.entry.includes(path) ? [TAGS.entry]
    : shape.foundation.includes(path) ? [TAGS.shared] : []);
  const units = [...shape.entry.map((m) => ({ key: m, comp: null })),
                 ...ranked(shape).map((c) => ({ key: c.anchor, comp: c })),
                 ...shape.foundation.map((m) => ({ key: m, comp: null }))];
  const counted = new Map<string, number>();
  for (const { key, comp } of units) {
    const name = names.get(key)!;
    const folder = at(key);
    counted.set(folder, (counted.get(folder) ?? 0) + 1);
    const n = String(counted.get(folder)).padStart(2, "0");
    const file = [folder, `${n}-${slug(name)}`].filter(Boolean).join("/");
    if (comp && comp.modules.length > 1) {
      component_files(comp, name, mod, file, shape.rank, api, out, true);
    } else {
      const path = comp ? comp.modules[0]! : key;
      out.set(`${file}.yaml`, yaml({ ...module_block(mod.get(path)!, name, api, file, out,
                                                     tag(path)), def: {} }));
    }
  }
}

/** A package's components in reading order, by level. */
function ranked(shape: Shape): Comp[] {
  const order = shape.levels.ranks.flat();
  return [...shape.comps].sort((a, z) => order.indexOf(a.anchor) - order.indexOf(z.anchor));
}

/** The names of a package's units, by key: its entry and shared modules', and its components'. */
function unit_names(shape: Shape): Map<string, string> {
  return named([...shape.entry, ...shape.foundation].map((path) => [path, stem_of(path)]),
               ranked(shape).map((c) => [c.anchor, c.name]));
}

/** **The models**: one per entry path of `LEAST` steps or more, the most salient first — the
 *  summed salience of the modules its units hold — each numbered by its place so the package
 *  reads them in that order. */
function model_files(shapes: Shape[], refs: Refs, folders: Set<string>, outside: string,
                     out: Map<string, string>): void {
  const weight = new Map(shapes.flatMap((x) => [...x.weight]));
  const held = new Map(shapes.flatMap((x) => x.comps.map((c) => [c.anchor, c.modules] as const)));
  const holds = (key: string) => held.get(key) ?? [key];
  const shared = new Set(shapes.flatMap((x) => x.foundation));
  const mod = new Map(shapes.flatMap((x) => x.pkg.modules.map((m) => [m.path, m] as const)));
  const told = shapes.flatMap((x) => x.paths).filter((p) => p.steps.length >= LEAST)
    .map((p) => {
      const keys = [p.entry, ...p.steps.flatMap((x) => [x.from, x.to])]
        .filter((k, i, all) => all.indexOf(k) === i);
      const score = keys.flatMap(holds).reduce((n, m) => n + (weight.get(m) ?? 0), 0);
      return { p, keys, score };
    })
    .sort((a, z) => z.score - a.score || a.p.entry.localeCompare(z.p.entry));
  /** Named by its entry, led by its package's name where two share one, never as a folder. */
  const bare = told.map(({ p }) => refs.get(p.entry)!.name);
  told.forEach(({ p, keys }, i) => {
    /** The shared modules its units import: leaned on, never stepped into. */
    const leaned = [...new Set(keys.flatMap(holds).flatMap((m) => mod.get(m)?.imports ?? [])
      .map((x) => x.path).filter((m) => shared.has(m) && !keys.includes(m)))].sort();
    const name = bare.indexOf(bare[i]!) === bare.lastIndexOf(bare[i]!) ? bare[i]!
      : `${refs.get(p.entry)!.pkg}-${bare[i]}`;
    const title = folders.has(name) ? `${name} path` : name;
    const entry = mod.get(p.entry)!;
    /** **The outside the path reaches**: each actor its units touch, a line from each. */
    const reach = new Map(keys.map((k) => [k, holds(k).flatMap((m) => mod.get(m)?.touches ?? [])]));
    const said = [entry.entered?.length ? `Entered by ${entry.entered.join(", ")}.` : "",
                  entry.description ?? ""].filter(Boolean).join(" ");
    out.set(`${i + 1}-${slug(title)}.yaml`, yaml(model_of(title, said, p, [...keys, ...leaned],
                                                           refs, reach, outside)));
  });
}

/** **One path's model**: a use of each unit it passes through, then of those it leans on, named
 *  by its unit, led by its package's name where two share one; a line a step, in order, named by
 *  what is called; then the outside its units reach, a line from each unit reaching it. */
function model_of(name: string, said: string, path: Path, keys: string[], refs: Refs,
                  reach: Map<string, string[]>, outside: string): Record<string, unknown> {
  const bare = keys.map((k) => refs.get(k)!.name);
  const local = new Map(keys.map((k, i) => [k, bare.indexOf(bare[i]!) === bare.lastIndexOf(bare[i]!)
    ? bare[i]! : `${refs.get(k)!.pkg}-${bare[i]}`]));
  const taken = new Set(local.values());
  const actors = [...new Set([...reach.values()].flat())].filter((a) => !taken.has(a));
  return {
    name, type: "model",
    description: said || `What ${name} calls, in the order it first calls it.`,
    blocks: [...keys.map((k) => ({ name: local.get(k)!, type: refs.get(k)!.ref })),
             ...actors.map((a) => ({ name: a, type: `${outside}.${a}` }))],
    relations: dependencies([...path.steps.map((x) => {
      const key = `${local.get(x.from)} -> ${local.get(x.to)}`;
      const said = said_of(x.names);
      return said ? { [key]: said } : key;
    }), ...keys.flatMap((k) => [...new Set(reach.get(k) ?? [])].filter((a) => actors.includes(a))
      .map((a) => `${local.get(k)} -> ${a}`))]),
  };
}

/** **The vocabulary written**: each shared type a definition in `types/<pkg>/<owner>/` — its
 *  fields its attributes, one typed by another written type an `association` to it, what it
 *  extends its `type`. A type is named bare where its name is said once (`twice`), a line's end by
 *  its path; a field typed by anything else is text saying its type. */
function vocab_files(shape: Shape, pkg: string, names: Map<string, string>, twice: Set<string>,
                     out: Map<string, string>): void {
  const defs = new Map(shape.pkg.modules.flatMap((m) => m.defs.map((d) => [d.id, d] as const)));
  const folder = (owner: string) => [TYPES, pkg, names.get(owner)!].filter(Boolean);
  const ref = new Map(shape.vocab.map((w) => [w.id, [...folder(w.owner),
                                                     defs.get(w.id)!.name].join(".")]));
  const named_as = new Map(shape.vocab.filter((w) => !twice.has(defs.get(w.id)!.name))
    .map((w) => [w.id, defs.get(w.id)!.name]));
  for (const w of shape.vocab) {
    const d = defs.get(w.id)!;
    const links = d.fields.filter((f) => f.link && ref.has(f.type));
    const base = d.extends && named_as.get(d.extends);
    out.set(`${folder(w.owner).map(slug).join("/")}/${slug(d.name)}.yaml`, yaml({
      name: d.name, ...(base ? { type: base } : {}),
      def: { attributes: d.fields.map((f) => attribute(f, named_as)) },
      ...(d.description ? { description: d.description } : {}),
      source: d.source, settings: { card: { face: "class" } },
      ...(links.length ? { relations: [{ association: links.map((f) => ({
        from: d.name, to: ref.get(f.type)!,
        ends: { to: { role: f.name, multiplicity: f.many ? "*" : f.optional ? "0..1" : "1" } },
      })) }] } : {}),
    }));
  }
}

/** A field as an attribute: a form as it is, a written type by its bare name, else text saying
 *  it. */
function attribute(f: Field, named_as: Map<string, string>): Record<string, unknown> {
  const form = ["text", "number", "flag"].includes(f.type);
  const type = form ? f.type : named_as.get(f.type) ?? "text";
  const note = form || named_as.has(f.type) ? f.note : f.note ?? f.type.split(".").pop();
  return { name: f.name, type, ...(f.many ? { many: true } : {}),
           ...(note ? { note } : {}) };
}

/** A component's file, at `file.yaml`, a definition where `def`: its own components where it
 *  splits again, each a file under `file/`, else every module, the most salient first — a view
 *  folds what it has no room for, never the model (2026-11-05); with the lines between them. */
function component_files(c: Comp, name: string, mod: Map<string, Mod>, file: string,
                         rank: string[], api: Api, out: Map<string, string>, def = false): string {
  const parts: Comp[] = c.parts.length ? c.parts : [...c.modules]
    .sort((a, z) => rank.indexOf(a) - rank.indexOf(z))
    .map((m) => ({ name: stem_of(m), anchor: m, modules: [m], parts: [] }));
  const names = named([], parts.map((x) => [x.anchor, x.name]));
  const blocks = parts.map((x) => x.modules.length === 1
    ? module_block(mod.get(x.modules[0]!)!, names.get(x.anchor)!, api,
                   `${file}/${slug(names.get(x.anchor)!)}`, out)
    : component_files(x, names.get(x.anchor)!, mod, `${file}/${slug(names.get(x.anchor)!)}`,
                      rank, api, out));
  const lines_of = [...mod.values()].filter((m) => c.modules.includes(m.path));
  const head = mod.get(c.anchor)?.description;
  out.set(`${file}.yaml`, yaml({
    name, type: KIND.component, ...(def ? { def: {} } : {}),
    description: head ?? `${c.modules.length} modules: ${c.modules.map(stem_of).join(", ")}.`,
    values: { lines: lines_of.reduce((sum, m) => sum + m.lines, 0), ...answers(lines_of) },
    blocks,
    relations: lines({ modules: lines_of }, new Map(parts.flatMap((x) => x.modules.map((m) =>
      [m, names.get(x.anchor)!] as const)))),
  }));
  return name;
}

/** **A module's block**: its file, its tags, its header, its length and its answers
 *  (`answers`); its API its parts, each by its signature — the exports another unit reads, never
 *  what it keeps to itself or its own unit only uses. **An API function calling three or more of
 *  the project's functions in order is a flow** (2026-11-08), a behaviour of the module, written
 *  under `dir`; an entry's functions all may be. */
function module_block(m: Mod, name: string, api: Api, dir: string, out: Map<string, string>,
                      tags: string[] = []): Record<string, unknown> {
  const used = api.get(m.path);
  const parts = m.parts.filter((p) => p.exported && (m.entered || used?.has(p.name)));
  const flows = m.flows.filter((f) => m.entered || parts.some((p) => p.name === f.name));
  for (const f of flows) {
    out.set(`${dir}/${slug(f.name)}.yaml`,
            yaml(flow_of(f, m.parts.find((p) => p.name === f.name))));
  }
  const kept = parts.filter((p) => !flows.some((f) => f.name === p.name));
  return { name, type: KIND.module, source: m.path, ...(tags.length ? { tags } : {}),
           ...(m.description ? { description: m.description } : {}),
           values: { lines: m.lines, ...answers([m]) },
           ...(kept.length ? { blocks: kept.map((p) => ({
             name: p.name, type: KIND[p.kind], source: p.source,
             ...(p.description ? { description: p.description } : {}),
             values: { signature: p.signature } })) } : {}) };
}

/** **A function's flow**: from its start, each project function it calls in order, to its end. */
function flow_of(f: Flow, part?: Mod["parts"][number]): Record<string, unknown> {
  const steps = f.steps.filter((x) => x !== "Begin" && x !== "Done");
  const chain = ["Begin", ...steps, "Done"];
  return { name: f.name, type: "flow",
           description: [part?.signature, part?.description].filter(Boolean).join(": ")
             || `What ${f.name} does, in order.`,
           blocks: [{ name: "Begin", type: "start" }, ...steps, { name: "Done", type: "end" }],
           relations: chain.slice(1).map((x, i) => `${chain[i]} -> ${x}`) };
}

/** **What units answer about themselves**, over their modules: where they run, how they are
 *  entered, the shared types, files and config keys they read, the files they write, the outside
 *  they touch, the tests importing them. Each a list cut short past `LISTED`; empty ones left out. */
function answers(mods: readonly Mod[]): Record<string, string> {
  const all = (pick: (m: Mod) => readonly string[]) => listed([...new Set(mods.flatMap(pick))]);
  const out: Record<string, string> = {
    runs: all((m) => (m.runs ? [m.runs] : [])), entered: all((m) => m.entered ?? []),
    types: reads_of(mods), reads: all((m) => m.files.reads), writes: all((m) => m.files.writes),
    config: all((m) => m.config), touches: all((m) => m.touches), tests: all((m) => m.tests) };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v));
}

/** A list said: its first items, then how many more. */
function listed(items: readonly string[]): string {
  return items.slice(0, LISTED).join(", ")
    + (items.length > LISTED ? ` +${items.length - LISTED}` : "");
}

/** The shared types some modules read, the most read first, cut short past `READS`. */
function reads_of(mods: readonly Mod[]): string {
  const count = new Map<string, number>();
  for (const n of mods.flatMap((m) => m.imports.flatMap((i) => i.types))) {
    count.set(n, (count.get(n) ?? 0) + 1);
  }
  const top = [...count].sort((a, z) => z[1] - a[1] || a[0].localeCompare(z[0])).map(([n]) => n);
  return top.slice(0, READS).join(", ") + (top.length > READS ? ` +${top.length - READS}` : "");
}

/** Dependency lines between the blocks modules are placed in, one per pair, each named by the
 *  values read across it, the most read first; types read are vocabulary, never a line. */
function lines(p: Pick<Pkg, "modules">, block: Map<string, string>): unknown[] {
  const read = new Map<string, Map<string, number>>();
  for (const m of p.modules) {
    for (const i of m.imports.filter((x) => values_of(x))) {
      const [from, to] = [block.get(m.path), block.get(i.path)];
      if (!from || !to || from === to) continue;
      const key = `${from} -> ${to}`;
      const names = read.get(key) ?? new Map<string, number>();
      for (const n of i.names.filter((x) => !i.types.includes(x))) {
        names.set(n, (names.get(n) ?? 0) + 1);
      }
      read.set(key, names);
    }
  }
  return dependencies([...read].map(([key, names]) => {
    const top = [...names].sort((a, z) => z[1] - a[1] || a[0].localeCompare(z[0])).map(([n]) => n);
    const said = said_of(top);
    return said ? { [key]: said } : key;
  }));
}

/** What a line says: its first names, then how many more. */
function said_of(names: readonly string[]): string {
  return names.slice(0, SAID).join(", ") + (names.length > SAID ? ` +${names.length - SAID}` : "");
}

/** Names unique among siblings, without dots: a repeated name is led by its folder. */
function named(...lists: [string, string][][]): Map<string, string> {
  const all = lists.flat();
  const count = (n: string) => all.filter(([, o]) => o === n).length;
  return new Map(all.map(([key, n]) => {
    const folder = key.split("/").slice(-2, -1)[0];
    const name = count(n) > 1 && folder ? `${folder}-${n}` : n;
    return [key, name.replace(/\./g, "-")];
  }));
}

/** Dependencies as one `dependency: [edges]` entry, each edge once: `A -> B`, or a map naming it. */
function dependencies(edges: readonly (string | Record<string, string>)[]): unknown[] {
  const kept = edges.filter((e, i) => typeof e !== "string" || edges.indexOf(e) === i);
  return kept.length ? [{ dependency: kept }] : [];
}

/** A name as a file or folder: spaces as `-`. */
function slug(name: string): string {
  return name.replace(/\s+/g, "-");
}

/** A map as YAML, wide enough that a line's names stay on one line. */
function yaml(map: Record<string, unknown>): string {
  return stringify(map, { lineWidth: 0 });
}
