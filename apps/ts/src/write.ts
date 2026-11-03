/** A project's structure written as a source folder, in the `ts` package's kinds, for `collect`:
 *
 *  - `<model>.yaml`: the model, named by what was read (`model_of`); its packages, in their
 *    groups' folders, and the dependencies between them. A project of one package is that model
 *  - `<model>/<group>/<pkg>.yaml`: a package; its entry points, components and shared modules as
 *    bands, where it has a band beside its components, and the lines between its components,
 *    each named by what crosses
 *  - `<pkg>/[components/]<component>.yaml`: a component of more than one module; its modules
 *    and the lines between them, or its own components where it splits again
 *  - `<pkg>/[entry-points/]<entry>.yaml`: an entry with a path, and under it
 *    `<entry>/<entry>-path.yaml`, the path as a `sequence` it owns (flow-plan stage 3)
 *  - `types/[<group>/<pkg>/]<owner>/<Type>.yaml`: the shared types, each a definition in the
 *    folder of the block owning it; and `<component>/<component>-types.yaml`, a `class` diagram
 *    of those a component owns
 *  - `package.json`: the project's package
 *
 *  Ids follow paths and names, so translating again keeps them while the structure holds. */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { stringify } from "yaml";
import type { Code, Field, Mod, Pkg } from "./read";
import { stem_of, type Comp, type Path, type Shape } from "./structure";

/** What the files are written in: the `ts` package's kinds. */
const KIND = { package: "ts.package", component: "ts.component", module: "ts.module" } as const;

/** The bands' names, and the most names a line says before counting the rest. */
const BANDS = { entry: "entry points", comps: "components", shared: "shared" } as const;
const SAID = 2;

/** The root folder the shared types are written in. */
const TYPES = "types";

/** The block a component's diagram folds its least salient modules into. */
const OTHER = "other";


