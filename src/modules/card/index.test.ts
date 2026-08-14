/** The card component.
 *
 *  The first component, so these are as much about the contract as about cards:
 *  a closed set is refused from data, an unknown key inside a claimed component
 *  is a mistake rather than a newer build, and the default has to be able to
 *  describe the card the canvas already draws. */

import { describe, expect, it } from "vitest";

import { card, cardOf, LAYOUTS, PLAIN, SHAPES } from "./index";
import { element, EMPTY } from "../../graph/types";
import type { Element, Graph } from "../../graph/types";

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
  it("accepts a configuration naming only the closed sets", () => {
    expect(card.check({ layout: "shape", shape: "diamond", label: "below" })).toBeNull();
  });

  it("accepts saying nothing at all", () => {
    expect(card.check({})).toBeNull();
  });

  it.each([
    ["layout", { layout: "invented" }],
    ["shape", { shape: "trapezium" }],
    ["label", { label: "above" }],
  ])("refuses a %s outside the closed set, and says so", (key, config) => {
    const why = card.check(config);

    expect(why).toContain(key);
  });

  it("refuses a key it knows nothing about, since it owns the whole of its own", () => {
    expect(card.check({ colour: "red" })).toContain("colour");
  });

  it("refuses `shows` that is not a list of field names", () => {
    expect(card.check({ shows: "id" })).toContain("shows");
    expect(card.check({ shows: ["id", 4] })).toContain("shows");
    expect(card.check({ shows: ["id", "text"] })).toBeNull();
  });
});

describe("how a usage is composed", () => {
  it("is the plain card where nothing says otherwise", () => {
    const [graph, element] = typed();

    expect(cardOf(graph, element)).toEqual(PLAIN);
  });

  it("is the plain card for an element with no definition at all", () => {
    const [graph, element] = typed();

    expect(cardOf(graph, { ...element, type: "" })).toEqual(PLAIN);
  });

  it("takes what the definition says, and the default for what it leaves out", () => {
    const [graph, element] = typed({ card: { shape: "diamond", shows: ["id"] } });
    const held = cardOf(graph, element);

    expect(held.shape).toBe("diamond");
    expect(held.shows).toEqual(["id"]);
    expect(held.layout).toBe(PLAIN.layout);
  });

  it("reads its own key and no other's", () => {
    const [graph, element] = typed({ style: { set: "sysml" }, card: { shape: "hex" } });

    expect(cardOf(graph, element)).toEqual({ ...PLAIN, shape: "hex" });
  });
});

describe("the base diagram as one configuration among others", () => {
  it("describes today's card: a name with its subtype chip, in a rectangle", () => {
    expect(PLAIN.layout).toBe("type");
    expect(PLAIN.shape).toBe("rect");
    expect(PLAIN.label).toBe("inside");
    expect(PLAIN.shows).toEqual([]);
  });

  it("keeps the sets closed, so a definition picks and never describes", () => {
    expect(LAYOUTS).toContain("type");
    expect(SHAPES).toContain("rect");
    expect(card.check({ shape: "rect" })).toBeNull();
  });
});
