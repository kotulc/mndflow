/** The one log, and the loop every input surface drives.
 *
 *  Hold the log, fold it, run an action, append what it wrote. Undo flips a
 *  status and refolds — no mutation needs an inverse, and the graph that comes
 *  back was built by the same fold that built the original. */

import { run, type Args, type Context, type Effect, type Result, type Spot } from "./actions";
import { check, inspect, say } from "./door";
import { fold } from "./fold";
import { compact, parse, read, write } from "./file";
import { new_id } from "./ids";
import { no_files, no_storage, type Ports } from "./ports";
import { ROOT } from "./types";
import type { Fault } from "./door";
import type { Graph, Id, Log, Mutation, Step } from "./types";

/** **Everything the app says goes to one strip, and not all of it is a
 *  mirror.** A create echoed back is; a refusal, a repair report or a rule note
 *  is the app answering for itself. Quiet mode silences the one and never the
 *  other, which is the only reason the two are told apart. */
export type Said = { text: string; at: number; kind: "mirror" | "note" };

/** A package that arrived, and what the door had to say about it. */
export type Found = { name: string; about: string; faults: Fault[] };

/** One row of the catalogue a `net` binding points at. Read defensively: it is
 *  written outside this workspace and nothing here wrote it. */
type Listed = { name: string; about: string; at: string };

export type Session = {
  log: () => Log;
  graph: () => Graph;
  layer: () => Id | null;
  picked: () => Id[];
  /** Which cells are picked. **Beside the ids, never among them** — a cell has
   *  no id, so it could not ride in `picked` without pretending to be a block. */
  cells: () => Spot[];
  said: () => Said | null;

  /** Run an action by name. Returns what it refused with, or null. */
  go: (name: string, args?: Args) => string | null;
  /** An adjustment: positional, unsayable, and undoable like anything else. */
  adjust: (name: string, mutations: Mutation[]) => void;

  look: (layer: Id | null) => void;
  pick: (ids: Id[]) => void;
  pick_cells: (cells: readonly Spot[]) => void;
  say: (text: string, kind?: Said["kind"]) => void;

  undo: () => boolean;
  redo: () => boolean;

  save: (name?: string) => Promise<void>;
  load: (text: string) => void;
  /** **Back to a fresh workspace**, seeded exactly as the first run was.
   *
   *  The log is what the workspace *is*, so starting over is dropping it and
   *  laying the seed down again — not a mutation, and not undoable, because
   *  there is nothing left to undo into. **It is also the only way a definition
   *  this build no longer ships leaves a workspace that already has it**: the
   *  seed is written once, when storage is empty, so a base definition retired
   *  in code lives on in every log written before it went. */
  reset: () => void;
  /** **A file in, grafted rather than opened.** Its definitions are taken and
   *  its blocks are appended to a layer, as one ordinary step — so a package
   *  fetched from outside and a subtree imported from a file arrive the same
   *  way, through the same door, and both undo. Returns what the door found. */
  graft: (text: string, into?: Id | null) => Fault[];
  /** **A definition package from outside the workspace, in through the door.**
   *  Null where there is nowhere to search, nothing by that name, or nothing
   *  there — the strip is told which, and the workspace is unchanged. */
  search: (want: string) => Promise<Found | null>;

  /** Called after every change. One subscriber is all a host needs. */
  watch: (fn: () => void) => void;
};

export type Seed = {
  /** Where the definition packages are listed. A host fact, like a port —
   *  nothing above an app may assume where *outside the workspace* is. */
  catalogue?: string;
  /** The definitions a fresh workspace opens with.
   *
   *  The engine needs a floor — something to draw and place a block that names
   *  no type — but it may not reach for the package that supplies one: `defs`
   *  depends on core, so core cannot depend back. An app hands it in, the same
   *  way it hands in a port. */
  defs?: Mutation[];
};

