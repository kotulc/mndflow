/** The engine's contract: what replaying a log is allowed to produce.
 *
 *  Everything here is an invariant rather than a value, because the values are
 *  still moving. What must not move is that the fold is a pure function of the
 *  log, that a reverted step leaves no trace, that a mutation with nowhere to
 *  land is skipped rather than thrown, and that `tidy` removes only what cannot
 *  exist. Those are the properties every refactor of `fold` can break without
 *  a single type error. */

import { describe, expect, it } from "vitest";

import { compact, fold, isReference, isTie, membersOf, relationNames, stepsIn, tiesOf,
         COMPACT_AT } from "./fold";
import { edge, element, step, ROOT, type Mutation, type Step } from "./types";

/** One step holding whatever mutations a case needs. */
const did = (...mutations: Mutation[]): Step => step("", "test", mutations);

/** A project with a parent, a child and a relationship between them. */
function sample() {
  const a = element("Pump", { parent: null });
  const b = element("Valve", { parent: a.id });

  return {
    a,
    b,
    steps: [did(
      { op: "add_element", element: a },
      { op: "add_element", element: b },
      { op: "link_elements", edge: edge(a.id, b.id, { type: "drives" }) },
    )],
  };
}

describe("folding", () => {
  it("is a pure function of the log — the same steps twice give the same graph", () => {
    const { steps } = sample();

    expect(fold(steps)).toEqual(fold(steps));
  });

  it("leaves no trace of a reverted step", () => {
    const { steps } = sample();
    const extra = element("Ghost", { parent: null });
    const withGhost = [...steps, { ...did({ op: "add_element", element: extra }),
                                   status: "reverted" as const }];

    expect(fold(withGhost)).toEqual(fold(steps));
  });

  it("skips a mutation with nowhere to land rather than throwing", () => {
    // An undone parent legitimately strands a later step, so this is the
    // normal case and not an error.
    const orphan = [did({ op: "place_element", id: "block_missing", x: 0, y: 0 },
                        { op: "set_body", id: "block_missing", body: "hi" })];

    expect(() => fold(orphan)).not.toThrow();
    expect(Object.keys(fold(orphan).elements)).toEqual([ROOT]);
  });

  it("always keeps root, whatever the log says", () => {
    expect(fold([did({ op: "delete_element", id: ROOT })]).elements[ROOT]).toBeDefined();
  });
});

describe("tidy", () => {
  it("drops a proxy whose target is gone — it is nothing without one", () => {
    const real = element("Pump", { parent: null });
    const stand = element("", { form: "proxy", parent: null, of: real.id });
    const graph = fold([did({ op: "add_element", element: stand })]);

    expect(graph.elements[stand.id]).toBeUndefined();
    expect(fold([did({ op: "add_element", element: real },
                     { op: "add_element", element: stand })]).elements[stand.id]).toBeDefined();
  });

  it("keeps a group of one, and drops a group of none", () => {
    // A group of one is a group: deleting one that fell to a single member
    // meant reading intent off a graph in which deliberate and decayed are
    // identical. A group of none has no bounds to draw and no way back.
    const held = element("Pump", { parent: null });
    const group = element("Set", { form: "group", parent: null });
    const made = did({ op: "add_element", element: held },
                     { op: "add_element", element: group },
                     { op: "join_group", id: held.id, group: group.id });

    expect(fold([made]).elements[group.id]).toBeDefined();
    expect(membersOf(fold([made]), group.id)).toHaveLength(1);

    const emptied = [made, did({ op: "leave_group", id: held.id, group: group.id })];
    expect(fold(emptied).elements[group.id]).toBeUndefined();
  });

  it("forgets membership of a group that no longer exists", () => {
    const held = element("Pump", { parent: null });
    const graph = fold([did({ op: "add_element", element: held },
                            { op: "join_group", id: held.id, group: "group_gone" })]);

    expect(graph.elements[held.id].groups).toHaveLength(0);
  });
});

describe("types and definitions", () => {
  it("mints a definition for a type that names none, so free text becomes real", () => {
    const { steps, a, b } = sample();
    const graph = fold(steps);
    const named = graph.edges[Object.keys(graph.edges)[0]];

    expect(graph.defs[named.type]).toBeDefined();
    expect(graph.defs[named.type].name).toBe("drives");
    expect(relationNames(graph)).toContain("drives");
    expect(a.id in graph.elements && b.id in graph.elements).toBe(true);
  });

  it("mints the same id every fold, or the graph would never settle", () => {
    const { steps } = sample();

    expect(Object.keys(fold(steps).defs)).toEqual(Object.keys(fold(steps).defs));
  });

  it("does not mint twice for a type already pointing at a definition", () => {
    const { steps } = sample();
    const once = fold(steps);
    const again = fold([...steps]);

    expect(Object.keys(again.defs)).toHaveLength(Object.keys(once.defs).length);
  });
});

