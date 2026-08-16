/** The constraints component.
 *
 *  The seam is settled — a component owns its key, refuses a misspelling
 *  inside it, and leaves an unknown component alone — so these are property
 *  tests against that contract, and against the one kind `required`. */

import { describe, expect, it } from "vitest";

import { constraints, constraintsOf, NONE } from "../../src/modules/constraints/index";
import { element, EMPTY } from "../../src/graph/types";
import type { Element, Graph } from "../../src/graph/types";

/** A graph holding one definition and one element typed by it. */
function typed(components?: Record<string, Record<string, unknown>>): [Graph, Element] {
  const held = element("a thing", { id: "block_1", type: "def_1" });
  const graph: Graph = {
    ...EMPTY,
    defs: { def_1: { id: "def_1", name: "requirement", form: "block", fields: [], components } },
    elements: { ...EMPTY.elements, block_1: held },
  };

  return [graph, held];
}

describe("what a definition may say", () => {
  it("accepts a configuration naming only required fields", () => {
    expect(constraints.check({ required: ["id", "text"] })).toBeNull();
  });

  it("accepts an empty required list", () => {
    expect(constraints.check({ required: [] })).toBeNull();
  });

  it("refuses `required` that is not a list of field names", () => {
    expect(constraints.check({ required: "id" })).toContain("required");
    expect(constraints.check({ required: ["id", 4] })).toContain("required");
  });

});

describe("how a usage is constrained", () => {
  it("requires nothing where nothing says otherwise", () => {
    const [graph, element] = typed();

    expect(constraintsOf(graph, element)).toEqual(NONE);
  });

  it("takes what the definition says, and none for what it leaves out", () => {
    const [graph, element] = typed({ constraints: { required: ["id"] } });

    expect(constraintsOf(graph, element)).toEqual({ required: ["id"] });
  });

});

describe("the one constraint", () => {
  it("is only `required`, so a definition picks fields and never invents a kind", () => {
    expect(Object.keys(NONE)).toEqual(["required"]);
    expect(constraints.check({ required: ["id"] })).toBeNull();
  });
});
