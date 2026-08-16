/** The application state, and the dispatch that reaches every action.
 *
 *  There is no server. A step log lives in this tab, the graph is folded from
 *  it on every render, and undo flips the last step rather than computing an
 *  inverse — so answered questions and hand edits unwind by the same
 *  mechanism.
 *
 *  Actions live in the registry (`actions/*`); this module holds state, runs
 *  them, and commits what they write. The question loop is optional: the rail
 *  registers it via `looping`, and a build without the rail leaves this seam
 *  alone. */

import { useCallback, useEffect, useMemo, useState } from "react";

import { run, writes, type Args, type Effect, type Picked, type Refusal } from "./actions";
import "./actions/elements";
import "./actions/edges";
import "./actions/groups";
import "./actions/fields";
import "./actions/layer";
import "./actions/behavior";
import * as embed from "./embed/model";
import { blocksOf, childrenOf, compact, fold, isCheckpoint, nameFree, stepsIn, titleOf } from "./graph/fold";
import { entering, report } from "./graph/check";
import * as file from "./graph/file";
import * as store from "./graph/store";
import {
  ROOT, defIdFor, step as makeStep,
  type Axis, type Dir, type EdgeForm, type End, type Field, type Flow,
  type Graph, type Mutation, type Side, type Step,
} from "./graph/types";
import * as workspace from "./workspace";

export type { Picked };

/** What the rail needs from the project to ask and answer. */
export type LoopCore = {
  graph: Graph;
  scope: string | null;
  applied: Step[];
  last: Step | null;
  commit: (step: Step) => void;
  bound: string;
  /** Bumped when undo, redo, reset or import should drop a half-built turn. */
  cleared: number;
};

/** What the rail contributes when it is attached. Structural — project names
 *  no question type of its own. */
export type LoopSurface = {
  question: {
    id: string;
    prompt: string;
    hint: string;
    choices: string[];
    placeholder: string;
  } | null;
  terms: { group: string; node: string; relation: string };
  turn: (said: string) => Promise<void>;
};

type LoopHook = (core: LoopCore) => LoopSurface;

const FALLBACK_TERMS = { group: "Group", node: "Object", relation: "Relation" };

/** No rail: nothing to ask, and an answer is a no-op. */
function useQuietLoop(_core: LoopCore): LoopSurface {
  return {
    question: null,
    terms: FALLBACK_TERMS,
    turn: async () => {},
  };
}

let useLoop: LoopHook = useQuietLoop;

/** Attach the question loop. Called by the rail at load; never from here. */
export function looping(hook: LoopHook): void {
  useLoop = hook;
}

/** What a step moves, when moving is *all* it does — the elements it places,
 *  keyed so two of them can be compared. Null for anything else, which is what
 *  ends a run: a drag that also joined a group changed the graph's shape and is
 *  worth its own step, and so is a reverted one, which a redo has to find.
 *
 *  Keyed on the exact set, so dragging A then B then A again is three steps.
 *  Only `place` qualifies — an arrangement moves everything and is a decision
 *  in its own right, not an adjustment being carried on. */
function placement(step: Step | undefined): string | null {
  if (!step || step.status !== "applied" || step.action !== "place") return null;
  if (!step.mutations.length) return null;
  if (!step.mutations.every((m) => m.op === "place_element")) return null;

  return step.mutations.map((m) => (m as { id: string }).id).sort().join(" ");
}

/** One project's log and every action on it. The page picks which project is
 *  in context by passing its id — this hook does not decide. */
