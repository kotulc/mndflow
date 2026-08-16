/** The engine's contract: what replaying a log is allowed to produce.
 *
 *  Everything here is an invariant rather than a value, because the values are
 *  still moving. What must not move is that the fold is a pure function of the
 *  log, that a reverted step leaves no trace, that a mutation with nowhere to
 *  land is skipped rather than thrown, and that `tidy` removes only what cannot
 *  exist — never a proxy whose target is merely gone. Those are the properties
 *  every refactor of `fold` can break without a single type error. */

import { describe, expect, it } from "vitest";

import { blocksOf, childrenOf, compact, fold, isa, isPort, isReference, isTie, membersOf,
         portsOf, relationNames, resolved, stepsIn, targetOf, tiesOf, COMPACT_AT } from "../../src/graph/fold";
import { edge, element, field, refTo, step, ROOT, type Mutation, type Step } from "../../src/graph/types";

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

describe("the children index", () => {
  /** A layer with a child block, a port on it, a note and a group — enough to
   *  tell blocks, ports and the rest apart without caring about their ids. */
  function layered() {
    const parent = element("Pump", { parent: null });
    const child = element("Valve", { parent: parent.id });
    const port = element("", { parent: parent.id, side: "right", at: 0.5, num: 1 });
    const note = element("watch", { form: "note", parent: null });
    const group = element("Set", { form: "group", parent: null });

    return {
      parent, child, port, note, group,
      graph: fold([did(
        { op: "add_element", element: parent },
        { op: "add_element", element: child },
        { op: "add_element", element: port },
        { op: "add_element", element: note },
        { op: "add_element", element: group },
        { op: "join_group", id: parent.id, group: group.id },
      )]),
    };
  }

  it("lists exactly the elements that hold a given parent", () => {
    const { graph, parent, child, port, note, group } = layered();
    const at = (id: string | null) => childrenOf(graph, id).map((n) => n.id).sort();

    expect(at(null)).toEqual([group.id, note.id, parent.id].sort());
    expect(at(parent.id)).toEqual([child.id, port.id].sort());
    expect(at(child.id)).toEqual([]);
  });

  it("treats an undone parent as the root layer, not as missing", () => {
    // Same rule childrenOf has always used: a stranded child surfaces rather
    // than vanishing from every listing.
    const ghost = "parent_gone";
    const stranded = element("Orphan", { parent: ghost });
    const graph = fold([did({ op: "add_element", element: stranded })]);

    expect(childrenOf(graph, null).map((n) => n.id)).toContain(stranded.id);
    expect(childrenOf(graph, ghost)).toEqual([]);
  });

  it("partitions blocks and ports from the same children listing", () => {
    const { graph, parent, child, port } = layered();

    expect(blocksOf(graph, parent.id).map((n) => n.id)).toEqual([child.id]);
    expect(portsOf(graph, parent.id).map((n) => n.id)).toEqual([port.id]);
    expect(portsOf(graph, parent.id).every(isPort)).toBe(true);
    expect(blocksOf(graph, parent.id).some(isPort)).toBe(false);
  });
});

