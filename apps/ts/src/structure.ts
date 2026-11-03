/** A project's structure, found from its import graph by deterministic stages (translate-plan
 *  *Strategy* 1–4, 9): each package's entry (its barrels, wiring, and the modules importing most
 *  of it) and foundation (the modules most of it imports), both set aside; its components
 *  (communities of what remains, split until each layer fits the budget), their levels by
 *  dependency direction, its cycles, each entry's path through the components by its calls
 *  (flow-plan stage 2), and a score. Every threshold is a default bounded by counts
 *  (`Settings`). */

import Graph from "graphology";
import louvain from "graphology-communities-louvain";
import { stronglyConnectedComponents } from "graphology-components";
import { topologicalGenerations } from "graphology-dag";
import pagerank from "graphology-metrics/centrality/pagerank";
import modularity from "graphology-metrics/graph/modularity";
import type { Code, Pkg } from "./read";

/** The defaults: the components a layer aims for and may hold at most; the share of a package
 *  that must import a module for it to be foundation, and the most set aside; how deep a package
 *  splits; the weight added to an import within one folder; the most steps an entry's path takes,
 *  and how many calls deep it is followed; the share of a component's modules drawn as blocks of
 *  their own, the most salient first (`shown`). */
export type Settings = { budget: number; most: number; share: number; depth: number;
                         bonus: number; steps: number; reach: number; shown: number };
export const SETTINGS: Settings = { budget: 7, most: 9, share: 0.35, depth: 2, bonus: 0.5,
                                    steps: 12, reach: 4, shown: 0.5 };

/** A component: its name, the module it is anchored on (its id's source), its modules, and its
 *  own components where it is split further. A component of one module is that module. */
export type Comp = { name: string; anchor: string; modules: string[]; parts: Comp[] };

/** Components ranked by dependency direction, entry first, each by its anchor; and the groups
 *  of them importing each other round. */
export type Levels = { ranks: string[][]; cycles: string[][] };

/** How well a package holds: the modularity of its top components where it was split, whether
 *  every layer fits, its cycles, and how deep it splits. */
export type Score = { modularity?: number; fit: boolean; cycles: number; depth: number };

/** One step of an entry's path: a call from one block of the package layer to another, by the
 *  names called; a block is an entry or shared module by its path, a component by its anchor. */
export type Step = { from: string; to: string; names: string[] };

/** An entry module's path: its steps in the order first called. */
export type Path = { entry: string; steps: Step[] };

/** A shared type: its definition's id, the block owning it (a component's anchor, or an entry or
 *  shared module), and how many other modules read it. */
export type Word = { id: string; owner: string; fan: number };

/** A package's structure; `rank`, its modules by salience, the most first; `folded`, those a
 *  component's diagram folds into one block rather than drawing each; `vocab`, its shared types,
 *  the most read first. */
export type Shape = { pkg: Pkg; entry: string[]; foundation: string[]; comps: Comp[];
                      levels: Levels; paths: Path[]; rank: string[]; folded: string[];
                      vocab: Word[]; score: Score };

/** Words that name nothing particular: never a component's name. */
const STOP = new Set(["the", "and", "for", "with", "from", "into", "its", "that", "this", "what",
                      "each", "one", "are", "not", "but", "every", "where", "which", "when", "how",
                      "own", "all", "any", "has", "use", "uses", "index", "helpers", "utils",
                      "util", "types", "main", "lib", "src"]);

/** Louvain's resolutions to choose among: lower finds fewer, larger groups. */
const RESOLUTIONS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];


/** Every package's structure, and the packages' levels. */
export function structure_of(code: Code, s = SETTINGS): { shapes: Shape[]; system: Levels } {
  const shapes = code.packages.map((p) => shape_of(p, s));
  const edges = code.packages.flatMap((p) => p.uses.map((u) => [p.dir, u, 1] as const));
  return { shapes, system: levels_of(code.packages.map((p) => p.dir), edges) };
}

/** A package's structure: a package within the budget shows each module as itself; a larger one
 *  sets its foundation and entry aside and splits the rest. */
