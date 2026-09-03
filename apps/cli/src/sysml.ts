/** A graph out as SysML, and the same text back as a graph.
 *
 *  **A standard is a translation layer, never a shape the model bends to.** A
 *  part property is a block with a parent, a port is an interface, a
 *  requirement is a block with two fields — so this is a name map and nothing
 *  more. It reads a graph and writes text; it never touches the log, the steps
 *  or the engine's reader, which is the whole of what a translator is allowed
 *  to know.
 *
 *  **The keyword is the map.** A definition saying `names.sysml` supplies it;
 *  anything else falls back to what its module already is. That is what makes
 *  bringing in the `sysml` package change the output without changing a block.
 *
 *  The reader exists to prove the emitter. It takes what this writes — a small,
 *  honest subset of the v2 textual notation — and hands back a graph, so
 *  *emitted, re-imported, emitted again* is a property anybody can check. */

import { children, edges_in, empty_graph, is_interface, is_reference, module_of, owner_of,
         path, shown_name, SCHEMA,
         type Block, type Graph, type Id, type Relation } from "@mnd/core";

/** What each block module is called, absent a definition that says otherwise.
 *  **Not a closed set of things** — a fallback table, one entry per module. */
const KEYWORD: Record<string, string> = {
  folder: "package", structure: "part", reference: "ref",
  interface: "port", resource: "item", group: "package", note: "comment", view: "view",
};

/** A relation module, as a keyword and back. Directed reads as a flow. */
const LINK: Record<string, string> = { line: "connect", directed: "flow",
                                       reference: "connect", tie: "comment" };

const quoted = (name: string) => `'${name.replaceAll("'", "\\'")}'`;

/** The keyword a block is written with: its definition's SysML name where it
 *  has one, else the module's. `«part»` is the name a package supplies and
 *  `part` is the word the notation wants, so the guillemets come off. */
function keyword(graph: Graph, id: Id): string {
  const type = graph.blocks[id]?.type;
  const said = type ? graph.defs[type]?.names?.["sysml"] : undefined;
  if (said) return said.replace(/[«»]/g, "").trim().replaceAll(" ", "_");
  return KEYWORD[module_of(graph, id)] ?? "part";
}

/** How an end is written: a port by its owner and its own name, anything else
 *  by its name alone. Names are unique among siblings, so this is an address. */
function end_of(graph: Graph, id: Id): string {
  const b = graph.blocks[id];
  if (b && is_interface(b) && b.parent) {
    return `${quoted(shown_name(graph, b.parent))}.${quoted(shown_name(graph, id))}`;
  }
  return quoted(shown_name(graph, id));
}

function relation(graph: Graph, e: Relation): string {
  const word = LINK[e.module] ?? "connect";
  const type = e.type ? ` : ${e.type}` : "";
  return `${word} ${end_of(graph, e.from)} to ${end_of(graph, e.to)}${type};`;
}

/** Where a block sits, written out — the address the notation uses for
 *  anything it has to point at rather than contain. */
function address(graph: Graph, id: Id): string {
  return path(graph, id).slice(1).map((b) => quoted(shown_name(graph, b.id))).join(".");
}

function block(graph: Graph, b: Block, depth: number): string[] {
  const pad = "  ".repeat(depth);
  const type = b.type ? ` : ${b.type}` : "";
  /** **A reference is drawn and a link is not**, so what a reference stands for
   *  has to travel: without it the notation says only that something is here,
   *  and reading it back would make a part of an appearance. */
  const stands = b.of ? ` -> ${address(graph, b.of)}` : "";
  const head = `${pad}${keyword(graph, b.id)} ${quoted(shown_name(graph, b.id))}${type}${stands}`;
  const inside = [
    ...children(graph, b.id).flatMap((k) => block(graph, k, depth + 1)),
    ...edges_in(graph, b.id).map((e) => `${pad}  ${relation(graph, e)}`),
  ];
  return inside.length ? [`${head} {`, ...inside, `${pad}}`] : [`${head};`];
}

/** The whole workspace as one package. */
export function to_sysml(graph: Graph): string {
  const inside = [
    ...children(graph, graph.root).flatMap((b) => block(graph, b, 1)),
    ...edges_in(graph, graph.root).map((e) => `  ${relation(graph, e)}`),
  ];
  return [`package ${quoted(shown_name(graph, graph.root))} {`, ...inside, "}", ""].join("\n");
}

// ---------------------------------------------------------------- and back

type Line = { depth: number; text: string; opens: boolean; closes: boolean };

const NAME = String.raw`'((?:\\'|[^'])*)'`;
const ELEMENT = new RegExp(
  `^(\\w+)\\s+${NAME}(?:\\s*:\\s*([\\w.]+))?(?:\\s*->\\s*(.+?))?\\s*[{;]?$`);
