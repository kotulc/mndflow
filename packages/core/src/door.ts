/** The one door a log comes in through. */

import { component } from "./components";
import { all_defs, def_at, is_base, package_of, packages } from "./defs";
import { fold, type Floor } from "./fold";
import { covers, inside, lattice_of, one_side, overlaps } from "./holders";
import { subtree } from "./tree";
import { new_id } from "./ids";
import { MAIN, type Graph, type Grid, type Id, type Log, type Mutation, type Span,
         type Step } from "./types";

export type Fault = {
  kind: "repaired" | "dropped";
  what: string;
};

export type Checked = {
  log: Log;
  faults: Fault[];
};

export type Inspection = { faults: Fault[]; repairs: Mutation[] };

const OPS = new Set<string>([
  "checkpoint", "add_block", "update_block", "delete_block", "move_block",
  "place_block", "order_block", "set_alias", "set_counter", "size_block",
  "set_body", "set_schema", "seat_cell", "set_grid", "link_blocks",
  "update_edge", "delete_edge", "set_dir", "flip_edge", "set_end", "set_port",
  "set_side", "mark_port", "set_value", "drop_value", "order_values", "set_source",
  "set_tags", "set_traits", "set_setting", "drop_settings",
]);

/** Read a log in, repairing what it can. Nothing writes into the shipped floor. */
export function check(input: unknown, floor: Floor = []): Checked {
  const faults: Fault[] = [];
  if (!Array.isArray(input)) return { log: [], faults: [{ kind: "dropped", what: "not a log" }] };

  const shipped = new Set(floor.map((b) => b.id));
  const log: Log = [];
  let taken = 0;
  for (const raw of input) {
    const step = read_step(raw, faults);
    if (!step) continue;
    const kept = step.mutations.filter((m) => {
      const ours = shipped.has(written(m) ?? "");
      if (ours) taken++;
      return !ours;
    });
    log.push(kept.length === step.mutations.length ? step : { ...step, mutations: kept });
  }
  if (taken) faults.push({ kind: "repaired", what: `${plural(taken, "write")} to a shipped package` });

  const mend = inspect(fold(log, floor));
  faults.push(...mend.faults);
  if (mend.repairs.length) log.push(repair_step(log.length, mend.repairs));
  return { log, faults };
}