function shape_of(pkg: Pkg, s: Settings): Shape {
  const { directed, undirected } = graphs_of(pkg, s);
  const nodes = directed.nodes();
  const splits = nodes.length > s.most;
  const foundation = splits ? set_aside(directed, undirected, nodes, "in", s) : [];
  const above = splits ? set_aside(directed, undirected,
                                   nodes.filter((n) => !foundation.includes(n)), "out", s) : [];
  const entry = [...pkg.modules.filter((m) => m.entry).map((m) => m.path), ...above];
  const rest = nodes.filter((n) => !foundation.includes(n) && !above.includes(n));
  const comps = worded(splits ? split(undirected, directed, rest, 1, s)
    : unique(rest.map((n) => comp_of(undirected, directed, [n], []))), pkg);
  const owner = new Map(comps.flatMap((c) => c.modules.map((m) => [m, c.anchor] as const)));
  const edges = directed.mapEdges((_, a, from, to) => [owner.get(from), owner.get(to),
                                                       a["weight"] as number] as const)
    .filter((e): e is readonly [string, string, number] => !!e[0] && !!e[1] && e[0] !== e[1]);
  const levels = levels_of(comps.map((c) => c.anchor), edges);
  const unit = new Map([...owner, ...[...entry, ...foundation].map((m) => [m, m] as const)]);
  const rank = salience(directed, pkg);
  return { pkg, entry, foundation, comps, levels, paths: paths_of(pkg, entry, foundation, unit, s),
           rank, folded: comps.flatMap((c) => folded_of(c, rank, s)), vocab: vocab_of(pkg, unit, s),
           score: { ...(splits ? { modularity: modularity_of(undirected, rest, owner) } : {}),
                    fit: fits(comps, s), cycles: levels.cycles.length, depth: depth_of(comps) } };
}

/** A package's import graphs, entries by kind left out: directed, each edge weighted by the symbols read
 *  and more within one folder; and the same undirected, both ways summed. */
function graphs_of(pkg: Pkg, s: Settings): { directed: Graph; undirected: Graph } {
  const directed = new Graph({ type: "directed" });
  const undirected = new Graph({ type: "undirected" });
  const kept = pkg.modules.filter((m) => !m.entry);
  const known = new Set(kept.map((m) => m.path));
  for (const m of kept) {
    directed.addNode(m.path);
    undirected.addNode(m.path);
  }
  for (const m of kept) {
    for (const i of m.imports.filter((x) => known.has(x.path))) {
      const weight = i.symbols * (folder_of(m.path) === folder_of(i.path) ? 1 + s.bonus : 1);
      directed.mergeEdge(m.path, i.path, { weight });
      const had = undirected.hasEdge(m.path, i.path)
        ? undirected.getEdgeAttribute(m.path, i.path, "weight") as number : 0;
      undirected.mergeEdge(m.path, i.path, { weight: had + weight });
    }
  }
  return { directed, undirected };
}

/** The modules set aside on one side, among some nodes: the foundation (`in`), imported by at
 *  least `share` of them, or the entry (`out`), importing at least that share; at least the
 *  likeliest one and at most `budget`, in order; of those, the run whose setting aside splits
 *  the rest most cleanly, which may be none. */
function set_aside(directed: Graph, undirected: Graph, nodes: string[], side: "in" | "out",
                   s: Settings): string[] {
  const among = new Set(nodes);
  const fan = nodes.map((n) => [n, (side === "in" ? directed.inNeighbors(n)
    : directed.outNeighbors(n)).filter((o) => among.has(o)).length] as const)
    .sort((a, z) => z[1] - a[1] || a[0].localeCompare(z[0]));
  const over = fan.filter(([, c]) => c >= s.share * nodes.length).length;
  const candidates = fan.slice(0, Math.min(Math.max(over, 1), s.budget)).map(([n]) => n);
  let best: string[] = [];
  let top = -Infinity;
  for (let k = 0; k <= candidates.length; k++) {
    const left = candidates.slice(0, k);
    const q = clustered(sub_of(undirected, nodes.filter((n) => !left.includes(n))), s).modularity;
    if (q > top) [best, top] = [left, q];
  }
  return best;
}

/** Modules split into components, nested where a component holds more than `most` and the depth
 *  allows. Modules joined to nothing here are reached from outside the code (pages, configs,
 *  commands): grouped by their folder, the one signal left. */
