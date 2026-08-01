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
import { blocksOf, childrenOf, descendsFrom, fold, isPort, isRef, nextPortNum } from "./fold";
import * as router from "./router";
import * as store from "./store";
import { answer, pendingQuestion, type Pending } from "./turn";
import {
  attr as makeAttr, edge as makeEdge, node as makeNode, step as makeStep,
  type Dir, type End, type Flow, type Side, type Step,
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

    /** A reference has no name of its own, so renaming one renames the node it
     *  stands in for — there is only ever one thing being named. */
    rename: (id: string, label: string) => {
      const real = graph.nodes[id]?.ref ?? id;

      return label.trim() &&
        commit(makeStep(`rename: ${label}`, "rename",
                        [{ op: "update_node", id: real, label: label.trim() }]));
    },

    retype: (id: string, type: string) =>
      commit(makeStep(`type: ${type}`, "retype", [{ op: "update_node", id, type }])),

    move: (id: string, parent: string | null) =>
      !descendsFrom(graph, parent, id) &&
      commit(makeStep(`move: ${name(id)}`, "move", [{ op: "move_node", id, parent }])),

    place: (id: string, x: number, y: number) =>
      commit(makeStep(`place: ${name(id)}`, "place", [{ op: "place_node", id, x, y }])),

    /** Where a drag came to rest: the positions things landed at, and any group
     *  they joined or left by landing there.
     *
     *  One step, because it was one gesture — a card dropped inside a boundary
     *  moved *and* joined, and undo should take back both. Several at once for
     *  the same reason: a selection dragged together is one action, and so is a
     *  group's members moving with its boundary. */
    placeMany: (moved: { id: string; x: number; y: number }[], what = "",
                membership: { attr: string; holder: string; join: boolean }[] = []) =>
      (moved.length || membership.length) &&
      commit(makeStep(
        what || (membership.length
          ? `${membership[0].join ? "into" : "out of"} a group`
          : moved.length === 1
            ? `place: ${name(moved[0].id)}`
            : `place ${moved.length} together`),
        "place",
        [
          ...moved.map(({ id, x, y }) => ({ op: "place_node" as const, id, x, y })),
          ...membership.map(({ attr, holder, join }) => join
            ? { op: "attach_attr" as const, id: attr, holder }
            : { op: "detach_attr" as const, id: attr, holder }),
        ],
      )),

    write: (id: string, body: string) =>
      commit(makeStep(`edit: ${name(id)}`, "edit", [{ op: "set_body", id, body }])),

    /** Slide an interface along its parent's frame edge. It never comes off:
     *  an interface is one for as long as it exists. */
    setPort: (id: string, side: Side, at: number) =>
      commit(makeStep(`port: ${name(id)}`, "port", [{ op: "set_port", id, side, at }])),

    markPort: (id: string, flow: Flow | null) =>
      commit(makeStep(`mark: ${flow ?? "none"}`, "port", [{ op: "mark_port", id, flow }])),

    /** A bare interface, from right-clicking a frame edge. The one way to get
     *  an interface without a relationship attached to it. */
    addPort: (parent: string | null, side: Side, at: number) => {
      const port = makeNode("", { parent, side, at, num: nextPortNum(graph, parent) });

      commit(makeStep("new interface", "port", [{ op: "add_node", node: port }]));

      return port.id;
    },

    /** A relationship with nowhere in particular to attach: its interfaces are
     *  implied at the sides facing each other. What a chip or a workflow makes,
     *  where there was no gesture to take a position from. */
    link: (source: string, target: string) =>
      source !== target &&
      commit(makeStep(`link: ${name(source)}`, "link",
                      [{ op: "link_nodes", edge: makeEdge(source, target) }])),

    /** A relationship drawn by hand, and the interfaces at both its ends. Each
     *  end is either an interface the drag landed on or a place on a border to
     *  put one, so a relationship always has both — made in one step, so undo
     *  takes back the whole gesture rather than half of it. */
    wire: (a: End, b: End) => {
      if (a.node === b.node) return;

      const made: { op: "add_node"; node: ReturnType<typeof makeNode> }[] = [];
      const anchor = (end: End) => {
        if (end.port) return end.port;
        if (!end.seat) return undefined;

        const port = makeNode("", { parent: end.node, ...end.seat,
                                    num: nextPortNum(graph, end.node) });
        made.push({ op: "add_node", node: port });

        return port.id;
      };

      // Both before the edge, so it can name the ports it was made with.
      const from = anchor(a);
      const to = anchor(b);

      commit(makeStep(`link: ${name(a.node)}`, "link", [
        ...made,
        { op: "link_nodes", edge: makeEdge(a.node, b.node, { from, to }) },
      ]));
    },

    setDir: (id: string, dir: Dir) =>
      commit(makeStep(`direction: ${dir}`, "direction", [{ op: "set_dir", id, dir }])),

    /** Turn a relation around. */
    flip: (id: string) =>
      commit(makeStep(`flip: ${graph.edges[id]?.relation || "relation"}`, "flip",
                      [{ op: "flip_edge", id }])),

    relation: (id: string, relation: string) =>
      commit(makeStep(`relation: ${relation}`, "relation",
                      [{ op: "update_edge", id, relation: relation.trim() }])),

    /** Delete a relationship, and the interfaces it put at its ends with it —
     *  rewiring a diagram should leave no trail of empty squares behind.
     *
     *  Two things are never collateral: an interface another relationship still
     *  attaches to, and one with contents of its own. Those are left standing,
     *  bare. */
    unlink: (id: string) => {
      if (picked?.id === id) setPicked(null);

      const edge = graph.edges[id];
      const spare = (port: string | undefined): port is string =>
        Boolean(port) && isPort(graph.nodes[port!]) &&
        !childrenOf(graph, port!).length &&
        !Object.values(graph.edges)
          .some((e) => e.id !== id && (e.from === port || e.to === port));

      commit(makeStep("unlink", "unlink", [
        { op: "delete_edge", id },
        ...[edge?.from, edge?.to].filter(spare).map((port) => ({
          op: "delete_node" as const, id: port,
        })),
      ]));
    },

    renameProject: (title: string) =>
      title.trim() &&
      commit(makeStep(`rename project: ${title}`, "project",
                      [{ op: "set_title", title: title.trim() }])),

    /** A placeholder for something that lives elsewhere in the project. It is
     *  an ordinary node from here on: it moves, relates, and carries
     *  attributes of its own. */
    refer: (target: string, x?: number, y?: number) => {
      const spot = x === undefined || y === undefined ? {} : { x, y };
      const stand = makeNode("", { parent: view, ref: target, ...spot });

      commit(makeStep(`reference: ${name(target)}`, "reference",
                      [{ op: "add_node", node: stand }]));
    },

    /** Go to where a node actually lives, and mark it there. What a reference
     *  offers instead of contents of its own. */
    reveal: (id: string) => {
      const node = graph.nodes[id];
      if (!node) return;

      setView(node.parent);
      setPicked({ kind: "node", id });
    },

    /** Put one node inside another. Nothing else is needed: holding a block is
     *  what makes a node a container. A reference holds nothing — whatever is
     *  inside the thing it points at is inside the thing it points at. */
    nest: (id: string, parent: string) => {
      if (id === parent || descendsFrom(graph, parent, id)) return;
      if (isRef(graph.nodes[parent])) return;

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

    /** A relationship dragged into empty space: make the far end, and attach.
     *  Both ends get their interface like any drawn relationship — the near one
     *  where the drag started, the far one on the side facing back towards it. */
    sprout: (a: End, label: string, x: number, y: number, side: Side) => {
      const fresh = makeNode(label, { parent: view, type: terms.node, x, y });
      const near = a.port ? null
                          : a.seat && makeNode("", { parent: a.node, ...a.seat,
                                                     num: nextPortNum(graph, a.node) });
      // The far node is new, so its first interface is always number one.
      const far = makeNode("", { parent: fresh.id, side, at: 0.5, num: 1 });

      commit(makeStep(`grew: ${label}`, "sprout", [
        ...(near ? [{ op: "add_node" as const, node: near }] : []),
        { op: "add_node", node: fresh },
        { op: "add_node", node: far },
        { op: "link_nodes",
          edge: makeEdge(a.node, fresh.id, { from: a.port ?? near?.id, to: far.id }) },
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
