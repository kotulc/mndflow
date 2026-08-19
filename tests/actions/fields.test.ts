/** Properties of field and definition actions — claimed mutations, refusal
 *  through check, and a refusal that writes nothing. */

import { beforeEach, describe, expect, it } from "vitest";

import { lookup, run, writes, type Context, type Effect, type Refusal } from "../../src/actions/index";
import "../../src/actions/fields";
import { fold } from "../../src/graph/fold";
import {
  element, step, type Mutation,
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
  for (const name of ["field", "unfield", "define", "undefine"]) {
    expect(lookup(name)?.name).toBe(name);
  }
});

describe("refusal", () => {
  it.each([
    ["field", {}],
    ["unfield", {}],
    ["define", {}],
    ["undefine", {}],
  ] as const)("%s refuses through check rather than throwing", (name, args) => {
    const graph = graph_of();
    expect(() => run(name, at(graph), args)).not.toThrow();
    const done = run(name, at(graph), args);
    expect(is_refusal(done)).toBe(true);
    expect("mutations" in done).toBe(false);
  });

  it("define refuses a name the project already has", () => {
    const graph = fold([step("", "test", [{
      op: "set_def", id: "def_held", name: "held", form: "block",
    }])]);
    const done = run("define", at(graph), { name: "held" });
    expect(is_refusal(done)).toBe(true);
    expect("mutations" in done).toBe(false);
  });

  it("undefine refuses an id the project does not hold", () => {
    const graph = graph_of();
    const done = run("undefine", at(graph), { id: "def_missing" });
    expect(is_refusal(done)).toBe(true);
    expect("mutations" in done).toBe(false);
  });
});

describe("field and unfield", () => {
  it("field returns set_field on a holder", () => {
    const leaf = element("Has", { parent: null });
    const graph = graph_of({ op: "add_element", element: leaf });
    const done = as_effect(run("field", at(graph, { kind: "node", id: leaf.id }), {
      holder: leaf.id, name: "mass",
    }));
    expect(ops(done)).toEqual(["set_field"]);
    expect(writes(done)).toBe(true);
  });

  it("field renaming drops the old name then sets the new one", () => {
    const leaf = element("Has", {
      parent: null,
      fields: [{ name: "old", form: "text", value: "1", tags: [] }],
    });
    const graph = graph_of({ op: "add_element", element: leaf });
    const done = as_effect(run("field", at(graph, { kind: "node", id: leaf.id }), {
      holder: leaf.id, name: "old", patch: { name: "new" },
    }));
    expect(ops(done)).toEqual(["drop_field", "set_field"]);
  });

  it("unfield returns drop_field", () => {
    const leaf = element("Has", {
      parent: null,
      fields: [{ name: "mass", form: "text", value: "1", tags: [] }],
    });
    const graph = graph_of({ op: "add_element", element: leaf });
    const done = as_effect(run("unfield", at(graph, { kind: "node", id: leaf.id }), {
      holder: leaf.id, name: "mass",
    }));
    expect(ops(done)).toEqual(["drop_field"]);
  });
});

describe("define and undefine", () => {
  it("define returns set_def for a new name", () => {
    const graph = graph_of();
    const done = as_effect(run("define", at(graph), { name: "pump", form: "block" }));
    expect(ops(done)).toEqual(["set_def"]);
    expect(writes(done)).toBe(true);
  });

  it("define amending an existing id still returns set_def", () => {
    const graph = fold([step("", "test", [{
      op: "set_def", id: "def_pump", name: "pump", form: "block",
    }])]);
    const done = as_effect(run("define", at(graph), { id: "def_pump", name: "Pump" }));
    expect(ops(done)).toEqual(["set_def"]);
  });

  it("undefine returns drop_def", () => {
    const graph = fold([step("", "test", [{
      op: "set_def", id: "def_pump", name: "pump", form: "block",
    }])]);
    const done = as_effect(run("undefine", at(graph), { id: "def_pump" }));
    expect(ops(done)).toEqual(["drop_def"]);
    expect(writes(done)).toBe(true);
  });
});
