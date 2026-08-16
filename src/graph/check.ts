/** The one door a log comes in through.
 *
 *  Everything the app loads — from storage or from a file — is checked and
 *  normalised here first, and whatever could not be made sense of is reported
 *  rather than quietly folded into a broken graph.
 *
 *  This exists because a log written by one build and read by another is the
 *  normal case while the schema is still moving, and the failure mode without
 *  it is the worst kind: the log loads, the graph folds, and something far
 *  away throws with no clue where the bad data came from. Healing belongs at
 *  the door so no reader downstream has to guard itself. */

import type { Mutation, Step } from "./types";

/** Something a log said that this build could not take at face value. */
export type Fault = {
  /** Which step it was in, counting from one, for saying where. */
  step: number;
  op: string;
  why: string;
  /** Whether it was put right, or whether the mutation had to be dropped. */
  healed: boolean;
};

/** Operations this build knows how to fold — the live set and the retired one.
 *  Anything else is from a future build, or is not a log at all. */
const KNOWN = new Set([
  "checkpoint", "add_element", "update_element", "move_element", "place_element",
  "size_element", "delete_element", "set_body", "set_port", "mark_port", "set_axis",
  "relax_layer", "join_group", "leave_group", "set_field", "drop_field", "link_elements",
  "set_end", "update_edge", "set_dir", "set_form", "set_side", "flip_edge", "delete_edge",
  "set_def", "drop_def", "set_vocabulary",
]);

/** The closed sets were `element` on an element and `kind` on a relationship
 *  before both became `form`. The two names are folded into one here rather
 *  than in every reader — including inside a checkpoint, which carries a whole
 *  graph written in whatever shape its build used. */
function healForm(it: Record<string, unknown>, was: string): boolean {
  if (typeof it.form === "string" || typeof it[was] !== "string") return false;

  it.form = it[was];
  delete it[was];

  return true;
}

/** A relationship's forms were four before two of them turned out to be derived
 *  and one to be presentation.
 *
 *  `flow` is `directed` under the name of the thing the engine actually reasons
 *  about; `untyped` is `line`; `assoc` was a weaker mention drawn lighter, which
 *  is a definition's business, so it becomes a plain line and loses its weight;
 *  and `tie` is worked out from a note being at one end, so the stored word goes
 *  and nothing is lost. */
const EDGE_WAS: Record<string, string> = {
  flow: "directed", untyped: "line", assoc: "line", tie: "line",
};

function healEdgeForm(it: Record<string, unknown>): boolean {
  const held = typeof it.form === "string" ? EDGE_WAS[it.form] : undefined;
  if (!held) return false;

  it.form = held;

  return true;
}

/** `figure` was a fifth element form before ornament proved to be a block with
 *  a shape. Healed rather than dropped: a usage still sits where it sat, now as
 *  the form that draws it. */
function healElemForm(it: Record<string, unknown>): boolean {
  if (it.form !== "figure") return false;

  it.form = "block";

  return true;
}

/** An element carried a colour of its own before presentation belonged to the
 *  definition it names. Dropped rather than carried: nothing reads it, and a
 *  field nothing reads is written back out on every save forever. */
function healColour(it: Record<string, unknown>): boolean {
  if (!("color" in it)) return false;

  delete it.color;

  return true;
}

/** What each component says about its own key under a definition's
 *  `components` — the reason it is wrong, or null.
 *
 *  Registered rather than reached for: the door knows the shape of a log and
 *  nothing about what a card or a style means, and a component absent from the
 *  build has to leave its key alone rather than condemn it. That is what makes
 *  *unknown configuration is ignored, never fatal* true of a whole build and
 *  not only of one reader. */
const configs = new Map<string, (config: Record<string, unknown>) => string | null>();

/** Register a component's validator. Called by `modules`, never from here. */
export function validating(
  name: string, check: (config: Record<string, unknown>) => string | null,
): void {
  configs.set(name, check);
}

