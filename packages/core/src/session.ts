/** The one log, and the loop every input surface drives. */

import { run, type Args, type Context, type Effect, type Result, type Spot } from "./actions";
import { check, inspect, say } from "./door";
import { fold, step, type Floor } from "./fold";
import { alias_kind, next_alias } from "./names";
import { path } from "./tree";
import { compact, file_name, parse, read, write } from "./file";
import { new_id } from "./ids";
import { no_files, no_storage, type Ports } from "./ports";
import { MAIN } from "./types";
import type { Fault } from "./door";
import type { Block, Graph, Id, Log, Mutation, Step } from "./types";

/** What the app says: a mirror of what was done, or a note of its own. */
export type Said = { text: string; at: number; kind: "mirror" | "note" };

/** A package that arrived, and what the door had to say about it. */
export type Found = { name: string; about: string; faults: Fault[] };

/** One row of the catalogue a `net` binding points at. */
export type Listed = { name: string; about: string; at: string };

export type Session = {
  log: () => Log;
  graph: () => Graph;
  layer: () => Id | null;
  picked: () => Id[];
  /** Which cells are picked, beside the ids. */
  cells: () => Spot[];
  said: () => Said | null;

  /** Run an action by name. Returns what it refused with, or null. */
  go: (name: string, args?: Args) => string | null;
  /** An adjustment: positional, unsayable, and undoable like anything else. */
  adjust: (name: string, mutations: Mutation[]) => void;
  /** Everything `fn` runs or adjusts lands as one step, and undoes as one. */
  batch: (fn: () => void) => void;

  look: (layer: Id | null) => void;
  pick: (ids: Id[]) => void;
  pick_cells: (cells: readonly Spot[]) => void;
  say: (text: string, kind?: Said["kind"]) => void;

  undo: () => boolean;
  redo: () => boolean;

  save: (name?: string) => Promise<void>;
  load: (text: string) => void;
  /** Back to a fresh, empty workspace; not undoable. */
  reset: () => void;
  /** Grafts a file into the workspace as one step: a workspace's definitions into its domain and
   *  its `main` into a layer, or a package whole, frozen. */
  graft: (text: string, into?: Id | null) => Fault[];
  /** A definition package from outside the workspace, in through the door. */
  search: (want: string) => Promise<Found | null>;
  /** What the catalogue offers, for a surface to list. */
  listing: () => Promise<Listed[]>;

  /** Called after every change. One subscriber is all a host needs. */
  watch: (fn: () => void) => void;
};

export type Seed = {
  /** Where the definition packages are listed. */
  catalogue?: string;
  /** The shipped packages every fold starts from. */
  floor?: Floor;
};

