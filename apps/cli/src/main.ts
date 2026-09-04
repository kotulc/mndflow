/** The headless app, and the harness that makes *independent and testable* true.
 *
 *  A passing suite proves the code agrees with itself. This proves the packages
 *  compose — that a log folds, an action writes, a layer projects, and a Scene
 *  is complete enough to draw from, with no React anywhere in the process. */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { check, children, fold, read, review, say, session, shown_name, write,
         type Fault, type Id, type Log, type Storage } from "@mnd/core";
import { seed } from "@mnd/defs";
import { fixture, graph_file, GRAPH_NAMES, NAMES } from "@mnd/fixtures";
import { draw, draw_svg, faults, outline, project } from "@mnd/views";
import { node_net } from "./ports";
import { as_file, from_sysml, shape_of, to_sysml } from "./sysml";

const USAGE = `mnd — the headless harness

  mnd fold <source>                    fold a log and print the block tree
  mnd project <source> [layer] [--how] project a layer and print it
  mnd project <source> [layer] --svg  project a layer and draw it as SVG
  mnd outline <source> [layer]         list what a projection holds
  mnd check <source>                   run the door, print faults
  mnd review <source> [layer]          ask what the definitions wanted
  mnd run <source> <action> [k=v ...]  apply an action, print what it wrote
  mnd search <source> <name>           fetch a definition package, through the door
  mnd translate <source> [--round]     write the graph as SysML, and check it comes back
                        [--with <pkg>] bring a vocabulary in first, so its names are used
  mnd export <source> [out.json]       fold and write the file

  <source> is a log fixture (${NAMES.join(", ")}),
           a file fixture (${GRAPH_NAMES.join(", ")}),
           an exported file, or a raw log.
  A log is harness input only: a file is a graph, and that is what export writes.
  --how sets the arrangement: free right left down up
  --svg writes the drawing instead of the text projection
  --from sets the package catalogue search reads (default public/packages/index.json)
`;

/** A fixture of either kind, an exported file, or a raw log.
 *
 *  **A log is not a file** — `read` takes envelopes only. This is the harness,
 *  and log fixtures are logs, so it opens one itself through the door rather
 *  than asking the file format to keep a second shape alive for it.
 *
 *  A **file** fixture is a graph this engine never wrote, so `check <name>` is
 *  how the outward reader is driven: what it repairs is printed like anything
 *  else the door says. */
function load(source: string): { log: Log; faults: Fault[] } {
  if (NAMES.includes(source as never)) return { log: fixture(source), faults: [] };
  const text = GRAPH_NAMES.includes(source as never)
    ? graph_file(source)
    : readFileSync(source, "utf8");
  return text.trimStart().startsWith("[") ? check(JSON.parse(text)) : read(text);
}

/** A storage bound to what we already hold, so `run` can use the real session. */
function held(log: Log): Storage {
  let kept = log;
  return { read: () => kept, write: (next) => { kept = next; }, clear: () => { kept = []; } };
}

function tree(log: Log): string {
  const graph = fold(log);
  const lines: string[] = [];
  const walk = (id: Id | null, depth: number) => {
    for (const b of children(graph, id)) {
      const kids = children(graph, b.id).length;
      lines.push(`${"  ".repeat(depth)}${kids ? "▾" : "·"} ${shown_name(graph, b.id)}`);
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
  const graph = fold(log);
  if (graph.blocks[want]) return want;
  const hit = Object.values(graph.blocks).find((b) => b.label === want);
  if (!hit) {
    console.error(`  no layer called "${want}"`);
    process.exit(1);
  }
  return hit.id;
}

function flag(args: string[], name: string): string | undefined {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
}

/** The flags that take the argument after them. Without knowing which do, a
 *  flag's value reads as a positional and `--how down` asks for a layer called
 *  "down". */
const VALUED = ["--how", "--layer", "--from", "--with"];

/** What is left once every flag, every flag's value and every pair is taken
 *  out: the positionals, and nothing else. */
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
    out[key] = value === "true" ? true : value === "false" ? false
             : /^-?\d+$/.test(value) ? Number(value) : value;
  }
  return out;
}

/** Where this host keeps its packages: beside the vendored weights, at the
 *  repo root, shared by every host that binds `net`. */
const CATALOGUE = resolve(dirname(fileURLToPath(import.meta.url)),
                          "../../../public/packages/index.json");

