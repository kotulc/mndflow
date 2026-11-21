/** The headless app: folds, acts, projects and checks without React. */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";
import { lens_of, NAMED_VIEWS, all_defs, alias_of, check, children, collect, diagram_kind,
         domain_of, fold, is_model, package_of, path, read, review, say, session, setting_of, shown_name, wanted, write, type Collected, type Fault,
         type Graph, type Id, type Leaf, type Log, type Storage } from "@mnd/core";
import { FLOOR } from "@mnd/defs";
import { fixture, graph_file, GRAPH_NAMES, NAMES } from "@mnd/fixtures";
import { draw, draw_svg, faults, outline, project } from "@mnd/views";
import { measured, scaled } from "./measure";
import { define, inline_home, kept_units, write_defined } from "./define";
import { python_fact, is_python } from "./python";
import { diagram_file, draft, presentations, tour } from "./tools";
import { held_in, is_facts, outside_of, selection_from } from "./from_facts";
import { node_net } from "./ports";
import { as_file, from_sysml, shape_of, to_sysml } from "./sysml";

const USAGE = `mnd — the headless harness

  mnd fold <source>                    fold a log and print the block tree
  mnd project <source> [layer] [--how] project a layer and print it
  mnd project <source> [layer] --svg  project a layer and draw it as SVG
  mnd outline <source> [layer]         list what a projection holds
  mnd measure <source> [layer]         lay out and route each diagram as the app does; count
                                       lines over cards, covered names, shared runs, tight gaps;
                                       --views: the scale check of every tree view
  mnd check <source | folder>          run the door, print faults; a folder is collected first
  mnd review <source> [layer]          ask what the definitions wanted
  mnd run <source> <action> [k=v ...]  apply an action, print what it wrote
  mnd search <source> <name>           fetch a definition package, through the door
  mnd translate <source> [--round]     write the graph as SysML, and check it comes back
                        [--with <pkg>] bring a vocabulary in first, so its names are used
  mnd export <source> [out.json]       fold and write the file

  tools (docs/tools/): plain commands a person or an agent composes models with
  mnd fact <name> <project> [--unit u] [--from m.fn] [--at m.fn] [--of name] [--depth n]
                            [--run "<command>"]  (trace)
                                       one question of a project's source, as JSON. TypeScript:
                                       entries, edges, runtimes, units, calls, data, workflows,
                                       schema, trace. Python: units, imports, classes, entries,
                                       calls, trace. --unit targets a part, --depth the detail
  mnd look <folder>                    every block by the hue its look resolves to: a highlight
                                       checked without the app
  mnd define <picked.json> <folder> [--keep a,b,…] [--force]
                                       the library from what was picked out of the facts: units
                                       as block files, relations as dependencies, classes as
                                       definitions; adds new files and keeps those already
                                       there (edited), unless --force replaces them
  mnd draw <kind> <selection.json|facts.json> [out.yaml] [--name n] [--description d]
           [--keep a,b,…] [--force]
                                       a diagram file of one kind from a selection (a diagram
                                       file's map as JSON) or from a fact answer, pruned:
                                       sequence and flow from calls or trace, context from
                                       imports, class and entity from classes, overview from
                                       units; into a source folder, lifted to its library;
                                       --keep only those parts (names or paths); warns below
                                       the floor, never overwrites unless --force
  mnd presentation list <model.yaml>   a model's presentations and their stops
  mnd presentation draft <folder> [--force]
                                       the whole model's tour: each model file's own, and the
                                       overview's leading into each; kept unless --force
  mnd presentation draft <model.yaml> --from <diagram.yaml> [--as name] [--dry]
                                       a presentation seeded from a flow or sequence, added
  mnd presentation check <model.yaml>  collect its package and say what does not resolve
  mnd collect <folder> [out.json]      a folder as a package: package.json, a .json file per
                                       definition, diagram files and markdown cards
                        [--bare]       keep the ids it says, as base's are kept
                        [--workspace]  collect it as the workspace, not a package

  <source> is a log fixture (${NAMES.join(", ")}),
           a file fixture (${GRAPH_NAMES.join(", ")}),
           an exported file, a raw log, or a source folder, collected as the workspace.
  A log is harness input only: a file is a graph, and that is what export writes.
  --how sets the layer's placing: auto layered treemap
  --svg writes the drawing instead of the text projection
  k=@path reads that value from a file: body=@cards/pump.md
  --from sets the package catalogue search reads (default public/packages/index.json)
`;

