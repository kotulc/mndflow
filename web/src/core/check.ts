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
  "relax_layer", "join_group", "leave_group", "set_attr", "drop_attr", "link_elements",
  "set_end", "update_edge", "set_dir", "set_kind", "set_side", "flip_edge", "delete_edge",
  "set_domain", "add_relation", "rename_relation", "drop_relation",
  // Retired, still folded.
  "add_node", "update_node", "move_node", "place_node", "delete_node", "link_nodes",
  "set_template", "set_title", "add_attr", "update_attr", "place_attr", "attach_attr",
  "detach_attr", "delete_attr", "route_edge",
]);

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
    if (healEdge(it.edge as Record<string, unknown>)) {
      faults.push({ step, op, why: "relationship had no type; took its old `relation`",
                    healed: true });
    }
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
