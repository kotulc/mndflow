/** The view component and the view-module registry.
 *
 *  The seam is settled — six names, a kind each, a component that owns its
 *  key — so these are property tests against that contract. The block module
 *  carries a projection surface; drawing from configuration is a later half. */

import { describe, expect, it } from "vitest";

import {
  BLOCK, MODULES, kindOf, named, view, viewOf, views,
} from "./index";
import type { ViewName } from "./index";
import { element, EMPTY } from "../../graph/types";
import type { Element, Graph } from "../../graph/types";

/** A graph holding one definition and one element typed by it. */
function typed(components?: Record<string, Record<string, unknown>>): [Graph, Element] {
  const held = element("a thing", { id: "block_1", type: "def_1" });
  const graph: Graph = {
    ...EMPTY,
    defs: { def_1: { id: "def_1", name: "diagram", form: "block", fields: [], components } },
    elements: { ...EMPTY.elements, block_1: held },
  };

  return [graph, held];
}

describe("the registered set", () => {
  it("holds exactly the six, three per kind", () => {
    const held = views();

    expect(held.map((m) => m.name).sort()).toEqual([...MODULES].sort());
    expect(held.filter((m) => m.kind === "structure")).toHaveLength(3);
    expect(held.filter((m) => m.kind === "behavior")).toHaveLength(3);
  });

  it("names no module `diagram` — that is the picture, not a projection", () => {
    expect(named("diagram")).toBeNull();
    expect(MODULES).not.toContain("diagram");
  });

  it("answers every registered name and none outside the set", () => {
    for (const name of MODULES) {
      expect(named(name)?.name).toBe(name);
      expect(kindOf(name)).toBe(named(name)?.kind);
    }
    expect(named("invented")).toBeNull();
  });
});

describe("what a definition may say", () => {
  it("accepts each registered module", () => {
    for (const name of MODULES) {
      expect(view.check({ module: name })).toBeNull();
    }
  });

  it("accepts saying nothing at all", () => {
    expect(view.check({})).toBeNull();
  });

  it("refuses a module outside the set, and says so", () => {
    expect(view.check({ module: "diagram" })).toContain("module");
    expect(view.check({ module: "invented" })).toContain("module");
  });

  it("refuses a key it knows nothing about, since it owns the whole of its own", () => {
    expect(view.check({ arrangement: "grid" })).toContain("arrangement");
  });
});

describe("how a usage is projected", () => {
  it("is the block view where nothing says otherwise", () => {
    const [graph, element] = typed();

    expect(viewOf(graph, element)).toEqual(BLOCK);
  });

  it("is the block view for an element with no definition at all", () => {
    const [graph, element] = typed();

    expect(viewOf(graph, { ...element, type: "" })).toEqual(BLOCK);
  });

  it("takes what the definition says", () => {
    const [graph, element] = typed({ view: { module: "matrix" } });

    expect(viewOf(graph, element)).toEqual({ module: "matrix" });
  });

  it("reads its own key and no other's", () => {
    const [graph, element] = typed({
      card: { shape: "hex" },
      view: { module: "table" },
    });

    expect(viewOf(graph, element)).toEqual({ module: "table" });
  });
});

describe("the base diagram as one configuration among others", () => {
  it("describes today's canvas: the block view", () => {
    expect(BLOCK.module).toBe("block");
    expect(kindOf(BLOCK.module)).toBe("structure");
  });

  it("carries the projection surface on the registered module", () => {
    expect(named("block")?.surface?.surround).toBe("frame");
    expect(named("block")?.surface?.viewport).toBe("camera");
    expect(named("block")?.surface?.asks).toBe(true);
    expect(named("table")?.surface?.surround).toBe("none");
    expect(named("table")?.surface?.viewport).toBe("scroll");
    expect(named("matrix")?.surface?.surround).toBe("none");
    expect(named("matrix")?.surface?.viewport).toBe("scroll");
  });

  it("keeps the set open only to a code change, so a definition picks and never describes", () => {
    expect(MODULES).toContain("block");
    expect(view.check({ module: "block" as ViewName })).toBeNull();
  });
});
