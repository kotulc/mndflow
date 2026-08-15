/** The application state, and the dispatch that reaches every action.
 *
 *  There is no server. A step log lives in this tab, the graph is folded from
 *  it on every render, and undo flips the last step rather than computing an
 *  inverse — so answered questions and hand edits unwind by the same
 *  mechanism.
 *
 *  Actions live in the registry (`actions/*`); this module holds state, runs
 *  them, and commits what they write. What an answer *means* lives in `turn`. */

import { useCallback, useEffect, useMemo, useState } from "react";

import { run, writes, type Args, type Effect, type Picked, type Refusal } from "./actions";
import "./actions/elements";
import "./actions/edges";
import "./actions/groups";
import "./actions/fields";
import "./actions/layer";
import * as embed from "./embed/model";
import { blocksOf, childrenOf, compact, fold, isCheckpoint, nameFree, stepsIn, titleOf } from "./graph/fold";
import * as router from "./terminal/router";
import { entering, report } from "./graph/check";
import * as file from "./graph/file";
import * as store from "./graph/store";
import { answer, pendingQuestion, type Pending } from "./terminal/turn";
import {
  ROOT, defIdFor, step as makeStep,
  type Axis, type Dir, type EdgeForm, type End, type Field, type Flow,
  type Graph, type Side, type Step,
} from "./graph/types";
import { getDomain } from "./terminal/workflows";

export type { Picked };

/** Consecutive turns on one operation before the loop moves on. */
const RHYTHM = 2;

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
  const [pending, setPending] = useState<Pending | null>(null);

  // The log is the only thing worth saving; the graph is folded from it.
  /** False once the log has stopped reaching storage — see `saving`. */
  const [saving, setSaving] = useState(true);
  /** True once the bound file on disk is newer than what this session last
   *  wrote or read — see `store.watch`. */
  const [drifted, setDrifted] = useState(false);

  // Page picked a different project — open that slot, leave the last one alone.
  useEffect(() => {
    if (bound === projectId) return;

    sayTrouble(null);
    setBound(projectId);
    setSteps(read(projectId));
    setView(null);
    setPicked(null);
    setPending(null);
  }, [projectId, bound]);

  useEffect(() => {
    if (bound !== projectId) return;

    setSaving(store.saveProject(projectId, steps));
  }, [bound, projectId, steps]);

  useEffect(() => store.watch(setDrifted), []);

  // Warm the catalogue once, so the first thing typed is not also the first
  // thing that waits on the model.
  useEffect(() => embed.warm(router.templatePhrases()), []);

  const graph = useMemo(() => fold(steps), [steps]);
  /** The project alone as it would be written — state hash ignores companions,
   *  so bundling at export does not look like a change to the work. */
  const written = useMemo(
    () => file.write(graph, bound, stepsIn(steps)), [graph, bound, steps],
  );
  const applied = useMemo(() => steps.filter((s) => s.status === "applied"), [steps]);
  const last = applied.length ? applied[applied.length - 1] : null;
  const terms = getDomain(graph.vocabulary).terms;

  /** Whatever the conversation should be about: the canvas selection if there
   *  is one, otherwise the layer being looked at. */
  const scope = picked?.kind === "node" ? picked.id : view;

  // Every name and body in the project, so suggestions and affinity have
  // vectors ready by the time anything is scored against them.
  useEffect(() => {
    embed.warm(Object.values(graph.elements).flatMap((n) => [n.label, n.body]));
  }, [graph]);

  /** Questions the last few turns answered — what gives the loop its rhythm. */
  const recent = useMemo(
    () => applied.filter((s) => s.question).slice(-RHYTHM).map((s) => s.question).reverse(),
    [applied],
  );

  const question = useMemo(() => {
    if (pending) return pendingQuestion(graph, pending);

    const next = router.question(graph, scope, recent);
    // Say so when a turn changed nothing; re-asking unaltered reads as though
    // the answer never arrived.
    if (next && last?.question && !last.mutations.length) {
      return { ...next, hint: `Nothing came of that. ${next.hint}`.trim() };
    }

    return next;
  }, [graph, scope, recent, pending, last]);

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

  const turn = useCallback(
    async (said: string) => {
      // Routing the opening answer needs its vector now, not on a later
      // render — it decides the domain the whole project runs under.
      if (question?.id === router.ENTRY) await embed.ensure([said]);

      const outcome = answer(graph, question, said, scope, pending, terms);
      setPending(outcome.pending);
      commit(makeStep(said.trim(), outcome.action, outcome.mutations,
                      question?.id ?? "", question?.prompt ?? ""));
    },
    [graph, question, scope, pending, terms, commit],
  );

  const undo = useCallback(() => {
    setPending(null);
    setSteps((prior) => {
      const index = prior.map((s) => s.status).lastIndexOf("applied");

      // A checkpoint is not something somebody did, so there is nothing to take
      // back — and reverting one would drop everything it stands for.
      return index < 0 || isCheckpoint(prior[index])
        ? prior
        : prior.map((s, i) => (i === index ? { ...s, status: "reverted" as const } : s));
    });
  }, []);

  /** Re-apply what undo last unwound. Undo always takes the newest applied
   *  step, so everything reverted sits in a run at the end and redo is simply
   *  the first of that run. */
  const redo = useCallback(() => {
    setPending(null);
    setSteps((prior) => {
      const next = prior.map((s) => s.status).lastIndexOf("applied") + 1;

      return next < prior.length && prior[next].status === "reverted"
        ? prior.map((s, i) => (i === next ? { ...s, status: "applied" as const } : s))
        : prior;
    });
  }, []);

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

  /** Apply an effect the registry returned: context first, then a step if it
   *  wrote. A refusal is said in the strip — the same channel as a repaired
   *  log — so a blocked action is an answer rather than a silent no-op. A
   *  lock refusal keeps its offers separate; the page turns them into strip
   *  buttons (unlock / fork). */
  const enact = (name: string, args: Args = {}): Effect | null => {
    const outcome = run(name, { graph, view, picked, locked }, args);
    if ("refused" in outcome) {
      sayRefuse(outcome);
      return null;
    }

    if (outcome.open !== undefined) setView(outcome.open);
    if (outcome.focus !== undefined) setPicked(outcome.focus);
    if (writes(outcome)) {
      commit(makeStep(outcome.say ?? name, name, outcome.mutations));
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
     *  it downloads. */
    save: (others: Record<string, { graph: Graph; steps: number }> = {}) =>
      store.writeOut(
        Object.keys(others).length
          ? file.write(graph, bound, stepsIn(steps), others)
          : written,
        titleOf(graph),
      ),

    /** Re-read the bound file into the session. What the working-session
     *  control offers when the file changed underneath. */
    reopen: async () => {
      const text = await store.readBound();
      if (text === null) return null;

      return loadFrom(text);
    },

    clearTrouble: () => sayTrouble(null),

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
      setPending(null);
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
      setPending(null);

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
    setPending(null);

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
    // Queries — readable state, off the action surface.
    nameTaken: (parent: string | null, label: string, except: string | null = null) =>
      !nameFree(graph, parent, label, except),
    stepCount: stepsIn(steps),
    state: file.hash(written),
    saving,
    drifted,
    trouble,
    offer,
    ...act,
  };
}