function split(undirected: Graph, directed: Graph, nodes: string[], depth: number,
               s: Settings): Comp[] {
  const sub = sub_of(undirected, nodes);
  const alone = nodes.filter((n) => sub.degree(n) === 0);
  const linked = sub_of(sub, nodes.filter((n) => !alone.includes(n)));
  const leftover = new Map<string, string[]>();
  for (const n of alone) leftover.set(folder_of(n), [...(leftover.get(folder_of(n)) ?? []), n]);
  const groups = new Map<number, string[]>();
  for (const [n, c] of Object.entries(clustered(linked, s).communities)) {
    groups.set(c, [...(groups.get(c) ?? []), n]);
  }
  const lists = [...groups.values()];
  const parts = (g: string[]) => {
    const inner = g.length > s.most && depth < s.depth ? split(undirected, directed, g, depth + 1, s)
      : [];
    return inner.length > 1 ? inner : [];
  };
  return unique([...lists, ...leftover.values()].map((g) => comp_of(undirected, directed, g,
                                                                     parts(g))))
    .sort((a, z) => z.modules.length - a.modules.length || a.anchor.localeCompare(z.anchor));
}

/** A graph's communities, wide before deep: of the resolutions giving at most `most`, those
 *  needing no further split first, then the cleanest split. Louvain without its random walk, so
 *  a run repeats. */
function clustered(g: Graph, s: Settings): { communities: Record<string, number>;
                                             modularity: number } {
  if (g.size === 0) return { communities: Object.fromEntries(g.nodes().map((n, i) => [n, i])),
                             modularity: 0 };
  const runs = RESOLUTIONS.map((resolution) => louvain.detailed(g, { resolution, randomWalk: false,
                                                                     getEdgeWeight: "weight" }));
  const fitting = runs.filter((r) => r.count <= s.most);
  const flat = (r: (typeof runs)[number]) => {
    const sizes = new Map<number, number>();
    for (const c of Object.values(r.communities)) sizes.set(c, (sizes.get(c) ?? 0) + 1);
    return Math.max(...sizes.values()) <= s.most ? 1 : 0;
  };
  const best = (fitting.length ? fitting : [runs[0]!]).sort((a, z) =>
    flat(z) - flat(a) || z.modularity - a.modularity)[0]!;
  return { communities: best.communities, modularity: best.modularity };
}

/** A component of modules: anchored on its most joined module within it, then the most imported;
 *  named by its folder where it is the whole of one, else by its anchor's file. */
function comp_of(undirected: Graph, directed: Graph, modules: string[], parts: Comp[]): Comp {
  const inside = new Set(modules);
  const joined = (n: string) => undirected.reduceEdges(n, (sum, _, a, from, to) =>
    sum + (inside.has(from === n ? to : from) ? a["weight"] as number : 0), 0);
  const anchor = [...modules].sort((a, z) => joined(z) - joined(a)
    || directed.inDegree(z) - directed.inDegree(a) || a.localeCompare(z))[0]!;
  const folders = new Set(modules.map(folder_of));
  const shared = folders.size === 1 && modules.length > 1 ? [...folders][0]! : "";
  const whole = !!shared && directed.nodes().every((n) => folder_of(n) !== shared || inside.has(n));
  const name = whole && !shared.endsWith("/src") ? shared.split("/").pop()! : stem_of(anchor);
  return { name, anchor, modules: [...modules].sort(), parts };
}

/** Components named apart: where names repeat, each is led by its anchor's folder. */
function unique(comps: Comp[]): Comp[] {
  const seen = (c: Comp) => comps.filter((o) => o.name === c.name).length > 1;
  return comps.map((c) => seen(c) ? { ...c, name: [folder_of(c.anchor).split("/").pop() || "root",
                                                     c.name].join("-") } : c);
}

/** Nodes ranked by direction over weighted edges, entry first. Where two import each other the
 *  heavier direction ranks them; cycles left are condensed and said. */