/** Every file of the source folder, by its path from the folder. */
export function files_of(code: Code, shapes: Shape[]): Map<string, string> {
  const out = new Map<string, string>();
  const model = model_of(code);
  /** The shared types' names said more than once across the packages: read by path, never bare. */
  const said = shapes.flatMap((x) => x.vocab.map((w) => x.pkg.modules.flatMap((m) => m.defs)
    .find((d) => d.id === w.id)!.name));
  const twice = new Set(said.filter((n, i) => said.indexOf(n) !== i));
  const head = { name: model, type: "model", packages: ["ts"],
                 ...(code.description ? { description: code.description } : {}) };
  if (shapes.length === 1) package_files(shapes[0]!, model, head, twice, out);
  else {
    const by_dir = new Map(code.packages.map((p) => [p.dir, p]));
    out.set(`${model}.yaml`, yaml({ ...head,
      relations: dependencies(code.packages.flatMap((p) => p.uses.map((u) =>
        `${path_of(p)} -> ${path_of(by_dir.get(u)!)}`))) }));
    for (const shape of shapes) {
      const p = shape.pkg;
      package_files(shape, [model, ...(p.group ? p.group.split("/") : []), p.name].join("/"), {
        name: p.name, type: KIND.package, source: p.dir,
        ...(p.description ? { description: p.description } : {}),
        ...(p.version ? { values: { version: p.version } } : {}) }, twice, out);
    }
  }
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

/** A package's file, at `at`, led by `head`, and its components' files under it. The entry
 *  points and shared modules are bands of their own above and below the components, their lines
 *  left out. */
function package_files(shape: Shape, at: string, head: Record<string, unknown>,
                       twice: Set<string>, out: Map<string, string>): void {
  const p = shape.pkg;
  const mod = new Map(p.modules.map((m) => [m.path, m]));
  const order = shape.levels.ranks.flat();
  const comps = [...shape.comps].sort((a, z) => order.indexOf(a.anchor) - order.indexOf(z.anchor));
  const names = named([...shape.entry, ...shape.foundation].map((path) => [path, stem_of(path)]),
                      comps.map((c) => [c.anchor, c.name]));
  const banded = shape.entry.length + shape.foundation.length > 0;
  /** A block on the layer by its module or anchor, as a reference names it from the root. */
  const where = (key: string) => [...at.split("/"), ...(banded ? [shape.entry.includes(key)
    ? BANDS.entry : shape.foundation.includes(key) ? BANDS.shared : BANDS.comps] : []),
                                  names.get(key)!].join(".");
  const entered = (path: string, inside: string) => {
    const p = shape.paths.find((x) => x.entry === path);
    return p ? entry_files(mod.get(path)!, names.get(path)!, p, where, names, inside, out)
      : module_block(mod.get(path)!, names.get(path)!);
  };
  const placed = comps.map((c) => c.modules.length === 1
    ? entered(c.modules[0]!, `${at}${banded ? `/${slug(BANDS.comps)}` : ""}`)
    : component_files(c, names.get(c.anchor)!, mod, `${at}${banded ? `/${slug(BANDS.comps)}` : ""}`,
                      shape.folded, out));
  const band = (name: string, paths: string[]) => paths.length
    ? [{ name, type: "region", blocks: paths.map((x) => entered(x, `${at}/${slug(name)}`))
      .filter(Boolean) }]
    : [];
  out.set(`${at}.yaml`, yaml({ ...head,
    blocks: banded ? [...band(BANDS.entry, shape.entry),
                      { name: BANDS.comps, type: "region", blocks: placed.filter(Boolean) },
                      ...band(BANDS.shared, shape.foundation)]
      : placed.filter(Boolean),
    relations: lines(p, new Map(comps.flatMap((c) => c.modules.map((m) =>
      [m, names.get(c.anchor)!] as const)))),
  }));
  vocab_files(shape, at, names, comps, `${at}${banded ? `/${slug(BANDS.comps)}` : ""}`, twice,
              out);
}

/** **The vocabulary written**: each shared type a definition in `types/`, in its package's and
 *  owner's folders — its fields its attributes, one typed by another written type an
 *  `association` to it, what it extends its `type` — and, for a component owning types, a
 *  `class` diagram of them beside its file (`comps_at`); the rest in one for the package. A type is named bare where its name is
 *  said once (`twice`), a line's end and a diagram's reference by its path; a field typed by
 *  anything else is text saying its type. */
function vocab_files(shape: Shape, at: string, names: Map<string, string>, comps: Comp[],
                     comps_at: string, twice: Set<string>, out: Map<string, string>): void {
  const defs = new Map(shape.pkg.modules.flatMap((m) => m.defs.map((d) => [d.id, d] as const)));
  const folder = (owner: string) => [TYPES, ...at.split("/").slice(1), names.get(owner)!];
  const ref = new Map(shape.vocab.map((w) => [w.id, [...folder(w.owner),
                                                     defs.get(w.id)!.name].join(".")]));
  const bare = new Map(shape.vocab.map((w) => defs.get(w.id)!.name).filter((n) => !twice.has(n))
    .map((n) => [n, n]));
  const named_as = new Map(shape.vocab.filter((w) => bare.has(defs.get(w.id)!.name))
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
  const diagram = (file: string, name: string, mine: typeof shape.vocab) => {
    if (mine.length) out.set(file, yaml({
      name: `${name} types`, type: "class",
      description: `The types ${name} declares and others read, the most read first.`,
      blocks: mine.map((w) => ({ type: "reference", of: ref.get(w.id)! })) }));
  };
  const filed = comps.filter((x) => x.modules.length > 1);
  for (const c of filed) {
    const name = names.get(c.anchor)!;
    diagram(`${comps_at}/${slug(name)}/${slug(name)}-types.yaml`, name,
            shape.vocab.filter((w) => w.owner === c.anchor));
  }
  /** Those its entry and shared modules own, the package's own. */
  const pkg = at.split("/").pop()!;
  diagram(`${at}/${slug(pkg)}-types.yaml`, pkg,
          shape.vocab.filter((w) => !filed.some((c) => c.anchor === w.owner)));
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

/** A component's file, at `at/<name>.yaml`: its own components where it splits again, else its
 *  modules, those `folded` by salience one block, `other`, saying which; with the lines between
 *  them. Nothing is placed inline for it, so it returns null. */
function component_files(c: Comp, name: string, mod: Map<string, Mod>, at: string,
                         folded: string[], out: Map<string, string>): null {
  const file = `${at}/${slug(name)}`;
  const away = c.modules.filter((m) => folded.includes(m));
  const parts: Comp[] = c.parts.length ? c.parts : [
    ...c.modules.filter((m) => !away.includes(m)).map((m) => ({ name: stem_of(m), anchor: m,
                                                                modules: [m], parts: [] })),
    ...(away.length ? [{ name: OTHER, anchor: OTHER, modules: away, parts: [] }] : [])];
  const names = named([], parts.map((x) => [x.anchor, x.name]));
  const blocks = parts.map((x) => x.anchor === OTHER
    ? { name: names.get(OTHER)!, description: `${x.modules.length} more modules: `
        + `${x.modules.map(stem_of).join(", ")}.`,
        values: { lines: x.modules.reduce((n, m) => n + mod.get(m)!.lines, 0) } }
    : x.modules.length === 1 ? module_block(mod.get(x.modules[0]!)!, names.get(x.anchor)!)
    : component_files(x, names.get(x.anchor)!, mod, file, folded, out)).filter(Boolean);
  const lines_of = [...mod.values()].filter((m) => c.modules.includes(m.path));
  out.set(`${file}.yaml`, yaml({
    name, type: KIND.component,
    description: `${c.modules.length} modules: ${c.modules.map(stem_of).join(", ")}.`,
    values: { lines: lines_of.reduce((sum, m) => sum + m.lines, 0) },
    blocks,
    relations: lines({ modules: lines_of }, new Map(parts.flatMap((x) => x.modules.map((m) =>
      [m, names.get(x.anchor)!] as const)))),
  }));
  return null;
}

/** An entry module with a path, as a file of its own at `at/<name>.yaml`, and its path as the
 *  `sequence` it owns beside it: a lifeline for each block the path reaches, a reference to it on
 *  the package layer (`where`); the entry's start, then a row a step, each step a block on the
 *  lifeline called, its message from where the caller was last, named by what is called. Placed
 *  as its file, so it returns null. */
function entry_files(m: Mod, name: string, path: Path, where: (key: string) => string,
                     names: Map<string, string>, at: string, out: Map<string, string>): null {
  const file = `${at}/${slug(name)}`;
  const lives = [path.entry, ...path.steps.flatMap((x) => [x.from, x.to])]
    .filter((k, i, all) => all.indexOf(k) === i);
  const cols = lives.map((k) => ({ name: names.get(k)!, type: "reference", of: where(k) }));
  const rows = ["0", ...path.steps.map((_, i) => String(i + 1))];
  /** One name space for lifelines, rows and blocks: a step's block is its call, `name()`. */
  const taken = new Set<string>([...cols.map((c) => c.name), ...rows]);
  const block_of = (n: string) => {
    let out = n;
    for (let i = 2; taken.has(out); i++) out = `${n} ${i}`;
    taken.add(out);
    return out;
  };
  const start = block_of("start");
  const last = new Map([[path.entry, start]]);
  const blocks = [{ name: start, cell: [rows[0], names.get(path.entry)] }];
  const messages = path.steps.map((x, i) => {
    const b = block_of(`${x.names[0]!}()`);
    blocks.push({ name: b, cell: [rows[i + 1], names.get(x.to)] });
    const from = last.get(x.from) ?? start;
    last.set(x.to, b);
    return { [`${from} -> ${b}`]: said_of(x.names) };
  });
  out.set(`${file}.yaml`, yaml(module_block(m, name)));
  out.set(`${file}/${slug(name)}-path.yaml`, yaml({
    name: `${name} path`, type: "sequence",
    description: `What ${name} calls, in the order it first calls it.`,
    cols, rows: rows.map((r) => ({ name: r })), blocks, relations: [{ message: messages }] }));
  return null;
}

/** A module's block: its file, its line of doc, its length. */
function module_block(m: Mod, name: string): Record<string, unknown> {
  return { name, type: KIND.module, source: m.path,
           ...(m.description ? { description: m.description } : {}), values: { lines: m.lines } };
}

/** Dependency lines between the blocks modules are placed in, one per pair, each named by the
 *  names read across it, the most read first. */
function lines(p: Pick<Pkg, "modules">, block: Map<string, string>): unknown[] {
  const read = new Map<string, Map<string, number>>();
  for (const m of p.modules) {
    for (const i of m.imports) {
      const [from, to] = [block.get(m.path), block.get(i.path)];
      if (!from || !to || from === to) continue;
      const key = `${from} -> ${to}`;
      const names = read.get(key) ?? new Map<string, number>();
      for (const n of i.names) names.set(n, (names.get(n) ?? 0) + 1);
      read.set(key, names);
    }
  }
  return dependencies([...read].map(([key, names]) => {
    const top = [...names].sort((a, z) => z[1] - a[1] || a[0].localeCompare(z[0])).map(([n]) => n);
    const said = said_of(top);
    return said ? { [key]: said } : key;
  }));
}

/** What a line or a message says: its first names, then how many more. */
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

/** The model's name: what was read, the folder every module sits in where there is one (`src`),
 *  else `code`. */
function model_of(code: Code): string {
  const tops = new Set(code.packages.flatMap((p) => p.modules.map((m) => m.path.split("/")[0])));
  const [top] = tops;
  return tops.size === 1 && top && code.packages.every((p) => p.modules.every((m) =>
    m.path.includes("/"))) ? top : "code";
}

/** A package's path on the model's layer: its group's folders, then its name. */
function path_of(p: Pkg): string {
  return [...(p.group ? p.group.split("/") : []), p.name].join(".");
}

/** A name as a file or folder: spaces as `-`. */
function slug(name: string): string {
  return name.replace(/\s+/g, "-");
}

/** A map as YAML, wide enough that a line's names stay on one line. */
function yaml(map: Record<string, unknown>): string {
  return stringify(map, { lineWidth: 0 });
}