/** Check one definition's `components` bag, dropping every key that cannot be
 *  taken at face value and leaving the definition otherwise whole. What comes
 *  back is why each one went.
 *
 *  A key no component in this build claims is left exactly as it was: it is
 *  **unvalidated**, which is a newer package read by an older app, and the one
 *  thing that must not happen is the app deciding it is wrong.
 *
 *  A dropped key is not a broken definition. The component falls back to what
 *  it does with no configuration at all, which is the same thing it does for
 *  every definition that never mentioned it. */
function healComponents(def: Record<string, unknown>): string[] {
  if (!("components" in def)) return [];

  const bag = def.components;
  if (!bag || typeof bag !== "object" || Array.isArray(bag)) {
    delete def.components;

    return ["component configuration was not a set of keys"];
  }

  const wrong: string[] = [];

  for (const [name, config] of Object.entries(bag as Record<string, unknown>)) {
    const why = !config || typeof config !== "object" || Array.isArray(config)
      ? `\`${name}\` configuration was not a record`
      : configs.get(name)?.(config as Record<string, unknown>) ?? null;
    if (!why) continue;

    delete (bag as Record<string, unknown>)[name];
    wrong.push(why);
  }

  return wrong;
}

/** An attribute was a field before a field carried a form, and was held under
 *  `attrs`. Everything written then was text, which is what it becomes. */
function healFields(it: Record<string, unknown>): boolean {
  if (!Array.isArray(it.attrs)) return false;

  it.fields = it.attrs.map((a) => ({ form: "text", value: "", tags: [], ...(a as object) }));
  delete it.attrs;

  return true;
}

/** Every element and relationship inside a checkpoint's graph — and every
 *  definition in it, since a checkpoint carries a whole one. What comes back is
 *  why each repair was needed, so a dropped component still says which. */
function healGraph(graph: Record<string, unknown>): string[] {
  const why: string[] = [];
  let shaped = false;
  let figured = false;

  if (graph.defs && typeof graph.defs === "object") {
    for (const raw of Object.values(graph.defs as Record<string, unknown>)) {
      if (!raw || typeof raw !== "object") continue;
      const def = raw as Record<string, unknown>;
      figured = healElemForm(def) || figured;
      why.push(...healComponents(def));
    }
  }

  for (const [held, was] of [["elements", "element"], ["edges", "kind"]] as const) {
    const bag = graph[held];
    if (!bag || typeof bag !== "object") continue;

    for (const raw of Object.values(bag as Record<string, unknown>)) {
      if (!raw || typeof raw !== "object") continue;

      const it = raw as Record<string, unknown>;
      shaped = healForm(it, was) || shaped;
      if (held === "edges") shaped = healEdgeForm(it) || shaped;
      if (held === "elements") {
        shaped = healColour(it) || shaped;
        figured = healElemForm(it) || figured;
      }
      shaped = healFields(it) || shaped;
    }
  }

  if (figured) why.unshift("named the retired `figure` form; read it as a block");
  if (shaped) why.unshift("checkpoint was written before `form`");

  return why;
}

/** A relationship's name field was `relation` before it was `type`. Logs
 *  written either side of that rename both exist, and a build that reads one
 *  and not the other loses the name — or throws on it. */
function healEdge(edge: Record<string, unknown>): boolean {
  if (typeof edge.type === "string") return false;

  edge.type = typeof edge.relation === "string" ? edge.relation : "";

  return true;
}