function levels_of(nodes: string[], edges: readonly (readonly [string, string, number])[]): Levels {
  const weight = new Map<string, number>();
  for (const [from, to, w] of edges) {
    if (from !== to) weight.set(`${from}\n${to}`, (weight.get(`${from}\n${to}`) ?? 0) + w);
  }
  const g = new Graph({ type: "directed" });
  nodes.forEach((n) => g.addNode(n));
  for (const [key, w] of weight) {
    const [from, to] = key.split("\n") as [string, string];
    const back = weight.get(`${to}\n${from}`) ?? 0;
    if (w > back || (w === back && from < to)) g.mergeEdge(from, to);
  }
  const sccs = stronglyConnectedComponents(g);
  const of = new Map(sccs.flatMap((c, i) => c.map((n) => [n, String(i)] as const)));
  const dag = new Graph({ type: "directed" });
  sccs.forEach((_, i) => dag.addNode(String(i)));
  g.forEachEdge((_, __, from, to) => {
    if (of.get(from) !== of.get(to)) dag.mergeEdge(of.get(from)!, of.get(to)!);
  });
  const ranks = topologicalGenerations(dag)
    .map((gen) => gen.flatMap((i) => sccs[Number(i)]!).sort());
  return { ranks, cycles: sccs.filter((c) => c.length > 1).map((c) => c.sort()) };
}

/** **Each entry's path**: its calls walked depth first in source order, never into a module twice,
 *  into a shared module never, at most `reach` calls deep; each call between two blocks of the
 *  layer a step, a pair called again folding its names into the first, at most `steps` of them.
 *  An entry calling nothing outside itself has none. */
function paths_of(pkg: Pkg, entry: string[], foundation: string[], unit: Map<string, string>,
                  s: Settings): Path[] {
  const mod = new Map(pkg.modules.map((m) => [m.path, m]));
  return entry.map((e) => {
    const steps: Step[] = [];
    const seen = new Set([e]);
    const walk = (path: string, depth: number) => {
      for (const c of [...mod.get(path)?.calls ?? []].sort((a, z) => a.at - z.at)) {
        const [from, to] = [unit.get(path), unit.get(c.to)];
        if (!from || !to) continue;
        const step = steps.find((x) => x.from === from && x.to === to);
        if (step && !step.names.includes(c.name)) step.names.push(c.name);
        else if (!step && from !== to && steps.length < s.steps) steps.push({ from, to,
                                                                              names: [c.name] });
        if (seen.has(c.to) || foundation.includes(c.to) || depth >= s.reach) continue;
        seen.add(c.to);
        walk(c.to, depth + 1);
      }
    };
    walk(e, 1);
    return { entry: e, steps };
  }).filter((p) => p.steps.length);
}

/** **Salience** (*Strategy* stage 6): the modules ranked by PageRank over the imports, each
 *  weighted by the symbols read, scaled by the module's length; entries, out of the graph, last. */
function salience(directed: Graph, pkg: Pkg): string[] {
  const pr = directed.order ? pagerank(directed, { getEdgeWeight: "weight" }) : {};
  const lines = new Map(pkg.modules.map((m) => [m.path, m.lines]));
  const score = (m: string) => (pr[m] ?? 0) * Math.log2(2 + (lines.get(m) ?? 0));
  return pkg.modules.map((m) => m.path).sort((a, z) => score(z) - score(a) || a.localeCompare(z));
}

/** **The vocabulary** (*Strategy* stage 7): the interfaces, classes and object types a module
 *  declares and another reads, each owned by the block holding its module; ranked by how many
 *  modules read it, at most `most` an owner. */
function vocab_of(pkg: Pkg, unit: Map<string, string>, s: Settings): Word[] {
  const readers = new Map<string, Set<string>>();
  const declared = new Map(pkg.modules.flatMap((m) => m.defs.map((d) => [`${m.path}#${d.name}`,
                                                                       d.id] as const)));
  for (const m of pkg.modules) {
    for (const i of m.imports) {
      for (const n of i.names) {
        const id = declared.get(`${i.path}#${n}`);
        if (id) readers.set(id, new Set([...readers.get(id) ?? [], m.path]));
      }
    }
  }
  const home = new Map(pkg.modules.flatMap((m) => m.defs.map((d) => [d.id, m.path] as const)));
  const all = [...readers].map(([id, by]) => ({ id, owner: unit.get(home.get(id)!) ?? "",
                                                fan: by.size }))
    .filter((w) => w.owner).sort((a, z) => z.fan - a.fan || a.id.localeCompare(z.id));
  return all.filter((w) => all.filter((o) => o.owner === w.owner).indexOf(w) < s.most);
}