describe("fields", () => {
  it("addresses a field by name, so setting it again rewrites it", () => {
    const held = element("Pump", { parent: null });
    const graph = fold([did(
      { op: "add_element", element: held },
      { op: "set_field", id: held.id, name: "mass", form: "number", value: "4" },
      { op: "set_field", id: held.id, name: "mass", value: "5" },
    )]);

    expect(graph.elements[held.id].fields).toHaveLength(1);
    expect(graph.elements[held.id].fields[0].value).toBe("5");
  });

  it("keeps what a later mutation does not mention", () => {
    // Everything but the name is a patch, so editing a value never has to
    // restate the form.
    const held = element("Pump", { parent: null });
    const graph = fold([did(
      { op: "add_element", element: held },
      { op: "set_field", id: held.id, name: "mass", form: "number", unit: "kg" },
      { op: "set_field", id: held.id, name: "mass", value: "4" },
    )]);

    expect(graph.elements[held.id].fields[0]).toMatchObject({ form: "number", unit: "kg" });
  });

  it("writes none of the mutation's own plumbing into the field", () => {
    const held = element("Pump", { parent: null });
    const graph = fold([did({ op: "add_element", element: held },
                            { op: "set_field", id: held.id, name: "mass" })]);

    expect(graph.elements[held.id].fields[0]).not.toHaveProperty("op");
    expect(graph.elements[held.id].fields[0]).not.toHaveProperty("id");
  });

  it("reaches a relationship as readily as an element", () => {
    const a = element("A", { parent: null });
    const b = element("B", { parent: null });
    const join = edge(a.id, b.id);
    const graph = fold([did(
      { op: "add_element", element: a },
      { op: "add_element", element: b },
      { op: "link_elements", edge: join },
      { op: "set_field", id: join.id, name: "guard", value: "ready" },
    )]);

    expect(graph.edges[join.id].fields?.[0].name).toBe("guard");
  });
});

describe("compaction", () => {
  const many = Array.from({ length: COMPACT_AT + 1 }, (_, at) =>
    did({ op: "add_element", element: element(`n${at}`, { parent: null }) }));

  it("leaves the graph exactly as it was", () => {
    expect(fold(compact(many))).toEqual(fold(many));
  });

  it("counts the steps it discarded, so the total survives", () => {
    expect(stepsIn(compact(many))).toBe(many.length);
    expect(compact(many).length).toBeLessThan(many.length);
  });

  it("does nothing below the cap", () => {
    const few = many.slice(0, 3);

    expect(compact(few)).toBe(few);
    expect(stepsIn(few)).toBe(3);
  });
});

describe("the two derived relation forms", () => {
  /** A note tied to a block, and a proxy pointing at one — the two ends that
   *  make a relationship something without anybody saying so. */
  function layer() {
    const block = element("Pump", { parent: null });
    const note = element("watch", { form: "note", parent: null });
    const stand = element("", { form: "proxy", parent: null, of: block.id });
    const tie = edge(note.id, block.id);
    const ref = edge(stand.id, block.id);
    const plain = edge(block.id, block.id);
    const mutations: Mutation[] = [
      ...[block, note, stand].map((it) => ({ op: "add_element" as const, element: it })),
      ...[tie, ref, plain].map((it) => ({ op: "link_elements" as const, edge: it })),
    ];

    return { graph: fold([step("", "test", mutations)]), tie, ref, plain };
  }

  it("reads a tie from a note being at an end, not from a stored word", () => {
    const { graph, tie, plain } = layer();

    expect(isTie(graph, graph.edges[tie.id])).toBe(true);
    expect(isTie(graph, graph.edges[plain.id])).toBe(false);
  });

  it("reads a reference from a proxy being at an end", () => {
    const { graph, ref, plain } = layer();

    expect(isReference(graph, graph.edges[ref.id])).toBe(true);
    expect(isReference(graph, graph.edges[plain.id])).toBe(false);
  });

  it("keeps its declared form either way — derived says nothing about that", () => {
    const { graph, tie, ref } = layer();

    expect(graph.edges[tie.id].form ?? "line").toBe("line");
    expect(graph.edges[ref.id].form ?? "line").toBe("line");
  });

  it("finds what a note describes without a form to filter on", () => {
    const { graph, tie } = layer();

    expect(tiesOf(graph, graph.edges[tie.id].source)).toEqual([graph.edges[tie.id].target]);
  });
});
