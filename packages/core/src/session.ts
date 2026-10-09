/** The one log, and the loop every input surface drives. */

import { run, type Args, type Context, type Effect, type Result, type Spot } from "./actions";
import { check, inspect, say } from "./door";
import { fold, replay, step, type Floor } from "./fold";
import { home_at, sight, trace, view_of, view_on, EDITOR, type Tiers,
         type View, type Views } from "./navigate";
import { is_layer_view, type ViewKind } from "./sections";
import { package_of } from "./defs";
import { path } from "./tree";
import { compact, file_name, parse, read, unmet, write, write_package } from "./file";
import { new_id } from "./ids";
import { no_files, no_storage, type Ports } from "./ports";
import type { Fault } from "./door";
import type { Graph, Id, Log, Mutation, Step } from "./types";

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
  /** What the canvas draws: the section, how, the layer, and the anchor navigation brought into
   *  sight — never what is only browsed. */
  view: () => View;
  /** The view each section was set to, by its id. */
  views: () => Views;
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
  /** The canvas's section shown whole another way, keeping `id` in sight; a layer view, which is
   *  never chosen, goes back to where what is kept in sight is drawn. */
  see: (kind: ViewKind, id?: Id | null) => void;
  pick: (ids: Id[]) => void;
  pick_cells: (cells: readonly Spot[]) => void;
  say: (text: string, kind?: Said["kind"]) => void;

  undo: () => boolean;
  redo: () => boolean;

  save: (name?: string) => Promise<void>;
  /** The workspace exported as a package called `name`, its ids prefixed with it. */
  save_package: (name: string) => Promise<void>;
  load: (text: string) => void;
  /** Back to a fresh, empty workspace; not undoable. */
  reset: () => void;
  /** Brings the packages a file carries in beside the workspace, whole and frozen, as one step.
   *  A package already here, or one whose ids clash with one here, is refused. */
  bring: (text: string) => Fault[];
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
  /** The host's sections; the editor's unless said. */
  tiers?: Tiers;
};

