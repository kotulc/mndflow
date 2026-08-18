/** The style component.
 *
 *  The seam is settled — a component owns its key, refuses a misspelling
 *  inside it, and leaves an unknown component alone — so these are property
 *  tests against that contract, against the open set of style sets, and
 *  against the portable fields a usage draws from without one. */

import { describe, expect, it } from "vitest";

import {
  EMPHASES, lookOf, NONE, SETS, SLOTS, VOICES, WEIGHTS, ramp, sheet, style, styleOf,
} from "../../src/modules/style/index";
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

    expect(styleOf(graph, element)).toEqual({ ...NONE, set: SETS[0] });
  });

});

describe("a definition picks within the palette, never a colour", () => {
  it("accepts every slot and every emphasis the build offers", () => {
    for (const slot of SLOTS) expect(style.check({ slot })).toBeNull();
    for (const emphasis of EMPHASES) expect(style.check({ emphasis })).toBeNull();
  });

  it("refuses a slot or an emphasis outside the closed set", () => {
    expect(style.check({ slot: "magenta" })).toContain("slot");
    expect(style.check({ emphasis: "shouting" })).toContain("emphasis");
  });

  it("accepts every weight and voice it offers, and refuses a value instead", () => {
    for (const weight of WEIGHTS) expect(style.check({ weight })).toBeNull();
    for (const voice of VOICES) expect(style.check({ voice })).toBeNull();
    expect(style.check({ weight: "6px" })).toContain("weight");
    expect(style.check({ voice: "Helvetica" })).toContain("voice");
  });

  it("names no colour anywhere — a slot resolves to a step of the theme's ramp", () => {
    for (const slot of SLOTS) {
      for (const emphasis of EMPHASES) {
        for (const part of ["fill", "line"] as const) {
          const drawn = ramp(
            { slot, emphasis, weight: NONE.weight, voice: NONE.voice, typed: true },
            part,
          );

          expect(drawn).toContain(slot);
          expect(drawn.startsWith("var(--")).toBe(true);
          expect(drawn).not.toMatch(/#|rgb|oklch/);
        }
      }
    }
  });

  it("gives a definition that says nothing the calm end of the ramp", () => {
    const [graph, element] = typed();
    const look = lookOf(graph, element);

    expect(look.slot).toBe(NONE.slot);
    expect(look.emphasis).toBe(NONE.emphasis);
  });

  it("tells a definition that says nothing from no definition at all", () => {
    const [graph] = typed();
    const bare = element("untyped", { id: "block_2" });

    expect(lookOf(graph, bare).typed).toBe(false);
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
    const [graph, element] = typed(undefined, { line: "dashed", head: "hollow" });

    expect(lookOf(graph, element)).toEqual({
      slot: NONE.slot, emphasis: NONE.emphasis, weight: NONE.weight, voice: NONE.voice,
      line: "dashed", head: "hollow", typed: true,
    });
  });

  it("carries the set when one is named and in the build", () => {
    const [graph, element] = typed({ style: { set: SETS[0] } }, {});

    expect(lookOf(graph, element)).toEqual({
      slot: NONE.slot, emphasis: NONE.emphasis, weight: NONE.weight, voice: NONE.voice,
      set: SETS[0], typed: true,
    });
  });

  it("drops a set this build does not ship, so a package still draws", () => {
    const [graph, element] = typed(
      { style: { set: "missing" } },
      { line: "dotted" },
    );

    expect(lookOf(graph, element)).toEqual({
      slot: NONE.slot, emphasis: NONE.emphasis, weight: NONE.weight, voice: NONE.voice,
      line: "dotted", typed: true,
    });
  });
});