/** The block a mutation writes, where it names one. */
function written(m: Mutation): Id | undefined {
  if (m.op === "add_block") return m.block.id;
  return "id" in m ? m.id : undefined;
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

function repair_step(at: number, mutations: Mutation[]): Step {
  return { id: new_id("step"), action: "repair", at, status: "applied", mutations };
}

/** What the door enforces: what is wrong and the mutations that mend it. */
export function inspect(graph: Graph): Inspection {
  const faults: Fault[] = [];
  const repairs: Mutation[] = [];
  const name = (id: Id) => graph.blocks[id]?.name ?? id;
  /** A fault and its mend; an empty `what` mends without saying twice. */
  const say = (kind: Fault["kind"], what: string, ...mend: Mutation[]) => {
    if (what) faults.push({ kind, what });
    repairs.push(...mend);
  };

  if (!graph.blocks[graph.root]) {
    say("repaired", "a missing root",
        { op: "add_block", block: { id: graph.root, parent: null, name: "workspace" } });
  }

  /** Every block sits under something that is there, and never under itself: a definition goes
   *  home to the workspace's domain, a usage to `main` where there is one. A package root sits
   *  under nothing. */
  const home = (id: Id) => (graph.blocks[id]?.def || !graph.blocks[MAIN] ? graph.root : MAIN);
  for (const b of Object.values(graph.blocks)) {
    if (b.parent === null) continue;
    if (!graph.blocks[b.parent]) {
      say("repaired", `"${name(b.id)}" had no parent`,
          { op: "move_block", id: b.id, parent: home(b.id) });
    } else if (subtree(graph, b.id).includes(b.parent)) {
      say("repaired", `"${name(b.id)}" contained itself`,
          { op: "move_block", id: b.id, parent: home(b.id) });
    }
  }

  /** Every relation has a block at both ends, and any part it names is there. */
  for (const e of Object.values(graph.edges)) {
    if (!graph.blocks[e.from] || !graph.blocks[e.to]) {
      say("dropped", "a relation with an end that is not there", { op: "delete_edge", id: e.id });
      continue;
    }
    for (const end of ["from", "to"] as const) {
      const part = end === "from" ? e.fromPart : e.toPart;
      if (part && !graph.blocks[part]) {
        say("repaired", "a relation named a part that is not there",
            { op: "set_end", id: e.id, end, port: e[end], part: null });
      }
    }
  }

  cells(graph, name, say);
  settings(graph, name, say);
  definitions(graph, say);
  named_defs(graph, say);
  named_packages(graph, say);
  return { faults, repairs };
}

type Say = (kind: Fault["kind"], what: string, ...mend: Mutation[]) => void;

/** A seated block sits in a grid, inside its extent, one to a cell; and a lattice says only what
 *  its extent can carry. A repair unseats, never deletes. */
function cells(graph: Graph, name: (id: Id) => string, say: Say): void {
  const taken = new Set<string>();
  for (const b of Object.values(graph.blocks)) {
    if (!b.cell) continue;
    const g = lattice_of(graph, b.parent ?? undefined);
    if (!g) {
      say("repaired", `"${name(b.id)}" had a cell outside a grid`, { op: "seat_cell", id: b.id, cell: null });
      continue;
    }
    const { r, c } = b.cell;
    const outside = !inside(g, b.cell);
    const at = g.merges?.find((s) => covers(s, r, c));
    const key = `${b.parent}|${at ? at.r : r}|${at ? at.c : c}`;
    if (outside || taken.has(key)) {
      say("repaired", `"${name(b.id)}" sat ${outside ? "outside" : "on top of something in"} "${name(b.parent!)}"`,
          { op: "seat_cell", id: b.id, cell: null });
      continue;
    }
    taken.add(key);
  }

  /** One lattice is mended in one write, so no mend undoes another. */
  for (const b of Object.values(graph.blocks)) {
    if (!b.grid) continue;
    const mended = fitted(graph, b.grid);
    if (mended.grid === b.grid) continue;
    if (mended.dropped) say("dropped", `${plural(mended.dropped, "merge")} "${name(b.id)}" could not hold`);
    say("repaired", mended.said ? `"${name(b.id)}" said more of its cells than it holds` : "",
        { op: "set_grid", id: b.id, grid: mended.grid });
  }
}

/** A setting its component refuses is dropped, on a definition or an element alike. */
function settings(graph: Graph, name: (id: Id) => string, say: Say): void {
  for (const it of [...Object.values(graph.blocks), ...Object.values(graph.edges)]) {
    for (const [key, config] of Object.entries(it.settings ?? {})) {
      const c = component(key);
      if (!c || !config || typeof config !== "object") continue;
      for (const [prop, value] of Object.entries(config)) {
        if (!c.check({ [prop]: value })) continue;
        say("dropped", `"${name(it.id)}" said ${key}.${prop}, which nothing reads`,
            { op: "set_setting", id: it.id, key, name: prop, value: null });
      }
    }
  }
}

/** Every definition is named, and extends something that is there — or a base, which every
 *  build ships whether or not it is laid. */
function definitions(graph: Graph, say: Say): void {
  for (const d of all_defs(graph)) {
    if (!d.name?.trim()) {
      say("repaired", "a definition had no name", { op: "update_block", id: d.id, name: d.id });
    }
    if (d.type && !def_at(graph, d.type) && !is_base(d.type)) {
      say("repaired", `"${d.name}" extended something that is not there`,
          { op: "update_block", id: d.id, type: null });
    }
  }
}

/** A definition is found by its name, so no two in one package may share one: definitions, tags
 *  and traits share the name space. */
function named_defs(graph: Graph, say: Say): void {
  const taken = new Set<string>();
  for (const d of all_defs(graph).sort((a, z) => a.id.localeCompare(z.id))) {
    if (!d.name?.trim()) continue;
    const slot = `${package_of(graph, d.id)}|`;
    if (!taken.has(slot + d.name)) { taken.add(slot + d.name); continue; }
    let name = d.name;
    for (let n = 2; taken.has(slot + name); n++) name = `${d.name} ${n}`;
    say("repaired", `two definitions were called "${d.name}"`,
        { op: "update_block", id: d.id, name });
    taken.add(slot + name);
  }
}

/** A package is found by its name, so no two may share one. The later one is renamed rather than
 *  dropped: what it brought is still wanted. */
function named_packages(graph: Graph, say: Say): void {
  const taken = new Set<string>();
  for (const p of packages(graph).sort((a, z) => a.id.localeCompare(z.id))) {
    const was = p.name ?? p.id;
    if (!taken.has(was)) { taken.add(was); continue; }
    let name = was;
    for (let n = 2; taken.has(name); n++) name = `${was} ${n}`;
    say("repaired", `two packages were called "${was}"`, { op: "update_block", id: p.id, name });
    taken.add(name);
  }
}

/** What is wrong with a graph, without mending it. */
export function validate(graph: Graph): Fault[] {
  return inspect(graph).faults;
}

/** What to say, once. Empty when nothing was wrong. */
export function say(faults: Fault[]): string {
  const repaired = faults.filter((f) => f.kind === "repaired").length;
  const dropped = faults.filter((f) => f.kind === "dropped").length;
  const parts: string[] = [];
  if (repaired) parts.push(`repaired ${repaired}`);
  if (dropped) parts.push(`could not read ${dropped}`);
  return parts.join(", ");
}

/** A lattice with a whole extent, merges inside it that neither overlap nor cross a header line,
 *  and only the values, schema and cell size it can carry; the same lattice where it already is. */
function fitted(graph: Graph, g: Grid): { grid: Grid; dropped: number; said: boolean } {
  const whole = (n: unknown) => typeof n === "number" && Number.isInteger(n) && n > 0;
  const rows = whole(g.rows) ? g.rows : 1;
  const cols = whole(g.cols) ? g.cols : 1;
  const sized: Grid = { ...g, rows, cols };

  /** A merge may not reach from a header into the body. */
  const kept: Span[] = [];
  for (const s of g.merges ?? []) {
    const sane = s.rows > 0 && s.cols > 0 && s.r >= 0 && s.c >= 0
              && s.r + s.rows <= rows && s.c + s.cols <= cols && one_side(s);
    if (sane && !kept.some((k) => overlaps(k, s))) kept.push(s);
  }
  const dropped = (g.merges ?? []).length - kept.length;

  const { values, schema, size, merges: _m, ...rest } = sized;
  const strings = Array.isArray(values)
    && values.every((row) => Array.isArray(row) && row.every((v) => typeof v === "string"));
  const trimmed = strings ? values!.slice(0, rows).map((row) => row.slice(0, cols)) : undefined;
  const cell = !!size && [size.w, size.h].every(whole);
  const named = !!schema && !!def_at(graph, schema);
  const same_values = values === undefined || (!!trimmed && trimmed.length === values.length
    && trimmed.every((row, n) => row.length === values[n]!.length));
  const said = !same_values || (schema !== undefined && !named) || (size !== undefined && !cell);

  if (!said && !dropped && rows === g.rows && cols === g.cols) return { grid: g, dropped, said };
  return { grid: { ...rest, ...(kept.length ? { merges: kept } : {}),
                   ...(trimmed ? { values: trimmed } : {}), ...(named ? { schema } : {}),
                   ...(cell ? { size } : {}) },
           dropped, said };
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
