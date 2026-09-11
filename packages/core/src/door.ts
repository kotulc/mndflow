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
import { alias_kind, covers, fold, can_hold, is_grid, module_named, overlaps,
         subtree } from "./fold";
import { new_id } from "./ids";
import { ROOT, type Block, type Definition, type Graph, type Id, type Log, type Mutation,
         type Span, type Step } from "./types";

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
  "place_block", "order_block", "set_alias", "set_counter", "size_block", "set_body",
  "set_group", "seat_cell",
  "set_grid", "merge_cells", "split_cells", "set_header", "link_blocks", "update_edge",
  "delete_edge", "set_dir", "set_form", "flip_edge", "set_end", "set_port", "set_side",
  "mark_port", "set_field", "drop_field", "set_def", "drop_def", "set_arrangement",
  "set_tags", "set_look", "drop_looks",
]);

/** Read a log in, repairing what it can.
 *
 *  **Nothing the floor ships may be written by a log.** A stored `set_def` for
 *  a shipped id is dropped on the way in — that is how a private copy of `base`
 *  got into every workspace and stayed there, outliving every change the build
 *  made to it. Stripped here rather than reconciled on open, so the bad state
 *  has nowhere to exist rather than being repaired once it does.
 *
 *  A workspace wanting its own `block` says so with a subtype that extends the
 *  shipped one. That is a different id, and it passes untouched. */
export function check(input: unknown, floor: Graph["defs"] = {}): Checked {
  const faults: Fault[] = [];
  if (!Array.isArray(input)) return { log: [], faults: [{ kind: "dropped", what: "not a log" }] };

  const log: Log = [];
  let taken = 0;
  const tally = { moved: 0 };
  for (const raw of input) {
    const step = read_step(raw, faults, tally);
    if (!step) continue;
    const kept = step.mutations.filter((m) => {
      const shipped = (m.op === "set_def" && floor[m.def.id])
                   || (m.op === "drop_def" && floor[m.id]);
      if (shipped) taken++;
      return !shipped;
    });
    if (kept.length !== step.mutations.length) log.push({ ...step, mutations: kept });
    else log.push(step);
  }
  if (taken) {
    faults.push({ kind: "repaired",
                  what: `${taken} write${taken > 1 ? "s" : ""} to a shipped definition` });
  }
  if (tally.moved) {
    faults.push({ kind: "repaired",
                  what: `${tally.moved} block${tally.moved > 1 ? "s" : ""} written before `
                      + "`label` became `name`" });
  }

  /** **A repair the door itself got wrong, put back.** The style vocabulary was
   *  renamed key for key; a build between the two could not read the old words
   *  and dropped the whole component — *and wrote the drop into the log*, which
   *  is what makes this recoverable at all: what it dropped is still in the step
   *  before it. Put back here, and renamed by `inspect` below in the same load. */
  const back = restored(log);
  if (back) {
    faults.push({ kind: "repaired",
                  what: `${back} look${back > 1 ? "s" : ""} an older build had dropped` });
  }

  const mend = inspect(fold(log, floor));
  faults.push(...mend.faults);
  if (mend.repairs.length) log.push(repair_step(log.length, mend.repairs));
  return { log, faults };
}

/** Every component bag a repair step took off a definition, given back — in
 *  place, because a repair is the app's own writing and not anybody's intent.
 *
 *  **Only the keys that were renamed**, and only where the record it replaced
 *  had one: a repair that dropped something genuinely malformed drops it again
 *  a few lines below, and says so. */
function restored(log: Log): number {
  const held = new Map<Id, Definition>();
  let back = 0;
  for (const step of log) {
    for (const m of step.mutations) {
      if (m.op !== "set_def") continue;
      const was = held.get(m.def.id);
      if (was && step.action === "repair") {
        for (const key of Object.keys(RENAMED)) {
          if (m.def.components?.[key] !== undefined) continue;
          const dropped = was.components?.[key];
          if (dropped === undefined) continue;
          m.def.components = { ...m.def.components, [key]: dropped };
          back++;
        }
      }
      held.set(m.def.id, m.def);
    }
  }
  return back;
}

function repair_step(at: number, mutations: Mutation[]): Step {
  return { id: new_id("step"), action: "repair", at, status: "applied", mutations };
}

