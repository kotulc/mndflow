/** The rule kinds, asked rather than enforced. */

import { children, def_of, is_interface, isa, subtree } from "./fold";
import type { Components, Flow, Graph, Id } from "./types";

export type NoteKind = "required" | "ends" | "holds" | "degree" | "match";

/** What a usage asked for and did not get. */
export type Note = {
  kind: NoteKind;
  /** The block or relation the note is about. */
  id: Id;
  what: string;
};

export type Range = { min?: number; max?: number };

/** What a definition may declare. */
export type Rules = {
  /** Field names a usage must carry a value for. */
  required?: string[];
  /** Which definitions may sit at each end, and optionally which flow. */
  ends?: { from?: Id[]; to?: Id[]; fromFlow?: Flow; toFlow?: Flow };
  /** Which definitions this one may contain. */
  holds?: Id[];
  /** How many relationships may meet a usage, counted separately. */
  degree?: { in?: Range; out?: Range };
  /** Field names that must agree across a relationship's two ends. */
  match?: string[];
};

const strings = (v: unknown): string[] | undefined =>
  Array.isArray(v) && v.every((s) => typeof s === "string") ? (v as string[]) : undefined;

const range = (v: unknown): Range | undefined => {
  if (!v || typeof v !== "object") return undefined;
  const { min, max } = v as Range;
  const ok = (n: unknown) => n === undefined || typeof n === "number";
  return ok(min) && ok(max) ? { min, max } : undefined;
};

/** The rules in force, nearest first, and the nearest declaration of each kind wins. */
export function rules_of(graph: Graph, id: Id | undefined): Rules {
  const out: Rules = {};
  for (const from of layers_of(graph, id)) {
    for (const key of Object.keys(from) as (keyof Rules)[]) {
      if (out[key] === undefined) (out as Record<string, unknown>)[key] = from[key];
    }
  }
  return out;
}

/** What states rules over this, nearest first. */
function layers_of(graph: Graph, id: Id | undefined): Rules[] {
  if (!id) return [];
  if (graph.defs[id]) return isa(graph, id).map((d) => read_rules(d.components));
  const chain = isa(graph, def_of(graph, id)).map((d) => read_rules(d.components));
  /** Whichever holder the id names. */
  const own = (graph.blocks[id] ?? graph.edges[id])?.looks;
  return own?.["rules"] ? [read_rules(own), ...chain] : chain;
}

function read_rules(components: Components | undefined): Rules {
  const r = components?.["rules"] ?? {};
  const out: Rules = {};

  const required = strings(r["required"]);
  if (required) out.required = required;

  const ends = r["ends"];
  if (ends && typeof ends === "object") {
    const e = ends as Record<string, unknown>;
    out.ends = { from: strings(e["from"]), to: strings(e["to"]),
                 fromFlow: e["fromFlow"] as Flow, toFlow: e["toFlow"] as Flow };
  }

  const holds = strings(r["holds"]);
  if (holds) out.holds = holds;

  const degree = r["degree"];
  if (degree && typeof degree === "object") {
    const g = degree as Record<string, unknown>;
    out.degree = { in: range(g["in"]), out: range(g["out"]) };
  }

  const match = strings(r["match"]);
  if (match) out.match = match;

  return out;
}

/** Does this type resolve to one of these, or to anything below one? */
function is_one_of(graph: Graph, type: Id | undefined, allowed: Id[]): boolean {
  return isa(graph, type).some((d) => allowed.includes(d.id));
}

/** What a block answers for one field name. */
function value_of(graph: Graph, id: Id, name: string): string | undefined {
  return graph.blocks[id]?.fields?.find((f) => f.name === name)?.value;
}

function label(graph: Graph, id: Id): string {
  return graph.blocks[id]?.name ?? id;
}

/** What a graph asked for and did not get. */
export function review(graph: Graph, scope?: Id): Note[] {
  const notes: Note[] = [];
  const within = scope ? new Set(subtree(graph, scope)) : null;
  const holds_block = (id: Id) => !within || within.has(id);

  for (const b of Object.values(graph.blocks)) {
    if (!holds_block(b.id)) continue;
    const rules = rules_of(graph, b.id);

    for (const name of rules.required ?? []) {
      if (!value_of(graph, b.id, name)) {
        notes.push({ kind: "required", id: b.id,
                     what: `"${label(graph, b.id)}" needs a value for ${name}` });
      }
    }

    /** The vocabulary's containment rule. */
    if (rules.holds) {
      for (const child of children(graph, b.id)) {
        if (!is_one_of(graph, child.type, rules.holds)) {
          notes.push({ kind: "holds", id: child.id,
                       what: `"${label(graph, b.id)}" may not hold "${label(graph, child.id)}"` });
        }
      }
    }

    /** Degree counts every relation meeting the block, in any layer. */
    if (rules.degree) {
      const met = Object.values(graph.edges);
      count(notes, b.id, label(graph, b.id), "in",
            met.filter((e) => e.to === b.id).length, rules.degree.in);
      count(notes, b.id, label(graph, b.id), "out",
            met.filter((e) => e.from === b.id).length, rules.degree.out);
    }
  }

  for (const e of Object.values(graph.edges)) {
    if (!holds_block(e.from) && !holds_block(e.to)) continue;
    const rules = rules_of(graph, e.id);

    /** An edge has no `required`: it carries no values. */
    if (rules.ends) {
      end(notes, graph, e.id, "from", e.from, rules.ends.from, rules.ends.fromFlow);
      end(notes, graph, e.id, "to", e.to, rules.ends.to, rules.ends.toFlow);
    }

    /** `match` is one fixed comparison: the same field name, read off both ends, agreeing. */
    for (const name of rules.match ?? []) {
      if (value_of(graph, e.from, name) !== value_of(graph, e.to, name)) {
        notes.push({ kind: "match", id: e.id,
                     what: `"${label(graph, e.from)}" and "${label(graph, e.to)}" `
                         + `disagree on ${name}` });
      }
    }
  }

  return notes;
}

function count(notes: Note[], id: Id, name: string, way: "in" | "out",
               got: number, want: Range | undefined): void {
  if (!want) return;
  if (want.min !== undefined && got < want.min) {
    notes.push({ kind: "degree", id, what: `"${name}" wants ${want.min} ${way}, and has ${got}` });
  }
  if (want.max !== undefined && got > want.max) {
    notes.push({ kind: "degree", id, what: `"${name}" takes ${want.max} ${way}, and has ${got}` });
  }
}

/** A rule about an end walks through a port. */
function end(notes: Note[], graph: Graph, id: Id, way: "from" | "to", at: Id,
             allowed: Id[] | undefined, flow: Flow | undefined): void {
  const met = graph.blocks[at];
  const owner = met && is_interface(met) && met.parent
    ? graph.blocks[met.parent] : undefined;
  if (allowed && !is_one_of(graph, met?.type, allowed)
      && !is_one_of(graph, owner?.type, allowed)) {
    notes.push({ kind: "ends", id,
                 what: `"${label(graph, owner?.id ?? at)}" may not sit at the ${way} end` });
  }
  if (flow && met?.flow !== flow) {
    notes.push({ kind: "ends", id,
                 what: `the ${way} end wants a ${flow} interface` });
  }
}