export function useProject(projectId: string, locked = false) {
  // Compacted on the way in as well: an imported or long-idle log can arrive
  // over the cap without this session having added a thing.
  /** What the strip should say from this project — a repaired log, or an
   *  action that refused. Held rather than thrown: the shell shows it, and
   *  dismissing the strip clears it. */
  const [trouble, setTrouble] = useState<string | null>(null);
  /** Ways through a lock refusal — workspace ops the page wires into the strip. */
  const [offer, setOffer] = useState<Refusal["offer"]>(undefined);

  /** A refusal reaches the strip as words, and — when locked — as offers. */
  const sayRefuse = (outcome: Refusal) => {
    setTrouble(outcome.refused);
    setOffer(outcome.offer);
  };

  /** Plain strip text (a repaired log) drops any leftover unlock/fork offers. */
  const sayTrouble = (text: string | null) => {
    setTrouble(text);
    setOffer(undefined);
  };

  /** Read one keyed slot through the door. */
  const read = (id: string): Step[] => {
    const came = entering(store.loadProject(id));
    if (!came) return [];

    if (came.faults.length) setTimeout(() => sayTrouble(report(came.faults)), 0);

    return compact(came.steps);
  };

  /** Which project's log `steps` currently is. Diverges from `projectId` for
   *  one render when the page switches; nothing is written to the new slot
   *  until they agree again. */
  const [bound, setBound] = useState(projectId);
  const [steps, setSteps] = useState<Step[]>(() => read(projectId));
  /** The layer the canvas is drawing. null is the project itself. */
  const [view, setView] = useState<string | null>(null);
  const [picked, setPicked] = useState<Picked>(null);
  /** Bumped so the attached loop drops a half-built turn — see `LoopCore`. */
  const [cleared, setCleared] = useState(0);
  const dismiss = useCallback(() => setCleared((n) => n + 1), []);

  // The log is the only thing worth saving; the graph is folded from it.
  /** False once the log has stopped reaching storage — see `saving`. */
  const [saving, setSaving] = useState(true);
  /** True once the bound file on disk is newer than what this session last
   *  wrote or read — see `store.watch`. */
  const [drifted, setDrifted] = useState(false);
  /** Advisory after quota pressure checkpointed other projects' history —
   *  see `store.watchPressure`. Distinct from `saving` / "not being saved". */
  const [pressure, setPressure] = useState<string | null>(null);

  // Page picked a different project — open that slot, leave the last one alone.
  useEffect(() => {
    if (bound === projectId) return;

    sayTrouble(null);
    setBound(projectId);
    setSteps(read(projectId));
    setView(null);
    setPicked(null);
  }, [projectId, bound]);

  useEffect(() => {
    if (bound !== projectId) return;

    setSaving(store.saveProject(projectId, steps));
  }, [bound, projectId, steps]);

  useEffect(() => store.watch(setDrifted), []);
  useEffect(() => store.watchPressure(setPressure), []);

  const graph = useMemo(() => fold(steps), [steps]);
  /** The project alone as it would be written — state hash ignores companions,
   *  so bundling at export does not look like a change to the work. */
  const written = useMemo(
    () => file.write(graph, bound, stepsIn(steps)), [graph, bound, steps],
  );
  const applied = useMemo(() => steps.filter((s) => s.status === "applied"), [steps]);
  const last = applied.length ? applied[applied.length - 1] : null;

  /** Whatever is in focus: the canvas selection if there is one, otherwise the
   *  layer being looked at. The rail reads this as its scope. */
  const scope = picked?.kind === "node" ? picked.id : view;

  // Every name and body in the project, so affinity (and the rail, when
  // attached) have vectors ready by the time anything is scored against them.
  useEffect(() => {
    embed.warm(Object.values(graph.elements).flatMap((n) => [n.label, n.body]));
  }, [graph]);

  /** Append a step, or replace the one before it where the two are the same
   *  adjustment carried on.
   *
   *  Nudging a card into place is half a dozen drags and one decision, and the
   *  log should record the decision. Same rule the panel's fields follow: one
   *  edit is one step, and the run ends when a different action begins. */
  const commit = useCallback((step: Step) => setSteps((prior) => {
    const carrying = placement(prior[prior.length - 1]);

    const next = carrying !== null && carrying === placement(step)
      ? [...prior.slice(0, -1), step]
      : [...prior, step];

    return compact(next);
  }), []);

  const { question, terms, turn } = useLoop({
    graph, scope, applied, last, commit, bound, cleared,
  });

  const undo = useCallback(() => {
    dismiss();
    setSteps((prior) => {
      const index = prior.map((s) => s.status).lastIndexOf("applied");

      // A checkpoint is not something somebody did, so there is nothing to take
      // back — and reverting one would drop everything it stands for.
      return index < 0 || isCheckpoint(prior[index])
        ? prior
        : prior.map((s, i) => (i === index ? { ...s, status: "reverted" as const } : s));
    });
  }, [dismiss]);

  /** Re-apply what undo last unwound. Undo always takes the newest applied
   *  step, so everything reverted sits in a run at the end and redo is simply
   *  the first of that run. */
  const redo = useCallback(() => {
    dismiss();
    setSteps((prior) => {
      const next = prior.map((s) => s.status).lastIndexOf("applied") + 1;

      return next < prior.length && prior[next].status === "reverted"
        ? prior.map((s, i) => (i === next ? { ...s, status: "applied" as const } : s))
        : prior;
    });
  }, [dismiss]);

  /** Nodes from the project down to the open one — the breadcrumb, and the
   *  set the explorer keeps expanded. */
  const path = useMemo(() => {
    const trail: string[] = [];
    let cursor = view;

    while (cursor && graph.elements[cursor]) {
      trail.unshift(cursor);
      cursor = graph.elements[cursor].parent;
    }

    return trail;
  }, [graph, view]);

  /** Write mutations into a named project's log — through the door, as one
   *  undoable step there. Writing home's call site: the structure project's
   *  id, the interfaces the inference stated, and nothing else.
   *
   *  The bound project takes the ordinary commit so React state and storage
   *  stay one log. A locked target refuses with the same offers as a registry
   *  write. */
  const home = (
    target: string,
    mutations: Mutation[],
    meta: { say: string; action: string },
    targetLocked = false,
  ): boolean => {
    if (!mutations.length) return false;

    if (!target || target === bound) {
      if (targetLocked) {
        sayRefuse({ refused: "This package is locked.", offer: ["unlock", "fork"] });
        return false;
      }
      commit(makeStep(meta.say, meta.action, mutations));
      return true;
    }

    const landed = workspace.writeInto(target, mutations, meta, { locked: targetLocked });
    if ("refuse" in landed) {
      sayRefuse({
        refused: landed.refuse,
        ...(landed.offer ? { offer: landed.offer } : {}),
      });
      return false;
    }

    return true;
  };

  /** Apply an effect the registry returned: context first, then a step if it
   *  wrote. A refusal is said in the strip — the same channel as a repaired
   *  log — so a blocked action is an answer rather than a silent no-op. A
   *  lock refusal keeps its offers separate; the page turns them into strip
   *  buttons (unlock / fork).
   *
   *  `into` on the effect routes the primary step to that project's log
   *  through the door ({@link workspace.writeInto}); absent or matching
   *  `bound` keeps the ordinary commit. `home` batches are further writes
   *  into structure projects via {@link home} — same door, not a second path. */
  const enact = (name: string, args: Args = {}): Effect | null => {
    const outcome = run(name, { graph, view, picked, locked, project: bound }, args);
    if ("refused" in outcome) {
      sayRefuse(outcome);
      return null;
    }

    if (outcome.open !== undefined) setView(outcome.open);
    if (outcome.focus !== undefined) setPicked(outcome.focus);

    if (outcome.mutations.length > 0) {
      const target = outcome.into;
      if (target && target !== bound) {
        const landed = workspace.writeInto(
          target, outcome.mutations,
          { say: outcome.say ?? name, action: name },
        );
        if ("refuse" in landed) {
          sayRefuse({
            refused: landed.refuse,
            ...(landed.offer ? { offer: landed.offer } : {}),
          });
          return null;
        }
      } else {
        commit(makeStep(outcome.say ?? name, name, outcome.mutations));
      }
    }

    if (outcome.home?.length) {
      for (const batch of outcome.home) {
        if (!batch.mutations.length) continue;
        if (!home(batch.into, batch.mutations, {
          say: batch.say ?? outcome.say ?? name,
          action: name,
        })) {
          return null;
        }
      }
    }

    return outcome;
  };

  const go = (name: string, args: Args = {}) => Boolean(enact(name, args));

  /** Go into something: the explorer's every click, and the canvas's
   *  double-click. Null is the project itself — not an action, just leaving. */
  const open = (id: string | null) => {
    if (!id) {
      setPicked(null);
      setView(null);
      return;
    }
    enact("open", { id });
  };

  /** Select on the canvas. The layer never changes: selecting is a glance, and
   *  going deeper is the deliberate second gesture. */
  const pick = useCallback((next: Picked) => setPicked(next), []);

  /** Leave the open layer for the one containing it. */
  const up = () => { enact("up"); };

  /** Registry-backed wrappers. New names match actions.md; aliases keep today's
   *  call sites working until page/canvas rename the collapsed pairs. */
  const act = {
    create: (label: string, parent: string | null = null, spot?: { x: number; y: number },
             groups: string[] = []) =>
      go("create", { label, parent, ...(spot ? { spot } : {}), groups }),

    delete: (id: string) => go("delete", { id }),
    remove: (id: string) => go("delete", { id }),

    rename: (id: string, label: string) => go("rename", { id, label }),
    renameProject: (title: string) => go("rename", { id: ROOT, label: title }),

    retype: (id: string, type: string) => go("retype", { id, type }),
    relation: (id: string, relation: string) => go("retype", { id, type: relation }),

    describe: (id: string, body: string) => go("describe", { id, body }),
    write: (id: string, body: string) => go("describe", { id, body }),

    move: (id: string, parent: string | null, spot?: { x: number; y: number }) =>
      go("move", { id, parent, ...(spot ? { spot } : {}) }),
    nest: (id: string, parent: string) => go("move", { id, parent }),
    promote: (id: string, parent: string | null) => go("move", { id, parent }),
    lift: (id: string, x: number, y: number) =>
      go("move", { id, parent: view, spot: { x, y } }),

    refer: (target: string, x?: number, y?: number) =>
      go("refer", {
        target,
        ...(x !== undefined && y !== undefined ? { spot: { x, y } } : {}),
      }),

    reveal: (id: string) => go("reveal", { id }),

    interface: (owner: string | null, side: Side, at: number,
                edge?: string, end?: "from" | "to") => {
      const effect = enact("interface", {
        owner, side, at,
        ...(edge && end ? { edge, end } : {}),
      });
      const added = effect?.mutations.find((m) => m.op === "add_element");
      return added && "element" in added ? added.element.id : undefined;
    },
    addPort: (parent: string | null, side: Side, at: number) =>
      act.interface(parent, side, at),
    promotePort: (edge: string, end: "from" | "to", owner: string, side: Side, at: number) =>
      act.interface(owner, side, at, edge, end),

    mark: (id: string, flow: Flow | null) =>
      go("mark", { id, flow: flow ?? "none" }),
    markPort: (id: string, flow: Flow | null) =>
      go("mark", { id, flow: flow ?? "none" }),

    relate: (from: string, to: string, form: EdgeForm = "line",
             ports?: { from?: string; to?: string },
             sides?: { from?: Side; to?: Side }) =>
      go("relate", { from, to, form, ...(ports ? { ports } : {}), ...(sides ? { sides } : {}) }),
    link: (source: string, target: string, form: EdgeForm = "line") =>
      go("relate", { from: source, to: target, form }),
    wire: (a: End, b: End, form: EdgeForm = "line") =>
      go("relate", {
        from: a.node, to: b.node, form,
        ports: { from: a.port, to: b.port },
        sides: { from: a.side, to: b.side },
      }),

    /** A relationship dragged into empty space: create the far end, then relate
     *  — one step, because it was one gesture. */
    sprout: (a: End, label: string, x: number, y: number, form: EdgeForm = "line") => {
      const ctx = { graph, view, picked, locked };
      const made = run("create", ctx, { label, spot: { x, y } });
      if ("refused" in made) {
        sayRefuse(made);
        return false;
      }
      if (!writes(made)) return false;

      const added = made.mutations.find((m) => m.op === "add_element");
      if (!added || !("element" in added)) return false;

      const linked = run("relate", ctx, {
        from: a.node, to: added.element.id, form, ports: { from: a.port },
      });
      if ("refused" in linked) {
        sayRefuse(linked);
        return false;
      }

      commit(makeStep(
        `grew: ${label}`, "create",
        [...made.mutations, ...linked.mutations],
      ));
      return true;
    },

    createAt: (label: string, x: number, y: number, groups: string[] = []) =>
      go("create", { label, spot: { x, y }, groups }),

    unlink: (id: string) => go("unlink", { id }),
    flip: (id: string) => go("flip", { id }),
    direct: (id: string, dir: Dir) => go("direct", { id, dir }),
    setDir: (id: string, dir: Dir) => go("direct", { id, dir }),
    reform: (id: string, form: EdgeForm) => go("reform", { id, form }),

    group: (members: string[], into?: string) =>
      go("group", { members, ...(into ? { into } : {}) }),
    joinGroup: (id: string, group: string) =>
      go("group", { members: [id], into: group }),
    leave: (id: string, group: string) => go("leave", { id, group }),
    leaveGroup: (id: string, group: string) => go("leave", { id, group }),
    dissolve: (id: string) => go("dissolve", { id }),

    note: (text: string, x: number, y: number, w?: number, h?: number) =>
      go("note", { text, spot: { x, y }, ...(w !== undefined ? { w } : {}),
                   ...(h !== undefined ? { h } : {}) }),
    tie: (note: string, holder: string) => go("tie", { note, holder }),

    field: (holder: string, name: string, patch?: Partial<Field>) =>
      go("field", { holder, name, ...(patch ? { patch } : {}) }),
    addField: (holder: string, label: string) =>
      go("field", { holder, name: label }),
    updateField: (holder: string, was: string, patch: Partial<Field>) =>
      go("field", { holder, name: was, patch }),
    unfield: (holder: string, name: string) => go("unfield", { holder, name }),
    dropField: (holder: string, label: string) =>
      go("unfield", { holder, name: label }),

    define: (name: string, id?: string, form?: string, patch?: Args) =>
      go("define", {
        name, ...(id ? { id } : {}), ...(form ? { form } : {}),
        ...(patch ? { patch } : {}),
      }),
    addRelation: (label: string) => go("define", { name: label, form: "line" }),
    renameRelation: (from: string, to: string) =>
      go("define", { id: defIdFor(from), name: to }),
    undefine: (id: string) => go("undefine", { id }),
    dropRelation: (label: string) => go("undefine", { id: defIdFor(label) }),

    axis: (axis: Axis) => go("axis", { axis }),
    setAxis: (axis: Axis) => go("axis", { axis }),
    arrange: (spots: { id: string; x: number; y: number }[] = [],
              notes: { id: string; x: number; y: number }[] = []) =>
      go("arrange", { spots, notes }),
    relax: (layer?: string | null) =>
      go("relax", layer !== undefined ? { layer } : {}),
    vocabulary: (name: string) => go("vocabulary", { name }),

    place: (moved: { id: string; x: number; y: number }[], what = "",
            membership: { attr: string; holder: string; join: boolean }[] = []) =>
      go("place", { moved, what, membership }),
    placeMany: (moved: { id: string; x: number; y: number }[], what = "",
                membership: { attr: string; holder: string; join: boolean }[] = []) =>
      go("place", { moved, what, membership }),
    placeNote: (id: string, x: number, y: number) =>
      go("place", { moved: [{ id, x, y }] }),

    size: (id: string, w: number, h: number) => go("size", { id, w, h }),
    seat: (id: string, side: Side, at: number) => go("seat", { id, side, at }),
    setPort: (id: string, side: Side, at: number) => go("seat", { id, side, at }),
    wall: (id: string, end: "from" | "to", side: Side | null) =>
      go("wall", { id, end, side }),
    setSide: (id: string, end: "from" | "to", side: Side | null) =>
      go("wall", { id, end, side }),

    /** The project as a file: the graph, laid out canonically, with any
     *  companions the page gathered so the snapshot stands alone. Changes
     *  nothing in the log. Chromium writes (or picks) a live handle; elsewhere
     *  it downloads. True when the write or download landed (false on cancel). */
    save: (others: Record<string, { graph: Graph; steps: number }> = {}) =>
      store.writeOut(
        Object.keys(others).length
          ? file.write(graph, bound, stepsIn(steps), others)
          : written,
        titleOf(graph),
      ),

    /** Re-read the bound file into the session. What the working-session
     *  control offers when the file changed underneath. The disk stamp is
     *  accepted only after the text has replaced the working copy. */
    reopen: async () => {
      const text = await store.readBound();
      if (text === null) return null;

      const got = loadFrom(text);
      if (got) await store.settleBound();

      return got;
    },

    clearTrouble: () => sayTrouble(null),
    /** Shell dismisses the pressure advisory — same channel as the strip. */
    clearPressure: () => store.clearPressure(),

    /** An imported file becomes this project's working copy, and is saved from
     *  then on under the file's own id — the page's next `projectId` should be
     *  that id (today via the session pointer).
     *
     *  A graph arrives as a checkpoint — the one mutation that already carries
     *  a whole graph — so there is no second reader and no second format. A
     *  bare array is a log from before the freeze and still folds. Companions
     *  under `projects` are installed into their own slots and listed on the
     *  result so the page can admit them (or restore a workspace). */
    load: (text: string) => loadFrom(text),

    reset: () => {
      store.release();
      setSteps([]);
      setView(null);
      setPicked(null);
      dismiss();
    },
  };

  /** What import hands the page: the primary id, every companion installed, and
   *  whether the file asked to restore the workspace filing list. */
  type Loaded = {
    id: string;
    bundled: string[];
    workspace: boolean;
    /** Checkpoint logs for every graph the file carried — the page may stash
     *  them so an untouched import still draws before it earns a storage key. */
    logs: Record<string, Step[]>;
  };

  /** Shared by import and reopen: replace the working copy from file text. */
  function loadFrom(text: string): Loaded | null {
    const raw = store.readFile(text);
    const held = file.read(raw);

    if (held) {
      const next = [makeStep("opened", "checkpoint",
                             [{ op: "checkpoint", graph: held.graph,
                                at: held.meta?.steps ?? 0 }])];
      const logs: Record<string, Step[]> = { [held.id]: next };
      const bundled: string[] = [];

      for (const [id, pack] of Object.entries(held.projects ?? {})) {
        const log = [makeStep("opened", "checkpoint",
                              [{ op: "checkpoint", graph: pack.graph,
                                 at: pack.meta?.steps ?? 0 }])];
        store.saveProject(id, log);
        logs[id] = log;
        bundled.push(id);
      }

      // Keyed slot first, then the session pointer: a remount or a switch
      // that re-reads storage must see what was just imported.
      store.saveProject(held.id, next);
      store.adoptId(held.id);
      sayTrouble(null);
      setBound(held.id);
      setSteps(next);
      setView(null);
      setPicked(null);
      dismiss();

      return {
        id: held.id,
        bundled,
        workspace: file.isWorkspace(held),
        logs,
      };
    }

    const came = entering(raw);
    if (!came) return null;

    const next = compact(came.steps);
    sayTrouble(came.faults.length ? report(came.faults) : null);
    setSteps(next);
    setView(null);
    setPicked(null);
    dismiss();

    return {
      id: bound,
      bundled: [],
      workspace: false,
      logs: { [bound]: next },
    };
  }

  return {
    graph,
    steps,
    view,
    picked,
    scope,
    path,
    open,
    pick,
    up,
    question,
    terms,
    undoable: applied.length > 0 && !isCheckpoint(applied[applied.length - 1]),
    redoable: steps.some((s) => s.status === "reverted"),
    children: (parent: string | null) => childrenOf(graph, parent),
    blocks: (parent: string | null) => blocksOf(graph, parent),
    turn,
    undo,
    redo,
    /** Land mutations in a named project's log — see {@link home}. */
    home,
    // Queries — readable state, off the action surface.
    nameTaken: (parent: string | null, label: string, except: string | null = null) =>
      !nameFree(graph, parent, label, except),
    stepCount: stepsIn(steps),
    state: file.hash(written),
    saving,
    drifted,
    pressure,
    trouble,
    offer,
    ...act,
  };
}
