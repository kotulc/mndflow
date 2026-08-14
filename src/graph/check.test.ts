/** The one door a log comes in through.
 *
 *  This is the module a schema change quietly breaks. Every rename since the
 *  first build is healed here, and a heal that stops firing does not throw —
 *  the log simply loads with a field missing and something fails far away. So
 *  each case asserts that an *old shape* still arrives as the current one, and
 *  that the user is told, without pinning the wording. */

import { describe, expect, it } from "vitest";

import { entering, report, validating } from "./check";
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
      { op: "link_elements", edge: { id: "e_1", source: "n_1", target: "n_1",
                                     relation: "holds", dir: "none", kind: "assoc" } },
    ))!;
    const held = fold(came.steps).edges.e_1;

    // `assoc` was presentation, so it heals to the plain form and loses its weight.
    expect(held.form).toBe("line");
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
    expect(graph.edges.e_1.form).toBe("directed");
  });
});

describe("an element's own colour, now its definition's", () => {
  it("is dropped rather than carried, so it is not written back out forever", () => {
    const came = entering(logged({ op: "add_element", element: oldElement() }))!;

    expect(fold(came.steps).elements.n_1).not.toHaveProperty("color");
    expect(came.faults.some((f) => f.healed)).toBe(true);
  });

  it("is dropped inside a checkpoint too, which is what a file arrives as", () => {
    const came = entering(logged({
      op: "checkpoint",
      graph: { elements: { n_1: oldElement() }, edges: {}, defs: {}, vocabulary: "" },
    }))!;

    expect(fold(came.steps).elements.n_1).not.toHaveProperty("color");
  });
});

describe("the relation forms that became two", () => {
  const linked = (form: string) => entering(logged(
    { op: "add_element", element: oldElement() },
    { op: "link_elements", edge: { id: "e_1", source: "n_1", target: "n_1", type: "t",
                                   dir: "none", form } },
  ))!;

  it.each([["flow", "directed"], ["untyped", "line"], ["assoc", "line"], ["tie", "line"]])(
    "reads a retired form — %s becomes %s", (was, now) => {
      expect(fold(linked(was).steps).edges.e_1.form).toBe(now);
    },
  );

  it("says so, since a form that vanished is worth one line", () => {
    expect(linked("assoc").faults.some((f) => f.healed)).toBe(true);
  });

  it("heals a form set after the fact as well as one given at creation", () => {
    const came = entering(logged(
      { op: "add_element", element: oldElement() },
      { op: "link_elements", edge: { id: "e_1", source: "n_1", target: "n_1", type: "t",
                                     dir: "none" } },
      { op: "set_form", id: "e_1", form: "flow" },
    ))!;

    expect(fold(came.steps).edges.e_1.form).toBe("directed");
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

describe("a definition's component configuration", () => {
  /** One definition arriving with whatever `components` bag is given. */
  const defined = (components: unknown) =>
    entering(logged({ op: "set_def", id: "def_1", name: "requirement", form: "block",
                      components }))!;

  const kept = (came: ReturnType<typeof defined>) =>
    (fold(came.steps).defs.def_1?.components ?? {});

  it("lets a key no component in this build claims through untouched", () => {
    const came = defined({ nothing_here_yet: { set: "sysml" } });

    expect(kept(came).nothing_here_yet).toEqual({ set: "sysml" });
    expect(came.faults).toHaveLength(0);
  });

  it("keeps what a registered component accepts", () => {
    validating("keen", () => null);
    const came = defined({ keen: { layout: "shape" } });

    expect(kept(came).keen).toEqual({ layout: "shape" });
    expect(came.faults).toHaveLength(0);
  });

  it("drops what a registered component refuses, and says the component's reason", () => {
    validating("fussy", () => "a card layout has to be one of the six");
    const came = defined({ fussy: { layout: "invented" } });

    expect(kept(came).fussy).toBeUndefined();
    expect(came.faults.some((f) => f.healed && f.why.includes("one of the six"))).toBe(true);
  });

  it("drops only the key that was refused, never the definition", () => {
    validating("fussy", () => "no");
    const came = defined({ fussy: {}, nobody_claims_this: { a: 1 } });
    const def = fold(came.steps).defs.def_1;

    expect(def.name).toBe("requirement");
    expect(def.components).toEqual({ nobody_claims_this: { a: 1 } });
  });

  it("refuses configuration that is not a record whether or not anybody claims the key", () => {
    for (const config of [[], "sysml", 4, null]) {
      const came = defined({ unclaimed: config });

      expect(kept(came).unclaimed).toBeUndefined();
      expect(came.faults.some((f) => f.healed)).toBe(true);
    }
  });

  it("reads the definitions inside a checkpoint the same way", () => {
    validating("fussy", () => "no");
    const def = { id: "def_1", name: "requirement", form: "block", fields: [],
                  components: { fussy: {}, unclaimed: { a: 1 } } };
    const came = entering(logged({ op: "checkpoint", at: 0, graph: {
      defs: { def_1: def }, elements: {}, edges: {}, vocabulary: "" } }))!;

    expect(fold(came.steps).defs.def_1.components).toEqual({ unclaimed: { a: 1 } });
    expect(came.faults.some((f) => f.healed)).toBe(true);
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
