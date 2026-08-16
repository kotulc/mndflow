/** The view component and the view-module registry.
 *
 *  The seam is settled — six names, a kind each, a word and a create answer,
 *  a component that owns its key including the abstraction cap — so these
 *  are property tests against that contract. The block module carries a
 *  projection surface; drawing from configuration is a later half. */

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

  it("gives every module a word and a create answer", () => {
    for (const module of views()) {
      expect(module.word.length).toBeGreaterThan(0);
      expect(module.creates === null || typeof module.creates === "string").toBe(true);
    }
  });

  it("lets matrix create nothing, and activity create an action", () => {
    expect(named("matrix")?.creates).toBeNull();
    expect(named("activity")?.creates).toBe("action");
    expect(named("state")?.creates).toBe("state");
    expect(named("block")?.creates).toBe("");
    expect(named("table")?.word).toBe("row");
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

  it("accepts a positive integer abstraction cap", () => {
    expect(view.check({ N: 1 })).toBeNull();
    expect(view.check({ N: BLOCK.N })).toBeNull();
  });

  it("refuses a module outside the set, and says so", () => {
    expect(view.check({ module: "diagram" })).toContain("module");
    expect(view.check({ module: "invented" })).toContain("module");
  });

  it("refuses a cap that is not a positive integer", () => {
    expect(view.check({ N: 0 })).toContain("N");
    expect(view.check({ N: -1 })).toContain("N");
    expect(view.check({ N: 1.5 })).toContain("N");
    expect(view.check({ N: "5" })).toContain("N");
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

  it("takes what the definition says, and the default for what it leaves out", () => {
    const [graph, element] = typed({ view: { module: "matrix" } });

    expect(viewOf(graph, element)).toEqual({ ...BLOCK, module: "matrix" });
  });

  it("takes a stated abstraction cap over the default", () => {
    const [graph, element] = typed({ view: { module: "activity", N: 3 } });

    expect(viewOf(graph, element)).toEqual({ module: "activity", N: 3 });
  });

  it("reads its own key and no other's", () => {
    const [graph, element] = typed({
      card: { shape: "hex" },
      view: { module: "table" },
    });

    expect(viewOf(graph, element)).toEqual({ ...BLOCK, module: "table" });
  });
});

describe("the base diagram as one configuration among others", () => {
  it("describes today's canvas: the block view, with an abstraction cap", () => {
    expect(BLOCK.module).toBe("block");
    expect(kindOf(BLOCK.module)).toBe("structure");
    expect(Number.isInteger(BLOCK.N) && BLOCK.N > 0).toBe(true);
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