/** Check and repair one mutation. Returns null where it cannot be kept. */
function pass(m: unknown, step: number, faults: Fault[]): Mutation | null {
  if (!m || typeof m !== "object") {
    faults.push({ step, op: "?", why: "not an operation", healed: false });

    return null;
  }

  const it = m as Record<string, unknown>;
  const op = typeof it.op === "string" ? it.op : "?";

  if (!KNOWN.has(op)) {
    faults.push({ step, op, why: "unknown operation — from a newer build?", healed: false });

    return null;
  }

  if ((op === "link_elements" || op === "link_nodes") && it.edge && typeof it.edge === "object") {
    const edge = it.edge as Record<string, unknown>;

    if (healEdge(edge)) {
      faults.push({ step, op, why: "relationship had no type; took its old `relation`",
                    healed: true });
    }
    if (healForm(edge, "kind")) {
      faults.push({ step, op, why: "relationship had a `kind`; read it as its form", healed: true });
    }
    if (healEdgeForm(edge)) {
      faults.push({ step, op, why: "relationship named a retired form; read it as a current one",
                    healed: true });
    }
  }

  // The same rename, where a form is set rather than given at creation.
  if (op === "set_form" && healEdgeForm(it)) {
    faults.push({ step, op, why: "relationship named a retired form; read it as a current one",
                  healed: true });
  }

  if (op === "add_element" && it.element && typeof it.element === "object") {
    const made = it.element as Record<string, unknown>;

    if (healForm(made, "element")) {
      faults.push({ step, op, why: "element named its own `element`; read it as its form",
                    healed: true });
    }
    if (healColour(made)) {
      faults.push({ step, op, why: "element carried its own colour; presentation is its definition's",
                    healed: true });
    }
    if (healFields(made)) {
      faults.push({ step, op, why: "element carried untyped `attrs`; read them as text fields",
                    healed: true });
    }
    if (healElemForm(made)) {
      faults.push({ step, op, why: "element named the retired `figure` form; read it as a block",
                    healed: true });
    }
  }

  if (op === "checkpoint" && it.graph && typeof it.graph === "object") {
    for (const why of healGraph(it.graph as Record<string, unknown>)) {
      faults.push({ step, op, why, healed: true });
    }
  }

  // A definition is where every component's configuration is held, so it is
  // the one place the door has to ask anybody else anything.
  if (op === "set_def") {
    if (healElemForm(it)) {
      faults.push({ step, op, why: "definition named the retired `figure` form; read it as a block",
                    healed: true });
    }
    for (const why of healComponents(it)) faults.push({ step, op, why, healed: true });
  }

  if (op === "update_edge" && typeof it.type !== "string") {
    it.type = typeof it.relation === "string" ? it.relation : "";
    faults.push({ step, op, why: "rename had no type; took its old `relation`", healed: true });
  }

  return it as Mutation;
}

/** Take a log in: check every step, repair what can be repaired, and say what
 *  could not be. A log that is not a log at all comes back as null. */
export function entering(raw: unknown): { steps: Step[]; faults: Fault[] } | null {
  if (!Array.isArray(raw)) return null;

  const faults: Fault[] = [];
  const steps: Step[] = [];

  raw.forEach((s, at) => {
    const step = at + 1;
    if (!s || typeof s !== "object" || !Array.isArray((s as Step).mutations)) {
      faults.push({ step, op: "—", why: "step has no operations", healed: false });

      return;
    }

    const it = s as Step;
    const kept = it.mutations
      .map((m) => pass(m, step, faults))
      .filter((m): m is Mutation => m !== null);

    steps.push({
      ...it,
      // A status that is neither counts as applied: dropping the step would
      // lose whatever it made, which is worse than showing it.
      status: it.status === "reverted" ? "reverted" : "applied",
      mutations: kept,
    });
  });

  return { steps, faults };
}

/** What to tell the user, or null where there is nothing worth saying.
 *
 *  Counted rather than listed: a log with four hundred faults of one kind is
 *  one thing wrong, and four hundred lines says it four hundred times. */
export function report(faults: Fault[]): string | null {
  if (!faults.length) return null;

  const healed = faults.filter((f) => f.healed).length;
  const lost = faults.length - healed;
  const kinds = [...new Set(faults.map((f) => f.why))].slice(0, 2).join("; ");
  const said = [
    healed ? `repaired ${healed}` : "",
    lost ? `could not read ${lost}` : "",
  ].filter(Boolean).join(", ");

  return `This project needed attention: ${said}. ${kinds}.`;
}
