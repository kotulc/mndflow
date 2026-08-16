/** The rules component.
 *
 *  The seam is settled — a component owns its key, refuses a misspelling
 *  inside it, and leaves an unknown component alone — so these are property
 *  tests against that contract, the four kinds, and reach via `isa`. */

import { describe, expect, it } from "vitest";

import { among, NONE, rules, rulesOf } from "../../src/modules/rules/index";
import { element, EMPTY } from "../../src/graph/types";
import type { Element, Graph } from "../../src/graph/types";

/** A graph holding one definition and one element typed by it. */
function typed(
  components?: Record<string, Record<string, unknown>>,
  defs?: Graph["defs"],
): [Graph, Element] {
  const held = element("a thing", { id: "block_1", type: "def_1" });
  const graph: Graph = {
    ...EMPTY,
    defs: {
      def_1: { id: "def_1", name: "requirement", form: "block", fields: [], components },
      ...defs,
    },
    elements: { ...EMPTY.elements, block_1: held },
  };

  return [graph, held];
}

describe("what a definition may say", () => {
  it("accepts each of the four kinds", () => {
    expect(rules.check({
      ends: { from: ["def_a"], to: ["def_b"], fromPort: "out", toPort: "in" },
      holds: ["def_block"],
      degree: { in: [0, 0], out: [1, null] },
      match: ["type"],
    })).toBeNull();
  });

  it("accepts empty lists and unbounded degree", () => {
    expect(rules.check({
      ends: { from: [], to: [] },
      holds: [],
      degree: { in: [null, null], out: [0, null] },
      match: [],
    })).toBeNull();
  });

  it("refuses ends that are not from/to lists", () => {
    expect(rules.check({ ends: "line" })).toContain("ends");
    expect(rules.check({ ends: { from: "def_a", to: [] } })).toContain("from");
    expect(rules.check({ ends: { from: [], to: [4] } })).toContain("to");
  });

  it("refuses a port direction outside the closed set", () => {
    expect(rules.check({ ends: { from: [], to: [], fromPort: "left" } })).toContain("fromPort");
  });

  it("refuses a key under ends it knows nothing about", () => {
    expect(rules.check({ ends: { from: [], to: [], side: "top" } })).toContain("side");
  });

  it("refuses holds that is not a list of names", () => {
    expect(rules.check({ holds: "def_block" })).toContain("holds");
    expect(rules.check({ holds: [1] })).toContain("holds");
  });

  it("refuses degree bounds that are not [least, most]", () => {
    expect(rules.check({ degree: { in: [1] } })).toContain("in");
    expect(rules.check({ degree: { out: [2, "many"] } })).toContain("out");
    expect(rules.check({ degree: { in: [3, 1] } })).toContain("least");
  });

  it("refuses a key under degree it knows nothing about", () => {
    expect(rules.check({ degree: { total: [0, 1] } })).toContain("total");
  });

  it("refuses match that is not a list of field names", () => {
    expect(rules.check({ match: "type" })).toContain("match");
  });

  it("refuses ends that omit from or to", () => {
    expect(rules.check({ ends: { to: [] } })).toContain("from");
    expect(rules.check({ ends: { from: [] } })).toContain("to");
  });
});

describe("how a usage is ruled", () => {
  it("rules nothing where nothing says otherwise", () => {
    const [graph, element] = typed();

    expect(rulesOf(graph, element)).toEqual(NONE);
  });

  it("takes what the definition says, and none for what it leaves out", () => {
    const [graph, element] = typed({
      rules: { degree: { in: [1, 1] }, match: ["type"] },
    });

    expect(rulesOf(graph, element)).toEqual({
      ends: { from: [], to: [] },
      holds: [],
      degree: { in: [1, 1] },
      match: ["type"],
    });
  });

  it("carries optional port directions on ends", () => {
    const [graph, element] = typed({
      rules: { ends: { from: ["def_a"], to: [], fromPort: "out" } },
    });

    expect(rulesOf(graph, element).ends).toEqual({
      from: ["def_a"], to: [], fromPort: "out",
    });
  });

});

describe("the four kinds", () => {
  it("are only ends, holds, degree and match", () => {
    expect(Object.keys(NONE).sort()).toEqual(["degree", "ends", "holds", "match"]);
  });
});

describe("reach via isa", () => {
  it("counts a definition among those it names", () => {
    const [graph] = typed(undefined, {
      def_req: { id: "def_req", name: "requirement", form: "block", fields: [] },
    });

    expect(among(graph, "def_req", ["def_req"])).toBe(true);
    expect(among(graph, "def_req", ["def_other"])).toBe(false);
  });

  it("reaches every subtype of a named definition", () => {
    const [graph] = typed(undefined, {
      def_req: { id: "def_req", name: "requirement", form: "block", fields: [] },
      def_safety: {
        id: "def_safety", name: "safety", form: "block", fields: [], extends: "def_req",
      },
      def_hazard: {
        id: "def_hazard", name: "hazard", form: "block", fields: [], extends: "def_safety",
      },
    });

    expect(among(graph, "def_hazard", ["def_req"])).toBe(true);
    expect(among(graph, "def_safety", ["def_req"])).toBe(true);
    expect(among(graph, "def_req", ["def_hazard"])).toBe(false);
  });

  it("is how an ends or holds list matches a usage's type", () => {
    const [graph, element] = typed(
      { rules: { holds: ["def_req"] } },
      {
        def_req: { id: "def_req", name: "requirement", form: "block", fields: [] },
        def_safety: {
          id: "def_safety", name: "safety", form: "block", fields: [], extends: "def_req",
        },
      },
    );
    const held = rulesOf(graph, element).holds;

    expect(among(graph, "def_safety", held)).toBe(true);
    expect(among(graph, "def_other", held)).toBe(false);
  });
});