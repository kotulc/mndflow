/** Properties of group and note actions — claimed mutations, refusal through
 *  check, and a refusal that writes nothing. */

import { beforeEach, describe, expect, it } from "vitest";

import { lookup, run, writes, type Context, type Effect, type Refusal } from "../../src/actions/index";
import "../../src/actions/groups";
import { fold, resolved } from "../../src/graph/fold";
import {
  edge, element, step, type Mutation,
} from "../../src/graph/types";

function at(graph: Context["graph"], picked: Context["picked"] = null): Context {
  return { graph, view: null, picked };
}

function graph_of(...mutations: Mutation[]) {
  return fold([step("", "test", mutations)]);
}

function is_refusal(done: Effect | Refusal): done is Refusal {
  return "refused" in done;
}

function as_effect(done: Effect | Refusal): Effect {
  expect(is_refusal(done)).toBe(false);
  return done as Effect;
}

function ops(done: Effect): Mutation["op"][] {
  return done.mutations.map((m) => m.op);
}

beforeEach(() => {
  for (const name of ["group", "leave", "dissolve", "note", "tie"]) {
    expect(lookup(name)?.name).toBe(name);
  }
});

describe("refusal", () => {
  it.each([
    ["group", {}],
    ["leave", {}],
    ["dissolve", {}],
    ["note", {}],
    ["tie", {}],
  ] as const)("%s refuses through check rather than throwing", (name, args) => {
    const graph = graph_of();
    expect(() => run(name, at(graph), args)).not.toThrow();
    const done = run(name, at(graph), args);
    expect(is_refusal(done)).toBe(true);
    expect("mutations" in done).toBe(false);
  });

  it("group refuses joining something that is not a group", () => {
    const a = element("A", { parent: null });
    const b = element("B", { parent: null, x: 40 });
    const graph = graph_of(
      { op: "add_element", element: a },
      { op: "add_element", element: b },
    );
    const done = run("group", at(graph), { members: [a.id], into: b.id });
    expect(is_refusal(done)).toBe(true);
    expect("mutations" in done).toBe(false);
  });
});

describe("group, leave, dissolve", () => {
  it("group without into adds a group then joins each member", () => {
    const a = element("A", { parent: null });
    const b = element("B", { parent: null, x: 40 });
    const graph = graph_of(
      { op: "add_element", element: a },
      { op: "add_element", element: b },
    );
    const done = as_effect(run("group", at(graph), { members: [a.id, b.id] }));
    expect(ops(done)[0]).toBe("set_def");
    expect(ops(done)[1]).toBe("add_element");
    expect(ops(done).slice(2).every((op) => op === "join_group")).toBe(true);
    expect(ops(done).filter((op) => op === "join_group").length).toBe(2);
    expect(writes(done)).toBe(true);
  });

  it("group mints a group element whose type resolves through resolved()", () => {
    const a = element("A", { parent: null });
    const seed = graph_of({ op: "add_element", element: a });
    const done = as_effect(run("group", at(seed), { members: [a.id] }));
    const graph = fold([
      step("", "seed", [{ op: "add_element", element: a }]),
      step("", "test", done.mutations),
    ]);
    const box = Object.values(graph.elements).find((e) => e.form === "group");
    expect(box && resolved(graph, box.type)).toBeTruthy();
  });

  it("group with into only joins", () => {
    // Fold tidies empty groups away, so the target must already hold someone.
    const box = element("Set", { form: "group", parent: null });
    const seed = element("Seed", { parent: null, groups: [box.id] });
    const a = element("A", { parent: null, x: 40 });
    const graph = graph_of(
      { op: "add_element", element: box },
      { op: "add_element", element: seed },
      { op: "add_element", element: a },
    );
    const done = as_effect(run("group", at(graph), { members: [a.id], into: box.id }));
    expect(ops(done)).toEqual(["join_group"]);
  });

  it("leave parting the last member deletes the group", () => {
    const box = element("", { form: "group", parent: null });
    const a = element("A", { parent: null, x: 40, groups: [box.id] });
    const graph = graph_of(
      { op: "add_element", element: box },
      { op: "add_element", element: a },
    );
    const done = as_effect(run("leave", at(graph, { kind: "node", id: a.id }), {
      id: a.id, group: box.id,
    }));
    expect(ops(done)).toEqual(["delete_element"]);
  });

  it("leave with others remaining returns leave_group", () => {
    const box = element("", { form: "group", parent: null });
    const a = element("A", { parent: null, x: 40, groups: [box.id] });
    const b = element("B", { parent: null, x: 80, groups: [box.id] });
    const graph = graph_of(
      { op: "add_element", element: box },
      { op: "add_element", element: a },
      { op: "add_element", element: b },
    );
    const done = as_effect(run("leave", at(graph, { kind: "node", id: a.id }), {
      id: a.id, group: box.id,
    }));
    expect(ops(done)).toEqual(["leave_group"]);
  });

  it("dissolve returns delete_element for a group", () => {
    const box = element("", { form: "group", parent: null });
    const a = element("A", { parent: null, groups: [box.id] });
    const graph = graph_of(
      { op: "add_element", element: box },
      { op: "add_element", element: a },
    );
    const done = as_effect(run("dissolve", at(graph, { kind: "node", id: box.id }), {
      id: box.id,
    }));
    expect(ops(done)).toEqual(["delete_element"]);
    expect(writes(done)).toBe(true);
  });
});

describe("note and tie", () => {
  it("note returns add_element when it has something to say", () => {
    const graph = graph_of();
    const done = as_effect(run("note", at(graph), { text: "remember" }));
    expect(ops(done)).toEqual(["set_def", "add_element"]);
    expect(writes(done)).toBe(true);
  });

  it("note mints a note element whose type resolves through resolved()", () => {
    const seed = graph_of();
    const done = as_effect(run("note", at(seed), { text: "remember" }));
    const graph = fold([step("", "test", done.mutations)]);
    const card = Object.values(graph.elements).find((e) => e.form === "note");
    expect(card && resolved(graph, card.type)).toBeTruthy();
  });

  it("tie links a note to a holder when none exists", () => {
    const note = element("said", { form: "note", parent: null });
    const holder = element("Pump", { parent: null, x: 40 });
    const graph = graph_of(
      { op: "add_element", element: note },
      { op: "add_element", element: holder },
    );
    const done = as_effect(run("tie", at(graph, { kind: "node", id: note.id }), {
      note: note.id, holder: holder.id,
    }));
    expect(ops(done)).toEqual(["link_elements"]);
  });

  it("tie deletes the relationship when one already ties them", () => {
    const note = element("said", { form: "note", parent: null });
    const holder = element("Pump", { parent: null, x: 40 });
    const tied = edge(note.id, holder.id);
    const graph = graph_of(
      { op: "add_element", element: note },
      { op: "add_element", element: holder },
      { op: "link_elements", edge: tied },
    );
    const done = as_effect(run("tie", at(graph, { kind: "node", id: note.id }), {
      note: note.id, holder: holder.id,
    }));
    expect(ops(done)).toEqual(["delete_edge"]);
  });
});
