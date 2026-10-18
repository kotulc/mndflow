/** A graph out as SysML, and the same text back as a graph. */

import { block_base, children, config_of, edge_base, edges_in, empty_graph, of_ref, on_side,
         base_of, owner_of, part_id, path, ports_on, shown_name, SCHEMA, type Block, type Graph,
         type Id, type Relation } from "@mnd/core";

/** What each block module is called, absent a definition that says otherwise. */
const KEYWORD: Record<string, string> = {
  folder: "package", structure: "part", reference: "ref",
  interface: "port", group: "package", region: "package", note: "comment", label: "comment",
  view: "view",
};

/** A relation module, as a keyword and back. */
const LINK: Record<string, string> = { line: "connect", tie: "comment" };

const quoted = (name: string) => `'${name.replaceAll("'", "\\'")}'`;

/** The keyword a block is written with: its definition's SysML name where it has one, else the
 *  module's. */
function keyword(graph: Graph, id: Id): string {
  const said = config_of(graph, graph.blocks[id]?.type, "names")["sysml"];
  if (typeof said === "string") return said.replace(/[«»]/g, "").trim().replaceAll(" ", "_");
  return KEYWORD[base_of(graph, id)] ?? "part";
}

/** How an end is written: a port by its block and its own name — one a usage reads through its
 *  definition by the usage — anything else by its name alone. */
function end_of(graph: Graph, id: Id, port?: Id): string {
  if (port) return `${quoted(shown_name(graph, id))}.${quoted(shown_name(graph, part_id(id, port)))}`;
  return quoted(shown_name(graph, id));
}

function relation(graph: Graph, e: Relation): string {
  const word = LINK[edge_base(graph, e.id)] ?? "connect";
  const type = e.type ? ` : ${e.type}` : "";
  return `${word} ${end_of(graph, e.from, e.fromPort)} to ${end_of(graph, e.to, e.toPort)}${type};`;
}

/** A block's address, for anything the notation points at. */
function address(graph: Graph, id: Id): string {
  return path(graph, id).slice(1).map((b) => quoted(shown_name(graph, b.id))).join(".");
}

function block(graph: Graph, b: Block, depth: number): string[] {
  const pad = "  ".repeat(depth);
  const type = b.type ? ` : ${b.type}` : "";
  /** A reference writes what it stands for. */
  const of = of_ref(graph, b.id);
  const stands = of ? ` -> ${address(graph, of)}` : "";
  const head = `${pad}${keyword(graph, b.id)} ${quoted(shown_name(graph, b.id))}${type}${stands}`;
  const inside = [
    ...(b.ports ?? []).map((p) => `${pad}  port ${quoted(shown_name(graph, part_id(b.id, p.id)))}`
      + `${p.type ? ` : ${p.type}` : ""};`),
    ...structure(graph, b.id).flatMap((k) => block(graph, k, depth + 1)),
    ...edges_in(graph, b.id).map((e) => `${pad}  ${relation(graph, e)}`),
  ];
  return inside.length ? [`${head} {`, ...inside, `${pad}}`] : [`${head};`];
}

/** What a block holds that is structure: definitions, and folders of nothing else, stay out. */
function structure(graph: Graph, id: Id): Block[] {
  return children(graph, id).filter((k) => !k.def && on_side(graph, k.id, "structure"));
}

/** The workspace root's structure, as one package. */
export function to_sysml(graph: Graph): string {
  const inside = [
    ...structure(graph, graph.root).flatMap((b) => block(graph, b, 1)),
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

/** An id from where a thing sits. */
const at = (trail: readonly string[]) => `sysml:${trail.join("/")}`;

function lines_of(text: string): Line[] {
  return text.split(/\r?\n/)
    .map((raw) => raw.trim())
    .filter((t) => t && !t.startsWith("//"))
    .map((t) => ({ depth: 0, text: t, opens: t.endsWith("{"), closes: t === "}" }));
}

/** The text back as a graph: the subset this writes, to prove the emitter. */
export function from_sysml(text: string, known: readonly Block[] = []): Graph {
  const graph = empty_graph();
  for (const b of known) graph.blocks[b.id] ??= b;
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
      graph.blocks[graph.root]!.name = name;
      if (line.opens) held.push(graph.root);
      continue;
    }

    /** A port is data on the block it is written in, and places itself. */
    if (word === "port") {
      const owner = graph.blocks[here()]!;
      owner.ports = [...owner.ports ?? [], { id: at([...trail, label]), name: label,
                                             ...(type ? { type } : {}) }];
      continue;
    }
    trail.push(label);
    const id = at(trail);
    const parent = here();
    graph.blocks[id] = { id, parent, name, type, order: ++n };
    if (points) {
      stands.push({ id, at: [...points.matchAll(STEPS)].map((m) => unquote(m[1]!)) });
    }
    if (line.opens) held.push(id);
    else trail.pop();
  }

  /** What a reference stands for, once everything it could name is placed. */
  for (const r of stands) {
    const target = graph.blocks[at(r.at)];
    const b = graph.blocks[r.id]!;
    if (target) {
      /** A reference is one by its kind: a type that is not a reference kind gives way to it. */
      const type = block_base(graph, b.type) === "reference" ? b.type : "reference";
      graph.blocks[r.id] = { ...b, type, of: target.id, name: undefined };
    }
  }

  /** Ends resolve once everything is placed. */
  for (const l of links) {
    const from = find(graph, l.from);
    const to = find(graph, l.to);
    if (!from || !to) continue;
    const id = `sysml:edge:${from.block}>${to.block}`;
    graph.edges[id] = { id, from: from.block, to: to.block, type: l.type,
                        ...(from.port ? { fromPort: from.port } : {}),
                        ...(to.port ? { toPort: to.port } : {}),
                        ...(l.word === "flow" ? { settings: { line: { dir: "forward" } } } : {}) };
  }
  return graph;
}

/** A name, or a block and its port, resolved to what it addresses. */
function find(graph: Graph, named: readonly string[]): { block: Id; port?: Id } | null {
  const hit = Object.values(graph.blocks)
    .filter((b) => !b.def && b.name === named[0])
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  if (!hit) return null;
  const port = named.length > 1 ? ports_on(graph, hit.id).find((p) => p.name === named[1]) : undefined;
  return { block: hit.id, ...(port ? { port: port.id } : {}) };
}

/** A file, so what comes back goes in through the door like anything else. */
export function as_file(graph: Graph, id = "sysml"): string {
  return JSON.stringify({ schema: SCHEMA, id, graph }, null, 2) + "\n";
}

/** What the notation carries, for comparing one graph with another. */
export function shape_of(graph: Graph): string[] {
  const trail = (id: Id) => path(graph, id).slice(2).map((b) => shown_name(graph, b.id)).join("/");
  const blocks = Object.values(graph.blocks)
    .filter((b) => !b.def && b.parent)
    .map((b) => {
      const of = of_ref(graph, b.id);
      return `${keyword(graph, b.id)} ${trail(b.id)}${b.type ? ` : ${b.type}` : ""}`
        + (of ? ` -> ${trail(of)}` : "");
    });
  const edges = Object.values(graph.edges)
    .map((e) => `${edge_base(graph, e.id)} ${trail(owner_of(graph, e.from))} -> ${trail(owner_of(graph, e.to))}`);
  return [...blocks.sort(), ...edges.sort()];
}
