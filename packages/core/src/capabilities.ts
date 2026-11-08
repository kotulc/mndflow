/** What a block may do, and what its values are asked for. `allows` is refused at the gesture;
 *  `expects` is only ever advice. */

import { closes_cycle, constraints_stated, frozen, holds_defs, is_domain, isa, models, owner_def,
         stated, tree_of } from "./defs";
import { constraint_at } from "./library";
import { is_grid } from "./holders";
import { shown_name } from "./names";
import { children, is_interface, ports_on, subtree } from "./tree";
import type { Components, Constraint, Flow, Graph, Id } from "./types";

export type NoteKind = "required" | "ends" | "holds" | "ports" | "values" | "degree" | "match"
  | "nested" | "self" | "cycle" | "cell" | "outside";

/** What a usage asked for and did not get. */
export type Note = {
  kind: NoteKind;
  /** The block or relation the note is about. */
  id: Id;
  what: string;
};

export type Range = { min?: number; max?: number };

/** One capability's setting: anything, nothing, or these definitions and whatever extends them.
 *  Absent means nobody said, and is a no: a capability is granted, by a trait or a setting. */
export type Allowed = boolean | Id[];

/** What may attach to or be held by a usage. Refused when a gesture would break it. */
export type Allows = {
  /** Whether interfaces may be seated on its walls. */
  ports?: Allowed;
  /** What it may own as children. */
  holds?: Allowed;
  /** What may head a group: its first member, where that member is one of these. Absent, a group
   *  has no head. */
  heads?: Allowed;
  /** Whether it may hold values of its own. */
  values?: boolean;
  /** Whether it may hold records of one type. */
  records?: boolean;
  /** How many relationships may meet a usage, counted separately. */
  degree?: { in?: Range; out?: Range };
  /** Which definitions may sit at each end of a relation, and optionally which flow. */
  ends?: { from?: Id[]; to?: Id[]; fromFlow?: Flow; toFlow?: Flow };
};

/** What a usage's values are asked for. Noted, never refused. */
export type Expects = {
  /** Field names a usage must carry a value for. */
  required?: string[];
  /** Field names that must agree across a relationship's two ends. */
  match?: string[];
};

const strings = (v: unknown): string[] | undefined =>
  Array.isArray(v) && v.every((s) => typeof s === "string") ? (v as string[]) : undefined;

/** A capability's four settings: absent, a flag, or a list of definitions. */
const allowed = (v: unknown): Allowed | undefined =>
  typeof v === "boolean" ? v : strings(v);

const range = (v: unknown): Range | undefined => {
  if (!v || typeof v !== "object") return undefined;
  const { min, max } = v as Range;
  const ok = (n: unknown) => n === undefined || typeof n === "number";
  return ok(min) && ok(max) ? { min, max } : undefined;
};

/** The capabilities in force, nearest first, and the nearest declaration of each wins. */
export function allows_of(graph: Graph, id: Id | undefined): Allows {
  return merged(layers_of(graph, id, "allows", read_allows));
}

/** What an element's values are asked for: every rule of the constraints it is held to, each read
 *  down its chain — a constraint extending another is held to that one's rules too. */
export function expects_of(graph: Graph, id: Id | undefined): Expects {
  const rules = constraints_stated(graph, id).ids.flatMap((c) => rules_of(graph, c));
  const all = (key: "required" | "match") => [...new Set(rules.flatMap((r) => r[key] ?? []))];
  const required = all("required");
  const match = all("match");
  return { ...(required.length ? { required } : {}), ...(match.length ? { match } : {}) };
}

/** A constraint and those it extends, nearest first. */
function rules_of(graph: Graph, id: Id): Constraint[] {
  const out: Constraint[] = [];
  for (let c = constraint_at(graph, id); c && !out.some((o) => o.id === c!.id);
       c = constraint_at(graph, c.type)) {
    out.push(c);
  }
  return out;
}

/** Nearest first, so the first declaration of each key is the one in force. */
function merged<T extends object>(layers: T[]): T {
  const out = {} as T;
  for (const from of layers) {
    for (const key of Object.keys(from) as (keyof T)[]) {
      if (out[key] === undefined) out[key] = from[key];
    }
  }
  return out;
}

/** What states this key over an element, nearest first: per link of its chain, its own word, then
 *  its traits. A definition's chain starts at itself. */
