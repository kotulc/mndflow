/** **Fact-fed draw** (2026-11-20): a fact answer, as `mnd fact` printed it and as the agent
 *  pruned it, turned into a diagram kind's selection, so `draw` writes the diagram from facts.
 *  The agent's job is to ask the facts, keep what the diagram is for, and draw; names, labels
 *  and notes are edited afterwards in the file written. Kinds whose meaning no fact holds
 *  (state, swimlane, mapping, dataflow) are drawn from a hand-written selection.
 *
 *  **The library sets the scale** (2026-11-20): drawn into a source folder, each end is lifted
 *  to the nearest unit its library holds, and what it holds nothing of is left out and said. */

import type { Graph } from "@mnd/core";

/** A relation between two dotted ends, as the facts say it; `what` the functions it calls. */
type Edge = { from: string; to: string; what?: string[] };

/** What one fact answer says, read off its shape. */
type Read = { edges: Edge[]; units: string[]; outside: Edge[]; classes: string[];
              functions: boolean };

/** What a library holds: each source unit (`hc.api.views`) a block stands for, to the block's
 *  path by name as a file names it (`hc.api.views`, or `api.views` after a move or rename). */
export type Held = Map<string, string>;

/** How a folder's path is keyed in what a library holds, apart from what an end lifts to. */
const FOLDER = "folder:";

/** The kinds a fact answer can be drawn as. */
export const FED = ["sequence", "flow", "context", "class", "entity", "overview"] as const;


/** Whether a parsed JSON input is a fact answer rather than a selection. */
export function is_facts(input: unknown): boolean {
  if (Array.isArray(input)) return input.some((x) => x && typeof x === "object"
    && "unit" in x && ("extends" in x || "kind" in x));
  const o = input as Record<string, unknown>;
  return Array.isArray(o["imports"]) || Array.isArray(o["units"]) || Array.isArray(o["classes"]) || typeof o["function"] === "string"
    || (Array.isArray(o["calls"]) && "run" in o);
}

/** **A kind's selection from a fact answer**: what the kind draws, named by the last step of
 *  each dotted name (a clash keeps one more step, joined by `-`), each part a reference to its
 *  unit (`of`) so the library's look and parts reach it. */
export function selection_from(kind: string, input: unknown, held?: Held,
                               keep?: string[]): { selection: Record<string, unknown>; left: string[] } {
  if (!(FED as readonly string[]).includes(kind)) {
    throw new Error(`a ${kind} is drawn from a selection, not from facts; facts draw `
      + `${FED.join(", ")}`);
  }
  const { said, left } = kept(lifted(read(input), kind, held), keep);
  try {
    return { selection: drawn(kind, said), left };
  } catch (e) {
    if (!left.length) throw e;
    throw new Error(`the library holds none of it (${left.slice(0, 4).join(", ")}…): pick those `
      + "units with `define`, or draw outside a source folder");
  }
}

/** **What a library holds**, out of a collected graph: each block but a folder by the unit its
 *  source says — a type definition by its id (`types.<unit>`), a block by its source file, a
 *  part in its holder's file by its holder's unit and its name — and by its own name path. */
export function held_in(graph: Graph): Held {
  const path = (id: string): string[] => {
    const b = graph.blocks[id];
    return !b || !b.parent ? [] : [...path(b.parent), b.name ?? ""];
  };
  const memo = new Map<string, string | undefined>();
  const unit = (id: string): string | undefined => {
    if (memo.has(id)) return memo.get(id);
    const b = graph.blocks[id];
    const typed = /(?:^|\.)types\.(.+)$/.exec(id)?.[1];
    const file = typeof b?.source === "string" ? b.source.split("#")[0]! : "";
    const mod = file.endsWith(".py") ? file.slice(0, -3).replace(/\/__init__$/, "").split("/").join(".")
      : "";
    const up = b?.parent ? unit(b.parent) : undefined;
    const same = up && mod && (up === mod || up.startsWith(`${mod}.`));
    const got = typed ?? (same ? `${up}.${b!.name}` : mod || undefined);
    memo.set(id, got);
    return got;
  };
  const held: Held = new Map();
  // A folder files what it holds: an end lifts to one only where nothing nearer is held
  for (const b of Object.values(graph.blocks)) {
    if (b.parent && b.type === "folder") held.set(`${FOLDER}${path(b.id).join(".")}`, path(b.id).join("."));
    if (!b.parent || b.type === "folder") continue;
    const at = path(b.id).join(".");
    held.set(at, at);
    const u = unit(b.id);
    if (u && !held.has(u)) held.set(u, at);
  }
  for (const b of Object.values(graph.blocks)) {
    const u = unit(b.id);
    if (u && b.type !== "folder" && b.parent) held.set(u, path(b.id).join("."));
    // Each folder above it named as a step of its unit stands for that step's unit
    let [at, steps] = [b.parent ? graph.blocks[b.parent] : undefined, u?.split(".").slice(0, -1)];
    while (at?.parent && at.type === "folder" && steps?.length && steps.at(-1) === at.name) {
      const key = `${FOLDER}${steps.join(".")}`;
      if (!held.has(key)) held.set(key, path(at.id).join("."));
      [at, steps] = [graph.blocks[at.parent], steps.slice(0, -1)];
    }
  }
  return held;
}