export function session(ports: Partial<Ports> & Seed = {}): Session {
  const storage = ports.storage ?? no_storage();
  const files = ports.files ?? no_files();
  const net = ports.net;

  let log: Log = [];
  let graph: Graph = fold(log);
  let layer: Id | null = null;
  /** The layer the open one was reached from, for leaving an interface. */
  let from: Id | null = null;
  let picked: Id[] = [];
  let cells: Spot[] = [];
  let said: Said | null = null;
  let listener: (() => void) | null = null;
  let opened_faults: import("./door").Fault[] = [];

  /** The shipped packages, as the floor every fold starts from. */
  const floor: Floor = ports.floor ?? [];

  /** A fresh log is empty. The floor is already under it. */
  const seeded = (): Log => [];

  const opened = storage.read();
  if (opened) {
    const checked = check(opened, floor);
    log = checked.log;
    /** Repairs are kept, so the next open is clean. */
    if (checked.faults.length) storage.write(log);
    opened_faults = checked.faults;
  } else {
    log = seeded();
  }
  graph = fold(log, floor);
  layer = home(graph);
  if (opened_faults.length) said = { text: say(opened_faults), at: Date.now(), kind: "note" };

  const settle = () => {
    const was = graph;
    graph = fold(log, floor);
    /** A layer that is gone gives way to its nearest surviving ancestor. */
    if (layer && !graph.blocks[layer]) {
      layer = path(was, layer).map((b) => b.id).reverse().find((id) => graph.blocks[id]) ?? null;
      if (layer === graph.root) layer = null;
      picked = picked.filter((id) => graph.blocks[id] || graph.edges[id]);
      cells = [];
    }
    storage.write(log);
    listener?.();
  };

  const ctx = (): Context => ({ graph, layer, picked, cells, from });

  const refuse = (why: string): null => {
    said = { text: why, at: Date.now(), kind: "note" };
    listener?.();
    return null;
  };

  /** The open batch: undefined outside one, null until its first step lands. */
  let batching: Step | null | undefined;

  const append = (action: string, mutations: Mutation[]) => {
    if (mutations.length === 0) return;
    if (batching) {
      batching.mutations.push(...mutations);
      settle();
      return;
    }
    const kept = live(log);
    /** A run of adjustments is one act: the last one supersedes the rest, so the log keeps one
     *  step and one undo rather than one per pixel the slider passed. */
    const last = kept[kept.length - 1];
    if (refines(last, action, mutations)) {
      log = compact([...kept.slice(0, -1), { ...last!, mutations }]);
      settle();
      return;
    }
    const step: Step = { id: new_id("step"), action, at: log.length, status: "applied", mutations };
    if (batching === null) batching = step;
    log = compact([...kept, step]);
    settle();
  };

  const effect = (e: Effect | undefined) => {
    if (!e) return;
    if (e.open !== undefined) {
      if (e.open !== layer) from = layer;
      layer = e.open;
      picked = [];
      cells = [];
    }
    if (e.focus !== undefined) picked = e.focus ? [e.focus] : [];
    if (e.say) said = { text: e.say, at: Date.now(), kind: "mirror" };
  };

  return {
    log: () => log,
    graph: () => graph,
    layer: () => layer,
    picked: () => picked,
    cells: () => cells,
    said: () => said,

    go(name, args = {}) {
      const out: Result | { refused: string } = run(name, ctx(), args);
      if ("refused" in out) {
        said = { text: out.refused, at: Date.now(), kind: "note" };
        listener?.();
        return out.refused;
      }
      append(name, out.mutations);
      effect(out.effect);
      listener?.();
      return null;
    },

    adjust(name, mutations) {
      append(name, mutations);
    },

    batch(fn) {
      if (batching !== undefined) { fn(); return; }
      batching = null;
      try { fn(); } finally { batching = undefined; }
    },

    look(next) {
      if (next !== layer) from = layer;
      layer = next;
      picked = [];
      cells = [];
      listener?.();
    },

    /** Picking elsewhere lets go of the cells. */
    pick(ids) {
      picked = ids;
      if (!cells.every((c) => ids.includes(c.group))) cells = [];
      listener?.();
    },

    /** Picking cells picks their grids too. */
    pick_cells(next) {
      cells = [...next];
      const groups = [...new Set(cells.map((c) => c.group))];
      if (groups.length) picked = groups;
      listener?.();
    },

    say(text, kind = "mirror") {
      said = text ? { text, at: Date.now(), kind } : null;
      listener?.();
    },

    undo() {
      const last = [...log].reverse().find((s) => s.status === "applied");
      /** A checkpoint cannot be undone. */
      if (!last || last.mutations.some((m) => m.op === "checkpoint")) return false;
      last.status = "reverted";
      settle();
      return true;
    },

    redo() {
      const next = log.find((s) => s.status === "reverted");
      if (!next) return false;
      next.status = "applied";
      settle();
      return true;
    },

    /** Named after the workspace unless the caller says otherwise. */
    async save(name = file_name(graph)) {
      await files.save(`${name}.json`, write(graph, name));
    },

    graft(text, into) {
      const got = parse(text);
      if (!got.graph) {
        said = { text: say(got.faults) || "that file could not be read",
                 at: Date.now(), kind: "note" };
        listener?.();
        return got.faults;
      }
      const from = fold([step("import", "import", 0, [{ op: "checkpoint", graph: got.graph }])], floor);
      const target = into ?? layer ?? MAIN;
      const mutations: Mutation[] = [];
      /** Incoming elements take the workspace's next handles, in their own order. */
      const counts: Record<string, number> = {};
      const serial = (id: Id) => {
        const kind = alias_kind(from, id);
        counts[kind] = (counts[kind] ?? next_alias(graph, kind) - 1) + 1;
        return counts[kind]!;
      };
      const by_alias = <T extends { id: Id; alias?: number }>(all: T[]) =>
        all.sort((a, z) => (a.alias ?? 0) - (z.alias ?? 0) || a.id.localeCompare(z.id));
      /** **The workspace always wins**: nothing it holds is replaced. A package comes whole and
       *  stays as it came; a workspace's definitions join this one's domain, and what its `main`
       *  holds lands where it was dropped. */
      const whole = from.root !== graph.root;
      const placed = (b: Block): Block => {
        if (whole) return b;
        if (b.parent === from.root) return { ...b, parent: graph.root };
        if (b.parent === MAIN) return { ...b, parent: target, alias: serial(b.id) };
        return b.def ? b : { ...b, alias: serial(b.id) };
      };
      for (const b of by_alias(Object.values(from.blocks))) {
        if (graph.blocks[b.id] || floor.some((f) => f.id === b.id)) continue;
        if (!whole && (b.id === from.root || b.id === MAIN)) continue;
        mutations.push({ op: "add_block", block: placed(b) });
      }
      for (const e of by_alias(Object.values(from.edges))) {
        if (graph.edges[e.id]) continue;
        mutations.push({ op: "link_blocks", edge: whole ? e : { ...e, alias: serial(e.id) } });
      }
      for (const [kind, n] of Object.entries(counts)) mutations.push({ op: "set_counter", kind, n });
      append("import", mutations);

      /** The door runs over the workspace as it now stands. */
      const mend = inspect(graph);
      if (mend.repairs.length) append("repair", mend.repairs);
      const faults = [...got.faults, ...mend.faults];
      if (faults.length) said = { text: say(faults), at: Date.now(), kind: "note" };
      listener?.();
      return faults;
    },

    /** What the catalogue offers, so a surface can list it rather than guess a name. Empty where
     *  there is nowhere to read from — an unbound port is a capability the app does without. */
    async listing() {
      const catalogue = ports.catalogue;
      if (!net || !catalogue) return [];
      return (await fetch_list(net, catalogue)) ?? [];
    },

    async search(want) {
      const catalogue = ports.catalogue;
      const name = want.trim();
      if (!net || !catalogue) return refuse("there is nowhere to search from");
      if (!name) return refuse("search for what?");

      const listed = await fetch_list(net, catalogue);
      if (!listed) return refuse("that catalogue could not be read");
      const hit = listed.find((p) => p.name.toLowerCase() === name.toLowerCase())
        ?? listed.find((p) => `${p.name} ${p.about}`.toLowerCase().includes(name.toLowerCase()));
      if (!hit) return refuse(`nothing out there is called “${name}”`);

      const text = await net.get(beside(catalogue, hit.at));
      if (text === null) return refuse(`“${hit.name}” could not be fetched`);

      const faults = this.graft(text);
      said = { text: faults.length ? `brought in ${hit.name} — ${say(faults)}`
                                   : `brought in ${hit.name}`, at: Date.now(), kind: "note" };
      listener?.();
      return { name: hit.name, about: hit.about, faults };
    },

    reset() {
      log = seeded();
      layer = home(fold(log, floor));
      picked = [];
      cells = [];
      said = { text: "a fresh workspace", at: Date.now(), kind: "note" };
      settle();
    },

    load(text) {
      const got = read(text, floor);
      if (got.log.length === 0) {
        said = { text: say(got.faults) || "that file could not be read", at: Date.now(), kind: "note" };
        listener?.();
        return;
      }
      log = got.log;
      layer = home(fold(log, floor));
      picked = [];
      cells = [];
      said = got.faults.length ? { text: say(got.faults), at: Date.now(), kind: "note" } : null;
      settle();
    },

    watch(fn) {
      listener = fn;
    },
  };
}

