/** The one log, and the loop every input surface drives.
 *
 *  Hold the log, fold it, run an action, append what it wrote. Undo flips a
 *  status and refolds — no mutation needs an inverse, and the graph that comes
 *  back was built by the same fold that built the original. */

import { run, type Args, type Context, type Effect, type Result } from "./actions";
import { check, say } from "./door";
import { fold } from "./fold";
import { compact, read, write } from "./file";
import { new_id } from "./ids";
import { no_files, no_storage, type Ports } from "./ports";
import type { Graph, Id, Log, Mutation, Step } from "./types";

export type Said = { text: string; at: number };

export type Session = {
  log: () => Log;
  graph: () => Graph;
  layer: () => Id | null;
  picked: () => Id[];
  said: () => Said | null;

  /** Run an action by name. Returns what it refused with, or null. */
  go: (name: string, args?: Args) => string | null;
  /** An adjustment: positional, unsayable, and undoable like anything else. */
  adjust: (name: string, mutations: Mutation[]) => void;

  look: (layer: Id | null) => void;
  pick: (ids: Id[]) => void;
  say: (text: string) => void;

  undo: () => boolean;
  redo: () => boolean;

  save: (name?: string) => Promise<void>;
  load: (text: string) => void;

  /** Called after every change. One subscriber is all a host needs. */
  watch: (fn: () => void) => void;
};

export type Seed = {
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

  let log: Log = [];
  let graph: Graph = fold(log);
  let layer: Id | null = null;
  let picked: Id[] = [];
  let said: Said | null = null;
  let listener: (() => void) | null = null;
  let opened_faults: import("./door").Fault[] = [];

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
  } else if (ports.defs?.length) {
    log = [{ id: new_id("step"), action: "seed", at: 0, status: "applied",
             mutations: ports.defs }];
  }
  graph = fold(log);
  if (opened_faults.length) said = { text: say(opened_faults), at: Date.now() };

  const settle = () => {
    graph = fold(log);
    storage.write(log);
    listener?.();
  };

  const ctx = (): Context => ({ graph, layer, picked });

  const append = (action: string, mutations: Mutation[]) => {
    if (mutations.length === 0) return;
    const step: Step = { id: new_id("step"), action, at: log.length, status: "applied", mutations };
    log = compact([...live(log), step]);
    settle();
  };

  const effect = (e: Effect | undefined) => {
    if (!e) return;
    if (e.open !== undefined) { layer = e.open; picked = []; }
    if (e.focus !== undefined) picked = e.focus ? [e.focus] : [];
    if (e.say) said = { text: e.say, at: Date.now() };
  };

  return {
    log: () => log,
    graph: () => graph,
    layer: () => layer,
    picked: () => picked,
    said: () => said,

    go(name, args = {}) {
      const out: Result | { refused: string } = run(name, ctx(), args);
      if ("refused" in out) {
        said = { text: out.refused, at: Date.now() };
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
      layer = next;
      picked = [];
      listener?.();
    },

    pick(ids) {
      picked = ids;
      listener?.();
    },

    say(text) {
      said = text ? { text, at: Date.now() } : null;
      listener?.();
    },

    undo() {
      const last = [...log].reverse().find((s) => s.status === "applied" && s.action !== "checkpoint");
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

    load(text) {
      const got = read(text);
      if (got.log.length === 0) {
        said = { text: "that file could not be read", at: Date.now() };
        listener?.();
        return;
      }
      log = got.log;
      layer = null;
      picked = [];
      settle();
    },

    watch(fn) {
      listener = fn;
    },
  };
}

/** Redo is only ever the run of reverted steps at the end. Anything done after
 *  an undo drops them, which is what makes the log a line rather than a tree. */
function live(log: Log): Log {
  let end = log.length;
  while (end > 0 && log[end - 1]!.status === "reverted") end--;
  return log.slice(0, end);
}