/** A fixture of either kind, an exported file, a raw log, or a source folder collected as the
 *  workspace — what it could not read or find said on the way. */
function load(source: string): { log: Log; faults: Fault[]; notes?: string[] } {
  if (NAMES.includes(source as never)) return { log: fixture(source), faults: [] };
  if (existsSync(source) && statSync(source).isDirectory()) {
    const got = gathered(source, true);
    for (const n of got.notes) console.error(`  ${n}`);
    return { ...read(got.text, FLOOR), notes: got.notes };
  }
  if (!GRAPH_NAMES.includes(source as never) && !existsSync(source)) {
    throw new Error(`no file or folder ${source} (paths are read from ${process.cwd()})`);
  }
  const text = GRAPH_NAMES.includes(source as never)
    ? graph_file(source)
    : readFileSync(source, "utf8");
  return text.trimStart().startsWith("[") ? check(JSON.parse(text), FLOOR) : read(text, FLOOR);
}

/** A storage bound to what we already hold, so `run` can use the real session. */
function held(log: Log): Storage {
  let kept = log;
  return { read: () => kept, write: (next) => { kept = next; }, clear: () => { kept = []; } };
}

function tree(log: Log): string {
  const graph = fold(log, FLOOR);
  const lines: string[] = [];
  const walk = (id: Id | null, depth: number) => {
    for (const b of children(graph, id)) {
      const kids = children(graph, b.id).length;
      /** The handle beside the name, composed here like every other surface. */
      const called = [shown_name(graph, b.id), alias_of(graph, b.id)]
        .filter(Boolean).join(" ");
      lines.push(`${"  ".repeat(depth)}${kids ? "▾" : "·"} ${called}`);
      walk(b.id, depth + 1);
    }
  };
  lines.push(shown_name(graph, graph.root));
  walk(graph.root, 1);
  return lines.join("\n");
}

/** A layer by name or by id, so nothing has to be copied out of a fixture. */
function find_layer(log: Log, want: string | undefined): Id | null {
  if (!want) return null;
  const graph = fold(log, FLOOR);
  if (graph.blocks[want]) return want;
  const hit = Object.values(graph.blocks).find((b) => b.name === want);
  if (!hit) {
    console.error(`  no layer called "${want}"`);
    process.exit(1);
  }
  return hit.id;
}

/** A view a block names is asked for by name. Every other layer is projected as the command
 *  always did. */
function look_of(graph: Graph, layer: Id | null) {
  if (!layer) return undefined;
  const kind = lens_of(graph, layer);
  if (!kind || !(NAMED_VIEWS as readonly string[]).includes(kind)) return undefined;
  return { look: { kind, cut: null } };
}

function flag(args: string[], name: string): string | undefined {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
}

/** The flags that take the argument after them. */
const VALUED = ["--how", "--layer", "--from", "--with", "--unit", "--at", "--of", "--depth",
                "--as", "--run", "--name", "--description", "--keep"];

/** The positional arguments. */
function loose(args: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (VALUED.includes(a)) i++;
    else if (!a.startsWith("--") && !a.includes("=")) out.push(a);
  }
  return out;
}

function pairs(args: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const a of args) {
    const eq = a.indexOf("=");
    if (eq < 0) continue;
    const key = a.slice(0, eq);
    const value = a.slice(eq + 1);
    /** A value said as `@path` is that file's text, where there is such a file. */
    out[key] = value.startsWith("@") && existsSync(value.slice(1)) ? readFileSync(value.slice(1), "utf8")
             : value === "true" ? true : value === "false" ? false
             : /^-?\d+$/.test(value) ? Number(value) : value;
  }
  return out;
}