function layers_of<T>(graph: Graph, id: Id | undefined, key: string,
                      read: (c: Components | undefined) => T): T[] {
  return stated(graph, id).filter((c) => c[key]).map(read);
}

function read_allows(components: Components | undefined): Allows {
  const a = components?.["allows"] ?? {};
  const out: Allows = {};

  for (const key of ["ports", "holds", "heads"] as const) {
    const said = allowed(a[key]);
    if (said !== undefined) out[key] = said;
  }

  if (typeof a["values"] === "boolean") out.values = a["values"];
  if (typeof a["records"] === "boolean") out.records = a["records"];

  const degree = a["degree"];
  if (degree && typeof degree === "object") {
    const g = degree as Record<string, unknown>;
    out.degree = { in: range(g["in"]), out: range(g["out"]) };
  }

  const ends = a["ends"];
  if (ends && typeof ends === "object") {
    const e = ends as Record<string, unknown>;
    out.ends = { from: strings(e["from"]), to: strings(e["to"]),
                 fromFlow: e["fromFlow"] as Flow, toFlow: e["toFlow"] as Flow };
  }

  return out;
}


// ------------------------------------------------------------ what is permitted

/** Does this type resolve to one of these, or to anything below one? */
function is_one_of(graph: Graph, type: Id | undefined, allowed: Id[]): boolean {
  return isa(graph, type).some((d) => allowed.includes(d.id));
}

/** Whether a setting lets this type through. Absent is a no: nobody granted it. */
export function permits(graph: Graph, setting: Allowed | undefined,
                        type?: Id): boolean {
  if (setting === true) return true;
  if (setting === undefined || setting === false) return false;
  return setting.length ? is_one_of(graph, type, setting) : false;
}

/** Whether an element may hold values of its own: granted by the `values` trait. A definition
 *  declares attributes rather than holding values, so it always may. */
export function holds_values(graph: Graph, id: Id): boolean {
  return !!graph.blocks[id]?.def || allows_of(graph, id).values === true;
}

/** Whether this block may own a child of that definition: its settings say, and nothing else. */
export function may_hold(graph: Graph, parent: Id, type?: Id): boolean {
  return permits(graph, allows_of(graph, parent).holds, type);
}

/** Whether interfaces may sit on this block's wall: granted by *has ports*. */
export function may_seat(graph: Graph, id: Id): boolean {
  const said = allows_of(graph, id).ports;
  return said === true || (Array.isArray(said) && said.length > 0);
}

/** Whether a block holds records of its own: granted by *has records*. */
export function holds_records(graph: Graph, id: Id): boolean {
  return allows_of(graph, id).records === true;
}

// ------------------------------------------------------------------- the review

/** What a block or a line answers for one field name. */
function value_of(graph: Graph, id: Id, name: string): string | undefined {
  return (graph.blocks[id] ?? graph.edges[id])?.values?.find((f) => f.name === name)?.value;
}

/** What an element is asked for and leaves unanswered. */
function unanswered(graph: Graph, id: Id, name: string, expects: Expects): Note[] {
  return (expects.required ?? []).filter((n) => !value_of(graph, id, n))
    .map((n) => ({ kind: "required", id, what: `"${name}" needs a value for ${n}` }));
}

function label(graph: Graph, id: Id): string {
  return graph.blocks[id]?.name ?? id;
}

/** What a graph asked for and did not get. Both keys are reported: a gesture refuses what
 *  `allows` forbids, but data that arrived another way still has to be said out loud. */
