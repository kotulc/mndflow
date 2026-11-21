/** **`define`** (docs/tools/define.md): the library written from what an agent picked out of the
 *  fact tools, in the `code` package's kinds, for any language. A translator lists; the agent
 *  picks; this writes (design.md *Translation*, 2026-11-19). The library is containment:
 *
 *  - a `package` unit is a folder; any other unit under folders alone is a **definition**, its
 *    own file, its parts inline — a part whose parts hold parts a file of its own in a directory
 *    named as its holder's file (its parts, never definitions)
 *  - `relations` (or `imports`): `{from, to, name?}` by unit, each end lifted to the nearest unit
 *    picked. Inside one definition, a dependency in the file holding both ends; between two
 *    definitions, an edge in `package.json`, rewritten each time
 *  - `classes`: each a definition under `types/`, by its module's path; a field keyed to another
 *    class picked typed by it; a base picked its type; the class's part in its module a use of it */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { parse, parseDocument, stringify, type Document } from "yaml";

/** A unit as the fact tools list it, and as an agent may edit it. */
type Unit = { unit?: string; name: string; kind?: string; description?: string; lines?: number;
              signature?: string; source?: { file: string; line?: number }; parts?: Unit[] };

/** A relation between two units, by their dotted names. */
type Link = { from: string; to: string; name?: string };

/** A class as `classes` lists it. */
type Cls = { name: string; unit?: string; extends?: string[]; description?: string;
             fields?: { name: string; type: string; to?: string }[];
             source?: { file: string; line?: number } };

/** What `define` reads: a `units` answer alone, or units with relations and classes. */
export type Picked = Unit[] | { units?: Unit[]; relations?: Link[]; imports?: Link[];
                                classes?: Cls[] };

/** What `define` writes: files by path under the folder, the package's edges, what it could
 *  not say. */
export type Defined = { files: Map<string, string>; edges: Record<string, unknown>; notes: string[] };

/** The kinds a unit may be, as the `code` package names them. */
const KINDS = ["package", "component", "module", "class", "function", "value", "interface",
               "actor"];

/** The id prefix of the edges `define` writes into `package.json`, so writing again replaces
 *  them and nothing else. */
const EDGE = "define.";

/** A unit placed: the unit holding it, the definition it is or sits in (none for a folder), the
 *  block whose file says it, and that file's path. */
type Placed = { node: Unit; up: Unit | null; def: Unit | null; file: Unit | null; path: string };

/** What one writing pass gathers. */
type Pass = { placed: Map<string, Placed>; bodies: Map<Unit, Record<string, unknown>>;
              typed: Map<string, string> };


/** **The files a selection writes**, the edges between its definitions, and what it could not
 *  say; `under` the folder a top unit is written in. */
export function define(picked: Picked, under: (unit: string) => string = () => ""): Defined {
  const said = Array.isArray(picked) ? { units: picked } : picked;
  const notes: string[] = [];
  const files = new Map<string, string>();
  const classes = said.classes ?? [];
  const pass: Pass = { placed: new Map(), bodies: new Map(),
                       typed: new Map(classes.flatMap((c) => (c.unit ? [[c.unit, c.name]] : []))) };
  // A top unit goes where the library already files what holds it (`hc.integrations` in `hc/`)
  for (const u of said.units ?? []) place(u, null, under(key(u)), pass);
  // `imports` may be the fact's whole answer, its list under `imports`
  const imported = said.imports as unknown as Link[] | { imports?: Link[] } | undefined;
  const links = Array.isArray(imported) ? imported : imported?.imports ?? [];
  const edges = place_links([...(said.relations ?? []), ...links], pass, notes);
  for (const [u, body] of pass.bodies) {
    files.set(pass.placed.get(key(u))!.path, stringify(body, { lineWidth: 0 }));
  }
  write_classes(classes, files, notes);
  return { files, edges, notes };
}

/** A unit under folders: a package a folder, anything else a definition of its own. */
function place(u: Unit, up: Unit | null, dir: string, pass: Pass): void {
  // A package holding parts picked is a folder; one picked alone is a definition, never empty
  if ((u.kind ?? "module") === "package" && u.parts?.length) {
    const at = [dir, name_of(u)].filter(Boolean).join("/");
    pass.placed.set(key(u), { node: u, up, def: null, file: null, path: at });
    for (const p of u.parts ?? []) place(p, u, at, pass);
    return;
  }
  own_file(u, up, u, dir, pass);
}