/** Every file under a folder, by its path from it, skipping what is hidden. */
function leaves(folder: string, at = folder): Leaf[] {
  return readdirSync(at).flatMap((name): Leaf[] => {
    if (name.startsWith(".") || name === "node_modules") return [];
    const full = join(at, name);
    if (statSync(full).isDirectory()) return leaves(folder, full);
    return [{ path: relative(folder, full).split(sep).join("/"), text: readFileSync(full, "utf8") }];
  });
}

/** A source folder collected, with every package it imports loaded first: a catalogue name from
 *  beside the catalogue, a path from the folder — itself a package file or a folder. */
function gathered(folder: string, workspace: boolean, bare = false,
                  seen = new Set<string>()): Collected {
  /** A folder importing itself, or two importing each other, is read once. */
  seen.add(resolve(folder));
  const files = leaves(folder);
  let over = fold([], FLOOR);
  const notes: string[] = [];
  for (const want of wanted(files)) {
    const at = want.startsWith("./") ? resolve(folder, want)
      : join(dirname(CATALOGUE), `${want}.json`);
    if (seen.has(resolve(at))) continue;
    const text = !existsSync(at) ? undefined
      : statSync(at).isDirectory() ? gathered(at, false, false, seen).text
      : readFileSync(at, "utf8");
    if (text) over = joined(over, text);
    else notes.push(`${want}: no such package; its names become plain definitions`);
  }
  const got = collect(basename(resolve(folder)), files, over,
                      { bare, ...(workspace ? { root: over.root } : {}) });
  return { ...got, notes: [...notes, ...got.notes] };
}


/** A package file's blocks and relations beside what a graph holds; an id already there stays. */
function joined(graph: Graph, text: string): Graph {
  const file = JSON.parse(text) as { graph?: Partial<Graph> };
  return { ...graph, blocks: { ...file.graph?.blocks, ...graph.blocks },
           edges: { ...file.graph?.edges, ...graph.edges } };
}

/** Where the packages catalogue lives, at the repo root. */
const CATALOGUE = resolve(dirname(fileURLToPath(import.meta.url)),
                          "../../../public/packages/index.json");