export function review(graph: Graph, scope?: Id): Note[] {
  const notes: Note[] = [];
  const within = scope ? new Set(subtree(graph, scope)) : null;
  const holds_block = (id: Id) => !within || within.has(id);
  const modeled = models(graph, graph.root).length > 0;

  for (const b of Object.values(graph.blocks)) {
    if (!holds_block(b.id) || frozen(graph, b.id)) continue;
    const allows = allows_of(graph, b.id);

    /** The rules a gesture refuses, said of data that arrived another way. */
    if (b.def && tree_of(graph, b.id) !== b.id) {
      notes.push({ kind: "nested", id: b.id, what: `"${label(graph, b.id)}" sits in a structure` });
    }
    const home = b.def ? null : owner_def(graph, b.id);
    if (home && home === b.type) {
      notes.push({ kind: "self", id: b.id, what: `"${label(graph, home)}" uses itself` });
    }
    /** **Everything drawn sits in a model**, where a workspace has any: structure filed straight
     *  under a package or a definitions folder is said once, at its top. A host's own structure,
     *  in a graph with no models, is the host's. */
    if (modeled && !is_domain(graph, b.id) && b.parent && holds_defs(graph, b.parent)
        && !is_interface(graph, b.id)) {
      notes.push({ kind: "outside", id: b.id,
                   what: `"${label(graph, b.id)}" sits outside every model, so it is never drawn` });
    }
    if (b.def && closes_cycle(graph, b.id, b.type)) {
      notes.push({ kind: "cycle", id: b.id, what: `"${label(graph, b.id)}" extends itself` });
    }
    if (!b.cell && !is_interface(graph, b.id) && is_grid(graph, b.parent ?? undefined)) {
      notes.push({ kind: "cell", id: b.id,
                   what: `"${label(graph, b.id)}" sits in a grid but in no cell, so it is not drawn` });
    }
    const expects = expects_of(graph, b.id);
    if (b.values?.length && !holds_values(graph, b.id)) {
      notes.push({ kind: "values", id: b.id, what: `"${label(graph, b.id)}" holds no values` });
    }

    /** A definition is a template, never allocated: what it asks is asked of its usages. */
    if (!b.def) notes.push(...unanswered(graph, b.id, label(graph, b.id), expects));

    /** What it holds without the containment capability, or of a sort it does not take. */
    for (const child of children(graph, b.id)) {
      if (is_interface(graph, child.id) || permits(graph, allows.holds, child.type)) continue;
      notes.push({ kind: "holds", id: child.id,
                   what: `"${label(graph, b.id)}" may not hold "${label(graph, child.id)}"` });
    }

    /** A wall that takes no ports, said about the ones already on it. */
    if (b.ports?.length && !may_seat(graph, b.id)) {
      notes.push({ kind: "ports", id: b.id, what: `"${label(graph, b.id)}" takes no ports` });
    }
    if (b.records?.length && !holds_records(graph, b.id)) {
      notes.push({ kind: "values", id: b.id, what: `"${label(graph, b.id)}" holds no records` });
    }

    /** Degree counts every relation meeting the block, in any layer — a usage's, never a
     *  definition's. */
    if (allows.degree && !b.def) {
      const met = Object.values(graph.edges);
      count(notes, b.id, label(graph, b.id), "in",
            met.filter((e) => e.to === b.id).length, allows.degree.in);
      count(notes, b.id, label(graph, b.id), "out",
            met.filter((e) => e.from === b.id).length, allows.degree.out);
    }
  }

  for (const e of Object.values(graph.edges)) {
    if (!holds_block(e.from) && !holds_block(e.to)) continue;
    const allows = allows_of(graph, e.id);
    const expects = expects_of(graph, e.id);

    notes.push(...unanswered(graph, e.id, shown_name(graph, e.id), expects));
    if (allows.ends) {
      end(notes, graph, e.id, "from", e.from, e.fromPort, allows.ends.from, allows.ends.fromFlow);
      end(notes, graph, e.id, "to", e.to, e.toPort, allows.ends.to, allows.ends.toFlow);
    }

    /** `match` is one fixed comparison: the same field name, read off both ends, agreeing. */
    for (const name of expects.match ?? []) {
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

/** A capability about an end: the block it meets, and the flow of the port it meets there. */
function end(notes: Note[], graph: Graph, id: Id, way: "from" | "to", at: Id, part: Id | undefined,
             allowed: Id[] | undefined, flow: Flow | undefined): void {
  const owner = graph.blocks[at];
  const port = part ? ports_on(graph, at).find((p) => p.id === part) : undefined;
  if (allowed && !is_one_of(graph, owner?.type, allowed)) {
    notes.push({ kind: "ends", id, what: `"${label(graph, owner?.id ?? at)}" may not sit at the ${way} end` });
  }
  /** An interface saying no flow carries both ways. */
  if (flow && (port ? port.flow ?? "both" : undefined) !== flow) {
    notes.push({ kind: "ends", id,
                 what: `the ${way} end wants a ${flow} interface` });
  }
}