/** Every quoted step of an address, in order. */
const STEPS = /'((?:\\'|[^'])*)'/g;
const RELATION = new RegExp(
  `^(\\w+)\\s+${NAME}(?:\\.${NAME})?\\s+to\\s+${NAME}(?:\\.${NAME})?(?:\\s*:\\s*([\\w.]+))?;$`);

const unquote = (s: string) => s.replaceAll("\\'", "'");

/** An id from where a thing sits. **Names are unique among siblings**, so the
 *  path is an identity — which is what lets the round trip be compared at all
 *  without the notation having to carry ids it has no place for. */
const at = (trail: readonly string[]) => `sysml:${trail.join("/")}`;

function lines_of(text: string): Line[] {
  return text.split(/\r?\n/)
    .map((raw) => raw.trim())
    .filter((t) => t && !t.startsWith("//"))
    .map((t) => ({ depth: 0, text: t, opens: t.endsWith("{"), closes: t === "}" }));
}

/** The text back as a graph — **the reader that proves the emitter**, and no
 *  more: it takes the subset this writes rather than the notation at large.
 *
 *  **The vocabulary does not travel and is not meant to.** A notation names a
 *  type; what that type *is* is a definition package, which is brought in
 *  separately and already in the workspace anybody imports into. `known` is
 *  that workspace's, so what comes back resolves the way it would there. */
export function from_sysml(text: string, known: Graph["defs"] = {}): Graph {
  const graph = { ...empty_graph(), defs: { ...known } };
  const trail: string[] = [];
  const held: Id[] = [graph.root];
  const links: { word: string; from: string[]; to: string[]; type?: string }[] = [];
  const stands: { id: Id; at: string[] }[] = [];
  let n = 0;

  const here = () => held[held.length - 1]!;

  for (const line of lines_of(text)) {
    if (line.closes) {
      held.pop();
      trail.pop();
      continue;
    }

    const link = RELATION.exec(line.text);
    if (link) {
      const [, word, a, a_port, b, b_port, type] = link;
      links.push({ word: word!, type,
                   from: [unquote(a!), ...(a_port ? [unquote(a_port)] : [])],
                   to: [unquote(b!), ...(b_port ? [unquote(b_port)] : [])] });
      continue;
    }

    const one = ELEMENT.exec(line.text);
    if (!one) continue;
    const [, word, name, type, points] = one;
    const label = unquote(name!);

    /** The outermost package is the workspace itself, not a block in it. */
    if (held.length === 1 && word === "package" && !graph.blocks[at([label])]) {
      graph.blocks[graph.root]!.label = label;
      if (line.opens) held.push(graph.root);
      continue;
    }

    trail.push(label);
    const id = at(trail);
    const parent = here();
    const port = word === "port";
    graph.blocks[id] = {
      id, parent, label, type, num: ++n,
      ...(port ? { side: "right" as const, at: 0.5 } : {}),
    };
    if (points) {
      stands.push({ id, at: [...points.matchAll(STEPS)].map((m) => unquote(m[1]!)) });
    }
    if (line.opens) held.push(id);
    else trail.pop();
  }

  /** What a reference stands for, once everything it could name is placed. A
   *  target that did not travel leaves the reference reading **missing**, which
   *  is kept rather than tidied away. */
  for (const r of stands) {
    const target = graph.blocks[at(r.at)];
    if (target) graph.blocks[r.id] = { ...graph.blocks[r.id]!, of: target.id, label: undefined };
  }

  /** Ends are resolved once everything is placed: a relation may name
   *  something written after it. */
  for (const l of links) {
    const from = find(graph, l.from);
    const to = find(graph, l.to);
    if (!from || !to) continue;
    const id = `sysml:edge:${from}>${to}`;
    graph.edges[id] = { id, from, to, type: l.type,
                        module: l.word === "flow" ? "directed" : "line" };
  }
  return graph;
}

/** A name, or an owner and its port, resolved to what it addresses. */
function find(graph: Graph, named: readonly string[]): Id | null {
  const hit = Object.values(graph.blocks)
    .filter((b) => b.label === named[0])
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  if (!hit) return null;
  if (named.length === 1) return hit.id;
  const port = children(graph, hit.id).find((k) => k.label === named[1]);
  return port?.id ?? hit.id;
}

/** A file, so what comes back goes in through the door like anything else. */
export function as_file(graph: Graph, id = "sysml"): string {
  return JSON.stringify({ schema: SCHEMA, id, graph }, null, 2) + "\n";
}

/** What the notation carries, for comparing one graph with another.
 *
 *  **Equivalent, not identical.** Ids, positions and the log never travel, so
 *  what a round trip has to preserve is the tree of names, what each is, and
 *  which of them are joined — and that is exactly what this reads. */
export function shape_of(graph: Graph): string[] {
  const trail = (id: Id) => path(graph, id).slice(1).map((b) => shown_name(graph, b.id)).join("/");
  const blocks = Object.values(graph.blocks)
    .filter((b) => b.id !== graph.root)
    .map((b) => `${keyword(graph, b.id)} ${trail(b.id)}${b.type ? ` : ${b.type}` : ""}`
              + (is_reference(b) && b.of ? ` -> ${trail(b.of)}` : ""));
  const edges = Object.values(graph.edges)
    .map((e) => `${e.module} ${trail(owner_of(graph, e.from))} -> ${trail(owner_of(graph, e.to))}`);
  return [...blocks.sort(), ...edges.sort()];
}