/** A block with a file of its own: its parts inline, or in files of their own beside it. */
function own_file(u: Unit, up: Unit | null, def: Unit, dir: string, pass: Pass): void {
  const path = [dir, `${name_of(u)}.yaml`].filter(Boolean).join("/");
  pass.placed.set(key(u), { node: u, up, def, file: u, path });
  const inside = [dir, name_of(u)].filter(Boolean).join("/");
  const blocks = (u.parts ?? []).map((p) => {
    if ((p.parts ?? []).some((x) => (x.parts ?? []).length)) {
      own_file(p, u, def, inside, pass);
      return name_of(p);
    }
    return inline(p, u, def, pass);
  });
  pass.bodies.set(u, { ...head(u, pass), ...(blocks.length ? { blocks } : {}) });
}

/** A part written inside its holder's file, with its parts. */
function inline(u: Unit, up: Unit, def: Unit, pass: Pass): unknown {
  const file = pass.placed.get(key(up))!.file;
  pass.placed.set(key(u), { node: u, up, def, file, path: "" });
  const blocks = (u.parts ?? []).map((p) => inline(p, u, def, pass));
  return { ...head(u, pass), ...(blocks.length ? { blocks } : {}) };
}

/** A block's fields: its name, kind (a class picked: its definition), source, description and
 *  values. */
function head(u: Unit, pass: Pass): Record<string, unknown> {
  const kind = u.kind ?? "module";
  if (!KINDS.includes(kind)) throw new Error(`${u.name}: no kind ${kind}: ${KINDS.join(", ")}`);
  const values = { ...(u.lines !== undefined ? { lines: u.lines } : {}),
                   ...(u.signature ? { signature: u.signature } : {}) };
  const typed = u.unit ? pass.typed.get(u.unit) : undefined;
  return { name: name_of(u), type: typed ?? `code.${kind}`,
           ...(u.source ? { source: anchor(u.source) } : {}),
           ...(u.description ? { description: u.description } : {}),
           ...(Object.keys(values).length ? { values } : {}) };
}

/** Each relation lifted to the units picked: inside one definition a dependency in the file
 *  holding both ends, between two definitions a `package.json` edge. */
function place_links(links: Link[], pass: Pass, notes: string[]): Record<string, unknown> {
  const { placed, bodies } = pass;
  const lines = new Map<Unit, Map<string, string>>();
  const edges: Record<string, unknown> = {};
  const folders = new Set<string>();
  for (const l of links) {
    const [a, b] = [lifted(l.from, placed), lifted(l.to, placed)];
    if (!a || !b) {
      notes.push(`${l.from} -> ${l.to}: an end is in no unit picked`);
      continue;
    }
    if (a === b || inside(a, b, placed) || inside(b, a, placed)) continue;
    const [da, db] = [placed.get(key(a))!.def, placed.get(key(b))!.def];
    if (!da || !db) {
      folders.add(key(!da ? a : b));
      continue;
    }
    /** **Between two definitions, part to part** (2026-11-21): the edge joins the units picked,
     *  so a definition's view draws it crossing its wall from the part it leaves. */
    if (da !== db) {
      const id = `${EDGE}${slug(key(a))}--${slug(key(b))}`;
      edges[id] = { id, type: "dependency", from: path_of(a, placed), to: path_of(b, placed),
                    ...(l.name ? { name: l.name } : {}) };
      continue;
    }
    const file = shared_file(a, b, placed);
    const line = `${path_in(a, file, placed)} -> ${path_in(b, file, placed)}`;
    const of = lines.get(file) ?? new Map<string, string>();
    if (!of.has(line)) of.set(line, l.name ?? "");
    lines.set(file, of);
  }
  // A package folder is said once, however many relations end on it
  for (const f of folders) notes.push(`relations end on ${f}, a package folder: pick its parts `
    + "(a finer --depth) to place them");
  for (const [file, of] of lines) {
    bodies.get(file)!["relations"] = [{ dependency: [...of].map(([line, name]) =>
      (name ? `${line}: ${name}` : line)) }];
  }
  return edges;
}

/** A unit as a package file's edge names it: its folders', definition's and parts' names from
 *  the package's root (`hc.accounts.views`), wherever each is written. */