async function main(argv: string[]): Promise<void> {
  const [verb, source, ...rest] = argv;
  if (!verb || !source) {
    console.log(USAGE);
    process.exit(verb ? 1 : 0);
  }

  const { log, faults: reading } = load(source);
  const how = flag(rest, "how");
  const plain = loose(rest);
  /** Everything but `check` gets the headline; `check` **is** the door's
   *  report, so it prints the detail rather than being told twice. */
  if (reading.length && verb !== "check") console.error(`  ${say(reading)}`);

  switch (verb) {
    case "fold":
      console.log(tree(log));
      return;

    /** A **file** fixture is a graph this engine never wrote, so its faults
     *  are the ones the door found on the way in. A log arrives unread, so
     *  running the door over it is what finds anything at all. */
    case "check": {
      const found = reading.length ? reading : check(log).faults;
      console.log(found.length ? say(found) : "clean");
      for (const f of found) console.log(`  ${f.kind}: ${f.what}`);
      return;
    }

    /** The other half of validity. `check` runs the door; this asks what the
     *  definitions in scope wanted and did not get, which is advice until a
     *  translator turns it into a refusal. */
    case "review": {
      const graph = fold(log);
      const notes = review(graph, find_layer(log, plain[0]) ?? undefined);
      console.log(notes.length ? `${notes.length} to answer for` : "clean");
      for (const n of notes) console.log(`  ${n.kind}: ${n.what}`);
      return;
    }

    case "project":
    case "outline": {
      const layer = find_layer(log, plain[0]);
      let graph = fold(log);
      if (how && layer !== null) graph = { ...graph,
        blocks: { ...graph.blocks, [layer]: { ...graph.blocks[layer]!, arrangement: how as never } } };
      const scene = project(graph, layer);
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

    case "run": {
      const [action] = plain;
      if (!action) {
        console.error("  which action?");
        process.exit(1);
      }
      const s = session({ storage: held(log), defs: seed() });
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

    /** A definition package from outside the workspace, **in through the
     *  door**: what arrives is a file like any other, checked against the graph
     *  it is joining rather than against itself, and what was repaired is said. */
    case "search": {
      const s = session({ storage: held(log), defs: seed(), net: node_net(),
                          catalogue: flag(rest, "from") ?? CATALOGUE });
      const before = new Set(Object.keys(s.graph().defs));
      const found = await s.search(plain.join(" "));
      console.log(s.said()?.text ?? "");
      if (!found) process.exit(1);
      for (const d of Object.values(s.graph().defs)) {
        if (!before.has(d.id)) console.log(`  ${d.group} ${d.name}`);
      }
      for (const f of found.faults) console.log(`  ${f.kind}: ${f.what}`);
      return;
    }

    /** A definition package from outside the workspace, **in through the
     *  door**: what arrives is a file like any other, checked against the graph
     *  it is joining rather than against itself, and what was repaired is said. */
    case "search": {
      const s = session({ storage: held(log), defs: seed(), net: node_net(),
                          catalogue: flag(rest, "from") ?? CATALOGUE });
      const before = new Set(Object.keys(s.graph().defs));
      const found = await s.search(plain.join(" "));
      console.log(s.said()?.text ?? "");
      if (!found) process.exit(1);
      for (const d of Object.values(s.graph().defs)) {
        if (!before.has(d.id)) console.log(`  ${d.group} ${d.name}`);
      }
      for (const f of found.faults) console.log(`  ${f.kind}: ${f.what}`);
      return;
    }


    /** **A standard is a translation layer, never a shape the model bends to.**
     *  One way out; the reader exists to prove it, so `--round` emits, reads
     *  the text back through the door, and asks whether the two graphs say the
     *  same thing. Ids and positions do not travel, so *equivalent* is what
     *  the notation carries — the tree, what each thing is, and what joins. */
    case "translate": {
      /** **The keyword is the map.** Bringing a vocabulary in changes what the
       *  same graph is called and nothing about the graph, which is the whole
       *  claim a translation layer makes. */
      const want = flag(rest, "with");
      let held_log = log;
      if (want) {
        const s = session({ storage: held(log), defs: seed(), net: node_net(),
                            catalogue: flag(rest, "from") ?? CATALOGUE });
        if (!(await s.search(want))) {
          console.error(`  ${s.said()?.text ?? ""}`);
          process.exit(1);
        }
        held_log = s.log();
      }
      const graph = fold(held_log);
      const text = to_sysml(graph);
      if (!rest.includes("--round")) {
        process.stdout.write(text);
        return;
      }
      const back = read(as_file(from_sysml(text, graph.defs)));
      for (const f of back.faults) console.log(`  ${f.kind}: ${f.what}`);
      const again = fold(back.log);
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
      const text = write(fold(log));
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

void main(process.argv.slice(2));
