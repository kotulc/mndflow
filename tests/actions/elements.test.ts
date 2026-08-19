/** Properties of the element and navigation actions — claimed mutations,
 *  refusal through check, and navigation that writes nothing. */

import { beforeEach, describe, expect, it } from "vitest";

import { lookup, run, writes, type Context, type Effect, type Refusal } from "../../src/actions/index";
import "../../src/actions/elements";
import { fold } from "../../src/graph/fold";
import {
  ROOT, element, step, type Mutation,
} from "../../src/graph/types";

function at(
  graph: Context["graph"],
  picked: Context["picked"] = null,
  view: string | null = null,
): Context {
  return { graph, view, picked };
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
    "create", "delete", "rename", "retype", "describe",
    "move", "refer", "open", "up", "reveal",
  ]) {
    expect(lookup(name)?.name).toBe(name);
  }
});

describe("refusal", () => {
  it.each([
    ["delete", {}],
    ["rename", {}],
    ["retype", {}],
    ["describe", {}],
    ["move", {}],
    ["refer", {}],
    ["open", {}],
    ["reveal", {}],
  ] as const)("%s refuses through check rather than throwing", (name, args) => {
    const graph = graph_of();
    expect(() => run(name, at(graph), args)).not.toThrow();
    const done = run(name, at(graph), args);
    expect(is_refusal(done)).toBe(true);
    expect("mutations" in done).toBe(false);
  });

  it("create refuses a name already used among siblings", () => {
    const held = element("Pump", { parent: null });
    const graph = graph_of({ op: "add_element", element: held });
    const done = run("create", at(graph), { label: "Pump" });
    expect(is_refusal(done)).toBe(true);
    expect("mutations" in done).toBe(false);
  });

  it("delete refuses the project root without writing", () => {
    const graph = graph_of();
    const done = run("delete", at(graph), { id: ROOT });
    expect(is_refusal(done)).toBe(true);
    expect("mutations" in done).toBe(false);
  });

  it("move refuses nesting something inside itself", () => {
    const outer = element("Outer", { parent: null });
    const inner = element("Inner", { parent: outer.id });
    const graph = graph_of(
      { op: "add_element", element: outer },
      { op: "add_element", element: inner },
    );
    const done = run("move", at(graph, { kind: "node", id: outer.id }), {
      id: outer.id, parent: inner.id,
    });
    expect(is_refusal(done)).toBe(true);
    expect("mutations" in done).toBe(false);
  });
});

describe("writes", () => {
  it("create returns add_element", () => {
    const graph = graph_of();
    const done = as_effect(run("create", at(graph), { label: "Fresh" }));
    expect(ops(done)).toContain("add_element");
    expect(writes(done)).toBe(true);
  });

  it("delete returns delete_element", () => {
    const leaf = element("Gone", { parent: null });
    const graph = graph_of({ op: "add_element", element: leaf });
    const done = as_effect(run("delete", at(graph, { kind: "node", id: leaf.id }), {
      id: leaf.id,
    }));
    expect(ops(done)).toContain("delete_element");
    expect(writes(done)).toBe(true);
  });

  it("rename returns update_element", () => {
    const leaf = element("Old", { parent: null });
    const graph = graph_of({ op: "add_element", element: leaf });
    const done = as_effect(run("rename", at(graph, { kind: "node", id: leaf.id }), {
      id: leaf.id, label: "New",
    }));
    expect(ops(done)).toEqual(["update_element"]);
  });

  it("retype returns update_element for an element", () => {
    const leaf = element("Typed", { parent: null });
    const graph = graph_of({ op: "add_element", element: leaf });
    const done = as_effect(run("retype", at(graph, { kind: "node", id: leaf.id }), {
      id: leaf.id, type: "pump",
    }));
    expect(ops(done)).toEqual(["update_element"]);
  });

  it("describe returns set_body", () => {
    const leaf = element("Told", { parent: null });
    const graph = graph_of({ op: "add_element", element: leaf });
    const done = as_effect(run("describe", at(graph, { kind: "node", id: leaf.id }), {
      id: leaf.id, body: "about it",
    }));
    expect(ops(done)).toEqual(["set_body"]);
  });

  it("move returns move_element", () => {
    const parent = element("Parent", { parent: null });
    const child = element("Child", { parent: null, x: 40 });
    const graph = graph_of(
      { op: "add_element", element: parent },
      { op: "add_element", element: child },
    );
    const done = as_effect(run("move", at(graph, { kind: "node", id: child.id }), {
      id: child.id, parent: parent.id,
    }));
    expect(ops(done)).toContain("move_element");
  });

  it("refer returns add_element for a proxy into another layer", () => {
    const host = element("Host", { parent: null });
    const elsewhere = element("Elsewhere", { parent: host.id });
    const graph = graph_of(
      { op: "add_element", element: host },
      { op: "add_element", element: elsewhere },
    );
    const done = as_effect(run("refer", at(graph), { target: elsewhere.id }));
    expect(ops(done)).toEqual(["add_element"]);
    expect(writes(done)).toBe(true);
  });
});

describe("navigation", () => {
  it("open writes nothing and asks to open the element", () => {
    const leaf = element("Inside", { parent: null });
    const graph = graph_of({ op: "add_element", element: leaf });
    const done = as_effect(run("open", at(graph, { kind: "node", id: leaf.id }), {
      id: leaf.id,
    }));
    expect(done.mutations).toHaveLength(0);
    expect(writes(done)).toBe(false);
    expect(done.open).toBe(leaf.id);
  });

  it("up writes nothing and leaves for the containing layer", () => {
    const host = element("Host", { parent: null });
    const graph = graph_of({ op: "add_element", element: host });
    const done = as_effect(run("up", at(graph, null, host.id)));
    expect(done.mutations).toHaveLength(0);
    expect(writes(done)).toBe(false);
    expect(done.open).toBe(host.parent ?? null);
  });

  it("reveal writes nothing and focuses the element in its layer", () => {
    const host = element("Host", { parent: null });
    const child = element("Child", { parent: host.id });
    const graph = graph_of(
      { op: "add_element", element: host },
      { op: "add_element", element: child },
    );
    const done = as_effect(run("reveal", at(graph, { kind: "node", id: child.id }), {
      id: child.id,
    }));
    expect(done.mutations).toHaveLength(0);
    expect(writes(done)).toBe(false);
    expect(done.open).toBe(host.id);
    expect(done.focus).toEqual({ kind: "node", id: child.id });
  });
});
