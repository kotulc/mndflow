/** The rule kinds, asked rather than enforced.
 *
 *  **They advise while modelling and refuse only at translation.** A model is
 *  legitimately unfinished, so nothing here is a fault and nothing here is
 *  repaired: the door owns what makes a graph readable, and this owns what a
 *  vocabulary asked for. A note is a note until a translator decides otherwise.
 *
 *  **One constraint and four rules**, each a lookup, a count or one fixed
 *  comparison. No operators, nothing to parse, and no rule language — what they
 *  cannot say is a module's `validate` hook, which is code.
 *
 *  A rule naming a definition means **it or anything below it**, so `isa` is
 *  the whole of the matching. A malformed rule is ignored rather than thrown
 *  on, the same way a component validates its own key and no other. */

import { children, isa, subtree } from "./fold";
import type { Definition, Flow, Graph, Id } from "./types";

export type NoteKind = "required" | "ends" | "holds" | "degree" | "match";

/** What a usage asked for and did not get. Carries the thing at fault, so a
 *  caller can light it up without searching for it. */
export type Note = {
  kind: NoteKind;
  /** The block or relation the note is about. */
  id: Id;
  what: string;
};

export type Range = { min?: number; max?: number };

/** What a definition may declare. Read defensively — a shape this build does
 *  not recognise is left alone rather than refused. */
export type Rules = {
  /** Field names a usage must carry a value for. The one constraint. */
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

/** The rules in force on a usage: the chain, nearest first, and the nearest
 *  declaration of each kind wins. Components merge per key, so a subtype
 *  restating one kind leaves the others alone. */
export function rules_of(graph: Graph, type: Id | undefined): Rules {
  const out: Rules = {};
  for (const d of isa(graph, type)) {
    const from = read_rules(d);
    for (const key of Object.keys(from) as (keyof Rules)[]) {
      if (out[key] === undefined) (out as Record<string, unknown>)[key] = from[key];
    }
  }
  return out;
}

function read_rules(d: Definition): Rules {
  const c = d.components?.["constraints"] ?? {};
  const r = d.components?.["rules"] ?? {};
  const out: Rules = {};

  const required = strings(c["required"]);
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

function value_of(graph: Graph, id: Id, name: string): string | undefined {
  const held = graph.blocks[id]?.fields ?? graph.edges[id]?.fields;
  return held?.find((f) => f.name === name)?.value;
}

function label(graph: Graph, id: Id): string {
  return graph.blocks[id]?.label ?? id;
}

/** What a graph asked for and did not get.
 *
 *  **Scoped, because that is how it is used**: the tray asks about the open
 *  layer and a translator asks about the subtree it is emitting, and neither
 *  wants to hear about the rest of the workspace. Absent, the whole graph. */
export function review(graph: Graph, scope?: Id): Note[] {
  const notes: Note[] = [];
  const within = scope ? new Set(subtree(graph, scope)) : null;
  const holds_block = (id: Id) => !within || within.has(id);

  for (const b of Object.values(graph.blocks)) {
    if (!holds_block(b.id)) continue;
    const rules = rules_of(graph, b.type);

    for (const name of rules.required ?? []) {
      if (!value_of(graph, b.id, name)) {
        notes.push({ kind: "required", id: b.id,
                     what: `"${label(graph, b.id)}" needs a value for ${name}` });
      }
    }

    /** `holds` is the vocabulary's containment rule. The engine owns exactly
     *  one of its own — a view holds references — and this is the other kind. */
    if (rules.holds) {
      for (const child of children(graph, b.id)) {
        if (!is_one_of(graph, child.type, rules.holds)) {
          notes.push({ kind: "holds", id: child.id,
                       what: `"${label(graph, b.id)}" may not hold "${label(graph, child.id)}"` });
        }
      }
    }

    /** Every relationship meeting the usage, wherever it is drawn — degree is
     *  about the thing, never about the layer somebody is looking at. */
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
    const rules = rules_of(graph, e.type);

    for (const name of rules.required ?? []) {
      if (!value_of(graph, e.id, name)) {
        notes.push({ kind: "required", id: e.id, what: `a relation needs a value for ${name}` });
      }
    }

    if (rules.ends) {
      end(notes, graph, e.id, "from", e.from, rules.ends.from, rules.ends.fromFlow);
      end(notes, graph, e.id, "to", e.to, rules.ends.to, rules.ends.toFlow);
    }

    /** `match` is one fixed comparison: the same field name, read off both
     *  ends, agreeing. Absent on either end is a disagreement. */
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

function end(notes: Note[], graph: Graph, id: Id, way: "from" | "to", at: Id,
             allowed: Id[] | undefined, flow: Flow | undefined): void {
  if (allowed && !is_one_of(graph, graph.blocks[at]?.type, allowed)) {
    notes.push({ kind: "ends", id,
                 what: `"${label(graph, at)}" may not sit at the ${way} end` });
  }
  if (flow && graph.blocks[at]?.flow !== flow) {
    notes.push({ kind: "ends", id,
                 what: `the ${way} end wants a ${flow} interface` });
  }
}
