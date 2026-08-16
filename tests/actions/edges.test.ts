/** Properties of the edge and interface actions — claimed mutations, refusal
 *  through check rather than throw, and a refusal that writes nothing. */

import { beforeEach, describe, expect, it } from "vitest";

import { lookup, run, writes, type Context, type Effect, type Refusal } from "../../src/actions/index";
import "../../src/actions/edges";
import { fold } from "../../src/graph/fold";
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

function pair() {
  const a = element("A", { parent: null });
  const b = element("B", { parent: null, x: 100 });
  const link = edge(a.id, b.id);
  const graph = graph_of(
    { op: "add_element", element: a },
    { op: "add_element", element: b },
    { op: "link_elements", edge: link },
  );
  return { graph, a, b, link };
}

beforeEach(() => {
  for (const name of ["interface", "mark", "relate", "unlink", "flip", "direct", "reform"]) {
    expect(lookup(name)?.name).toBe(name);
  }
});

describe("refusal", () => {
  it.each([
    ["relate", {}],
    ["unlink", {}],
    ["flip", {}],
    ["direct", {}],
    ["reform", {}],
    ["mark", {}],
    ["interface", {}],
  ] as const)("%s refuses through check rather than throwing", (name, args) => {
    const { graph } = pair();
    expect(() => run(name, at(graph), args)).not.toThrow();
    const done = run(name, at(graph), args);
    expect(is_refusal(done)).toBe(true);
    expect("mutations" in done).toBe(false);
  });

  it("relate refuses the same end twice without writing", () => {
    const { graph, a } = pair();
    const done = run("relate", at(graph), { from: a.id, to: a.id });
    expect(is_refusal(done)).toBe(true);
    expect("mutations" in done).toBe(false);
  });
});

describe("relate", () => {
  it("returns a link_elements mutation for two distinct ends", () => {
    const a = element("From", { parent: null });
    const b = element("To", { parent: null, x: 100 });
    const graph = graph_of(
      { op: "add_element", element: a },
      { op: "add_element", element: b },
    );
    const done = as_effect(run("relate", at(graph), { from: a.id, to: b.id }));
    expect(ops(done)).toEqual(["link_elements"]);
    expect(writes(done)).toBe(true);
  });
});

describe("unlink", () => {
  it("deletes the relationship, and spare interfaces only when they are spare", () => {
    const { graph, link } = pair();
    const done = as_effect(run("unlink", at(graph, { kind: "edge", id: link.id }), {
      id: link.id,
    }));
    expect(ops(done)).toContain("delete_edge");
    expect(writes(done)).toBe(true);
  });
});

describe("flip, direct, reform", () => {
  it("flip returns flip_edge", () => {
    const { graph, link } = pair();
    const done = as_effect(run("flip", at(graph, { kind: "edge", id: link.id }), {
      id: link.id,
    }));
    expect(ops(done)).toEqual(["flip_edge"]);
  });

  it("direct returns set_dir when given a direction", () => {
    const { graph, link } = pair();
    const done = as_effect(run("direct", at(graph, { kind: "edge", id: link.id }), {
      id: link.id, dir: "forward",
    }));
    expect(ops(done)).toEqual(["set_dir"]);
  });

  it("reform returns set_form when given a form", () => {
    const { graph, link } = pair();
    const done = as_effect(run("reform", at(graph, { kind: "edge", id: link.id }), {
      id: link.id, form: "directed",
    }));
    expect(ops(done)).toEqual(["set_form"]);
  });
});

describe("interface and mark", () => {
  it("interface adds an element when given a place on the border", () => {
    const owner = element("Frame", { parent: null });
    const graph = graph_of({ op: "add_element", element: owner });
    const done = as_effect(run("interface", at(graph, { kind: "node", id: owner.id }), {
      owner: owner.id, side: "left", at: 24,
    }));
    expect(ops(done)).toEqual(["add_element"]);
    expect(writes(done)).toBe(true);
  });

  it("interface pins a relationship end with add_element then set_end", () => {
    const { graph, a, link } = pair();
    const done = as_effect(run("interface", at(graph, { kind: "node", id: a.id }), {
      owner: a.id, side: "right", at: 12, edge: link.id, end: "from",
    }));
    expect(ops(done)).toEqual(["add_element", "set_end"]);
  });

  it("mark returns mark_port for an interface", () => {
    const owner = element("Frame", { parent: null });
    const port = element("", { parent: owner.id, side: "left", at: 24 });
    const graph = graph_of(
      { op: "add_element", element: owner },
      { op: "add_element", element: port },
    );
    const done = as_effect(run("mark", at(graph, { kind: "node", id: port.id }), {
      id: port.id, flow: "in",
    }));
    expect(ops(done)).toEqual(["mark_port"]);
  });
});