function path_of(u: Unit, placed: Map<string, Placed>): string {
  const names: string[] = [];
  for (let at: Unit | null = u; at; at = placed.get(key(at))?.up ?? null) names.unshift(name_of(at));
  return names.join(".");
}

/** The unit picked that holds a dotted name: itself, else its nearest holder. */
function lifted(name: string, placed: Map<string, Placed>): Unit | null {
  for (let at = name; at; at = at.includes(".") ? at.slice(0, at.lastIndexOf(".")) : "") {
    const hit = placed.get(at);
    if (hit) return hit.node;
  }
  return null;
}

/** Whether `a` sits inside `b`. */
function inside(a: Unit, b: Unit, placed: Map<string, Placed>): boolean {
  for (let at = placed.get(key(a))?.up ?? null; at; at = placed.get(key(at))?.up ?? null) {
    if (at === b) return true;
  }
  return false;
}

/** The innermost block with a file of its own above both units, inside their definition. */
function shared_file(a: Unit, b: Unit, placed: Map<string, Placed>): Unit {
  const above = (u: Unit) => {
    const out: Unit[] = [];
    for (let at = placed.get(key(u))?.up ?? null; at; at = placed.get(key(at))?.up ?? null) {
      if (placed.get(key(at))?.file === at) out.push(at);
    }
    return out;
  };
  const of_b = new Set(above(b));
  return above(a).find((x) => of_b.has(x)) ?? placed.get(key(a))!.def!;
}

/** A unit's path as the file of `file` names it: its holders below that file, then itself. */
function path_in(u: Unit, file: Unit, placed: Map<string, Placed>): string {
  const chain: string[] = [];
  for (let at: Unit | null = u; at && at !== file; at = placed.get(key(at))?.up ?? null) {
    chain.unshift(name_of(at));
  }
  return chain.join(".");
}

/** Each class a definition under `types/`, by its module's path; its fields its attributes. */
function write_classes(classes: Cls[], files: Map<string, string>, notes: string[]): void {
  const by_name = new Map<string, Cls[]>();
  for (const c of classes) by_name.set(c.name, [...(by_name.get(c.name) ?? []), c]);
  for (const [name, same] of by_name) {
    if (same.length > 1) {
      notes.push(`class ${name} picked ${same.length} times (${same.map((c) => c.unit).join(", ")}):`
                 + " rename all but one, a definition's name is unique in its package");
    }
  }
  for (const c of classes) {
    const base = (c.extends ?? []).map((e) => e.split(".").pop()!).find((e) => by_name.has(e));
    // A base of the project's own left unpicked is said: the class loses what it inherits
    const top = (c.unit ?? "").split(".")[0];
    const unpicked = (c.extends ?? []).filter((e) => e.split(".")[0] === top
      && !by_name.has(e.split(".").pop()!));
    if (!base && unpicked.length) {
      notes.push(`class ${c.name} extends ${unpicked.join(", ")}, not picked: pick it to `
        + "inherit from it, else it is written a plain code.class");
    }
    const attributes = (c.fields ?? []).map((f) => {
      const to = f.to?.split(".").pop();
      return to && by_name.has(to) ? { name: f.name, type: to }
        : { name: f.name, type: "text", note: to ? `${f.type} to ${to}` : f.type };
    });
    const module = (c.unit ?? c.name).split(".").slice(0, -1);
    const def = { id: ["types", ...module, name_of(c)].join("."), name: name_of(c),
                  type: base ?? "code.class",
                  ...(c.description ? { description: c.description } : {}),
                  ...(c.source ? { source: anchor(c.source) } : {}), def: { attributes } };
    files.set(["types", ...module, `${name_of(c)}.json`].join("/"),
              `${JSON.stringify(def, null, 2)}\n`);
  }
}

/** A source anchor as a block's `source`: its file, and its line where there is one. */
function anchor(s: { file: string; line?: number }): string {
  return s.line ? `${s.file}#L${s.line}` : s.file;
}

/** A unit's name as a file may say it: no `.` (written `-`). */
function name_of(u: { name: string }): string {
  return u.name.replace(/\./g, "-");
}

/** A unit's key: its dotted name, else its name. */
function key(u: Unit): string {
  return u.unit ?? u.name;
}

/** A key as an id may hold it. */
function slug(s: string): string {
  return s.replace(/[^\w-]+/g, "-");
}

