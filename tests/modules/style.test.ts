/** The style component.
 *
 *  The seam is settled — a component owns its key, refuses a misspelling
 *  inside it, and leaves an unknown component alone — so these are property
 *  tests against that contract, against the open set of style sets, and
 *  against the portable fields a usage draws from without one. */

import { describe, expect, it } from "vitest";

import { lookOf, NONE, SETS, sheet, style, styleOf } from "../../src/modules/style/index";
import { element, EMPTY } from "../../src/graph/types";
import type { Element, Graph } from "../../src/graph/types";

/** A graph holding one definition and one element typed by it. */
function typed(
  components?: Record<string, Record<string, unknown>>,
  extra?: Partial<Graph["defs"][string]>,
): [Graph, Element] {
  const held = element("a thing", { id: "block_1", type: "def_1" });
  const graph: Graph = {
    ...EMPTY,
    defs: {
      def_1: {
        id: "def_1", name: "requirement", form: "block", fields: [],
        components, ...extra,
      },
    },
    elements: { ...EMPTY.elements, block_1: held },
  };

  return [graph, held];
}

describe("what a definition may say", () => {
  it("accepts a configuration naming a style set this build ships", () => {
    expect(SETS.length).toBeGreaterThan(0);
    expect(style.check({ set: SETS[0] })).toBeNull();
  });

  it("refuses a set this build does not ship, and says so", () => {
    const why = style.check({ set: "invented" });

    expect(why).toContain("set");
  });

  it("refuses a set that is not a name", () => {
    expect(style.check({ set: 4 })).toContain("set");
  });

});

describe("how a usage is coloured", () => {
  it("names no set where nothing says otherwise", () => {
    const [graph, element] = typed();

    expect(styleOf(graph, element)).toEqual(NONE);
  });

  it("takes what the definition says", () => {
    const [graph, element] = typed({ style: { set: SETS[0] } });

    expect(styleOf(graph, element)).toEqual({ set: SETS[0] });
  });

});

describe("style sets as an open set", () => {
  it("ships each named set as an asset the module can resolve", () => {
    for (const name of SETS) {
      expect(sheet(name)?.name).toBe(name);
    }
  });

  it("accepts every set it ships", () => {
    for (const name of SETS) {
      expect(style.check({ set: name })).toBeNull();
    }
  });
});

describe("portable fields without a set", () => {
  it("draws on the definition's fields when no set is named", () => {
    const [graph, element] = typed(undefined, {
      color: "#3f6552", line: "dashed", head: "hollow",
    });

    expect(lookOf(graph, element)).toEqual({
      color: "#3f6552", line: "dashed", head: "hollow",
    });
  });

  it("carries the set when one is named and in the build", () => {
    const [graph, element] = typed(
      { style: { set: SETS[0] } },
      { color: "#3f6552" },
    );

    expect(lookOf(graph, element)).toEqual({
      color: "#3f6552", set: SETS[0],
    });
  });

  it("drops a set this build does not ship, so a package still draws", () => {
    const [graph, element] = typed(
      { style: { set: "missing" } },
      { line: "dotted" },
    );

    expect(lookOf(graph, element)).toEqual({ line: "dotted" });
  });
});