describe("tidy", () => {
  it("keeps a proxy whose target is gone — absence is never recorded", () => {
    const real = element("Pump", { parent: null });
    const stand = element("", { form: "proxy", parent: null, of: real.id });
    const orphan = fold([did({ op: "add_element", element: stand })]);

    expect(orphan.elements[stand.id]).toBeDefined();
    expect(targetOf(orphan, stand.id)).toEqual({ element: real.id });

    const live = fold([did({ op: "add_element", element: real },
                           { op: "add_element", element: stand })]);
    expect(live.elements[stand.id]).toBeDefined();
    expect(live.elements[stand.id]?.of).toBe(real.id);
  });

  it("drops a proxy that names no target at all", () => {
    const stand = element("", { form: "proxy", parent: null, of: null });
    const graph = fold([did({ op: "add_element", element: stand })]);

    expect(graph.elements[stand.id]).toBeUndefined();
  });

  it("reads a path of as { project, element } and leaves a foreign one alone", () => {
    const stand = element("", {
      form: "proxy", parent: null, of: refTo("block_pump", "proj_other"),
    });
    const graph = fold([did({ op: "add_element", element: stand })]);

    expect(graph.elements[stand.id]).toBeDefined();
    expect(targetOf(graph, stand.id)).toEqual({
      project: "proj_other", element: "block_pump",
    });
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

describe("a definition refining another", () => {
  /** A chain: safety requirement → requirement, plus something unrelated. */
  const chain = () => fold([step("", "test", [
    { op: "set_def", id: "def_req", name: "requirement", form: "block" },
    { op: "set_def", id: "def_safety", name: "safety requirement", form: "block",
      extends: "def_req" },
    { op: "set_def", id: "def_hazard", name: "hazard", form: "block", extends: "def_safety" },
    { op: "set_def", id: "def_part", name: "part", form: "block" },
  ])]);

  it("is itself", () => {
    expect(isa(chain(), "def_req", "def_req")).toBe(true);
  });

  it("is what it extends, however many hops away", () => {
    const graph = chain();

    expect(isa(graph, "def_safety", "def_req")).toBe(true);
    expect(isa(graph, "def_hazard", "def_req")).toBe(true);
  });

  it("is not what it never extended, and the chain does not run backwards", () => {
    const graph = chain();

    expect(isa(graph, "def_part", "def_req")).toBe(false);
    expect(isa(graph, "def_req", "def_safety")).toBe(false);
  });

  it("stops rather than hanging when a chain loops", () => {
    const looped = fold([step("", "test", [
      { op: "set_def", id: "def_a", name: "a", form: "block", extends: "def_b" },
      { op: "set_def", id: "def_b", name: "b", form: "block", extends: "def_a" },
    ])]);

    expect(isa(looped, "def_a", "def_missing")).toBe(false);
  });

  it("ends the walk at a parent that is not loaded, rather than throwing", () => {
    const alone = fold([step("", "test", [
      { op: "set_def", id: "def_mine", name: "mine", form: "block",
        extends: "pkg_sysml/def_requirement" },
    ])]);

    expect(isa(alone, "def_mine", "def_mine")).toBe(true);
    expect(isa(alone, "def_mine", "pkg_sysml/def_requirement")).toBe(true);
  });
});

describe("resolving a subtype", () => {
  /** Parent declares id+text and a card; child redeclares text and adds a
   *  constraints key — enough to tell union, override and per-key merge apart. */
  function refined() {
    return fold([step("", "test", [
      { op: "set_def", id: "def_req", name: "requirement", form: "block",
        fields: [field("id"), field("text", { value: "parent" })],
        components: { card: { layout: "fields", shape: "rect" },
                      style: { set: "sysml" } } },
      { op: "set_def", id: "def_safety", name: "safety requirement", form: "block",
        extends: "def_req",
        fields: [field("text", { value: "child" }), field("severity")],
        components: { card: { layout: "shape" },
                      constraints: { required: ["severity"] } } },
    ])]);
  }

  it("is itself when it extends nothing", () => {
    const graph = fold([step("", "test", [
      { op: "set_def", id: "def_part", name: "part", form: "block",
        fields: [field("mass")],
        components: { card: { layout: "type" } } },
    ])]);
    const view = resolved(graph, "def_part");

    expect(view?.id).toBe("def_part");
    expect(view?.fields.map((f) => f.name)).toEqual(["mass"]);
    expect(view?.components).toEqual({ card: { layout: "type" } });
  });

  it("unions fields, with the subtype winning by name", () => {
    const view = resolved(refined(), "def_safety");
    const by = Object.fromEntries((view?.fields ?? []).map((f) => [f.name, f]));

    expect(Object.keys(by).sort()).toEqual(["id", "severity", "text"]);
    expect(by.text.value).toBe("child");
    expect(by.id).toBeDefined();
  });

  it("merges components per key — unmentioned inherited whole, mentioned replaced", () => {
    const view = resolved(refined(), "def_safety");

    // Child never mentioned style, so the parent's set arrives whole.
    expect(view?.components?.style).toEqual({ set: "sysml" });
    // Child mentioned card, so the parent's shape does not leak in.
    expect(view?.components?.card).toEqual({ layout: "shape" });
    expect(view?.components?.constraints).toEqual({ required: ["severity"] });
  });

  it("keeps the subtype's own identity and presentation", () => {
    const view = resolved(refined(), "def_safety");

    expect(view?.id).toBe("def_safety");
    expect(view?.name).toBe("safety requirement");
    expect(view?.extends).toBe("def_req");
  });

  it("inherits across more than one hop", () => {
    const graph = fold([step("", "test", [
      { op: "set_def", id: "def_req", name: "requirement", form: "block",
        fields: [field("id")],
        components: { style: { set: "sysml" } } },
      { op: "set_def", id: "def_safety", name: "safety", form: "block",
        extends: "def_req", fields: [field("severity")] },
      { op: "set_def", id: "def_hazard", name: "hazard", form: "block",
        extends: "def_safety", fields: [field("likelihood")] },
    ])]);
    const view = resolved(graph, "def_hazard");

    expect(view?.fields.map((f) => f.name).sort()).toEqual(
      ["id", "likelihood", "severity"]);
    expect(view?.components?.style).toEqual({ set: "sysml" });
  });

  it("stands on its own when the parent is not loaded", () => {
    const alone = fold([step("", "test", [
      { op: "set_def", id: "def_mine", name: "mine", form: "block",
        extends: "pkg_sysml/def_requirement",
        fields: [field("mine")],
        components: { card: { layout: "name" } } },
    ])]);
    const view = resolved(alone, "def_mine");

    expect(view?.fields.map((f) => f.name)).toEqual(["mine"]);
    expect(view?.components).toEqual({ card: { layout: "name" } });
  });

  it("stops on a cycle rather than hanging", () => {
    const looped = fold([step("", "test", [
      { op: "set_def", id: "def_a", name: "a", form: "block", extends: "def_b",
        fields: [field("a")] },
      { op: "set_def", id: "def_b", name: "b", form: "block", extends: "def_a",
        fields: [field("b")] },
    ])]);

    expect(() => resolved(looped, "def_a")).not.toThrow();
    expect(new Set(resolved(looped, "def_a")?.fields.map((f) => f.name)))
      .toEqual(new Set(["a", "b"]));
  });

  it("yields nothing for an id that is not there", () => {
    expect(resolved(fold([]), "def_missing")).toBeUndefined();
  });
});