async function main(argv: string[]): Promise<void> {
  const [verb, source, ...rest] = argv;
  /** `--help` anywhere asks for the usage, never a source named so. */
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    return;
  }
  if (!verb || !source) {
    console.log(USAGE);
    process.exit(verb ? 1 : 0);
  }

  if (verb === "look") {
    if (!source) throw new Error("mnd look <folder>");
    console.log(looks(JSON.parse(gathered(resolve(source!), true).text).graph).join("\n"));
    return;
  }
  if (verb === "fact" || verb === "draw" || verb === "presentation" || verb === "define") {
    await tool(verb, source, rest);
    return;
  }

  /** A source folder is a folder, not a log: read whole, and written as a package file. */
  if (verb === "collect") {
    const { text, made, clashes, notes } = gathered(source, rest.includes("--workspace"),
                                                    rest.includes("--bare"));
    const out = loose(rest)[0];
    if (out) writeFileSync(out, text);
    else process.stdout.write(text);
    if (made.length) console.error(`  made ${made.join(", ")}`);
    if (clashes.length) console.error(`  refused, said twice: ${clashes.join(", ")}`);
    for (const n of notes) console.error(`  ${n}`);
    return;
  }

  const { log, faults: reading, notes: collected = [] } = load(source);
  const how = flag(rest, "how");
  const plain = loose(rest);
  /** Everything but `check` prints a headline of what the door said. */
  if (reading.length && verb !== "check") console.error(`  ${say(reading)}`);

  switch (verb) {
    case "fold":
      console.log(tree(log));
      return;

    /** A file fixture's faults are the door's on the way in; a log is checked here. */
    /** A folder's collection notes (a name that resolves to nothing) fail it as faults do. */
    case "check": {
      const found = reading.length ? reading : check(log, FLOOR).faults;
      const head = [found.length ? `${found.length} read past (the files are unchanged: fix each)`
        : "", collected.length
        ? `${collected.length} ${collected.length === 1 ? "note" : "notes"} from collecting` : ""];
      console.log(head.filter(Boolean).join("; ") || "clean");
      for (const f of found) console.log(`  ${f.what}`);
      if (found.length || collected.length) process.exitCode = 1;
      return;
    }

    /** What the definitions in scope asked for and did not get. */
    case "review": {
      const graph = fold(log, FLOOR);
      const notes = review(graph, find_layer(log, plain[0]) ?? undefined);
      console.log(notes.length ? `${notes.length} to answer for` : "clean");
      for (const n of notes) console.log(`  ${n.kind}: ${n.what}`);
      return;
    }

    case "project":
    case "outline": {
      const layer = find_layer(log, plain[0]);
      let graph = fold(log, FLOOR);
      if (how && layer !== null) graph = { ...graph,
        blocks: { ...graph.blocks, [layer]: { ...graph.blocks[layer]!,
          settings: { ...graph.blocks[layer]!.settings, diagram: { placing: how } } } } };
      const scene = project(graph, layer, look_of(graph, layer));
      const wrong = faults(scene);
      if (wrong.length) {
        console.error("the scene is not well-formed:");
        for (const w of wrong) console.error(`  ${w}`);
        process.exit(1);
      }
      if (verb === "outline") console.log(outline(scene));
      else if (rest.includes("--svg")) process.stdout.write(draw_svg(scene));
      else console.log(draw(scene));
      return;
    }

    case "measure": {
      const graph = fold(log, FLOOR);
      if (rest.includes("--views")) console.log(scaled(graph).join("\n"));
      else console.log((await measured(graph, find_layer(log, plain[0]))).join("\n"));
      return;
    }

    case "run": {
      const [action] = plain;
      if (!action) {
        console.error("  which action?");
        process.exit(1);
      }
      const s = session({ storage: held(log), floor: FLOOR });
      const before = s.log().length;
      const layer = find_layer(s.log(), flag(rest, "layer"));
      if (layer !== null) s.look(layer);
      const refused = s.go(action, pairs(rest));
      if (refused) {
        console.error(`  refused: ${refused}`);
        process.exit(1);
      }
      const wrote = s.log().slice(before);
      for (const step of wrote) {
        console.log(`${step.action}:`);
        for (const m of step.mutations) console.log(`  ${m.op}`);
      }
      if (wrote.length === 0) console.log("(no step — navigation writes nothing)");
      console.log();
      console.log(tree(s.log()));
      return;
    }

    /** A package from outside, in through the door against the workspace it joins. */
    case "search": {
      const s = session({ storage: held(log), floor: FLOOR, net: node_net(),
                          catalogue: flag(rest, "from") ?? CATALOGUE });
      const before = new Set(all_defs(s.graph()).map((d) => d.id));
      const found = await s.search(plain.join(" "));
      console.log(s.said()?.text ?? "");
      if (!found) process.exit(1);
      for (const d of all_defs(s.graph())) {
        if (!before.has(d.id)) console.log(`  ${domain_of(s.graph(), d.id)} ${d.name}`);
      }
      for (const f of found.faults) console.log(`  ${f.kind}: ${f.what}`);
      return;
    }


    /** SysML out, and with `--round`, back in and compared. */
    case "translate": {
      /** `--with` brings a vocabulary in first, so its names are used. */
      const want = flag(rest, "with");
      let held_log = log;
      if (want) {
        const s = session({ storage: held(log), floor: FLOOR, net: node_net(),
                            catalogue: flag(rest, "from") ?? CATALOGUE });
        if (!(await s.search(want))) {
          console.error(`  ${s.said()?.text ?? ""}`);
          process.exit(1);
        }
        held_log = s.log();
      }
      const graph = fold(held_log, FLOOR);
      const text = to_sysml(graph);
      if (!rest.includes("--round")) {
        process.stdout.write(text);
        return;
      }
      const back = read(as_file(from_sysml(text, all_defs(graph))), FLOOR);
      for (const f of back.faults) console.log(`  ${f.kind}: ${f.what}`);
      const again = fold(back.log, FLOOR);
      const was = shape_of(graph);
      const now = shape_of(again);
      const lost = was.filter((line) => !now.includes(line));
      const gained = now.filter((line) => !was.includes(line));
      console.log(lost.length || gained.length
        ? `${was.length} out, ${now.length} back — ${lost.length} lost, ${gained.length} gained`
        : `${was.length} out and the same ${now.length} back`);
      for (const line of lost) console.log(`  lost:   ${line}`);
      for (const line of gained) console.log(`  gained: ${line}`);
      if (lost.length || gained.length) process.exit(1);
      return;
    }

    case "export": {
      const text = write(fold(log, FLOOR));
      const out = plain[0];
      if (out) writeFileSync(out, text);
      else process.stdout.write(text);
      return;
    }

    default:
      console.error(`  no verb called "${verb}"`);
      console.log(USAGE);
      process.exit(1);
  }
}