/** **`label` became `name` and `num` became `order`**, and both are read here
 *  rather than mended below, because a mutation carries them: by the time a
 *  graph exists to inspect, an old `add_block` has already laid down a block
 *  with neither field, and there is nothing left to rename.
 *
 *  **Only where the word means a block.** `card.label` is a component key and
 *  says where the *type word* sits, which is a different thing that kept its
 *  name — so this reaches into `add_block`, `update_block` and `order_block`
 *  and nowhere near a `set_look` or a `set_def`. A checkpoint carries whole
 *  blocks, so it is walked too. */
function renamed(m: Record<string, unknown>): boolean {
  const on = (o: unknown): boolean => {
    if (!o || typeof o !== "object") return false;
    const b = o as Record<string, unknown>;
    let did = false;
    if ("label" in b && !("name" in b)) { b["name"] = b["label"]; delete b["label"]; did = true; }
    if ("num" in b && !("order" in b)) { b["order"] = b["num"]; delete b["num"]; did = true; }
    return did;
  };
  switch (m["op"]) {
    case "add_block": return on(m["block"]);
    case "update_block": case "order_block": return on(m);
    case "checkpoint": {
      const g = m["graph"] as { blocks?: Record<string, unknown> } | undefined;
      let did = false;
      for (const b of Object.values(g?.blocks ?? {})) did = on(b) || did;
      return did;
    }
    default: return false;
  }
}