export function session(ports: Partial<Ports> & Seed = {}): Session {
  const storage = ports.storage ?? no_storage();
  const files = ports.files ?? no_files();
  const net = ports.net;

  let log: Log = [];
  let graph: Graph = fold(log);
  const tiers: Tiers = ports.tiers ?? EDITOR;
  let views: Views = {};
  let view: View = { at: 0, kind: "internal", layer: null, pick: null };
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
  view = home(graph);
  if (opened_faults.length) said = { text: say(opened_faults), at: Date.now(), kind: "note" };

  const settle = () => {
    const was = graph;
    graph = fold(log, floor);
    /** A layer that is gone gives way to its nearest surviving ancestor, seen from inside in the
     *  section listing it; a whole section whose scope is gone starts again. */
    const layer = view.layer;
    if (layer && !graph.blocks[layer]) {
      const kept = path(was, layer).map((b) => b.id).reverse().find((id) => graph.blocks[id]);
      view = kept && is_layer_view(view.kind) ? view_on(graph, tiers, views, kept) : home(graph);
      picked = picked.filter((id) => graph.blocks[id] || graph.edges[id]);
      cells = [];
    }
    storage.write(log);
    listener?.();
  };

  const ctx = (): Context => ({ graph, layer: view.layer, picked, cells, from, tiers, views,
                                view });

  /** Where the canvas starts on this graph. */
  function home(on: Graph): View {
    return home_at(on, tiers, views) ?? view_on(on, tiers, views, null);
  }

  /** The canvas moved: what it was looking into is kept for leaving an interface, and what it
   *  brought into sight is its anchor — which browsing, a pick made elsewhere, never moves. */
  /** Each section remembers how it was last shown: whole, or from a block. A package's own view
   *  is neither, so it leaves it as it was. */
  const move = (next: View) => {
    if (next.layer !== view.layer) from = view.layer;
    const section = tiers.sections[next.at];
    const pkg = next.layer !== null && graph.blocks[next.layer]?.parent === null;
    if (section && !pkg) {
      views = { ...views, [section.id]: is_layer_view(next.kind) ? "internal" : next.kind };
    }
    view = next;
    picked = [];
    cells = [];
  };

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
    if (e.view) move(e.view);
    if (e.focus !== undefined) picked = e.focus ? [e.focus] : [];
    if (e.say) said = { text: e.say, at: Date.now(), kind: "mirror" };
  };

  return {
    log: () => log,
    graph: () => graph,
    layer: () => view.layer,
    view: () => view,
    views: () => views,
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
      move(view_on(graph, tiers, views, next));
      listener?.();
    },

    see(kind, id) {
      const section = tiers.sections[view.at];
      if (!section) return;
      /** What stays in sight: the pick, where it lies within what the canvas has open — the same
       *  root in its section — else the canvas's anchor, its layer, or what the host says; the
       *  first the section lists. A pick browsed elsewhere never moves the canvas. With none, a
       *  whole section is shown as it is; inside, there is no layer to look into, so nothing
       *  changes. */
      const listed = (x: Id | null | undefined): x is Id =>
        !!x && trace(graph, tiers, x).held[view.at] === x;
      const root = (x: Id | null) => (x ? trace(graph, tiers, x).roots[view.at] : undefined);
      const anchor = view.pick ?? view.layer;
      const within = picked[0] && root(picked[0]) === root(anchor) ? picked[0] : null;
      const keep = [within, view.pick, view.layer, id].find(listed);
      /** A layer view is never chosen: from one, there is nowhere else to go. */
      if (is_layer_view(kind) && is_layer_view(view.kind)) return;
      if (!keep && is_layer_view(kind)) return;
      views = { ...views, [section.id]: is_layer_view(kind) ? "internal" : kind };
      const to = keep ? sight(graph, tiers, views, view.at, keep)
        : { ...view, kind: view_of(tiers, views, view.at) };
      move(to);
      if (to.pick) picked = [to.pick];
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

    async save_package(name) {
      const text = write_package(graph, name);
      await files.save(`${JSON.parse(text).id}.json`, text);
    },

    bring(text) {
      const got = parse(text);
      const fail = (faults: Fault[]) => {
        said = { text: say(faults) || "that file could not be read", at: Date.now(), kind: "note" };
        listener?.();
        return faults;
      };
      if (!got.graph) return fail(got.faults);
      const from = fold([step("import", "import", 0, [{ op: "checkpoint", graph: got.graph }])], floor);
      /** Every package the file carries but the workspace and `base`, each whole and frozen. */
      const roots = Object.values(from.blocks)
        .filter((b) => b.parent === null && b.id !== graph.root && !floor.some((f) => f.id === b.id));
      if (!roots.length) return fail([{ kind: "dropped", what: "a file carrying no package" }]);
      const fresh = roots.filter((r) => !graph.blocks[r.id]);
      if (!fresh.length) return fail([{ kind: "dropped", what: "that package is here already" }]);
      const incoming = Object.values(from.blocks)
        .filter((b) => fresh.some((r) => r.id === package_of(from, b.id)));
      const clash = incoming.find((b) => graph.blocks[b.id]);
      if (clash) {
        return fail([{ kind: "dropped", what: `a package whose ids clash with one here: ${clash.id}` }]);
      }
      const ids = new Set(incoming.map((b) => b.id));
      const mutations: Mutation[] = [
        ...incoming.map((b): Mutation => ({ op: "add_block", block: b })),
        ...Object.values(from.edges).filter((e) => ids.has(e.from) || ids.has(e.to))
          .filter((e) => !graph.edges[e.id])
          .map((e): Mutation => ({ op: "link_blocks", edge: e })),
      ];
      const missing = unmet(replay(graph, mutations));
      if (missing.length) {
        return fail([{ kind: "dropped",
                       what: `a package naming what it does not carry: ${missing.slice(0, 3).join(", ")}` }]);
      }
      append("import", mutations);
      const mend = inspect(graph);
      if (mend.repairs.length) append("repair", mend.repairs);
      if (mend.faults.length) said = { text: say(mend.faults), at: Date.now(), kind: "note" };
      listener?.();
      return mend.faults;
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

      const faults = this.bring(text);
      said = { text: faults.length ? `brought in ${hit.name} — ${say(faults)}`
                                   : `brought in ${hit.name}`, at: Date.now(), kind: "note" };
      listener?.();
      return { name: hit.name, about: hit.about, faults };
    },

    reset() {
      log = seeded();
      view = home(fold(log, floor));
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
      view = home(fold(log, floor));
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