/** **The tools' commands** (docs/tools/): each prints JSON or writes a file; a question a tool
 *  cannot answer exits 1 with why, a misuse 2. */
async function tool(verb: string, first: string, rest: string[]): Promise<void> {
  const fail = (why: unknown, code = 1) => {
    console.error(`  ${why instanceof Error ? why.message : String(why)}`);
    process.exit(code);
  };
  try {
    if (verb === "define") {
      const [folder] = loose(rest);
      if (!folder) fail("mnd define <picked.json> <folder> [--force]", 2);
      // A top unit lands in the deepest folder there already named for what holds it
      const under = (unit: string) => {
        const steps = unit.split(".").slice(0, -1);
        for (let k = steps.length; k > 0; k--) {
          const dir = steps.slice(0, k).join("/");
          if (existsSync(join(folder!, dir)) && statSync(join(folder!, dir)).isDirectory()) return dir;
        }
        return "";
      };
      const keep = flag(rest, "keep")?.split(",").map((k) => k.trim()).filter(Boolean);
      const read_in = JSON.parse(readFileSync(first, "utf8"));
      const picked = !keep?.length ? read_in : Array.isArray(read_in) ? kept_units(read_in, keep)
        : { ...read_in, units: kept_units(read_in.units ?? [], keep),
            // A class is kept where `--keep` names it or a unit holding it
            ...(read_in.classes ? { classes: (read_in.classes as { name: string; unit?: string }[])
              .filter((c) => keep.some((k) => c.name === k || (c.unit ?? "") === k
                || (c.unit ?? "").endsWith(`.${k}`) || (c.unit ?? "").includes(`.${k}.`)
                || (c.unit ?? "").startsWith(`${k}.`))) } : {}) };
      // A package already written inline in its holder's file is re-translated through it
      if (!rest.includes("--force")) {
        const tops = (Array.isArray(picked) ? picked : picked.units ?? []) as
          { unit?: string; kind?: string; parts?: unknown[]; source?: { file: string } }[];
        for (const t of tops) {
          const home = t.kind === "package" && t.parts?.length && t.source
            ? inline_home(folder!, t.source.file) : null;
          if (home) fail(`${t.unit} sits inline in ${home}: re-translate the unit that file holds `
            + "at a finer --depth (its new parts merge in), or pass --force to rewrite");
        }
      }
      const defined = define(picked, under);
      for (const n of defined.notes) console.error(`  note: ${n}`);
      const done = write_defined(folder!, defined, rest.includes("--force"));
      console.log(JSON.stringify(done, null, 2));
      return;
    }
    if (verb === "fact" && is_python(resolve(loose(rest)[0] ?? "."))) {
      const [project] = loose(rest);
      process.stdout.write(python_fact(first, resolve(project!), rest));
      return;
    }
    if (verb === "fact") {
      /** The source reader (ts-morph) loads only for a fact. */
      const { fact, FACTS } = await import("@mnd/ts");
      /** The command `trace` runs, quoted whole. */
      const run = flag(rest, "run");
      const [project] = loose(rest);
      if (!(FACTS as readonly string[]).includes(first) || !project) {
        fail(`mnd fact <${FACTS.join("|")}> <project>`, 2);
      }
      const depth = flag(rest, "depth");
      const asked = { unit: flag(rest, "unit"), from: flag(rest, "from"), at: flag(rest, "at"),
                      of: flag(rest, "of"), ...(depth ? { depth: Number(depth) } : {}),
                      ...(run ? { run } : {}) };
      console.log(JSON.stringify(fact(first as (typeof FACTS)[number], resolve(project!), asked),
                                 null, 2));
      return;
    }
    if (verb === "draw") {
      const [selection, out] = loose(rest);
      if (!selection) fail("mnd draw <kind> <selection.json|facts.json> [out.yaml]", 2);
      // A fact answer is turned into the kind's selection first; a name and description join it
      const input: unknown = JSON.parse(readFileSync(selection!, "utf8"));
      const said = { ...(flag(rest, "name") ? { name: flag(rest, "name") } : {}),
                     ...(flag(rest, "description") ? { description: flag(rest, "description") } : {}) };
      // Drawn into a source folder, its library sets the scale facts are lifted to
      const held = out && in_source(out) && is_facts(input) ? held_in(JSON.parse(gathered(
        package_root(resolve(out)), true).text).graph) : undefined;
      const keep = flag(rest, "keep")?.split(",").map((k) => k.trim()).filter(Boolean);
      const fed = is_facts(input) ? selection_from(first, input, held, keep) : undefined;
      if (fed?.left.length) {
        console.error(`  left out, the library holds none of: ${fed.left.slice(0, 8).join(", ")}`
          + `${fed.left.length > 8 ? ` and ${fed.left.length - 8} more` : ""}`);
      }
      if (fed && first === "context" && outside_of(input).length) {
        console.error(`  across, for the model holding it as externals: `
          + outside_of(input).slice(0, 8).join(", "));
      }
      const picked = fed?.selection ?? input as Record<string, unknown>;
      const drawn = diagram_file(first, { ...said, ...picked });
      for (const w of drawn.warnings) console.error(`  warning: ${w}`);
      if (!out) { process.stdout.write(drawn.text); return; }
      if (existsSync(out) && !rest.includes("--force")) {
        fail(`${out} exists: a diagram file is edited by hand once written; --force replaces it`);
      }
      mkdirSync(dirname(resolve(out)), { recursive: true });
      writeFileSync(out, drawn.text);
      // What was written, counted, so a run says it worked
      const map = parse(drawn.text) as Record<string, unknown[] | undefined>;
      // A typed group of lines (`- dependency: [...]`) counts its lines
      const n = (k: string) => (map[k] ?? []).reduce((sum: number, x) => sum + (x && typeof x === "object"
        && !Array.isArray(x) ? Object.values(x).reduce((a: number, v) => a + (Array.isArray(v) ? v.length : 1), 0)
        : 1), 0);
      console.log(`wrote ${out}: ${first}, ${(map["participants"] ?? []).length + (map["blocks"] ?? []).length} parts, `
        + `${n("relations") + n("records")} lines`);
      // Written into a source folder, it is checked there at once: what it says, said now
      const notes = in_source(out) ? model_notes(out) : [];
      for (const note of notes) console.error(`  ${note}`);
      if (notes.length) {
        console.error(`${notes.length} to fix in ${out} (check says the same)`);
        process.exitCode = 1;
      }
      return;
    }
    const [model] = loose(rest);
    if (!model) fail("mnd presentation <list|draft|check> <model.yaml>", 2);
    if (first === "list") console.log(JSON.stringify(presentations(model!), null, 2));
    else if (first === "draft" && statSync(model!).isDirectory()) {
      /** **The whole model's tour** (2026-11-21), each model file's drafted and checked; any
       *  that adds faults is taken back, every file left as it was. */
      const files = tour(model!, rest.includes("--force"));
      const before = files.map((f) => [f.file, readFileSync(f.file, "utf8")] as const);
      const had = files.flatMap((f) => model_notes(f.file));
      for (const f of files) writeFileSync(f.file, f.text);
      const notes = files.flatMap((f) => model_notes(f.file)).filter((n) => !had.includes(n));
      if (notes.length) {
        for (const [file, text] of before) writeFileSync(file, text);
        for (const n of notes) console.log(`  ${n}`);
        console.log(`not written, ${notes.length} to fix`);
        process.exit(1);
      }
      for (const f of files) console.log(`drafted ${relative(process.cwd(), f.file)}: `
        + presentations(f.file).map((x) => `${x.name} (${x.stops.length} stops)`).join(", "));
    } else if (first === "draft") {
      const from = flag(rest, "from");
      if (!from) fail("draft asks --from <diagram.yaml>", 2);
      const text = draft(model!, from!, flag(rest, "as"));
      /** A dry draft says only the presentation it adds; a written one is checked at once. */
      if (rest.includes("--dry")) {
        const all = (parse(text) as { presentations?: unknown[] }).presentations ?? [];
        process.stdout.write(stringify(all.slice(-1), { lineWidth: 0 }));
        return;
      }
      // A draft that adds faults is taken back, the model file left as it was
      const before = readFileSync(model!, "utf8");
      const had = model_notes(model!);
      writeFileSync(model!, text);
      const notes = model_notes(model!).filter((n) => !had.includes(n));
      if (notes.length) {
        writeFileSync(model!, before);
        for (const n of notes) console.log(`  ${n}`);
        console.log(`not written, ${notes.length} to fix: --as names the diagram as this model `
          + "holds it (a block of the model whose type is the diagram)");
        process.exit(1);
      }
    } else if (first === "check") {
      const notes = model_notes(model!);
      for (const n of notes) console.log(`  ${n}`);
      for (const w of unvisited(model!)) console.log(`  warning: ${w}`);
      console.log(notes.length ? `${notes.length} to fix` : "clean");
      if (notes.length) process.exit(1);
    } else fail(`no presentation command ${first}: list, draft, check`, 2);
  } catch (e) { fail(e); }
}