export function session(ports: Partial<Ports> & Seed = {}): Session {
  const storage = ports.storage ?? no_storage();
  const files = ports.files ?? no_files();
  const net = ports.net;

  let log: Log = [];
  let graph: Graph = fold(log);
  let layer: Id | null = null;
  /** The layer the open one was reached from. **Not a history** — one step, for
   *  the one question that cannot be answered from the graph: which of the two
   *  layers that draw an interface you were looking at when you went into it. */
  let from: Id | null = null;
  let picked: Id[] = [];
  let cells: Spot[] = [];
  let said: Said | null = null;
  let listener: (() => void) | null = null;
  let opened_faults: import("./door").Fault[] = [];

  /** A fresh log: the base package as one step, or nothing where an app binds
   *  no definitions. **Written in one place** so opening a fresh workspace and
   *  starting a new one cannot come out different. */
  const seeded = (): Log => ports.defs?.length
    ? [{ id: new_id("step"), action: "seed", at: 0, status: "applied",
         mutations: ports.defs }]
    : [];

  const opened = storage.read();
  if (opened) {
    const checked = check(opened);
    log = checked.log;
    /** A repair is a step, so it has to be kept. Left in memory it would be
     *  made again on every load, and the log would be re-read as damaged each
     *  time — the door would be telling the truth about something it had
     *  already mended. */
    if (checked.faults.length) storage.write(log);
    opened_faults = checked.faults;
  } else {
    log = seeded();
  }
  graph = fold(log);
  if (opened_faults.length) said = { text: say(opened_faults), at: Date.now(), kind: "note" };

  const settle = () => {
    graph = fold(log);
    storage.write(log);
    listener?.();
  };

  const ctx = (): Context => ({ graph, layer, picked, cells, from });

  const refuse = (why: string): null => {
    said = { text: why, at: Date.now(), kind: "note" };
    listener?.();
    return null;
  };

  const append = (action: string, mutations: Mutation[]) => {
    if (mutations.length === 0) return;
    const step: Step = { id: new_id("step"), action, at: log.length, status: "applied", mutations };
    log = compact([...live(log), step]);
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

    look(next) {
      if (next !== layer) from = layer;
      layer = next;
      picked = [];
      cells = [];
      listener?.();
    },

    /** **Picking elsewhere lets go of the cells.** The grid a cell is in is not
     *  elsewhere — clicking a cell picks the grid too, because the canvas
     *  reports one gesture as both, and an action on a cell is an action on
     *  that grid at an address. */
    pick(ids) {
      picked = ids;
      if (!cells.every((c) => ids.includes(c.group))) cells = [];
      listener?.();
    },

    /** **A cell is picked beside the grid it is in**, never instead of it: an
     *  action asked of a cell is an action on that grid at an address, and the
     *  rail and the resize handles are the grid's. */
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
      const last = [...log].reverse()
        .find((s) => s.status === "applied" && s.action !== "checkpoint");
      if (!last) return false;
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

    async save(name = "workspace") {
      await files.save(`${name}.json`, write(graph, name));
    },

    /** Ids survive the round trip, so a collision means the two really are the
     *  same thing and the newer record replaces it. Anything the package held
     *  at its own root lands in the target layer. */
    graft(text, into) {
      const got = parse(text);
      if (!got.graph) {
        said = { text: say(got.faults) || "that file could not be read",
                 at: Date.now(), kind: "note" };
        listener?.();
        return got.faults;
      }
      const from = got.graph;
      const target = into ?? layer ?? graph.root;
      const mutations: Mutation[] = [];
      for (const d of Object.values(from.defs)) mutations.push({ op: "set_def", def: d });
      for (const b of Object.values(from.blocks)) {
        if (b.id === from.root) continue;
        const parent = b.parent === from.root || !b.parent ? target : b.parent;
        mutations.push({ op: "add_block", block: { ...b, parent } });
      }
      for (const e of Object.values(from.edges)) mutations.push({ op: "link_blocks", edge: e });
      append("import", mutations);

      /** **The door runs over what arrived, not over what was sent.** A package
       *  extending the workspace's own definitions is whole once it is here and
       *  broken on its own, so checking it in isolation would repair away the
       *  very thing it came for. A repair is a step, like any other. */
      const mend = inspect(graph);
      if (mend.repairs.length) append("repair", mend.repairs);
      const faults = [...got.faults, ...mend.faults];
      if (faults.length) said = { text: say(faults), at: Date.now(), kind: "note" };
      listener?.();
      return faults;
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

      /** **Filed under the workspace**, so every layer can reach it: a package
       *  brought in for one block would be invisible from the next. */
      const faults = this.graft(text, ROOT);
      said = { text: faults.length ? `brought in ${hit.name} — ${say(faults)}`
                                   : `brought in ${hit.name}`, at: Date.now(), kind: "note" };
      listener?.();
      return { name: hit.name, about: hit.about, faults };
    },

    reset() {
      log = seeded();
      layer = null;
      picked = [];
      cells = [];
      said = { text: "a fresh workspace", at: Date.now(), kind: "note" };
      settle();
    },

    load(text) {
      const got = read(text);
      if (got.log.length === 0) {
        said = { text: "that file could not be read", at: Date.now(), kind: "note" };
        listener?.();
        return;
      }
      log = got.log;
      layer = null;
      picked = [];
      cells = [];
      settle();
    },

    watch(fn) {
      listener = fn;
    },
  };
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

/** A package's address, relative to the catalogue that listed it. Absolute
 *  stays absolute, so a catalogue may point anywhere. */
function beside(catalogue: string, at: string): string {
  if (/^(https?:)?\/\//.test(at) || at.startsWith("/")) return at;
  return catalogue.replace(/[^/\\]*$/, "") + at;
}

/** Redo is only ever the run of reverted steps at the end. Anything done after
 *  an undo drops them, which is what makes the log a line rather than a tree. */
function live(log: Log): Log {
  let end = log.length;
  while (end > 0 && log[end - 1]!.status === "reverted") end--;
  return log.slice(0, end);
}
