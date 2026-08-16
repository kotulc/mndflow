/** Properties of layer, vocabulary and adjustment actions — claimed mutations,
 *  refusal through check, and a refusal that writes nothing. */

import { beforeEach, describe, expect, it } from "vitest";

import { lookup, run, writes, type Context, type Effect, type Refusal } from "../../src/actions/index";
import "../../src/actions/layer";
import { fold } from "../../src/graph/fold";
import {
  asVocabulary, edge, element, step, type Mutation,
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
  for (const name of [
    "axis", "arrange", "relax", "vocabulary", "place", "size", "seat", "wall",
  ]) {
    expect(lookup(name)?.name).toBe(name);
  }
});

describe("refusal", () => {
  it.each([
    ["axis", {}],
    ["arrange", {}],
    ["vocabulary", {}],
    ["size", {}],
    ["seat", {}],
    ["wall", {}],
  ] as const)("%s refuses through check rather than throwing", (name, args) => {
    const graph = graph_of();
    expect(() => run(name, at(graph), args)).not.toThrow();
    const done = run(name, at(graph), args);
    expect(is_refusal(done)).toBe(true);
    expect("mutations" in done).toBe(false);
  });
});

describe("axis, arrange, relax, vocabulary", () => {
  it("axis returns set_axis", () => {
    const graph = graph_of();
    const done = as_effect(run("axis", at(graph), { axis: "across" }));
    expect(ops(done)).toEqual(["set_axis"]);
    expect(writes(done)).toBe(true);
  });

  it("arrange with a shape places every block it lays out", () => {
    const a = element("A", { parent: null });
    const b = element("B", { parent: null, x: 100 });
    const graph = graph_of(
      { op: "add_element", element: a },
      { op: "add_element", element: b },
    );
    const done = as_effect(run("arrange", at(graph), { shape: "grid" }));
    expect(ops(done).every((op) => op === "place_element")).toBe(true);
    expect(ops(done).length).toBeGreaterThan(0);
    expect(writes(done)).toBe(true);
  });

  it("arrange with handed spots places those and skips the shape", () => {
    const a = element("A", { parent: null });
    const graph = graph_of({ op: "add_element", element: a });
    const done = as_effect(run("arrange", at(graph), {
      spots: [{ id: a.id, x: 10, y: 20 }],
    }));
    expect(ops(done)).toEqual(["place_element"]);
  });

  it("relax returns relax_layer", () => {
    const graph = graph_of();
    const done = as_effect(run("relax", at(graph)));
    expect(ops(done)).toEqual(["relax_layer"]);
    expect(writes(done)).toBe(true);
  });

  it("vocabulary returns set_vocabulary", () => {
    const graph = graph_of();
    const packages = asVocabulary("systems");
    const done = as_effect(run("vocabulary", at(graph), { packages }));
    expect(ops(done)).toEqual(["set_vocabulary"]);
    expect(done.mutations[0]).toMatchObject({ op: "set_vocabulary", vocabulary: packages });
  });
});

describe("adjustments", () => {
  it("place returns place_element for where something came to rest", () => {
    const leaf = element("Moved", { parent: null });
    const graph = graph_of({ op: "add_element", element: leaf });
    const done = as_effect(run("place", at(graph, { kind: "node", id: leaf.id }), {
      moved: [{ id: leaf.id, x: 12, y: 34 }],
    }));
    expect(ops(done)).toEqual(["place_element"]);
    expect(writes(done)).toBe(true);
  });

  it("place with membership joins in the same step", () => {
    const box = element("", { form: "group", parent: null });
    const leaf = element("Moved", { parent: null, x: 40 });
    const graph = graph_of(
      { op: "add_element", element: box },
      { op: "add_element", element: leaf },
    );
    const done = as_effect(run("place", at(graph, { kind: "node", id: leaf.id }), {
      moved: [{ id: leaf.id, x: 12, y: 34 }],
      membership: [{ attr: box.id, holder: leaf.id, join: true }],
    }));
    expect(ops(done)).toContain("place_element");
    expect(ops(done)).toContain("join_group");
  });

  it("size returns size_element for a note", () => {
    const note = element("said", { form: "note", parent: null });
    const graph = graph_of({ op: "add_element", element: note });
    const done = as_effect(run("size", at(graph, { kind: "node", id: note.id }), {
      id: note.id, w: 120, h: 80,
    }));
    expect(ops(done)).toEqual(["size_element"]);
  });

  it("seat returns set_port for an interface", () => {
    const owner = element("Frame", { parent: null });
    const port = element("", { parent: owner.id, side: "left", at: 24 });
    const graph = graph_of(
      { op: "add_element", element: owner },
      { op: "add_element", element: port },
    );
    const done = as_effect(run("seat", at(graph, { kind: "node", id: port.id }), {
      id: port.id, side: "top", at: 40,
    }));
    expect(ops(done)).toEqual(["set_port"]);
  });

  it("wall returns set_side for a relationship end", () => {
    const a = element("A", { parent: null });
    const b = element("B", { parent: null, x: 100 });
    const link = edge(a.id, b.id);
    const graph = graph_of(
      { op: "add_element", element: a },
      { op: "add_element", element: b },
      { op: "link_elements", edge: link },
    );
    const done = as_effect(run("wall", at(graph, { kind: "edge", id: link.id }), {
      id: link.id, end: "from", side: "left",
    }));
    expect(ops(done)).toEqual(["set_side"]);
  });
});