/** Where a workspace opens: `main`, where its structure is built, else its domain. */
function home(graph: Graph): Id | null {
  return graph.blocks[MAIN] ? MAIN : null;
}

/** The catalogue, read defensively — it was written outside this workspace. */
async function fetch_list(net: NonNullable<Ports["net"]>,
                          where: string): Promise<Listed[] | null> {
  const text = await net.get(where);
  if (text === null) return null;
  try {
    const raw = JSON.parse(text) as { packages?: unknown };
    if (!Array.isArray(raw.packages)) return null;
    return raw.packages
      .map((p) => p as Partial<Listed>)
      .filter((p): p is Listed => typeof p.name === "string" && typeof p.at === "string")
      .map((p) => ({ name: p.name, about: String(p.about ?? ""), at: p.at }));
  } catch {
    return null;
  }
}

/** A package's address, relative to the catalogue that listed it. */
function beside(catalogue: string, at: string): string {
  if (/^(https?:)?\/\//.test(at) || at.startsWith("/")) return at;
  return catalogue.replace(/[^/\\]*$/, "") + at;
}

/** The one slot an absolute write lands in, or null where a mutation is not one.
 *
 *  **A closed list, and a short one on purpose.** Two things keep a mutation off it: anything
 *  relative would be lost rather than folded — two `flip_edge`s are not one — and anything a
 *  surface only ever writes once per gesture has nothing to fold. A body, a name and a tag list
 *  all commit when their box is left, so folding those would quietly merge two edits somebody
 *  made on purpose. What is here is what a *drag* streams. */
function slot_of(m: Mutation): string | null {
  switch (m.op) {
    /** A slider, on an element or a definition. */
    case "set_setting": return `${m.id}|${m.key}|${m.name}`;
    /** A card dragged or resized. A lattice is written once per edit, so it never folds. */
    case "place_block": case "size_block": case "seat_cell": return m.id;
    default: return null;
  }
}

/** Whether a step only refines the one before it — the same act, writing the same slot the same
 *  way. **The later write has to say everything the earlier one did**, or replacing it would
 *  drop what the earlier said, so the two must carry the same keys. */
function refines(last: Step | undefined, action: string, mutations: Mutation[]): boolean {
  if (!last || last.status !== "applied" || last.action !== action) return false;
  if (last.mutations.length !== 1 || mutations.length !== 1) return false;
  const was = last.mutations[0]!;
  const now = mutations[0]!;
  if (was.op !== now.op) return false;
  const slot = slot_of(now);
  if (slot === null || slot !== slot_of(was)) return false;
  const a = Object.keys(was).sort();
  const b = Object.keys(now).sort();
  return a.length === b.length && a.every((k, i) => k === b[i]);
}

/** Redo is only ever the run of reverted steps at the end. */
function live(log: Log): Log {
  let end = log.length;
  while (end > 0 && log[end - 1]!.status === "reverted") end--;
  return log.slice(0, end);
}
