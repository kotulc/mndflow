/** The one door a log comes in through. */

import { component, unreadable } from "./components";
import { block_base, isa, outside, relation_base, shipped } from "./defs";
import { fold } from "./fold";
import { can_hold, covers, inside, is_holder, lattice_of, one_side, overlaps } from "./holders";
import { subtree } from "./tree";
import { new_id } from "./ids";
import { ROOT, type Graph, type Grid, type Id, type Log, type Mutation, type Span,
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
  "place_block", "order_block", "set_alias", "set_counter", "set_pinned", "set_shelf", "size_block", "set_body", "set_about",
  "set_group", "seat_cell", "set_grid", "link_blocks",
  "update_edge", "delete_edge", "set_dir", "flip_edge", "set_end", "set_port",
  "set_side", "mark_port", "set_field", "drop_field", "order_fields", "set_def", "drop_def",
  "set_package", "drop_package", "set_source",
  "set_arrangement", "set_tags", "set_look", "drop_looks",
]);

/** Read a log in, repairing what it can. */
export function check(input: unknown, floor: Graph["defs"] = {}): Checked {
  const faults: Fault[] = [];
  if (!Array.isArray(input)) return { log: [], faults: [{ kind: "dropped", what: "not a log" }] };

  const log: Log = [];
  let taken = 0;
  for (const raw of input) {
    const step = read_step(raw, faults);
    if (!step) continue;
    const kept = step.mutations.filter((m) => {
      const ours = (m.op === "set_def" && floor[m.def.id]) || (m.op === "drop_def" && floor[m.id]);
      if (ours) taken++;
      return !ours;
    });
    log.push(kept.length === step.mutations.length ? step : { ...step, mutations: kept });
  }
  if (taken) faults.push({ kind: "repaired", what: `${plural(taken, "write")} to a shipped definition` });

  const mend = inspect(fold(log, floor));
  faults.push(...mend.faults);
  if (mend.repairs.length) log.push(repair_step(log.length, mend.repairs));
  return { log, faults };
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
        { op: "add_block", block: { id: graph.root, parent: null, name: "workspace", type: "folder" } });
  }

  /** Every block sits under something that is there, and never under itself. */
  for (const b of Object.values(graph.blocks)) {
    if (b.id === graph.root) continue;
    if (b.parent === null || !graph.blocks[b.parent]) {
      say("repaired", `"${name(b.id)}" had no parent`, { op: "move_block", id: b.id, parent: ROOT });
    } else if (subtree(graph, b.id).includes(b.parent)) {
      say("repaired", `"${name(b.id)}" contained itself`, { op: "move_block", id: b.id, parent: ROOT });
    }
  }

  /** Every relation has a block at both ends. */
  for (const e of Object.values(graph.edges)) {
    if (!graph.blocks[e.from] || !graph.blocks[e.to]) {
      say("dropped", "a relation with an end that is not there", { op: "delete_edge", id: e.id });
    }
  }

  cells(graph, name, say);
  looks(graph, name, say);
  definitions(graph, say);
  named_defs(graph, say);
  named_packages(graph, say);
  return { faults, repairs };
}

type Say = (kind: Fault["kind"], what: string, ...mend: Mutation[]) => void;

/** Membership on the block's own layer, in something that may hold it; one block per cell,
 *  inside its grid; and a lattice that says only what its extent can carry. **A block that stops
 *  holding keeps what it held, dormant**, so taking a capability away and giving it back loses
 *  nothing. */