/** **Only what `--keep` names** (2026-11-20): a unit named (its name, its dotted path or the
 *  end of it) is kept whole; one holding a kept unit is kept to hold it; the rest dropped. */
export function kept_units(units: Unit[], keep: readonly string[]): Unit[] {
  const hit = (u: Unit) => keep.some((k) => u.name === k || key(u) === k || key(u).endsWith(`.${k}`));
  return units.flatMap((u): Unit[] => {
    if (hit(u)) return [u];
    const parts = kept_units(u.parts ?? [], keep);
    return parts.length ? [{ ...u, parts }] : [];
  });
}

/** **Writes** the files under `folder`: new ones written, one already there kept (its new parts
 *  merged in by name) unless `force`
 *  (2026-11-20: a finer pick folds into an edited library); its edges added to `package.json`'s,
 *  or under `force` in place of those written before. */
export function write_defined(folder: string, { files, edges }: Defined,
                              force: boolean): { written: string[]; kept: string[];
                                                 merged: string[] } {
  const pkg = join(folder, "package.json");
  if (!existsSync(pkg)) throw new Error(`${folder} has no package.json: write one importing code`);
  // Without --force a file already there is kept as edited, new parts merged into its blocks;
  // one moved or renamed is found by its source, and one now inline in its holder grafted there
  const at = new Map<string, string>();
  if (!force) {
    const placed = sources_in(folder);
    for (const f of files.keys()) {
      const moved = placed.get(source_of(files.get(f)!) ?? "");
      if (existsSync(join(folder, f))) at.set(f, f);
      else if (moved) at.set(f, moved);
    }
  }
  // A part file follows its holder's file where that was moved
  const holder = (f: string) => `${f.replace(/\/[^/]+$/, "")}.yaml`;
  const placed = (f: string): string => {
    if (!f.includes("/")) return at.get(f) ?? f;
    const up = placed(holder(f));
    return at.get(f) ?? `${up.replace(/\.yaml$/, "")}/${f.split("/").pop()}`;
  };
  const inline = force ? [] : [...files.keys()].filter((f) => !at.has(f) && (f.includes("/")
    && held_inline(join(folder, placed(holder(f))), files.get(f)!)
    || grafted_inline(folder, files.get(f)!)));
  const written = [...files.keys()].filter((f) => !at.has(f) && !inline.includes(f));
  for (const file of written) {
    mkdirSync(dirname(join(folder, placed(file))), { recursive: true });
    writeFileSync(join(folder, placed(file)), files.get(file)!);
  }
  const kept = [...at.values()];
  const merged = [...at].filter(([f, to]) => to.endsWith(".yaml")
    && merge(join(folder, to), files.get(f)!)).map(([, to]) => to);
  merged.push(...inline.map((f) => placed(holder(f))));
  // Edges `define` wrote before are replaced under --force, else added to
  const doc = JSON.parse(readFileSync(pkg, "utf8")) as { graph: { edges?: Record<string, unknown> } };
  const before = Object.entries(doc.graph.edges ?? {}).filter(([id]) => !force || !id.startsWith(EDGE));
  doc.graph.edges = { ...Object.fromEntries(before), ...edges };
  writeFileSync(pkg, `${JSON.stringify(doc, null, 2)}
`);
  return { written: [...written.map(placed), ...(Object.keys(edges).length ? ["package.json (edges)"] : [])],
           kept: kept.filter((f) => !merged.includes(f)), merged: [...new Set(merged)] };
}

/** Parts a new pick adds to a file already there, grafted into its `blocks` by name at every
 *  depth, nothing there changed; whether any were. */
function merge(path: string, text: string): boolean {
  const doc = parseDocument(readFileSync(path, "utf8"));
  const added = graft(doc, [], (parse(text) as { blocks?: unknown[] }).blocks ?? []);
  if (added) writeFileSync(path, doc.toString({ lineWidth: 0 }));
  return added > 0;
}

/** Each file's own source anchor, by anchor: where a block written before now lives. */
function sources_in(folder: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const f of readdirSync(folder, { recursive: true }) as string[]) {
    const rel = f.split(sep).join("/");
    if (!/\.(ya?ml|json)$/.test(rel) || rel === "package.json") continue;
    const said = source_of(readFileSync(join(folder, f), "utf8"));
    if (said && !out.has(said)) out.set(said, rel);
  }
  return out;
}

