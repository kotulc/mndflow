/** **Fact tools** (docs/tools/): one question each about a project's source, answered as JSON,
 *  every fact anchored to its source (file, symbol) so `check` can flag drift. They read; whoever
 *  uses them decides what matters (docs/tools/README.md). Each is a view over `read_code`. */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parse } from "yaml";
import { read_code, type Code, type Mod } from "./read";

/** The fact tools, by name. */
export const FACTS = ["entries", "edges", "runtimes", "units", "calls", "data", "workflows",
                      "schema", "trace"] as const;

export type FactName = (typeof FACTS)[number];

/** What a fact tool is asked beside its source: a unit, a start, a datum, a depth. */
export type Asked = { unit?: string; from?: string; at?: string; of?: string; depth?: number };

/** Where a fact comes from: a file, and the symbol in it where there is one. */
type Anchor = { file: string; symbol?: string };


/** **A fact tool's answer** for the project at `root`. Throws, with why, where the question is
 *  not one the tool answers. */
export function fact(name: FactName, root: string, asked: Asked = {}): unknown {
  if (name === "workflows") return workflows(root);
  if (name === "trace") {
    throw new Error("trace is not built: it runs a command on a sample and watches the files it "
      + "touches (docs/tools/trace.md)");
  }
  const code = read_code(root);
  const mods = code.packages.flatMap((p) => p.modules);
  if (name === "entries") return entries(mods);
  if (name === "edges") return edges(mods, asked.unit);
  if (name === "runtimes") return mods.map((m) => ({ unit: m.path, runs: m.runs ?? null,
                                                     source: anchor(m) }));
  if (name === "units") return units(code, asked.depth ?? 2);
  if (name === "calls") return calls(mods, need(asked.from, "--from <module.function>"),
                                     asked.depth ?? 3);
  if (name === "data") return data(mods, asked);
  return schema(mods, need(asked.of, "--of <name>"));
}

/** A flag a tool cannot answer without. */
function need(said: string | undefined, flag: string): string {
  if (!said) throw new Error(`asks ${flag}`);
  return said;
}

/** A module as an anchor. */
function anchor(m: Mod, symbol?: string): Anchor {
  return { file: m.path, ...(symbol ? { symbol } : {}) };
}

/** **entries**: how the system is started, and by whom — each declared entry as it is run. */
function entries(mods: readonly Mod[]) {
  return mods.filter((m) => m.entered?.length).flatMap((m) => m.entered!.map((how) => ({
    name: how.startsWith("script ") ? `npm run ${how.slice(7)}` : how,
    by: how.startsWith("script ") ? "a person" : how.startsWith("Dockerfile") ? "Docker"
      : how === "index.html" ? "a browser" : how,
    module: m.path, source: anchor(m) })));
}

/** **edges**: where the system meets the outside — each unit's reach, reads and writes. */
function edges(mods: readonly Mod[], unit?: string) {
  return mods.filter((m) => (!unit || m.path.includes(unit))
    && (m.touches.length || m.files.reads.length || m.files.writes.length || m.config.length))
    .map((m) => ({ unit: m.path, reaches: m.touches, reads: m.files.reads,
                   writes: m.files.writes, config: m.config, source: anchor(m) }));
}

/** **units**: the containment tree — packages, then their modules, then their exported parts,
 *  to `depth`. */
function units(code: Code, depth: number) {
  return code.packages.map((p) => ({
    unit: p.name, dir: p.dir, ...(p.description ? { description: p.description } : {}),
    uses: p.uses,
    ...(depth > 1 ? { modules: p.modules.map((m) => ({
      unit: m.path, lines: m.lines, ...(m.description ? { description: m.description } : {}),
      imports: m.imports.map((i) => i.path), source: anchor(m),
      ...(depth > 2 ? { parts: m.parts.filter((x) => x.exported).map((x) => ({
        name: x.name, kind: x.kind, signature: x.signature,
        source: anchor(m, x.name) })) } : {}) })) } : {}),
  }));
}

/** One step of a call chain: the function, its module, and what it calls in turn. */
type Step = { function: string; module: string; source: Anchor; calls?: Step[] };