/** The modules a component's diagram folds away: past the most salient `shown` share of a
 *  component of modules, at least 1 and at most `budget` drawn; never one alone. A component
 *  split again folds within its parts. */
function folded_of(c: Comp, rank: string[], s: Settings): string[] {
  if (c.parts.length) return c.parts.flatMap((p) => folded_of(p, rank, s));
  const kept = Math.min(s.budget, Math.max(1, Math.ceil(c.modules.length * s.shown)));
  const by = [...c.modules].sort((a, z) => rank.indexOf(a) - rank.indexOf(z));
  return by.length - kept > 1 ? by.slice(kept) : [];
}

/** **Names by words** (*Strategy* stage 8): a component not named by its folder takes the word
 *  most particular to it — in its modules' names, and their first doc lines where its anchor's
 *  name is a stop word, against its siblings' (tf-idf), recurring there unless the anchor's is a
 *  stop word — never a stop word or the
 *  package's own name; else it keeps its anchor's. Its own
 *  components are named among themselves alike. */
function worded(comps: Comp[], pkg: Pkg): Comp[] {
  const doc = new Map(pkg.modules.map((m) => [m.path, m.description ?? ""]));
  /** Its modules' names; their first doc lines too where the anchor names nothing. */
  const bag = (c: Comp) => c.modules.flatMap((m) => words_of(STOP.has(c.name.toLowerCase())
    ? `${stem_of(m)} ${doc.get(m)}` : stem_of(m)))
    .filter((w) => w.length > 2 && !STOP.has(w) && w !== pkg.name.toLowerCase());
  const bags = comps.map(bag);
  const df = new Map<string, number>();
  for (const b of bags) for (const w of new Set(b)) df.set(w, (df.get(w) ?? 0) + 1);
  const named = comps.map((c, i) => {
    const parts = c.parts.length ? worded(c.parts, pkg) : c.parts;
    if (c.modules.length < 2 || c.name !== stem_of(c.anchor)) return { ...c, parts };
    const tf = new Map<string, number>();
    for (const w of bags[i]!) tf.set(w, (tf.get(w) ?? 0) + 1);
    const idf = (w: string) => Math.log((comps.length + 1) / (df.get(w) ?? 1));
    /** A word must recur to outrank an anchor that names something; a stop word never does. */
    const least = STOP.has(c.name.toLowerCase()) ? 1 : 2;
    const [top] = [...tf].filter(([, n]) => n >= least).map(([w, n]) => [w, n * idf(w)] as const)
      .filter(([, x]) => x > 0).sort((a, z) => z[1] - a[1] || a[0].localeCompare(z[0]));
    return { ...c, name: top ? top[0] : c.name, parts };
  });
  return unique(named);
}

/** A name's or a sentence's words, lower case: camelCase, kebab and snake split. */
function words_of(text: string): string[] {
  return text.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z]+/).filter(Boolean);
}

/** The modularity of a partition over the given nodes. */
function modularity_of(undirected: Graph, nodes: string[], owner: Map<string, string>): number {
  const sub = sub_of(undirected, nodes);
  if (sub.size === 0) return 0;
  return modularity(sub, { getNodeCommunity: (n) => owner.get(n) ?? n, getEdgeWeight: "weight" });
}

/** Whether every layer holds at most `most` components. */
function fits(comps: Comp[], s: Settings): boolean {
  return comps.length <= s.most && comps.every((c) => fits(c.parts, s));
}

/** How many layers of components a list nests. */
function depth_of(comps: Comp[]): number {
  return comps.length ? 1 + Math.max(...comps.map((c) => depth_of(c.parts))) : 0;
}

/** The graph over some of a graph's nodes, with the edges between them. */
function sub_of(g: Graph, nodes: string[]): Graph {
  const out = new Graph({ type: g.type });
  const kept = new Set(nodes);
  nodes.forEach((n) => out.addNode(n));
  g.forEachEdge((_, a, from, to) => {
    if (kept.has(from) && kept.has(to)) out.mergeEdge(from, to, a);
  });
  return out;
}

/** A module's folder, from the root. */
function folder_of(path: string): string {
  return path.split("/").slice(0, -1).join("/");
}

/** A module's file name, without its extension. */
export function stem_of(path: string): string {
  return path.split("/").pop()!.replace(/\.([jt]sx?|mdx)$/, "");
}
