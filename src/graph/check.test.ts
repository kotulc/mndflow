/** The one door a log comes in through.
 *
 *  This is the module a schema change quietly breaks. Every rename since the
 *  first build is healed here, and a heal that stops firing does not throw —
 *  the log simply loads with a field missing and something fails far away. So
 *  each case asserts that an *old shape* still arrives as the current one, and
 *  that the user is told, without pinning the wording. */

import { describe, expect, it } from "vitest";

import { entering, report } from "./check";
import { fold } from "./fold";

/** A log as some earlier build would have written it. */
const logged = (...mutations: unknown[]) => ([{
  id: "step_1", question: "", prompt: "", input: "", action: "test",
  status: "applied", mutations,
}]);

/** An element as it looked before `form` and `fields`. */
const oldElement = (extra: Record<string, unknown> = {}) => ({
  id: "n_1", element: "block", label: "Old", type: "", parent: null, body: "",
  x: null, y: null, w: null, h: null, side: null, at: null, flow: null, num: 1,
  axis: null, groups: [], of: null, attrs: [], color: "#d9a441", ...extra,
});

describe("what is not a log", () => {
  it.each([null, 42, "steps", { steps: [] }])("is refused rather than half-loaded: %s", (raw) => {
    expect(entering(raw)).toBeNull();
  });

  it("takes an empty log as an empty project", () => {
    expect(entering([])).toEqual({ steps: [], faults: [] });
  });
});

describe("healing old shapes", () => {
  it("reads an element's own `element` as its form", () => {
    const came = entering(logged({ op: "add_element", element: oldElement() }))!;

    expect(fold(came.steps).elements.n_1.form).toBe("block");
    expect(came.faults.some((f) => f.healed)).toBe(true);
  });

  it("reads untyped `attrs` as text fields", () => {
    const attrs = [{ name: "note", value: "hi", tags: [] }];
    const came = entering(logged({ op: "add_element", element: oldElement({ attrs }) }))!;
    const held = fold(came.steps).elements.n_1.fields;

    expect(held).toHaveLength(1);
    expect(held[0]).toMatchObject({ name: "note", value: "hi", form: "text" });
  });

  it("reads a relationship's `kind` as its form, and its `relation` as its type", () => {
    const came = entering(logged(
      { op: "add_element", element: oldElement() },
      { op: "link_nodes", edge: { id: "e_1", source: "n_1", target: "n_1",
                                  relation: "holds", dir: "none", kind: "assoc" } },
    ))!;
    const held = fold(came.steps).edges.e_1;

    expect(held.form).toBe("assoc");
    expect(fold(came.steps).defs[held.type].name).toBe("holds");
  });

  it("reaches inside a checkpoint, which carries a whole graph of its own", () => {
    const came = entering(logged({
      op: "checkpoint",
      graph: {
        elements: { n_1: oldElement({ attrs: [{ name: "a", value: "b", tags: [] }] }) },
        edges: { e_1: { id: "e_1", source: "n_1", target: "n_1", type: "t", dir: "none",
                        kind: "flow" } },
        defs: {}, vocabulary: "",
      },
    }))!;
    const graph = fold(came.steps);

    expect(graph.elements.n_1.form).toBe("block");
    expect(graph.elements.n_1.fields).toHaveLength(1);
    expect(graph.edges.e_1.form).toBe("flow");
  });
});

describe("what cannot be read", () => {
  it("drops an operation from a newer build and says so", () => {
    const came = entering(logged({ op: "invent_something", id: "x" }))!;

    expect(came.steps[0].mutations).toHaveLength(0);
    expect(came.faults.some((f) => !f.healed)).toBe(true);
  });

  it("keeps the rest of a step whose neighbour was unreadable", () => {
    const came = entering(logged({ op: "invent_something" },
                                 { op: "add_element", element: oldElement() }))!;

    expect(came.steps[0].mutations).toHaveLength(1);
    expect(fold(came.steps).elements.n_1).toBeDefined();
  });

  it("treats a status that is neither as applied, rather than losing the work", () => {
    const came = entering([{ ...logged()[0], status: "whatever" }])!;

    expect(came.steps[0].status).toBe("applied");
  });
});

describe("what the user is told", () => {
  it("says nothing about a clean log", () => {
    expect(report([])).toBeNull();
  });

  it("counts rather than lists, so one kind of fault is one message", () => {
    const many = Array.from({ length: 400 }, (_, step) => ({
      step, op: "x", why: "same reason", healed: false,
    }));

    expect(report(many)!.split("\n")).toHaveLength(1);
    expect(report(many)).toContain("400");
  });
});
