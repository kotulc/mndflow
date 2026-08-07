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
import {
  actual, blocksOf, childrenOf, descendsFrom, fold, isPort, isProxy, membersOf, nameFree, nextNum,
  proxyIn, titleOf,
} from "./fold";
import * as router from "./router";
import * as store from "./store";
import { answer, pendingQuestion, type Pending } from "./turn";
import {
  ROOT, edge as makeEdge, element as makeElement, step as makeStep,
  type Axis, type Dir, type End, type Flow, type Kind, type Mutation, type Side,
  type Spot, type Step,
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
  const terms = getDomain(graph.domain).terms;

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

  const name = (id: string) => graph.elements[id]?.label ?? id;

  /** Members going out of one attribute.
   *
   *  A group left holding a single member goes altogether rather than shrinking
   *  around it: a boundary drawn round one card says nothing the card does not
   *  already say, and one left over from a set that has scattered is litter.
   *  Grouping a single block *deliberately* is a different act — a way of
   *  marking it — and is allowed. What is refused is decaying into one. */
  const parting = (group: string, gone: string[]): Mutation[] => {
    const held = membersOf(graph, group).map((m) => m.id);
    const out = held.filter((h) => gone.includes(h));
    if (!out.length) return [];

    if (held.length - out.length < 2) return [{ op: "delete_element", id: group }];

    return out.map((id) => ({ op: "leave_group", id, group }));
  };

  /** The same, across every annotation these objects are drawn in. Annotations
   *  are local to a layer, so leaving one drops them; a plain attribute
   *  describes the object itself and travels with it. */
  const partings = (gone: string[]): Mutation[] => [
    ...Object.values(graph.elements)
      .filter((e) => e.element === "group")
      .flatMap((g) => parting(g.id, gone)),
    // A tie is a relationship, so letting one go is deleting it.
    ...Object.values(graph.edges)
      .filter((e) => e.kind === "tie" && gone.includes(e.target))
      .map((e) => ({ op: "delete_edge" as const, id: e.id })),
  ];

  /** What a node sheds by moving to another layer: its annotations, and
   *  the relationships joining it to whatever is staying behind.
   *
   *  Everything travelling with it is kept whole. Its children go too, and so
   *  does the wiring among them and from them to its own interfaces — an
   *  interface draws on both sides of its node, so a child wired to one is
   *  internal wiring, drawn inside the very layer that is moving. What breaks
   *  is only what had one end here and the other there. */
  const shed = (id: string, parent: string | null) => {
    if (!graph.elements[id] || graph.elements[id].parent === parent) return [];

    return [
      ...partings([id]),
      ...Object.values(graph.edges)
        .filter((edge) => {
          const far = edge.source === id ? edge.target
                    : edge.target === id ? edge.source
                    : null;

          return far !== null && !descendsFrom(graph, far, id);
        })
        .map((edge) => ({ op: "delete_edge" as const, id: edge.id })),
    ];
  };

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
    setView(view ? (graph.elements[view]?.parent ?? null) : null);
  }, [graph, view]);

  const act = {
    /** A name has to be free among its siblings: where something sits in the
     *  tree is what makes it unique in the project, so two things in one layer
     *  cannot share a name. */
    create: (label: string, parent: string | null) =>
      nameFree(graph, parent, label) &&
      commit(makeStep(`new: ${label}`, "create", [{
        op: "add_element",
        element: makeElement(label, {
          parent, type: terms.node, num: nextNum(graph, parent, "block"),
        }),
      }])),

    remove: (id: string) => {
      // Never leave the selection or the open layer pointing at something gone.
      if (picked && picked.id === id) setPicked(null);
      if (view && descendsFrom(graph, view, id)) setView(graph.elements[id]?.parent ?? null);
      // Its contents go with it, so an annotation drawn round any of them loses
      // those members in the same step — and goes itself if that empties it.
      const gone = Object.keys(graph.elements).filter((n) => descendsFrom(graph, n, id));

      commit(makeStep(`delete: ${name(id)}`, "delete",
                      [{ op: "delete_element", id }, ...partings(gone)]));
    },

    /** A reference has no name of its own, so renaming one renames the node it
     *  stands in for — there is only ever one thing being named. */
    rename: (id: string, label: string) => {
      const real = actual(graph, id)?.id ?? id;
      const parent = graph.elements[real]?.parent ?? null;

      return label.trim() && nameFree(graph, parent, label, real) &&
        commit(makeStep(`rename: ${label}`, "rename",
                        [{ op: "update_element", id: real, label: label.trim() }]));
    },

    retype: (id: string, type: string) =>
      commit(makeStep(`type: ${type}`, "retype", [{ op: "update_element", id, type }])),

    move: (id: string, parent: string | null) =>
      !descendsFrom(graph, parent, id) &&
      commit(makeStep(`move: ${name(id)}`, "move",
                      [{ op: "move_element", id, parent }, ...shed(id, parent)])),

    place: (id: string, x: number, y: number) =>
      commit(makeStep(`place: ${name(id)}`, "place", [{ op: "place_element", id, x, y }])),

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
          ...moved.map(({ id, x, y }) => ({ op: "place_element" as const, id, x, y })),
          ...membership.filter((m) => m.join)
            .map(({ attr, holder }) => ({ op: "join_group" as const, id: holder, group: attr })),
          // Leaving is not simply joining in reverse: a group the drag would
          // leave holding one member goes instead of shrinking. Taken a group
          // at a time, since several cards can walk out of one together.
          ...[...new Set(membership.filter((m) => !m.join).map((m) => m.attr))]
            .flatMap((id) => parting(
              id,
              membership.filter((m) => !m.join && m.attr === id).map((m) => m.holder),
            )),
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
      const port = makeElement("", { parent, side, at, num: nextNum(graph, parent, "block", true) });

      commit(makeStep("new interface", "port", [{ op: "add_element", element: port }]));

      return port.id;
    },

    /** A relationship with nowhere in particular to attach: its interfaces are
     *  implied at the sides facing each other. What a chip or a workflow makes,
     *  where there was no gesture to take a position from. */
    link: (source: string, target: string, kind: Kind = "untyped") =>
      source !== target &&
      commit(makeStep(`link: ${name(source)}`, "link",
                      [{ op: "link_elements", edge: makeEdge(source, target, { kind }) }])),

    /** A relationship drawn by hand.
     *
     *  It makes no interfaces. Where a line meets each card is worked out by
     *  the layer it is drawn in, so there is nothing about a drawn relationship
     *  worth writing down that the two nodes do not already say. An end that
     *  landed on an interface somebody made keeps it — that one is a choice,
     *  and choices are stored. */
    wire: (a: End, b: End, kind: Kind = "untyped") =>
      a.node !== b.node &&
      commit(makeStep(`link: ${name(a.node)}`, "link", [
        { op: "link_elements",
          edge: makeEdge(a.node, b.node, {
            from: a.port, to: b.port, kind, fromSide: a.side, toSide: b.side,
          }) },
      ])),

    /** Pin one end of a relationship to a wall, or hand it back to the layer. */
    setSide: (id: string, end: "from" | "to", side: Side | null) =>
      commit(makeStep(side ? `wall: ${side}` : "wall: auto", "side",
                      [{ op: "set_side", id, end, side }])),

    /** Turn a derived seat into an interface of its own, where it sits.
     *
     *  The one way a relationship's end becomes a node: it is worth naming, or
     *  worth putting something inside, or worth pinning where the arrangement
     *  would otherwise move it. Until then it is only a place on a border. */
    promotePort: (edge: string, end: "from" | "to", owner: string, side: Side, at: number) => {
      const port = makeElement("", {
        parent: owner, side, at, num: nextNum(graph, owner, "block", true),
      });

      commit(makeStep("promote interface", "port", [
        { op: "add_element", element: port },
        { op: "set_end", id: edge, end, port: port.id },
      ]));

      return port.id;
    },

    /** What a relationship's ends are and how it draws. */
    setKind: (id: string, kind: Kind) =>
      commit(makeStep(`kind: ${kind}`, "kind", [{ op: "set_kind", id, kind }])),

    setDir: (id: string, dir: Dir) =>
      commit(makeStep(`direction: ${dir}`, "direction", [{ op: "set_dir", id, dir }])),

    /** Which way the open layer reads. A setting, so it persists: it decides
     *  which sides a flow relationship attaches to and how its line is drawn,
     *  and says nothing at all about where cards go. */
    setAxis: (axis: Axis) =>
      commit(makeStep(`reads: ${axis}`, "axis", [{ op: "set_axis", layer: view, axis }])),

    /** Write down where an arrangement put everything.
     *
     *  An arrangement is an action, not a mode. What it computes becomes
     *  ordinary placement, so a card can be dragged about afterwards like any
     *  other — under a mode the drag would be recomputed away on the next
     *  frame. It changes nothing else: arranging as a grid is no reason for a
     *  layer to forget which way it reads. */
    arrange: (spots: { id: string; x: number; y: number }[] = [],
              notes: { id: string; x: number; y: number }[] = []) =>
      spots.length > 0 &&
      commit(makeStep("arrange", "arrange", [
        ...spots.map(({ id, x, y }) => ({ op: "place_element" as const, id, x, y })),
        // A note's place is beside what it describes, so laying the layer out
        // again moves it with them. One tied to nothing has nothing to follow
        // and stays where it was put.
        ...notes.map(({ id, x, y }) => ({ op: "place_attr" as const, id, x, y })),
      ])),

    /** Turn a relation around. */
    flip: (id: string) =>
      commit(makeStep(`flip: ${graph.edges[id]?.type || "relation"}`, "flip",
                      [{ op: "flip_edge", id }])),

    relation: (id: string, relation: string) =>
      commit(makeStep(`relation: ${relation}`, "relation",
                      [{ op: "update_edge", id, type: relation.trim() }])),

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
        Boolean(port) && isPort(graph.elements[port!]) &&
        !childrenOf(graph, port!).length &&
        !Object.values(graph.edges)
          .some((e) => e.id !== id && (e.from === port || e.to === port));

      commit(makeStep("unlink", "unlink", [
        { op: "delete_edge", id },
        ...[edge?.from, edge?.to].filter(spare).map((port) => ({
          op: "delete_element" as const, id: port,
        })),
      ]));
    },

    renameProject: (title: string) =>
      title.trim() &&
      commit(makeStep(`rename project: ${title}`, "project",
                      [{ op: "update_element", id: ROOT, label: title.trim() }])),

    /** A placeholder for something that lives elsewhere in the project. It is
     *  an ordinary node from here on: it moves, relates, and carries
     *  attributes of its own. */
    refer: (target: string, x?: number, y?: number) => {
      // One proxy per layer per block: a second appearance of the same thing
      // in the same layer says nothing the first did not. Nor is a proxy for
      // something already in this layer meaningful.
      if ((graph.elements[target]?.parent ?? null) === view) return;
      if (proxyIn(graph, view, target)) return;

      const spot = x === undefined || y === undefined ? {} : { x, y };
      const stand = makeElement("", {
        element: "proxy", parent: view, of: target,
        num: nextNum(graph, view, "proxy"), ...spot,
      });

      commit(makeStep(`reference: ${name(target)}`, "reference",
                      [{ op: "add_element", element: stand }]));
    },

    /** Go to where a node actually lives, and mark it there. What a reference
     *  offers instead of contents of its own. */
    reveal: (id: string) => {
      const node = graph.elements[id];
      if (!node) return;

      setView(node.parent);
      setPicked({ kind: "node", id });
    },

    /** Put one node inside another. Nothing else is needed: holding a block is
     *  what makes a node a container. A reference holds nothing — whatever is
     *  inside the thing it points at is inside the thing it points at. */
    nest: (id: string, parent: string) => {
      if (id === parent || descendsFrom(graph, parent, id)) return;
      if (isProxy(graph.elements[parent])) return;

      commit(makeStep(`into: ${name(parent)}`, "nest",
                      [{ op: "move_element", id, parent }, ...shed(id, parent)]));
    },

    /** Push a node out past the edge of the layer it is in, into whatever
     *  contains that layer. */
    promote: (id: string, parent: string | null) =>
      graph.elements[id] && graph.elements[id].parent !== parent &&
      commit(makeStep(`out of layer: ${name(id)}`, "promote",
                      [{ op: "move_element", id, parent }, ...shed(id, parent)])),

    /** Take an object out of its container and set it down on the open layer.
     *  One step, so undo puts it back where it was. */
    lift: (id: string, x: number, y: number) => {
      const node = graph.elements[id];
      if (!node || node.parent === view) return;

      commit(makeStep(`out: ${name(id)}`, "lift", [
        { op: "move_element", id, parent: view },
        ...shed(id, view),
        { op: "place_element", id, x, y },
      ]));
    },

    /** Make something where the user pointed, rather than where layout would
     *  have put it — joining any group boundaries it was made inside, since
     *  making one in a group's clear space plainly means it belongs there. */
    createAt: (label: string, x: number, y: number, groups: string[] = []) => {
      const fresh = makeElement(label, { parent: view, type: terms.node, x, y });

      commit(makeStep(`new: ${label}`, "create", [
        { op: "add_element", element: fresh },
        ...groups.map((id) => ({ op: "attach_attr" as const, id, holder: fresh.id })),
      ]));
    },

    /** A relationship dragged into empty space: make the far end, and attach.
     *  No interfaces — where the line meets either card is the layer's to work
     *  out, and the far node is placed where it was let go so the line between
     *  them already runs the way the drag did. */
    sprout: (a: End, label: string, x: number, y: number, kind: Kind = "untyped") => {
      const fresh = makeElement(label, { parent: view, type: terms.node, x, y });

      commit(makeStep(`grew: ${label}`, "sprout", [
        { op: "add_element", element: fresh },
        { op: "link_elements", edge: makeEdge(a.node, fresh.id, { from: a.port, kind }) },
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

    /** A descriptive value on one element, addressed by its name. An attribute
     *  has no identity of its own — setting the same name again rewrites it. */
    addAttr: (holder: string, label: string) =>
      label.trim() &&
      commit(makeStep(`attribute: ${label.trim()}`, "attribute",
                      [{ op: "set_attr", id: holder, name: label.trim() }])),

    updateAttr: (holder: string, was: string,
                 patch: { name?: string; value?: string; tags?: string[] }) => {
      const renamed = patch.name !== undefined && patch.name !== was;
      const held = graph.elements[holder]?.attrs.find((a) => a.name === was);

      commit(makeStep(`attribute: ${patch.name ?? was}`, "attribute", [
        ...(renamed ? [{ op: "drop_attr" as const, id: holder, name: was }] : []),
        { op: "set_attr", id: holder, name: patch.name ?? was,
          value: patch.value ?? held?.value, tags: patch.tags ?? held?.tags },
      ]));
    },

    dropAttr: (holder: string, label: string) =>
      commit(makeStep(`dropped attribute`, "attribute",
                      [{ op: "drop_attr", id: holder, name: label }])),

    /** Join a group, or leave one. Leaving goes through `parting`, so a group
     *  that would fall to a single member goes instead of shrinking. */
    joinGroup: (id: string, group: string) =>
      commit(makeStep(`group: ${name(id)}`, "group", [{ op: "join_group", id, group }])),

    leaveGroup: (id: string, group: string) =>
      commit(makeStep(`ungroup: ${name(id)}`, "group", parting(group, [id]))),

    /** Recolour or rename a group or a note — both are elements now. */
    paint: (id: string, color: string) =>
      commit(makeStep("colour", "attribute", [{ op: "update_element", id, color }])),

    /** Turn a selection into a group: one attribute they all hold, drawn as a
     *  boundary. Purely visual — no node's parent changes.
     *
     *  One member is allowed. A boundary round a single block is a way of
     *  marking it, and asking for that is unambiguous; it is only a group that
     *  *falls* to one that gets swept up — see `parting`. */
    group: (members: string[]) => {
      if (!members.length) return false;
      const box = makeElement("", { element: "group", parent: view,
                                    num: nextNum(graph, view, "group") });

      return commit(makeStep(`group: ${members.length} elements`, "group", [
        { op: "add_element", element: box },
        ...members.map((id) => ({ op: "join_group" as const, id, group: box.id })),
      ]));
    },

    /** A note: a card of text placed in this layer, tied by a faint leader to
     *  whatever it describes.
     *
     *  Untied and unwritten to begin with — it reads "note" until it is given
     *  something to say, the way an unnamed block reads "block". */
    /** A note, with what it says and the least room it was asked for.
     *
     *  Text is required, the same as a node's name is: an empty note is not a
     *  thing somebody meant to make, it is litter. The swept rectangle is a
     *  minimum rather than a size, so a long description gets the room it was
     *  given and a longer one still grows the card. */
    note: (text: string, x: number, y: number, w?: number, h?: number) =>
      text.trim() !== "" &&
      commit(makeStep(`note: ${text.trim()}`, "note", [
        { op: "add_element", element: makeElement(text.trim(), {
            element: "note", parent: view, x, y, w: w ?? null, h: h ?? null,
            num: nextNum(graph, view, "note"),
          }) },
      ])),

    /** Where a note came to rest. Its own place, unlike every other annotation:
     *  a note tied to nothing has nothing else to be placed by. */
    placeNote: (id: string, x: number, y: number) =>
      commit(makeStep("place: note", "note", [{ op: "place_element", id, x, y }])),

    /** Tie a note to an object, or untie it — one gesture both ways, since
     *  dragging onto something already tied can only mean undoing it. */
    tie: (id: string, holder: string) => {
      const note = graph.elements[id];
      if (note?.element !== "note" || !graph.elements[holder]) return;

      // A tie is a relationship, so tying is drawing one and untying is
      // deleting it — no second mechanism for joining two things.
      const tied = Object.values(graph.edges)
        .find((e) => e.kind === "tie" && e.source === id && e.target === holder);

      commit(makeStep(tied ? `untie: ${name(holder)}` : `tie: ${name(holder)}`, "note",
                      [tied ? { op: "delete_edge", id: tied.id }
                            : { op: "link_elements",
                                edge: makeEdge(id, holder, { kind: "tie" }) }]));
    },

    save: () => store.exportSteps(steps, titleOf(graph)),

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