function cells(graph: Graph, name: (id: Id) => string, say: Say): void {
  const taken = new Set<string>();
  for (const b of Object.values(graph.blocks)) {
    if (!b.group) {
      if (b.cell) say("repaired", `"${name(b.id)}" had a cell and no group`, { op: "seat_cell", id: b.id, cell: null });
      continue;
    }
    const h = graph.blocks[b.group];
    const wrong = !h || h.parent !== b.parent || (is_holder(graph, h.id) && !can_hold(graph, h.id, b.id));
    if (wrong) {
      say("repaired", `"${name(b.id)}" was in a group that cannot hold it`, { op: "set_group", id: b.id, group: null });
      continue;
    }
    /** A member of a grid sits in a cell, or it is not a member at all. */
    const g = lattice_of(graph, b.group);
    if (!g) continue;
    if (!b.cell) {
      say("repaired", `"${name(b.id)}" was in "${name(b.group)}" with no cell`,
          { op: "set_group", id: b.id, group: null });
      continue;
    }
    const { r, c } = b.cell;
    const outside = !inside(g, b.cell);
    const at = g.merges?.find((s) => covers(s, r, c));
    const key = `${b.group}|${at ? at.r : r}|${at ? at.c : c}`;
    if (outside || taken.has(key)) {
      say("repaired", `"${name(b.id)}" sat ${outside ? "outside" : "on top of something in"} "${name(b.group)}"`,
          { op: "set_group", id: b.id, group: null });
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

/** An element's own look property that its component refuses is dropped. */
function looks(graph: Graph, name: (id: Id) => string, say: Say): void {
  for (const it of [...Object.values(graph.blocks), ...Object.values(graph.edges)]) {
    for (const [key, config] of Object.entries(it.looks ?? {})) {
      const c = component(key);
      if (!c || !config || typeof config !== "object") continue;
      for (const [prop, value] of Object.entries(config)) {
        if (!c.check({ [prop]: value })) continue;
        say("dropped", `"${name(it.id)}" said ${key}.${prop}, which nothing reads`,
            { op: "set_look", id: it.id, key, name: prop, value: null });
      }
    }
  }
}

/** One mended record per definition: extends something that is there, only readable components, a
 *  default only for its own kind, and one per kind. */
function definitions(graph: Graph, say: Say): void {
  const claimed = new Set<string>();
  for (const d of Object.values(graph.defs).sort((a, z) => a.id.localeCompare(z.id))) {
    let mended = d;
    if (mended.extends && !graph.defs[mended.extends]) {
      say("repaired", `"${d.name}" extended something that is not there`);
      mended = { ...mended, extends: undefined };
    }
    for (const { key, why } of unreadable(mended)) {
      say("dropped", `"${d.name}" said ${why}`);
      const components = { ...mended.components };
      delete components[key];
      mended = { ...mended, components: Object.keys(components).length ? components : undefined };
    }
    /** **What it stands in for is whatever outside definition it extends** — a base, or a
     *  package's. Reading it as a base alone stripped the marker off every word about a
     *  package's definition, which then quietly stopped standing in front of it. */
    if (mended.default !== undefined) {
      const stood = graph.defs[mended.default];
      const slot = `${mended.group}:${mended.default}`;
      const why = mended.from ? "a package's definition cannot be a default"
        : !stood ? "there is nothing of that name to stand in for"
        : !outside(stood) ? `"${stood.name}" is the workspace's own`
        : !isa(graph, mended.extends).some((up) => up.id === mended.default)
          ? `it does not extend "${stood.name}"`
        : claimed.has(slot) ? `another definition already is` : null;
      if (why) {
        say("dropped", `"${d.name}" claimed the ${mended.default} default — ${why}`);
        mended = { ...mended, default: undefined };
      } else claimed.add(slot);
    }
    if (!mended.from && !shipped(mended) && !mended.extends) {
      const base = mended.default
        ?? (mended.group === "relation" ? relation_base(graph, undefined) : block_base(graph, undefined));
      if (graph.defs[base] && base !== mended.id) {
        say("repaired", `"${d.name}" now extends the ${base} base`);
        mended = { ...mended, extends: base };
      }
    }
    if (mended !== d) say("repaired", "", { op: "set_def", def: mended });
  }
}

/** A definition is found by its name within its own source, so no two there may share one.
 *  **A workspace definition may wear a base's or a package's name** — that is exactly how a word
 *  about one is written — but never another of its own, or `def_named` cannot say which was
 *  meant. A default keeps its name, so it claims its slot first and the other one is renamed. */
function named_defs(graph: Graph, say: Say): void {
  const taken = new Set<string>();
  const order = Object.values(graph.defs)
    .sort((a, z) => Number(a.default === undefined) - Number(z.default === undefined)
                    || a.id.localeCompare(z.id));
  for (const d of order) {
    const slot = `${d.group}|${d.from ?? ""}|`;
    if (!taken.has(slot + d.name)) { taken.add(slot + d.name); continue; }
    let name = d.name;
    for (let n = 2; taken.has(slot + name); n++) name = `${d.name} ${n}`;
    say("repaired", `two ${d.group} definitions were called "${d.name}"`,
        { op: "set_def", def: { ...d, name } });
    taken.add(slot + name);
  }
}

/** A package is found by its name, so no two may share one. The later one is renamed rather than
 *  dropped: what it brought is still wanted. */
function named_packages(graph: Graph, say: Say): void {
  const taken = new Set<string>();
  for (const p of Object.values(graph.packages).sort((a, z) => a.id.localeCompare(z.id))) {
    if (!taken.has(p.name)) { taken.add(p.name); continue; }
    let name = p.name;
    for (let n = 2; taken.has(name); n++) name = `${p.name} ${n}`;
    say("repaired", `two packages were called "${p.name}"`,
        { op: "set_package", pkg: { ...p, name } });
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
              && s.r + s.rows <= rows && s.c + s.cols <= cols && one_side(sized, s);
    if (sane && !kept.some((k) => overlaps(k, s))) kept.push(s);
  }
  const dropped = (g.merges ?? []).length - kept.length;

  const { values, schema, size, merges: _m, ...rest } = sized;
  const strings = Array.isArray(values)
    && values.every((row) => Array.isArray(row) && row.every((v) => typeof v === "string"));
  const trimmed = strings ? values!.slice(0, rows).map((row) => row.slice(0, cols)) : undefined;
  const cell = !!size && [size.w, size.h].every(whole);
  const named = !!schema && !!graph.defs[schema];
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