/** What collecting a model's package says of that model's file. */
function model_notes(model: string): string[] {
  const root = package_root(resolve(model));
  const said = relative(root, resolve(model)).split(sep).join("/");
  return gathered(root, true).notes.filter((n) => n.startsWith(`${said}:`));
}

/** **A diagram no tour visits** (the user, 2026-11-21): each diagram of the model a file holds
 *  that no stop of any presentation in its package shows, directly or through a usage. A
 *  warning: whoever drafts the tour decides what it skips. */
function unvisited(model: string): string[] {
  const graph = fold(read(gathered(package_root(resolve(model)), true).text, FLOOR).log, FLOOR);
  const name = (parse(readFileSync(model, "utf8")) as { name?: string })?.name
    ?? basename(model).replace(/^\d+-|\.ya?ml$/g, "");
  const shown = new Set(Object.values(graph.blocks).flatMap((b) => (b.presentations ?? [])
    .flatMap((p) => p.stops.flatMap((s) => (s.show ? [s.show, graph.blocks[s.show]?.type ?? ""]
      : [])))));
  return Object.keys(graph.blocks).filter((id) => package_of(graph, id) === graph.root
    && !!diagram_kind(graph, id) && !is_model(graph, id) && !shown.has(id)
    && path(graph, id).some((b) => is_model(graph, b.id) && b.name === name))
    .map((id) => `${shown_name(graph, id)} is in no tour: no stop shows it`);
}