/** **calls**: what a function calls, in source order, across modules, to `depth`. */
function calls(mods: readonly Mod[], from: string, depth: number): Step {
  const by = new Map(mods.map((m) => [m.path, m]));
  const cut = from.lastIndexOf(".");
  const [path, fn] = cut > 0 ? [from.slice(0, cut), from.slice(cut + 1)] : ["", from];
  const start = mods.find((m) => m.path === path || m.path.replace(/\.[jt]sx?$/, "") === path
    || (!path && m.parts.some((x) => x.name === fn)));
  if (!start) throw new Error(`no module ${path || "declares"} ${fn}`);
  const seen = new Set<string>();
  const step = (m: Mod, name: string, left: number): Step => {
    seen.add(`${m.path}.${name}`);
    const next = m.calls.filter((c) => c.from === name).sort((a, z) => a.at - z.at)
      .filter((c) => !seen.has(`${c.to}.${c.name}`));
    return { function: name, module: m.path, source: anchor(m, name),
             ...(left > 0 && next.length ? { calls: next.map((c) => {
               const to = by.get(c.to);
               return to ? step(to, c.name, left - 1)
                 : { function: c.name, module: c.to, source: { file: c.to, symbol: c.name } };
             }) } : {}) };
  };
  return step(start, fn, depth);
}

/** **data**: at a function, what its module reads and writes and the types it takes in; of a
 *  datum, where it is declared (made) and every module reading it. */
function data(mods: readonly Mod[], asked: Asked) {
  if (asked.of) {
    const of = asked.of;
    const made = mods.filter((m) => m.defs.some((d) => d.name === of));
    const read = mods.filter((m) => m.imports.some((i) => i.types.includes(of)));
    return { datum: of, made: made.map((m) => anchor(m, of)),
             read: read.map((m) => ({ ...anchor(m), names: m.imports
               .filter((i) => i.types.includes(of)).map((i) => i.path) })) };
  }
  const at = need(asked.at, "--at <module.function> or --of <datum>");
  const path = at.slice(0, Math.max(0, at.lastIndexOf(".")));
  const m = mods.find((x) => x.path === path || x.path.replace(/\.[jt]sx?$/, "") === path);
  if (!m) throw new Error(`no module ${path}`);
  return { at, reads: m.files.reads, writes: m.files.writes, config: m.config,
           types: [...new Set(m.imports.flatMap((i) => i.types))],
           source: anchor(m, at.slice(path.length + 1)) };
}

/** **schema**: a data definition's shape — its fields, their types, what it extends. */
function schema(mods: readonly Mod[], of: string) {
  for (const m of mods) {
    const d = m.defs.find((x) => x.name === of);
    if (d) {
      return { name: d.name, kind: d.kind, ...(d.extends ? { extends: d.extends } : {}),
               ...(d.description ? { description: d.description } : {}),
               fields: d.fields, source: { file: d.source, symbol: d.name } };
    }
    const t = m.types.find((x) => x.name === of);
    if (t) return { name: t.name, form: t.form, choices: t.choices ?? [], source: anchor(m, of) };
  }
  throw new Error(`no definition named ${of}`);
}

/** **workflows**: what CI does, on which trigger — each workflow's triggers, its jobs in order
 *  (`needs` first), what each runs or uses. */
function workflows(root: string) {
  const dir = join(root, ".github", "workflows");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).map((f) => {
    const file = join(dir, f);
    const doc = (parse(readFileSync(file, "utf8")) ?? {}) as Record<string, unknown>;
    const on = doc["on"] ?? doc["true"];
    const triggers = typeof on === "string" ? [on] : Array.isArray(on) ? on.map(String)
      : on && typeof on === "object" ? Object.keys(on) : [];
    const jobs = Object.entries((doc["jobs"] ?? {}) as Record<string, Record<string, unknown>>)
      .map(([id, job]) => ({
        id, needs: [job["needs"] ?? []].flat().map(String),
        steps: ((job["steps"] ?? []) as Record<string, unknown>[]).map((s) => ({
          ...(s["name"] ? { name: String(s["name"]) } : {}),
          ...(s["uses"] ? { uses: String(s["uses"]) } : {}),
          ...(s["run"] ? { run: String(s["run"]).trim() } : {}) })) }));
    return { workflow: String(doc["name"] ?? f), triggers, jobs: ordered(jobs),
             source: { file: relative(root, file).split("\\").join("/") } };
  });
}

/** Jobs in the order they can run: each after what it needs. */
function ordered<T extends { id: string; needs: string[] }>(jobs: T[]): T[] {
  const out: T[] = [];
  const left = [...jobs];
  while (left.length) {
    const i = left.findIndex((j) => j.needs.every((n) => out.some((o) => o.id === n)));
    out.push(...left.splice(i < 0 ? 0 : i, 1));
  }
  return out;
}
