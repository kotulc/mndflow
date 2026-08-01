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
import { blocksOf, childrenOf, descendsFrom, fold, touched } from "./fold";
import * as router from "./router";
import * as store from "./store";
import { answer, pendingQuestion, type Pending } from "./turn";
import {
  attr as makeAttr, edge as makeEdge, newId, node as makeNode, step as makeStep,
  type Dir, type Flow, type Side, type Step,
} from "./types";
import { getDomain } from "./workflows";

/** Consecutive turns on one operation before the loop moves on. */
const RHYTHM = 2;

/** What the canvas currently has selected. The layer itself is never in here —
 *  an empty selection is what shows the layer's own properties. */
export type Picked = { kind: "node" | "edge" | "attr"; id: string } | null;

export function useProject() {
  const [steps, setSteps] = useState<Step[]>(store.load);
  /** The layer the canvas is drawing. null is the project itself. */
  const [view, setView] = useState<string | null>(null);
  const [picked, setPicked] = useState<Picked>(null);
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

  /** Whatever the conversation should be about: the canvas selection if there
   *  is one, otherwise the layer being looked at. */
  const scope = picked?.kind === "node" ? picked.id : view;

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

  /** Nodes from the project down to the open one — the breadcrumb, and the
   *  set the explorer keeps expanded. */
  const path = useMemo(() => {
    const trail: string[] = [];
    let cursor = view;

    while (cursor && graph.nodes[cursor]) {
      trail.unshift(cursor);
      cursor = graph.nodes[cursor].parent;
    }

    return trail;
  }, [graph, view]);

  /** Go into something: the explorer's every click, and the canvas's
   *  double-click. Anything can be entered — a block with nothing in it still
   *  has a frame, its ports, and room to start building. */
  const open = useCallback((id: string | null) => {
    setPicked(null);
    setView(id && id !== "" ? id : null);
  }, []);

  /** Select on the canvas. The layer never changes: selecting is a glance, and
   *  going deeper is the deliberate second gesture. */
  const pick = useCallback((next: Picked) => setPicked(next), []);

  /** Leave the open layer for the one containing it. */
  const up = useCallback(() => {
    setPicked(null);
    setView(view ? (graph.nodes[view]?.parent ?? null) : null);
  }, [graph, view]);

  const act = {
    create: (label: string, parent: string | null) =>
      commit(makeStep(`new: ${label}`, "create", [{
        op: "add_node",
        node: makeNode(label, { parent, type: terms.node }),
      }])),

    remove: (id: string) => {
      // Never leave the selection or the open layer pointing at something gone.
      if (picked && picked.id === id) setPicked(null);
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

    /** Several at once — a selection dragged together is one action, and so is
     *  a group's members moving with its boundary. */
    placeMany: (moved: { id: string; x: number; y: number }[], what = "") =>
      moved.length &&
      commit(makeStep(
        what || (moved.length === 1
          ? `place: ${name(moved[0].id)}`
          : `place ${moved.length} together`),
        "place",
        moved.map(({ id, x, y }) => ({ op: "place_node" as const, id, x, y })),
      )),

    write: (id: string, body: string) =>
      commit(makeStep(`edit: ${name(id)}`, "edit", [{ op: "set_body", id, body }])),

    /** Put a node on its parent's frame edge, or slide one already there. */
    setPort: (id: string, side: Side | null, at: number | null) =>
      commit(makeStep(side ? `port: ${name(id)}` : `off the edge: ${name(id)}`, "port",
                      [{ op: "set_port", id, side, at }])),

    markPort: (id: string, flow: Flow | null) =>
      commit(makeStep(`mark: ${flow ?? "none"}`, "port", [{ op: "mark_port", id, flow }])),

    /** A bare interface, from right-clicking a frame edge. Deliberate, so it
     *  is a node of its own rather than something derived from a relation. */
    addPort: (parent: string | null, side: Side, at: number) => {
      const port = makeNode("", { parent, side, at });

      commit(makeStep("new interface", "port", [{ op: "add_node", node: port }]));

      return port.id;
    },

    link: (source: string, target: string, from?: string, to?: string) =>
      source !== target &&
      commit(makeStep(`link: ${name(source)}`, "link",
                      [{ op: "link_nodes", edge: makeEdge(source, target, { from, to }) }])),

    /** A right drag from a frame edge: the interface it started from and the
     *  relationship it drew, made together so undo takes back the gesture
     *  rather than half of it. */
    wire: (parent: string, side: Side, at: number, target: string) => {
      if (parent === target) return;

      const port = makeNode("", { parent, side, at });

      commit(makeStep(`link: ${name(parent)}`, "link", [
        { op: "add_node", node: port },
        { op: "link_nodes", edge: makeEdge(parent, target, { from: port.id }) },
      ]));
    },

    /** Tie one end of a relation to a particular interface. */
    reanchor: (id: string, from?: string, to?: string) =>
      commit(makeStep(`anchor: ${graph.edges[id]?.relation || "relation"}`, "anchor",
                      [{ op: "reanchor_edge", id, from, to }])),

    setDir: (id: string, dir: Dir) =>
      commit(makeStep(`direction: ${dir}`, "direction", [{ op: "set_dir", id, dir }])),

    /** Turn a relation around. */
    flip: (id: string) =>
      commit(makeStep(`flip: ${graph.edges[id]?.relation || "relation"}`, "flip",
                      [{ op: "flip_edge", id }])),

    relation: (id: string, relation: string) =>
      commit(makeStep(`relation: ${relation}`, "relation",
                      [{ op: "update_edge", id, relation: relation.trim() }])),

    unlink: (id: string) => {
      if (picked?.id === id) setPicked(null);
      commit(makeStep("unlink", "unlink", [{ op: "delete_edge", id }]));
    },

    renameProject: (title: string) =>
      title.trim() &&
      commit(makeStep(`rename project: ${title}`, "project",
                      [{ op: "set_title", title: title.trim() }])),

    /** Put one node inside another. Nothing else is needed: holding a block is
     *  what makes a node a container. */
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

    /** Take an object out of its container and set it down on the open layer.
     *  One step, so undo puts it back where it was. */
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

    /** A link dragged into empty space: make the far end, and attach it. The
     *  near end may be an interface the same gesture is creating. */
    sprout: (from: string, label: string, x: number, y: number, port?:
             { parent: string; side: Side; at: number }) => {
      const fresh = makeNode(label, { parent: view, type: terms.node, x, y });
      const anchor = port ? makeNode("", { parent: port.parent, side: port.side, at: port.at })
                          : null;

      commit(makeStep(`grew: ${label}`, "sprout", [
        ...(anchor ? [{ op: "add_node" as const, node: anchor }] : []),
        { op: "add_node", node: fresh },
        { op: "link_nodes", edge: makeEdge(from, fresh.id, { from: anchor?.id }) },
      ]));
    },

    /** A new kind of relation, offered from then on. */
    addRelation: (label: string) =>
      label.trim() && !graph.relations.includes(label.trim()) &&
      commit(makeStep(`relation kind: ${label.trim()}`, "relations",
                      [{ op: "add_relation", name: label.trim() }])),

    /** Rename a kind, and every edge already using it, in one step. */
    renameRelation: (from: string, to: string) =>
      to.trim() && to.trim() !== from &&
      commit(makeStep(`renamed "${from}" to "${to.trim()}"`, "relations",
                      [{ op: "rename_relation", from, to: to.trim() }])),

    /** Drop a kind. Edges using it stay, unnamed — deleting a label should not
     *  quietly delete the connections it described. */
    dropRelation: (label: string) =>
      commit(makeStep(`dropped "${label}"`, "relations", [{ op: "drop_relation", name: label }])),

    /** A property of one object, or of several. Sharing is all a group is. */
    addAttr: (holder: string, label: string) =>
      label.trim() &&
      commit(makeStep(`attribute: ${label.trim()}`, "attribute",
                      [{ op: "add_attr", attr: makeAttr(label.trim(), { holders: [holder] }) }])),

    updateAttr: (id: string, patch: { name?: string; value?: string; tags?: string[];
                                      color?: string }) =>
      commit(makeStep(`attribute: ${patch.name ?? graph.attrs[id]?.name ?? ""}`, "attribute",
                      [{ op: "update_attr", id, ...patch }])),

    attachAttr: (id: string, holder: string) =>
      commit(makeStep(`attribute on: ${name(holder)}`, "attribute",
                      [{ op: "attach_attr", id, holder }])),

    detachAttr: (id: string, holder: string) =>
      commit(makeStep(`attribute off: ${name(holder)}`, "attribute",
                      [{ op: "detach_attr", id, holder }])),

    dropAttr: (id: string) => {
      if (picked?.kind === "attr" && picked.id === id) setPicked(null);
      commit(makeStep(`dropped attribute`, "attribute", [{ op: "delete_attr", id }]));
    },

    /** Turn a selection into a group: one attribute they all hold, drawn as a
     *  boundary. Purely visual — no node's parent changes. */
    group: (members: string[]) =>
      members.length > 1 &&
      commit(makeStep(`group: ${members.length} nodes`, "group", [{
        op: "add_attr",
        attr: makeAttr("", { holders: members, group: true }),
      }])),

    save: () => store.exportSteps(steps, graph.title),

    load: (text: string) => {
      const loaded = store.importSteps(text);
      if (!loaded) return false;

      setSteps(loaded);
      setView(null);
      setPicked(null);
      setPending(null);

      return true;
    },

    reset: () => {
      setSteps([]);
      setView(null);
      setPicked(null);
      setPending(null);
    },
  };

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
    touched: touched(last),
    undoable: applied.length > 0,
    redoable: steps.some((s) => s.status === "reverted"),
    children: (parent: string | null) => childrenOf(graph, parent),
    blocks: (parent: string | null) => blocksOf(graph, parent),
    turn,
    undo,
    redo,
    ...act,
  };
}
