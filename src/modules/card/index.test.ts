/** The card component.
 *
 *  The first component, so these are as much about the contract as about cards:
 *  a closed set is refused from data, an unknown key inside a claimed component
 *  is a mistake rather than a newer build, and the default has to be able to
 *  describe the card the canvas already draws. */

import { describe, expect, it } from "vitest";

import { card, cardOf, LAYOUTS, outline, PLAIN, shaped, SHAPES } from "./index";
import type { Outline, Shape, Spot } from "./index";
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

  it("inherits a card the parent names when the subtype says nothing", () => {
    const held = element("a thing", { id: "block_1", type: "def_child" });
    const graph: Graph = {
      ...EMPTY,
      defs: {
        def_parent: {
          id: "def_parent", name: "parent", form: "block", fields: [],
          components: { card: { shape: "diamond", shows: ["id"] } },
        },
        def_child: {
          id: "def_child", name: "child", form: "block", fields: [],
          extends: "def_parent",
        },
      },
      elements: { ...EMPTY.elements, block_1: held },
    };
    const composed = cardOf(graph, held);

    expect(composed.shape).toBe("diamond");
    expect(composed.shows).toEqual(["id"]);
    expect(composed.layout).toBe(PLAIN.layout);
  });

  it("replaces the parent's card when the subtype names its own", () => {
    const held = element("a thing", { id: "block_1", type: "def_child" });
    const graph: Graph = {
      ...EMPTY,
      defs: {
        def_parent: {
          id: "def_parent", name: "parent", form: "block", fields: [],
          components: { card: { shape: "diamond", shows: ["id"] } },
        },
        def_child: {
          id: "def_child", name: "child", form: "block", fields: [],
          extends: "def_parent",
          components: { card: { shape: "hex" } },
        },
      },
      elements: { ...EMPTY.elements, block_1: held },
    };
    const composed = cardOf(graph, held);

    // Whole key replaced — the parent's shows does not leak in.
    expect(composed.shape).toBe("hex");
    expect(composed.shows).toEqual(PLAIN.shows);
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

describe("a shape drawn without storing one", () => {
  it("is the shape layout, showing no fields", () => {
    const held = shaped("diamond");

    expect(held.layout).toBe("shape");
    expect(held.shape).toBe("diamond");
    expect(held.shows).toEqual([]);
    expect(held.label).toBe("below");
  });

  it("takes the label the caller names, for marks with no text at all", () => {
    expect(shaped("rect", "none").label).toBe("none");
  });

  it("is a configuration the door would accept", () => {
    for (const shape of SHAPES) {
      expect(card.check(shaped(shape))).toBeNull();
    }
  });
});

describe("how a shape fills the engine's box", () => {
  const box = { w: 80, h: 40 };

  function pointsOf(drawn: Outline): Spot[] {
    if (drawn.kind === "poly") return drawn.points;
    if (drawn.kind === "ellipse") {
      return [
        { x: drawn.cx - drawn.rx, y: drawn.cy },
        { x: drawn.cx + drawn.rx, y: drawn.cy },
        { x: drawn.cx, y: drawn.cy - drawn.ry },
        { x: drawn.cx, y: drawn.cy + drawn.ry },
      ];
    }
    return [
      { x: drawn.x, y: drawn.y },
      { x: drawn.x + drawn.w, y: drawn.y + drawn.h },
    ];
  }

  function inside(p: Spot): boolean {
    return p.x >= -1e-9 && p.y >= -1e-9 && p.x <= box.w + 1e-9 && p.y <= box.h + 1e-9;
  }

  it.each([...SHAPES])("keeps every %s inside the box the engine placed", (shape: Shape) => {
    expect(pointsOf(outline(shape, box)).every(inside)).toBe(true);
  });

  it("answers every shape in the closed set", () => {
    for (const shape of SHAPES) {
      expect(outline(shape, box).kind).toMatch(/rect|ellipse|poly/);
    }
  });

  it("puts a diamond's tips on the box border, one per side", () => {
    const drawn = outline("diamond", box);

    expect(drawn.kind).toBe("poly");
    if (drawn.kind !== "poly") return;

    const tips = drawn.points;
    expect(tips).toHaveLength(4);
    expect(tips.every((p) =>
      p.x === 0 || p.x === box.w || p.y === 0 || p.y === box.h)).toBe(true);
    expect(new Set(tips.map((p) => `${p.x === 0 || p.x === box.w ? "v" : "h"}`)).size)
      .toBe(2);
  });
});
