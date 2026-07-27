/** The application state, and every action that changes it.
 *
 *  There is no server. A step log lives in this tab, the graph is folded from
 *  it on every render, and undo flips the last step rather than computing an
 *  inverse — so answered questions and hand edits unwind by the same
 *  mechanism.
 *
 *  What an answer *means* lives in `turn`; this only wires it to state. */

import { useCallback, useEffect, useMemo, useState } from "react";

import { childrenOf, descendsFrom, fold, touched } from "./fold";
import * as router from "./router";
import * as store from "./store";
import { answer, pendingQuestion, type Pending } from "./turn";
import { newId, node as makeNode, step as makeStep,
         type Kind, type Mutation, type Step } from "./types";
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

  const graph = useMemo(() => fold(steps), [steps]);
  const applied = useMemo(() => steps.filter((s) => s.status === "applied"), [steps]);
  const last = applied.length ? applied[applied.length - 1] : null;
  const terms = getDomain(graph.template).terms;

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
    (said: string) => {
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

  /** Selecting and opening are one gesture: a group is a place you go into, an
   *  object is a thing you look at. Both views share this, which is what keeps
   *  the explorer and the canvas pointing at the same thing. */
  const select = useCallback(
    (id: string | null) => {
      setScope(id);
      if (!id) return setView(null);

      const node = graph.nodes[id];
      if (node) setView(node.kind === "group" ? id : node.parent);
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
    create: (label: string, parent: string | null, kind: Kind = "object") =>
      commit(makeStep(`new: ${label}`, "create", [{
        op: "add_node",
        node: makeNode(label, { parent, kind, type: kind === "group" ? terms.group : terms.node }),
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

    regroup: (id: string, kind: Kind) =>
      commit(makeStep(`${kind}: ${name(id)}`, "regroup", [{ op: "update_node", id, kind }])),

    move: (id: string, parent: string | null) =>
      !descendsFrom(graph, parent, id) &&
      commit(makeStep(`move: ${name(id)}`, "move", [{ op: "move_node", id, parent }])),

    place: (id: string, x: number, y: number) =>
      commit(makeStep(`place: ${name(id)}`, "place", [{ op: "place_node", id, x, y }])),

    write: (id: string, body: string) =>
      commit(makeStep(`edit: ${name(id)}`, "edit", [{ op: "set_body", id, body }])),

    link: (source: string, target: string) =>
      source !== target &&
      commit(makeStep(`link: ${name(source)}`, "link", [{
        op: "link_nodes",
        edge: { id: newId("e"), source, target, relation: "" },
      }])),

    relation: (id: string, relation: string) =>
      commit(makeStep(`relation: ${relation}`, "relation",
                      [{ op: "update_edge", id, relation: relation.trim() }])),

    unlink: (id: string) => commit(makeStep("unlink", "unlink", [{ op: "delete_edge", id }])),

    renameProject: (title: string) =>
      title.trim() &&
      commit(makeStep(`rename project: ${title}`, "project",
                      [{ op: "set_title", title: title.trim() }])),

    /** Put one object inside another, promoting the target to a group in the
     *  same step — dropping a card on a card is one action to undo, not two. */
    nest: (id: string, parent: string) => {
      if (id === parent || descendsFrom(graph, parent, id)) return;

      const target = graph.nodes[parent];
      const mutations: Mutation[] = [{ op: "move_node", id, parent }];
      if (target && target.kind !== "group") {
        mutations.push({ op: "update_node", id: parent, kind: "group", type: terms.group });
      }

      commit(makeStep(`into: ${name(parent)}`, "nest", mutations));
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

    save: () => store.exportSteps(steps, graph.title),

    open: (text: string) => {
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
    up,
    question,
    terms,
    touched: touched(last),
    undoable: applied.length > 0,
    children: (parent: string | null) => childrenOf(graph, parent),
    turn,
    undo,
    ...act,
  };
}