function read_step(raw: unknown, faults: Fault[], tally: { moved: number }): Step | null {
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
    if (m && typeof m === "object" && OPS.has((m as Mutation).op)) {
      if (renamed(m as Record<string, unknown>)) tally.moved++;
      kept.push(m as Mutation);
    }
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
/** Every element given a handle, and the counters left past the highest one.
 *
 *  **Renumbered per kind, in the order they were made.** Handles used to run
 *  one workspace-wide sequence whose letter was only the high digit; they now
 *  run a counter per kind, so an existing serial means nothing under the new
 *  scheme and every one is handed out again. A workspace written before handles
 *  reached relationships gets them here too.
 *
 *  **Ordered by the serial already carried**, falling back to the id, so a
 *  renumbering is stable across folds and two loads of one file agree. */
function handed_out(graph: Graph): Mutation[] {
  const out: Mutation[] = [];
  const counts: Record<string, number> = {};
  /** **All or nothing, and the graph says which.** A graph that hands out
   *  handles at all gets one for every element — gaps are how a workspace ended
   *  up with lettered blocks beside blank groups, notes and lines, because each
   *  kind mints on its own path and not every path had been taught to.
   *
   *  A graph that has never handed one out — a fixture, a translator's, an
   *  import — is left alone. Minting for those would make the door rewrite
   *  every graph it ever read, and no file would round-trip. */
  const held: { id: Id; alias?: number }[] = [
    ...Object.values(graph.blocks).filter((b) => b.id !== graph.root),
    ...Object.values(graph.edges),
  ];
  const uses = held.some((it) => typeof it.alias === "number")
    || !!graph.blocks[graph.root]?.counters;
  if (!uses) return [];
  const order = [...held].sort((a, z) =>
    (a.alias ?? Number.MAX_SAFE_INTEGER) - (z.alias ?? Number.MAX_SAFE_INTEGER)
    || a.id.localeCompare(z.id));

  for (const it of order) {
    const kind = alias_kind(graph, it.id);
    const n = (counts[kind] ?? 0) + 1;
    counts[kind] = n;
    if (it.alias !== n) out.push({ op: "set_alias", id: it.id, alias: n });
  }
  const ws = graph.blocks[graph.root]?.counters ?? {};
  for (const [kind, n] of Object.entries(counts)) {
    if (ws[kind] !== n) out.push({ op: "set_counter", kind, n });
  }
  return out;
}

export function inspect(graph: Graph): Inspection {
  const faults: Fault[] = [];
  const repairs: Mutation[] = [];
  const name = (id: Id) => graph.blocks[id]?.name ?? id;

  /** **Handles, before anything else.** Every element carries one now, per
   *  kind, so a workspace written under the old single sequence is renumbered
   *  once on the way in. */
  const handles = handed_out(graph);
  if (handles.length) {
    const marks = handles.filter((m) => m.op === "set_alias").length;
    repairs.push(...handles);
    if (marks) {
      faults.push({ kind: "repaired",
                    what: `${marks} handle${marks > 1 ? "s" : ""} renumbered by kind` });
    }
  }

  if (!graph.blocks[graph.root]) {
    faults.push({ kind: "repaired", what: "a missing root" });
    repairs.push({ op: "add_block",
      block: { id: graph.root, parent: null, name: "workspace", type: "folder" } });
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

  /** `groups: Id[]` → `group: Id`. **One group per block**, so a block that was
   *  in several keeps the first. The record is replaced whole rather than
   *  patched: a field this build no longer reads would otherwise ride along
   *  into every file written from here. */
  const held = new Map<Id, Id | undefined>();
  for (const b of Object.values(graph.blocks)) {
    const was = (b as Block & { groups?: Id[] }).groups;
    held.set(b.id, b.group ?? was?.[0]);
    if (!was) continue;
    if (was.length) {
      faults.push({ kind: "repaired", what: `"${name(b.id)}" belonged to ${was.length} groups` });
    }
    const { groups: _gone, ...rest } = b as Block & { groups?: Id[] };
    repairs.push({ op: "add_block", block: { ...rest, group: held.get(b.id) } });
  }

  /** `structure` → `block` on a usage. **The base kind was renamed, not
   *  retired**, so a file naming the old word still resolves. Repaired rather
   *  than dropped: a block whose type went missing would silently become a
   *  plain one and take its subtype's fields with it. A subtype rooted there is
   *  mended with the rest of its record, further down. */
  for (const b of Object.values(graph.blocks)) {
    if (b.type !== "structure") continue;
    faults.push({ kind: "repaired", what: `"${name(b.id)}" named the old base type` });
    repairs.push({ op: "update_block", id: b.id, type: "block" });
  }
  /** **Grids used to share the group module.** Anything carrying an extent is
   *  a grid, whatever module it names, and is repaired to say so.
   *
   *  **The set is kept, because the repairs below have to see it.** A repair is
   *  a mutation somebody applies afterwards, so the checks that follow still
   *  read the graph as it came in — which freed every seated block of a legacy
   *  grid on the same pass that migrated it. */
  const grids = new Set(Object.keys(graph.blocks).filter((id) => is_grid(graph, id)));
  for (const b of Object.values(graph.blocks)) {
    if (grids.has(b.id) || b.rows === undefined || b.cols === undefined) continue;
    faults.push({ kind: "repaired", what: `"${name(b.id)}" was a grid named ${b.type ?? "block"}` });
    repairs.push({ op: "update_block", id: b.id, type: "grid" });
    grids.add(b.id);
  }

  /** The grid: one block per cell, no merge across another, no holder seated
   *  in a cell, and bands nesting so long as membership does not cycle.
   *  **Every repair frees the block rather than deleting it** — a layout fault
   *  must not cost model content, and a block may be referenced from other
   *  layers. */
  const taken = new Map<string, Id>();
  for (const b of Object.values(graph.blocks)) {
    const group = held.get(b.id);
    if (!group) {
      if (b.cell) {
        faults.push({ kind: "repaired", what: `"${name(b.id)}" had a cell and no group` });
        repairs.push({ op: "seat_cell", id: b.id, cell: null });
      }
      continue;
    }
    const grid = graph.blocks[group];
    if (!grid || !can_hold(graph, group, b.id, held)) {
      faults.push({ kind: "repaired", what: `"${name(b.id)}" was in a group that cannot hold it` });
      repairs.push({ op: "set_group", id: b.id, group: null });
      continue;
    }
    if (!b.cell) continue;
    const { r, c } = b.cell;
    const outside = !grids.has(group) || r < 0 || c < 0
                 || r >= grid.rows! || c >= grid.cols!;
    const at = merge_at_span(grid, r, c);
    const key = `${group}|${at ? at.r : r}|${at ? at.c : c}`;
    if (outside || taken.has(key)) {
      faults.push({ kind: "repaired",
                    what: `"${name(b.id)}" sat ${outside ? "outside" : "on top of something in"} `
                        + `"${name(group)}"` });
      repairs.push({ op: "seat_cell", id: b.id, cell: null });
      continue;
    }
    taken.set(key, b.id);
  }

  /** A merge is a cell's extent, so one reaching past the grid or across
   *  another leaves *what is this cell* without an answer.
   *
   *  **The set is laid down again rather than patched.** `split_cells` takes
   *  away whichever span covers an address, which is the right answer for a
   *  gesture and the wrong one here — dropping the overlapping span by its
   *  corner takes the sound one with it. */
  for (const g of Object.values(graph.blocks)) {
    const kept: Span[] = [];
    let bad = 0;
    for (const s of g.merges ?? []) {
      const sane = s.rows > 0 && s.cols > 0 && s.r >= 0 && s.c >= 0
                && grids.has(g.id) && s.r + s.rows <= g.rows! && s.c + s.cols <= g.cols!;
      if (sane && !kept.some((k) => overlaps(k, s))) kept.push(s);
      else bad++;
    }
    if (!bad) continue;
    faults.push({ kind: "dropped",
                  what: `${bad} merge${bad > 1 ? "s" : ""} "${name(g.id)}" could not hold` });
    for (const s of g.merges ?? []) repairs.push({ op: "split_cells", id: g.id, r: s.r, c: s.c });
    for (const s of kept) repairs.push({ op: "merge_cells", id: g.id, span: s });
  }

  /** **The style vocabulary was renamed, key for key**, so that every key says
   *  what part of the card it is about: the name and the label used to share one
   *  weight, one facing and one contrast between them, and neither could be set
   *  alone. A file written before that says `slot` and means `family`.
   *
   *  **Renamed rather than dropped.** An unknown key takes the *whole* `style`
   *  component down with it, so a workspace opened once without this would come
   *  back with every card painted plain. */
  for (const [id, looks] of stale_looks(graph)) {
    for (const { key, was, now, value } of looks) {
      repairs.push({ op: "set_look", id, key, name: was, value: null });
      if (now) repairs.push({ op: "set_look", id, key, name: now, value });
    }
    faults.push({ kind: "repaired", what: `"${name(id)}" said its look the old way` });
  }

  /** One definition, one repair. Filing, extension and every component key it
   *  claims are three separate faults and one mended record — two `set_def`s
   *  for the same definition would leave the later one undoing the earlier. */
  for (const d of Object.values(graph.defs)) {
    let mended = d;
    /** `structure` → `block`. **The base kind was renamed, not retired**, so a
     *  subtype that roots there still resolves. **Mended here rather than in a
     *  repair of its own**: a second `set_def` for one definition leaves the
     *  later one undoing the earlier, and the missing-extends check below would
     *  have blanked what this had just repaired. */
    if (mended.extends === "structure") {
      faults.push({ kind: "repaired", what: `"${d.name}" extended the old base type` });
      mended = { ...mended, extends: "block" };
    }
    if (mended.extends && !graph.defs[mended.extends]) {
      faults.push({ kind: "repaired", what: `"${d.name}" extended something that is not there` });
      mended = { ...mended, extends: undefined };
    }
    /** **`home` was retired, and a file already written still carries it.**
     *  Dropped rather than left to ride along into every file written from
     *  here. **Silently**: it governed nothing, so saying so would be a fault
     *  report that carried no information — and a false alarm is what teaches
     *  people to ignore the real ones. */
    const stale = mended as Definition & { home?: unknown };
    if (stale.home !== undefined) {
      const { home: _gone, ...rest } = stale;
      mended = rest as Definition;
    }
    /** **`constraints` folded into `rules`.** `required` was the only thing
     *  under it, and one concept with two component keys is drift. Moved
     *  rather than dropped, and moved **before** the check below reads the
     *  record: `constraints` is no longer a published component, so what it
     *  carried would otherwise ride along unvalidated into every file written
     *  from here. A `rules` already there keeps whatever it says. */
    const old_c = mended.components?.["constraints"];
    if (old_c && typeof old_c === "object") {
      faults.push({ kind: "repaired", what: `"${d.name}" stated a constraint the old way` });
      const rules = { ...(old_c as Record<string, unknown>),
                      ...(mended.components?.["rules"] ?? {}) };
      mended = { ...mended, components: { ...without(mended.components, "constraints"), rules } };
    }
    /** The same renaming, one layer up: a definition says it in `components`
     *  where a block says it in `looks`, and they are the same bag. */
    const renamed = renaming(mended.components);
    if (renamed) {
      faults.push({ kind: "repaired", what: `"${d.name}" said its look the old way` });
      mended = { ...mended, components: renamed };
    }
    /** `tertiary` and `quaternary` were retired, not renamed — they carried
     *  `secondary`'s chroma and differed only by hue, at a chroma the fill step
     *  scales into invisibility. **Repaired before the check below reads it**,
     *  because that one drops the *whole* `style` component over one bad word,
     *  which would take emphasis, weight and voice down with it. */
    /** **A component validates its own key and no other's**, so what it
     *  refuses is dropped and only that key. An unknown component is left
     *  alone — unvalidated rather than wrong, which is how this build opens a
     *  package a later one wrote.
     *
     *  **Read off the mended record, not the one that came in.** Checking the
     *  original undid every repair above it: a retired family was rewritten and
     *  then the stale word was found again, so the whole `style` component went
     *  out and took emphasis, weight and voice with it. */
    for (const { key, why } of unreadable(mended)) {
      faults.push({ kind: "dropped", what: `"${d.name}" said ${why}` });
      mended = { ...mended, components: without(mended.components, key) };
    }
    /** **A default stands in for its own kind, and only for its own.** Read on
     *  every plain block of that kind, so a folder definition wearing
     *  `default: "block"` would draw every untyped block as a folder. A
     *  package's is refused outright: importing one must never take a project
     *  over. Checked here so the read stays a single lookup. */
    if (mended.default !== undefined) {
      const why = mended.from ? `a package's definition cannot be a default`
        : mended.group !== "block" ? `only a block definition may be a default`
        : module_named(graph, mended.id) !== mended.default
          ? `it is not a ${mended.default}` : null;
      if (why) {
        faults.push({ kind: "dropped", what: `"${d.name}" claimed a default — ${why}` });
        mended = { ...mended, default: undefined };
      }
    }
    if (mended !== d) repairs.push({ op: "set_def", def: mended });
  }

  /** **One default per kind.** Two definitions claiming the same one leaves
   *  which one wins to whatever order the record happens to be in, so the
   *  later-named gives it up. */
  const claimed = new Map<string, string>();
  for (const d of Object.values(graph.defs).sort((a, b) => a.id.localeCompare(b.id))) {
    if (d.default === undefined || d.from || d.group !== "block") continue;
    const held = claimed.get(d.default);
    if (held === undefined) { claimed.set(d.default, d.id); continue; }
    faults.push({ kind: "repaired",
                  what: `"${d.name}" and "${graph.defs[held]!.name}" both claimed the ${d.default} default` });
    repairs.push({ op: "set_def", def: { ...d, default: undefined } });
  }

  return { faults, repairs };
}





/** The span covering an address, read off a group in hand. The fold's reader
 *  asks the graph; the door already has the block. */
function merge_at_span(g: Block, r: number, c: number): Span | null {
  return g.merges?.find((s) => covers(s, r, c)) ?? null;
}

/** A definition's components without one key, and no `components` at all once
 *  the last one goes — nothing still at its default is written. */
/** **What the old style vocabulary called each key.** One map, read by both
 *  repairs — a definition says it in `components` and a block says it in
 *  `looks`, and they are the same bag one layer apart.
 *
 *  `card.name` has no new name: **a card always writes its name now**, so the
 *  three places it could sit were three ways of saying the same nothing. */
const RENAMED: Record<string, Record<string, string | null>> = {
  style: { slot: "family", weight: "border_width", line: "border_contrast",
           voice: "name_weight", decor: "name_font", ink: "name_contrast",
           set: null },
  card: { name: null },
};

/** Every stale property one holder says, as the moves that would mend it. */
function stale_looks(graph: Graph) {
  const out: [Id, { key: string; was: string; now: string | null; value: unknown }[]][] = [];
  for (const b of Object.values(graph.blocks)) {
    const moves: { key: string; was: string; now: string | null; value: unknown }[] = [];
    for (const [key, map] of Object.entries(RENAMED)) {
      const held = b.looks?.[key];
      if (!held) continue;
      for (const [was, now] of Object.entries(map)) {
        if (held[was] === undefined) continue;
        moves.push({ key, was, now, value: held[was] });
      }
    }
    if (moves.length) out.push([b.id, moves]);
  }
  return out;
}

/** The same bag, said the new way, or null where nothing was stale. */
function renaming(components: Definition["components"]): Definition["components"] | null {
  if (!components) return null;
  let moved = false;
  const out: NonNullable<Definition["components"]> = { ...components };
  for (const [key, map] of Object.entries(RENAMED)) {
    const held = components[key];
    if (!held) continue;
    const next: Record<string, unknown> = { ...held };
    for (const [was, now] of Object.entries(map)) {
      if (next[was] === undefined) continue;
      if (now) next[now] = next[was];
      delete next[was];
      moved = true;
    }
    out[key] = next;
  }
  return moved ? out : null;
}

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

/** **Nothing here compares names.** A name was once unique among siblings, and
 *  every gesture that set one could be refused for it — which is a rule about
 *  typing rather than about the model. Identity is the id; two parts of an
 *  assembly are called the same thing all the time; and an unnamed block never
 *  collided in the first place. The only two lookups by name are conveniences
 *  in the CLI, and both already answer an ambiguous one. */
