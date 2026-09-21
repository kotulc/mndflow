/** What a block may do, and what its values are asked for. `allows` is refused at the gesture;
 *  `expects` is only ever advice. */

import { base_of, def_of, isa } from "./defs";
import { children, is_interface, subtree } from "./tree";
import type { Components, Flow, Graph, Id } from "./types";

export type NoteKind = "required" | "ends" | "holds" | "ports" | "degree" | "match";

/** What a usage asked for and did not get. */
export type Note = {
  kind: NoteKind;
  /** The block or relation the note is about. */
  id: Id;
  what: string;
};

export type Range = { min?: number; max?: number };

/** One capability's setting: anything, nothing, or these definitions and whatever extends them.
 *  Absent is not this — it means nobody said, and the chain answers instead. */
export type Allowed = boolean | Id[];

/** What may attach to or be held by a usage. Refused when a gesture would break it. */
export type Allows = {
  /** Whether interfaces may be seated on its walls. */
  ports?: Allowed;
  /** What it may own as children. */
  holds?: Allowed;
  /** What a holder may take as members. */
  members?: Allowed;
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

/** What this usage's values are asked for, merged the same way. */
export function expects_of(graph: Graph, id: Id | undefined): Expects {
  return merged(layers_of(graph, id, "expects", read_expects));
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

/** What states this key over an element, nearest first: its own look, then its chain. */
function layers_of<T>(graph: Graph, id: Id | undefined, key: string,
                      read: (c: Components | undefined) => T): T[] {
  if (!id) return [];
  if (graph.defs[id]) return isa(graph, id).map((d) => read(d.components));
  const chain = isa(graph, def_of(graph, id)).map((d) => read(d.components));
  const own = (graph.blocks[id] ?? graph.edges[id])?.looks;
  return own?.[key] ? [read(own), ...chain] : chain;
}

function read_allows(components: Components | undefined): Allows {
  const a = components?.["allows"] ?? {};
  const out: Allows = {};

  for (const key of ["ports", "holds", "members"] as const) {
    const said = allowed(a[key]);
    if (said !== undefined) out[key] = said;
  }

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

function read_expects(components: Components | undefined): Expects {
  const e = components?.["expects"] ?? {};
  const out: Expects = {};

  const required = strings(e["required"]);
  if (required) out.required = required;

  const match = strings(e["match"]);
  if (match) out.match = match;

  return out;
}

// ------------------------------------------------------------ what is permitted

/** Does this type resolve to one of these, or to anything below one? */
function is_one_of(graph: Graph, type: Id | undefined, allowed: Id[]): boolean {
  return isa(graph, type).some((d) => allowed.includes(d.id));
}

/** Whether a setting lets this type through. Absent is a yes: nobody said otherwise. */
export function permits(graph: Graph, setting: Allowed | undefined,
                        type?: Id): boolean {
  if (setting === undefined || setting === true) return true;
  if (setting === false) return false;
  return setting.length ? is_one_of(graph, type, setting) : false;
}

/** Whether this block may own a child of that definition. */
export function may_hold(graph: Graph, parent: Id, type?: Id): boolean {
  /** The kind answers first: a reference stands in for a block living elsewhere and a note is a
   *  remark about one, so neither holds blocks, whatever a vocabulary says of it. */
  const base = base_of(graph, parent);
  if (base === "reference" || base === "note") return false;
  return permits(graph, allows_of(graph, parent).holds, type);
}

/** Whether this block may have an interface of that definition seated on its wall. */
export function may_seat(graph: Graph, id: Id, type: Id = "interface"): boolean {
  return permits(graph, allows_of(graph, id).ports, type);
}

/** Whether this holder may take that block as a member. */
export function may_take(graph: Graph, holder: Id, type?: Id): boolean {
  return permits(graph, allows_of(graph, holder).members, type);
}

// ------------------------------------------------------------------- the review

/** What a block answers for one field name. */
function value_of(graph: Graph, id: Id, name: string): string | undefined {
  return graph.blocks[id]?.fields?.find((f) => f.name === name)?.value;
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

  for (const b of Object.values(graph.blocks)) {
    if (!holds_block(b.id)) continue;
    const allows = allows_of(graph, b.id);
    const expects = expects_of(graph, b.id);

    for (const name of expects.required ?? []) {
      if (!value_of(graph, b.id, name)) {
        notes.push({ kind: "required", id: b.id,
                     what: `"${label(graph, b.id)}" needs a value for ${name}` });
      }
    }

    /** The vocabulary's containment capability. */
    if (allows.holds !== undefined) {
      for (const child of children(graph, b.id)) {
        if (is_interface(child)) continue;
        if (!permits(graph, allows.holds, child.type)) {
          notes.push({ kind: "holds", id: child.id,
                       what: `"${label(graph, b.id)}" may not hold "${label(graph, child.id)}"` });
        }
      }
    }

    /** A wall that takes no interfaces, said about the ones already on it. */
    if (allows.ports !== undefined && !permits(graph, allows.ports, "interface")) {
      for (const child of children(graph, b.id)) {
        if (!is_interface(child)) continue;
        notes.push({ kind: "ports", id: child.id,
                     what: `"${label(graph, b.id)}" takes no interfaces` });
      }
    }

    /** Degree counts every relation meeting the block, in any layer. */
    if (allows.degree) {
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

    /** An edge has no `required`: it carries no values. */
    if (allows.ends) {
      end(notes, graph, e.id, "from", e.from, allows.ends.from, allows.ends.fromFlow);
      end(notes, graph, e.id, "to", e.to, allows.ends.to, allows.ends.toFlow);
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

/** A capability about an end walks through a port. */
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
