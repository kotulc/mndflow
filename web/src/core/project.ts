/** The application state, and every action that changes it.
 *
 *  There is no server. A step log lives in this tab, the graph is folded from
 *  it on every render, and undo flips the last step rather than computing an
 *  inverse — so answered questions and hand edits unwind by the same
 *  mechanism.
 *
 *  What an answer *means* lives in `turn`; this only wires it to state. */

import { useCallback, useEffect, useMemo, useState } from "react";

import * as embed from "./embed";
import { childrenOf, descendsFrom, fold, isGroup, touched } from "./fold";
import { arrange, type Arrangement } from "./layout";
import * as router from "./router";
import * as store from "./store";
import { answer, pendingQuestion, type Pending } from "./turn";
import { newId, node as makeNode, step as makeStep, type Mutation, type Step } from "./types";
import { getDomain } from "./workflows";

/** Consecutive turns on one operation before the loop moves on. */
const RHYTHM = 2;

export function useProject() {
  const [steps, setSteps] = useState<Step[]>(store.load);
  const [scope, setScope] = useState<string | null>(null);
  /** The group whose contents fill the canvas. null is the project itself. */
  const [view, setView] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  // The log is the only thing worth saving; the graph is folded from it.
  useEffect(() => store.save(steps), [steps]);

  // Warm the catalogue once, so the first thing typed is not also the first
  // thing that waits on the model.
  useEffect(() => embed.warm(router.templatePhrases()), []);

  const graph = useMemo(() => fold(steps), [steps]);
  const applied = useMemo(() => steps.filter((s) => s.status === "applied"), [steps]);
  const last = applied.length ? applied[applied.length - 1] : null;
  const terms = getDomain(graph.template).terms;

  // Every name and body in the project, so suggestions and affinity have
  // vectors ready by the time anything is scored against them.
  useEffect(() => {
    embed.warm(Object.values(graph.nodes).flatMap((n) => [n.label, n.body]));
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

  const commit = useCallback((step: Step) => setSteps((prior) => [...prior, step]), []);

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

      return index < 0
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

  const name = (id: string) => graph.nodes[id]?.label ?? id;

  /** Groups from the project down to the open one — the breadcrumb, and the
   *  set the explorer keeps expanded. Everything else stays collapsed, so
   *  opening one layer closes the last. */
  const path = useMemo(() => {
    const trail: string[] = [];
    let cursor = view;

    while (cursor && graph.nodes[cursor]) {
      trail.unshift(cursor);
      cursor = graph.nodes[cursor].parent;
    }

    return trail;
  }, [graph, view]);

  /** Selecting shows a thing among its siblings — the layer it lives in, not
   *  the layer it contains. Going *into* a group is a separate gesture, so a
   *  glance never costs you your place. */
  const select = useCallback(
    (id: string | null) => {
      setScope(id);
      if (!id) return setView(null);

      const node = graph.nodes[id];
      if (node) setView(node.parent);
    },
    [graph],
  );

  /** Step into a node, making its contents the layer. Only something that
   *  holds anything can be entered — an empty one has nothing to show. */
  const open = useCallback(
    (id: string) => {
      const node = graph.nodes[id];
      if (!node) return;

      setScope(id);
      setView(isGroup(graph, id) ? id : node.parent);
    },
    [graph],
  );

  /** Leave the open group for the one containing it. */
  const up = useCallback(() => {
    const parent = view ? (graph.nodes[view]?.parent ?? null) : null;
    setView(parent);
    setScope(parent);
  }, [graph, view]);

  const act = {
    create: (label: string, parent: string | null) =>
      commit(makeStep(`new: ${label}`, "create", [{
        op: "add_node",
        node: makeNode(label, { parent, type: terms.node }),
      }])),

    remove: (id: string) => {
      // Never leave the selection or the open layer pointing at something gone.
      if (scope && descendsFrom(graph, scope, id)) setScope(null);
      if (view && descendsFrom(graph, view, id)) setView(graph.nodes[id]?.parent ?? null);
      commit(makeStep(`delete: ${name(id)}`, "delete", [{ op: "delete_node", id }]));
    },

    rename: (id: string, label: string) =>
      label.trim() &&
      commit(makeStep(`rename: ${label}`, "rename",
                      [{ op: "update_node", id, label: label.trim() }])),

    retype: (id: string, type: string) =>
      commit(makeStep(`type: ${type}`, "retype", [{ op: "update_node", id, type }])),

    move: (id: string, parent: string | null) =>
      !descendsFrom(graph, parent, id) &&
      commit(makeStep(`move: ${name(id)}`, "move", [{ op: "move_node", id, parent }])),

    place: (id: string, x: number, y: number) =>
      commit(makeStep(`place: ${name(id)}`, "place", [{ op: "place_node", id, x, y }])),

    /** Several at once — a selection dragged together is one action. */
    placeMany: (moved: { id: string; x: number; y: number }[]) =>
      moved.length &&
      commit(makeStep(
        moved.length === 1 ? `place: ${name(moved[0].id)}` : `place ${moved.length} together`,
        "place",
        moved.map(({ id, x, y }) => ({ op: "place_node" as const, id, x, y })),
      )),

    /** Lay the open layer out afresh, ignoring where things currently sit. */
    arrange: (kind: Arrangement) => {
      const here = childrenOf(graph, view);
      const spots = arrange(graph, here, kind);
      const mutations = here.map((node) => ({
        op: "place_node" as const, id: node.id, ...spots[node.id],
      }));

      return mutations.length && commit(makeStep(`arrange: ${kind}`, "arrange", mutations));
    },

    write: (id: string, body: string) =>
      commit(makeStep(`edit: ${name(id)}`, "edit", [{ op: "set_body", id, body }])),

    link: (source: string, target: string, from?: string, to?: string) =>
      source !== target &&
      commit(makeStep(`link: ${name(source)}`, "link", [{
        op: "link_nodes",
        edge: { id: newId("e"), source, target, relation: "", from, to },
      }])),

    /** Tie one end of a relation to a particular anchor. */
    reanchor: (id: string, from?: string, to?: string) =>
      commit(makeStep(`anchor: ${graph.edges[id]?.relation || "relation"}`, "anchor",
                      [{ op: "reanchor_edge", id, from, to }])),

    /** Turn a relation around. */
    flip: (id: string) =>
      commit(makeStep(`flip: ${graph.edges[id]?.relation || "relation"}`, "flip",
                      [{ op: "flip_edge", id }])),

    relation: (id: string, relation: string) =>
      commit(makeStep(`relation: ${relation}`, "relation",
                      [{ op: "update_edge", id, relation: relation.trim() }])),

    unlink: (id: string) => commit(makeStep("unlink", "unlink", [{ op: "delete_edge", id }])),

    renameProject: (title: string) =>
      title.trim() &&
      commit(makeStep(`rename project: ${title}`, "project",
                      [{ op: "set_title", title: title.trim() }])),

    /** Put one node inside another. Nothing else is needed: holding something
     *  is what makes a node a group. */
    nest: (id: string, parent: string) => {
      if (id === parent || descendsFrom(graph, parent, id)) return;

      commit(makeStep(`into: ${name(parent)}`, "nest", [{ op: "move_node", id, parent }]));
    },

    /** Push a node out past the edge of the layer it is in, into whatever
     *  contains that layer. */
    promote: (id: string, parent: string | null) =>
      graph.nodes[id] && graph.nodes[id].parent !== parent &&
      commit(makeStep(`out of layer: ${name(id)}`, "promote",
                      [{ op: "move_node", id, parent }])),

    /** Take an object out of its group and set it down on the open layer. One
     *  step, so undo puts it back where it was. */
    lift: (id: string, x: number, y: number) => {
      const node = graph.nodes[id];
      if (!node || node.parent === view) return;

      commit(makeStep(`out: ${name(id)}`, "lift", [
        { op: "move_node", id, parent: view },
        { op: "place_node", id, x, y },
      ]));
    },

    /** Make something where the user pointed, rather than where layout would
     *  have put it. */
    createAt: (label: string, x: number, y: number) =>
      commit(makeStep(`new: ${label}`, "create", [{
        op: "add_node",
        node: makeNode(label, { parent: view, type: terms.node, x, y }),
      }])),

    /** A link dragged into empty space: make the far end, and attach it. */
    sprout: (from: string, label: string, x: number, y: number) => {
      const fresh = makeNode(label, { parent: view, type: terms.node, x, y });

      commit(makeStep(`grew: ${label}`, "sprout", [
        { op: "add_node", node: fresh },
        { op: "link_nodes", edge: { id: newId("e"), source: from, target: fresh.id, relation: "" } },
      ]));
    },

    /** A new kind of relation, offered from then on. */
    addRelation: (name: string) =>
      name.trim() && !graph.relations.includes(name.trim()) &&
      commit(makeStep(`relation kind: ${name.trim()}`, "relations",
                      [{ op: "add_relation", name: name.trim() }])),

    /** Rename a kind, and every edge already using it, in one step. */
    renameRelation: (from: string, to: string) =>
      to.trim() && to.trim() !== from &&
      commit(makeStep(`renamed "${from}" to "${to.trim()}"`, "relations",
                      [{ op: "rename_relation", from, to: to.trim() }])),

    /** Drop a kind. Edges using it stay, unnamed — deleting a label should not
     *  quietly delete the connections it described. */
    dropRelation: (name: string) =>
      commit(makeStep(`dropped "${name}"`, "relations", [{ op: "drop_relation", name }])),

    save: () => store.exportSteps(steps, graph.title),

    load: (text: string) => {
      const loaded = store.importSteps(text);
      if (!loaded) return false;

      setSteps(loaded);
      setScope(null);
      setView(null);
      setPending(null);

      return true;
    },

    reset: () => {
      setSteps([]);
      setScope(null);
      setView(null);
      setPending(null);
    },
  };

  return {
    graph,
    steps,
    scope,
    view,
    path,
    select,
    open,
    up,
    question,
    terms,
    touched: touched(last),
    undoable: applied.length > 0,
    redoable: steps.some((s) => s.status === "reverted"),
    children: (parent: string | null) => childrenOf(graph, parent),
    turn,
    undo,
    redo,
    ...act,
  };
}