/** A kind's selection from what was read. */
function drawn(kind: string, said: Read): Record<string, unknown> {
  if (kind === "class" || kind === "entity") {
    if (!said.classes.length) throw new Error(`a ${kind} is drawn from \`classes\``);
    return { blocks: names_of(said.classes).map((n) => n.name) };
  }
  if (kind === "overview") {
    if (!said.units.length) throw new Error("an overview is drawn from `units`");
    return { blocks: names_of(said.units).map(referenced) };
  }
  if (!said.edges.length) throw new Error(`a ${kind} is drawn from \`calls\`, \`trace\` or `
    + "`imports`");
  if (kind === "sequence") return sequence(said);
  if (kind === "flow") return flow(said);
  return context(said);
}

/** **Each end at the library's scale**: lifted to the nearest unit it holds, a function call's
 *  ends to their class or module for a sequence (the message named by the function); what
 *  the library holds nothing of is left out, and listed. No library, nothing lifted. */
function lifted(said: Read, kind: string, held?: Held): { said: Read; left: string[] } {
  const left = new Set<string>();
  const up = (u: string) => {
    if (!held) return u;
    const steps = u.split(".");
    // The nearest held unit; else a package folder below the top (never a catch-all root)
    for (let k = steps.length; k > 0; k--) {
      const key = steps.slice(0, k).join(".");
      const at = held.get(key) ?? (k > 1 ? held.get(`${FOLDER}${key}`) : undefined);
      if (at) return at;
    }
    left.add(u);
    return undefined;
  };
  const holder = (f: string) => f.slice(0, f.lastIndexOf("."));
  const by_holder = kind === "sequence" && said.functions;
  const edges = said.edges.flatMap((e) => {
    const [a, b] = by_holder ? [up(holder(e.from)), up(holder(e.to))] : [up(e.from), up(e.to)];
    const what = said.functions ? [e.to.slice(e.to.lastIndexOf(".") + 1)] : e.what;
    return a && b ? [{ from: a, to: b, ...(what ? { what } : {}) }] : [];
  });
  // A context draws one level: a part's descendants are folded into it
  if (kind === "context") {
    const ends = new Set(edges.flatMap((e) => [e.from, e.to]));
    const top = (u: string) => [...ends].filter((v) => u.startsWith(`${v}.`))
      .sort((a, z) => a.length - z.length)[0] ?? u;
    for (const e of edges) Object.assign(e, { from: top(e.from), to: top(e.to) });
    edges.splice(0, edges.length, ...edges.filter((e) => e.from !== e.to));
  }
  const outside = said.outside.flatMap((e) => {
    const a = up(e.from);
    return a ? [{ from: a, to: e.to }] : [];
  });
  // A unit or class is drawn only where the library holds it itself, never a holder of it
  const own = (u: string) => {
    const at = held ? held.get(u) ?? (kind === "overview" ? held.get(`${FOLDER}${u}`) : undefined) : u;
    if (!at) left.add(u);
    return at ? [at] : [];
  };
  const units = said.units.flatMap(own);
  const classes = said.classes.flatMap(own);
  return { said: { edges, outside, units, classes, functions: said.functions && !by_holder },
           left: [...left] };
}

/** **Only what `--keep` names** (2026-11-20): each end, unit or class kept where a kept word is
 *  its name, its path or the end of its path; a line kept where both its ends are. */
function kept(got: { said: Read; left: string[] }, keep?: string[]): { said: Read; left: string[] } {
  if (!keep?.length) return got;
  const hit = (u: string) => keep.some((k) => u === k || u.endsWith(`.${k}`));
  const { said } = got;
  return { left: got.left, said: { ...said,
    edges: said.edges.filter((e) => hit(e.from) && hit(e.to)),
    outside: said.outside.filter((e) => hit(e.from) && hit(e.to)),
    units: said.units.filter(hit), classes: said.classes.filter(hit) } };
}

/** Edges, units and classes out of any fact answer: a `calls` tree flattened in call order,
 *  `trace` and `imports` as they are; ends of `calls` and an ungathered `trace` are functions. */