/** **What each hue reaches** (2026-11-20): every block of the workspace by the hue its look
 *  resolves to — its own, or one its definition chain or the workspace's `overrides` gives it —
 *  so a highlight is seen without the app. */
function looks(graph: Graph): string[] {
  const by = new Map<string, string[]>();
  for (const b of Object.values(graph.blocks)) {
    if (!b.parent || package_of(graph, b.id) !== graph.root || b.type === "folder") continue;
    const hue = setting_of(graph, b.id, "style")["hue"];
    if (hue === undefined) continue;
    const key = `hue ${String(hue)}`;
    by.set(key, [...(by.get(key) ?? []), `${shown_name(graph, b.id)}${b.def ? " (definition)" : ""}`]);
  }
  return [...by].map(([hue, names]) => `${hue}: ${[...new Set(names)].sort().join(", ")}`);
}

/** Whether a file would sit in a source folder. */
function in_source(file: string): boolean {
  try { package_root(resolve(file)); return true; } catch { return false; }
}

/** The source folder a file sits in: the nearest folder above it holding a `package.json`. */
function package_root(file: string): string {
  for (let at = dirname(file); ; at = dirname(at)) {
    if (existsSync(join(at, "package.json"))) return at;
    if (dirname(at) === at) throw new Error(`${file} is in no source folder`);
  }
}

// Anything thrown is said in one line, never as a trace
main(process.argv.slice(2)).catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
