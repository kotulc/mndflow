/** The headless app, and the harness that makes *independent and testable* true.
 *
 *  A passing suite proves the code agrees with itself. This proves the packages
 *  compose — that a log folds, an action writes, a layer projects, and a Scene
 *  is complete enough to draw from, with no React anywhere in the process. */

import { readFileSync, writeFileSync } from "node:fs";
import { check, children, fold, read, say, session, shown_name, write,
         type Id, type Log, type Storage } from "@mnd/core";
import { seed } from "@mnd/defs";
import { fixture, graph_file, GRAPH_NAMES, NAMES } from "@mnd/fixtures";
import { draw, draw_svg, faults, outline, view } from "@mnd/views";

const USAGE = `mnd — the headless harness

  mnd fold <source>                    fold a log and print the block tree
  mnd project <source> [layer] [--how] project a layer and print it
  mnd project <source> [layer] --svg  project a layer and draw it as SVG
  mnd outline <source> [layer]         list what a projection holds
  mnd check <source>                   run the door, print faults
  mnd run <source> <action> [k=v ...]  apply an action, print what it wrote
  mnd export <source> [out.json]       fold and write the file

  <source> is a log fixture (${NAMES.join(", ")}),
           a file fixture (${GRAPH_NAMES.join(", ")}),
           an exported file, or a raw log.
  A log is harness input only: a file is a graph, and that is what export writes.
  --how sets the arrangement: free grid right left down up
  --read sets the reading of a behavior layer: activity sequence state
  --view picks the module: block table matrix
  --svg writes the drawing instead of the text projection`;

/** A fixture of either kind, an exported file, or a raw log.
 *
 *  **A log is not a file** — `read` takes envelopes only. This is the harness,
 *  and log fixtures are logs, so it opens one itself through the door rather
 *  than asking the file format to keep a second shape alive for it.
 *
 *  A **file** fixture is a graph this engine never wrote, so `check <name>` is
 *  how the outward reader is driven: what it repairs is printed like anything
 *  else the door says. */
function load(source: string): Log {
  if (NAMES.includes(source as never)) return fixture(source);
  const text = GRAPH_NAMES.includes(source as never)
    ? graph_file(source)
    : readFileSync(source, "utf8");
  const got = text.trimStart().startsWith("[") ? check(JSON.parse(text)) : read(text);
  if (got.faults.length) console.error(`  ${say(got.faults)}`);
  return got.log;
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
 *  flag's value reads as a positional and `--view matrix` asks for a layer
 *  called "matrix". */
const VALUED = ["--how", "--read", "--view", "--layer"];

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

function main(argv: string[]): void {
  const [verb, source, ...rest] = argv;
  if (!verb || !source) {
    console.log(USAGE);
    process.exit(verb ? 1 : 0);
  }

  const log = load(source);
  const how = flag(rest, "how");
  const plain = loose(rest);

  switch (verb) {
    case "fold":
      console.log(tree(log));
      return;

    case "check": {
      const got = check(log);
      console.log(got.faults.length ? say(got.faults) : "clean");
      for (const f of got.faults) console.log(`  ${f.kind}: ${f.what}`);
      return;
    }

    case "project":
    case "outline": {
      const layer = find_layer(log, plain[0]);
      let graph = fold(log);
      if (how && layer !== null) graph = { ...graph,
        blocks: { ...graph.blocks, [layer]: { ...graph.blocks[layer]!, arrangement: how as never } } };
      const module = view(flag(rest, "view") ?? "block");
      if (!module) {
        console.error(`  no view module called "${flag(rest, "view")}"`);
        process.exit(1);
      }
      const scene = module.project(graph, layer, { reading: flag(rest, "read") as never });
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

main(process.argv.slice(2));