function read(input: unknown): Read {
  const out: Read = { edges: [], units: [], outside: [], classes: [], functions: false };
  if (Array.isArray(input)) {
    // One top unit alone is drawn by its parts
    const one = input.length === 1 && Array.isArray(input[0]?.parts) && !("extends" in input[0]);
    for (const x of (one ? input[0].parts : input) as Record<string, unknown>[]) {
      if ("extends" in x) out.classes.push(String(x["unit"]));
      else out.units.push(String(x["unit"]));
    }
    return out;
  }
  const o = input as Record<string, unknown>;
  // `define`'s pick, `{units, classes, …}`, reads as its lists
  if (Array.isArray(o["units"]) || Array.isArray(o["classes"])) {
    const [u, c] = [read(o["units"] ?? []), read(o["classes"] ?? [])];
    return { ...u, classes: c.classes };
  }
  if (typeof o["function"] === "string") {
    out.functions = true;
    const walk = (n: Record<string, unknown>) => {
      for (const c of (n["calls"] ?? []) as Record<string, unknown>[]) {
        out.edges.push({ from: String(n["function"]), to: String(c["function"]) });
        walk(c);
      }
    };
    walk(o);
  } else if (Array.isArray(o["imports"])) {
    out.edges = (o["imports"] as Edge[]).map(({ from, to }) => ({ from, to }));
    out.outside = ((o["outside"] ?? []) as { package: string; by: string[] }[])
      .flatMap((p) => p.by.map((b) => ({ from: b, to: p.package })));
  } else {
    out.functions = o["depth"] === undefined;
    out.edges = [...(o["calls"] as (Edge & { order?: number })[])]
      .sort((a, z) => (a.order ?? 0) - (z.order ?? 0))
      .map(({ from, to, what }) => ({ from, to, ...(what ? { what } : {}) }));
  }
  return out;
}

/** **A sequence from calls**: a participant per unit a call leaves or reaches (a function's
 *  class or module, lifted), in order of first message; each a message named by the first few
 *  functions it calls (`what`). */
function sequence(said: Read): Record<string, unknown> {
  const ends = said.edges.flatMap((e) => [e.from, e.to]);
  const named = new Map(names_of(ends).map((n) => [n.unit, n.name]));
  // Messages in order, one after another between the same pair merged into one row
  const rows: { a: string; b: string; what: string[] }[] = [];
  for (const e of said.edges) {
    const [a, b] = [named.get(e.from)!, named.get(e.to)!];
    // A call within one participant is kept: a message to itself, named by what it calls
    if (a === b && !(e.what ?? []).length) continue;
    const last = rows[rows.length - 1];
    const row = last && last.a === a && last.b === b ? last : rows[rows.push({ a, b, what: [] }) - 1]!;
    for (const w of e.what ?? []) if (!row.what.includes(w)) row.what.push(w);
  }
  const relations = [...new Set(rows.map((r) => `${r.a} -> ${r.b}${r.what.length
    ? `: ${r.what.slice(0, 3).join(", ")}${r.what.length > 3 ? ", …" : ""}` : ""}`))];
  return { participants: names_of(ends.filter((u) => relations.some((l) =>
    l.split(/ -> |: /).slice(0, 2).includes(named.get(u)!)))).map(referenced), relations };
}

/** **A flow from calls**: a step per function (or unit), in order of first call. */
function flow(said: Read): Record<string, unknown> {
  const ends = said.edges.flatMap((e) => [e.from, e.to]);
  const names = names_of(ends);
  const named = new Map(names.map((n) => [n.unit, n.name]));
  // A step calling itself is no step; a line names the functions it calls
  const lines = new Map<string, string[]>();
  for (const e of said.edges) {
    const [a, b] = [named.get(e.from)!, named.get(e.to)!];
    if (a === b) continue;
    const what = lines.get(`${a} -> ${b}`) ?? [];
    // A label only naming the step it reaches says nothing
    for (const w of e.what ?? []) if (!what.includes(w) && !b.endsWith(w)) what.push(w);
    lines.set(`${a} -> ${b}`, what);
  }
  const relations = [...lines].map(([l, w]) => (w.length ? `${l}: ${w.slice(0, 3).join(", ")}` : l));
  return { blocks: names.map(referenced), relations };
}

/** **A context from imports**: a part per unit, a dependency line per import. What is across —
 *  the packages from outside — is never written here (context.md, agreed 2): `draw` names them
 *  for the model holding the context. */
function context(said: Read): Record<string, unknown> {
  const parts = names_of(said.edges.flatMap((e) => [e.from, e.to]));
  const named = new Map(parts.map((n) => [n.unit, n.name]));
  const line = (e: Edge) => `${named.get(e.from) ?? e.from} -> ${named.get(e.to) ?? e.to}`;
  return { blocks: parts.map(referenced),
           relations: [{ dependency: [...new Set(said.edges.map(line))] }] };
}

/** The packages from outside a fact answer names, by how many parts lean on each. */
export function outside_of(input: unknown): string[] {
  const o = input as { outside?: { package: string; by: string[] }[] };
  return (o?.outside ?? []).sort((a, z) => z.by.length - a.by.length).map((p) => p.package);
}

/** A part referencing its unit, by its short name. */
function referenced(n: { unit: string; name: string }): Record<string, unknown> {
  return n.name === n.unit ? { name: n.name } : { name: n.name, of: n.unit };
}

/** Each distinct dotted name, in first order, with its shortest unclashing name. */
function names_of(units: readonly string[]): { unit: string; name: string }[] {
  const all = [...new Set(units)];
  const short = (u: string, k: number) => u.split(".").slice(-k).join("-");
  return all.map((u) => {
    let k = 1;
    while (k < u.split(".").length && all.some((v) => v !== u && short(v, k) === short(u, k))) k++;
    return { unit: u, name: short(u, k) };
  });
}