/** A file's own `source`, at its top. */
function source_of(text: string): string | undefined {
  return /^\s*"?source"?:\s*"?([^"\s,]+)/m.exec(text.replace(/^\s{4,}.*$/gm, ""))?.[1];
}

/** A new part file (`api/models.yaml`) whose holder's file (`api.yaml`) holds it inline already:
 *  its parts grafted into that inline block instead; whether it was. */
function held_inline(holder: string, text: string): boolean {
  if (!existsSync(holder)) return false;
  const doc = parseDocument(readFileSync(holder, "utf8"));
  const name = (parse(text) as { name?: string }).name;
  const had = ((doc.toJS() as { blocks?: unknown[] }).blocks ?? []);
  const i = had.findIndex((b) => typeof b === "object" && b && (b as { name?: string }).name === name);
  if (i < 0) return false;
  if (graft(doc, ["blocks", i], (parse(text) as { blocks?: unknown[] }).blocks ?? [])) {
    writeFileSync(holder, doc.toString({ lineWidth: 0 }));
  }
  return true;
}

/** The file a block of that source already sits inline in, anywhere in the library, else null. */
export function inline_home(folder: string, src: string): string | null {
  for (const f of readdirSync(folder, { recursive: true }) as string[]) {
    if (!/\.ya?ml$/.test(f)) continue;
    const doc = parseDocument(readFileSync(join(folder, f), "utf8"));
    const at = path_to_source((doc.toJS() as { blocks?: unknown[] }).blocks ?? [], src, ["blocks"]);
    if (at) return f.split(sep).join("/");
  }
  return null;
}

/** A new file whose block already sits inline anywhere in the library, found by its `source`:
 *  its parts grafted there instead; whether it was. */
function grafted_inline(folder: string, text: string): boolean {
  const src = source_of(text);
  if (!src) return false;
  for (const f of readdirSync(folder, { recursive: true }) as string[]) {
    if (!/\.ya?ml$/.test(f)) continue;
    const doc = parseDocument(readFileSync(join(folder, f), "utf8"));
    const at = path_to_source((doc.toJS() as { blocks?: unknown[] }).blocks ?? [], src, ["blocks"]);
    if (!at) continue;
    if (graft(doc, at, (parse(text) as { blocks?: unknown[] }).blocks ?? [])) {
      writeFileSync(join(folder, f), doc.toString({ lineWidth: 0 }));
    }
    return true;
  }
  return false;
}

/** Where under `blocks` a block of that source sits inline, as a document path. */
function path_to_source(blocks: unknown[], src: string, at: (string | number)[]): (string | number)[] | null {
  for (const [i, b] of blocks.entries()) {
    if (typeof b !== "object" || !b) continue;
    const m = b as { source?: string; blocks?: unknown[] };
    if (m.source === src) return [...at, i];
    const deeper = path_to_source(m.blocks ?? [], src, [...at, i, "blocks"]);
    if (deeper) return deeper;
  }
  return null;
}

/** Each fresh block missing under `at` added; one there taking its own missing parts. */
function graft(doc: Document, at: (string | number)[], fresh: unknown[]): number {
  const name = (b: unknown) => (typeof b === "string" ? b : (b as { name?: string })?.name);
  // A part renamed by hand is still found by its source
  const src = (b: unknown) => (typeof b === "object" && b ? (b as { source?: string }).source
    : undefined);
  const same = (h: unknown, b: unknown) => name(h) === name(b) || (!!src(h) && src(h) === src(b));
  const parts = (b: unknown) => (typeof b === "object" && b ? (b as { blocks?: unknown[] }).blocks
    : undefined);
  const node = doc.getIn([...at, "blocks"]) as { toJSON?: () => unknown } | undefined;
  if (!node) {
    doc.setIn([...at, "blocks"], doc.createNode(fresh));
    return fresh.length;
  }
  const had = (node?.toJSON?.() ?? []) as unknown[];
  let n = 0;
  for (const b of fresh) {
    const i = had.findIndex((h) => same(h, b));
    if (i < 0) {
      doc.addIn([...at, "blocks"], doc.createNode(b));
      n++;
    } else if (parts(b)?.length && typeof had[i] === "string") {
      // A bare name there takes the block with its parts
      doc.setIn([...at, "blocks", i], doc.createNode(b));
      n++;
    } else if (parts(b)?.length) n += graft(doc, [...at, "blocks", i], parts(b)!);
  }
  return n;
}
