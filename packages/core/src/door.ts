/** The one door a log comes in through.
 *
 *  Every log is checked before it is folded, from storage or from a file. What
 *  can be repaired is repaired; what cannot is dropped rather than folded into
 *  a broken graph. The user is told once, and a clean log says nothing.
 *
 *  **A repair is a step, not a patched graph.** The graph is derived, so
 *  mending one mends nothing — the next fold would undo it. Repairs come back
 *  as ordinary mutations and are appended like any other work, which also makes
 *  them visible and undoable.
 *
 *  A normalisation that carried nothing is not a repair — a false alarm is what
 *  teaches people to ignore the real ones. */

import { unreadable } from "./components";
import { fold, subtree } from "./fold";
import { new_id } from "./ids";
import { ROOT, type Definition, type Graph, type Id, type Log, type Mutation, type Step }
  from "./types";

export type Fault = {
  kind: "repaired" | "dropped";
  what: string;
};

export type Checked = {
  log: Log;
  faults: Fault[];
};

const OPS = new Set<string>([
  "checkpoint", "add_block", "update_block", "delete_block", "move_block",
  "place_block", "order_block", "size_block", "set_body", "join_group", "leave_group", "link_blocks", "update_edge",
  "delete_edge", "set_dir", "set_form", "flip_edge", "set_end", "set_port", "set_side",
  "mark_port", "set_field", "drop_field", "set_def", "drop_def", "set_arrangement",
]);

/** Read a log in, repairing what it can. */
export function check(input: unknown): Checked {
  const faults: Fault[] = [];
  if (!Array.isArray(input)) return { log: [], faults: [{ kind: "dropped", what: "not a log" }] };

  const log: Log = [];
  for (const raw of input) {
    const step = read_step(raw, faults);
    if (step) log.push(step);
  }

  const mend = inspect(fold(log));
  faults.push(...mend.faults);
  if (mend.repairs.length) log.push(repair_step(log.length, mend.repairs));
  return { log, faults };
}

function repair_step(at: number, mutations: Mutation[]): Step {
  return { id: new_id("step"), action: "repair", at, status: "applied", mutations };
}

function read_step(raw: unknown, faults: Fault[]): Step | null {
  if (!raw || typeof raw !== "object") {
    faults.push({ kind: "dropped", what: "a step that is not an object" });
    return null;
  }
  const s = raw as Partial<Step>;
  if (typeof s.id !== "string" || !Array.isArray(s.mutations)) {
    faults.push({ kind: "dropped", what: "a step with no id or no mutations" });
    return null;
  }
  const kept: Mutation[] = [];
  for (const m of s.mutations) {
    if (m && typeof m === "object" && OPS.has((m as Mutation).op)) kept.push(m as Mutation);
    else faults.push({ kind: "dropped", what: "an op this build does not know" });
  }
  return {
    id: s.id,
    action: typeof s.action === "string" ? s.action : "unknown",
    at: typeof s.at === "number" ? s.at : 0,
    status: s.status === "reverted" ? "reverted" : "applied",
    mutations: kept,
  };
}

export type Inspection = { faults: Fault[]; repairs: Mutation[] };

/** What the door enforces. Reports what is wrong and how to mend it, and
 *  changes nothing itself. */
export function inspect(graph: Graph): Inspection {
  const faults: Fault[] = [];
  const repairs: Mutation[] = [];
  const name = (id: Id) => graph.blocks[id]?.label ?? id;

  if (!graph.blocks[graph.root]) {
    faults.push({ kind: "repaired", what: "a missing root" });
    repairs.push({ op: "add_block",
      block: { id: graph.root, parent: null, label: "workspace", type: "folder" } });
  }

  for (const b of Object.values(graph.blocks)) {
    if (b.id === graph.root) continue;
    if (b.parent === null || !graph.blocks[b.parent]) {
      faults.push({ kind: "repaired", what: `"${name(b.id)}" had no parent` });
      repairs.push({ op: "move_block", id: b.id, parent: ROOT });
      continue;
    }
    if (subtree(graph, b.id).includes(b.parent)) {
      faults.push({ kind: "repaired", what: `"${name(b.id)}" contained itself` });
      repairs.push({ op: "move_block", id: b.id, parent: ROOT });
    }
  }

  for (const [id, e] of Object.entries(graph.edges)) {
    if (!graph.blocks[e.from] || !graph.blocks[e.to]) {
      faults.push({ kind: "dropped", what: "a relation with an end that is not there" });
      repairs.push({ op: "delete_edge", id });
    }
  }

  /** One definition, one repair. Filing, extension and every component key it
   *  claims are three separate faults and one mended record — two `set_def`s
   *  for the same definition would leave the later one undoing the earlier. */
  for (const d of Object.values(graph.defs)) {
    let mended = d;
    if (!graph.blocks[d.home]) {
      faults.push({ kind: "repaired", what: `"${d.name}" was filed under nothing` });
      mended = { ...mended, home: ROOT };
    }
    if (d.extends && !graph.defs[d.extends]) {
      faults.push({ kind: "repaired", what: `"${d.name}" extended something that is not there` });
      mended = { ...mended, extends: undefined };
    }
    /** **A component validates its own key and no other's**, so what it
     *  refuses is dropped and only that key. An unknown component is left
     *  alone — unvalidated rather than wrong, which is how this build opens a
     *  package a later one wrote. */
    for (const { key, why } of unreadable(d)) {
      faults.push({ kind: "dropped", what: `"${d.name}" said ${why}` });
      mended = { ...mended, components: without(mended.components, key) };
    }
    if (mended !== d) repairs.push({ op: "set_def", def: mended });
  }

  return { faults, repairs };
}

/** A definition's components without one key, and no `components` at all once
 *  the last one goes — nothing still at its default is written. */
function without(components: Definition["components"], key: string): Definition["components"] {
  const out = { ...components };
  delete out[key];
  return Object.keys(out).length ? out : undefined;
}

/** What is wrong with a graph. The door's question without its answer: a
 *  caller may ask what a graph violates, and mending it stays the engine's. */
export function validate(graph: Graph): Fault[] {
  return inspect(graph).faults;
}

/** What to say, once. Empty when the log was clean. */
export function say(faults: Fault[]): string {
  if (faults.length === 0) return "";
  const repaired = faults.filter((f) => f.kind === "repaired").length;
  const dropped = faults.filter((f) => f.kind === "dropped").length;
  const parts: string[] = [];
  if (repaired) parts.push(`repaired ${repaired}`);
  if (dropped) parts.push(`could not read ${dropped}`);
  return parts.join(", ");
}

/** Names are unique among siblings. Only stored labels compare — a fallback is
 *  a number nobody chose, and blank is not a name. */
export function name_taken(graph: Graph, parent: Id | null, label: string, except?: Id): boolean {
  const want = label.trim();
  if (!want) return false;
  return Object.values(graph.blocks).some(
    (b) => b.parent === parent && b.id !== except && b.label?.trim() === want,
  );
}
