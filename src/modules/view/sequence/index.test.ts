/** The sequence view module's surface, map and stage composition.
 *
 *  The surface seam is settled — surround / viewport / chrome / asking — and
 *  the map settles that a sequence accepts `seat`. Columns, messages and
 *  dimmed labels are counts over the layer, never stored elements. */

import { describe, expect, it } from "vitest";

import { edge, element, EMPTY, ROOT, field } from "../../../graph/types";
import type { Graph } from "../../../graph/types";
import { named } from "../index";
import { CHROME } from "../diagram/surface";
import {
  SEQUENCE, DIM, MAP, VERB, along, columnsOf, guardOf, ranked, reaches,
  stageOf, takes,
} from "./index";

describe("the sequence module's surface", () => {
  it("is a framed plane with a camera, and a place to ask", () => {
    expect(SEQUENCE.surround).toBe("frame");
    expect(SEQUENCE.viewport).toBe("camera");
    expect(SEQUENCE.asks).toBe(true);
    expect(SEQUENCE.chrome).toContain("crumbs");
    expect(SEQUENCE.chrome).not.toContain("interfaces");
  });

  it("is what the registered sequence module carries", () => {
    expect(named("sequence")?.surface).toEqual(SEQUENCE);
    expect(named("sequence")?.kind).toBe("behavior");
    expect(named("sequence")?.creates).toBe("action");
    expect(named("sequence")?.word).toBe("action");
  });

  it("names no chrome kind outside the open set", () => {
    for (const kind of SEQUENCE.chrome) {
      expect(CHROME).toContain(kind);
    }
  });
});

describe("the sequence module's gesture map", () => {
  it("accepts seat and none of the other three adjustments", () => {
    expect(MAP.adjustments).toEqual(["seat"]);
    expect(takes("seat")).toBe(true);
    expect(takes("place")).toBe(false);
    expect(takes("size")).toBe(false);
    expect(takes("wall")).toBe(false);
  });

  it("binds create, relate and open on the plane", () => {
    expect(reaches("right", "click", "empty")).toBe("create");
    expect(reaches("right", "drag", "card")).toBe("relate");
    expect(reaches("left", "double", "card")).toBe("open");
  });

  it("answers null for a gesture it does not bind", () => {
    expect(reaches("right", "click", "frame")).toBeNull();
    expect(reaches("left", "drag", "card")).toBeNull();
  });
});

describe("stage composition", () => {
  /** Three participants; directed chain a→b, c placed later on the axis. */
  function layered(): Graph {
    const layer = element("flow", {
      id: "L", parent: ROOT, form: "block", axis: "across",
    });
    const a = element("", {
      id: "a", parent: "L", form: "block", type: "def_action", x: 0, y: 0,
    });
    const b = element("", {
      id: "b", parent: "L", form: "block", type: "def_action", x: 40, y: 0,
    });
    const c = element("", {
      id: "c", parent: "L", form: "block", type: "def_action", x: 80, y: 0,
    });
    const pa = element("", {
      id: "pa", parent: "a", form: "proxy", of: "proj/pump",
    });
    const pb = element("", {
      id: "pb", parent: "b", form: "proxy", of: "proj/tank",
    });
    const pc = element("", {
      id: "pc", parent: "c", form: "proxy", of: "proj/valve",
    });

    const e1 = edge("a", "b", {
      id: "e1", form: "directed", dir: "forward",
    });
    const e2 = edge("b", "c", {
      id: "e2", form: "directed", dir: "forward",
      fields: [field("guard", { value: "ready" })],
    });

    return {
      ...EMPTY,
      defs: {
        def_action: { id: "def_action", name: "action", form: "block", fields: [] },
      },
      elements: {
        ...EMPTY.elements, L: layer, a, b, c, pa, pb, pc,
      },
      edges: { e1, e2 },
    };
  }

  it("derives a dimmed label from the verb and the participant ref", () => {
    const stage = stageOf(layered(), "L");
    const occ = stage.occurrences.find((row) => row.id === "a");

    expect(occ?.derived).toBe(true);
    expect(occ?.label.startsWith(`${VERB} `)).toBe(true);
    expect(stage.dim).toEqual(DIM);
    expect(typeof DIM.color).toBe("string");
    expect(DIM.opacity).toBeGreaterThan(0);
    expect(DIM.opacity).toBeLessThan(1);
  });

  it("uses a typed label without marking it derived", () => {
    const graph = layered();
    graph.elements.a = { ...graph.elements.a, label: "circulate" };
    const occ = stageOf(graph, "L").occurrences.find((row) => row.id === "a");

    expect(occ?.derived).toBe(false);
    expect(occ?.label).toBe("circulate");
  });

  it("builds a column per participant ref", () => {
    const cols = columnsOf(layered(), "L");

    expect(cols.length).toBeGreaterThan(0);
    expect(cols.every((col) => col.ref.length > 0)).toBe(true);
    expect(cols.every((col) => col.actions.length > 0)).toBe(true);
    expect(new Set(cols.map((c) => c.ref)).size).toBe(cols.length);
  });

  it("orders by directed relations before axis position", () => {
    const graph = layered();
    // Reverse axis placement so position alone would put c first.
    graph.elements.a = { ...graph.elements.a, x: 80 };
    graph.elements.b = { ...graph.elements.b, x: 40 };
    graph.elements.c = { ...graph.elements.c, x: 0 };
    const stage = stageOf(graph, "L");
    const ranks = stage.occurrences
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .map((o) => o.id);

    expect(ranks.indexOf("a")).toBeLessThan(ranks.indexOf("b"));
    expect(ranks.indexOf("b")).toBeLessThan(ranks.indexOf("c"));
  });

  it("falls back to axis position when no directed edge speaks", () => {
    const graph = layered();
    graph.edges = {};
    const ids = ranked(
      [graph.elements.a, graph.elements.b, graph.elements.c],
      [],
      "across",
    );

    expect(along("across", graph.elements.a))
      .toBeLessThan(along("across", graph.elements.c));
    expect(ids.indexOf("a")).toBeLessThan(ids.indexOf("c"));
  });

  it("marks axis-only consecutive pairs as implied", () => {
    const graph = layered();
    graph.edges = {};
    const stage = stageOf(graph, "L");

    expect(stage.orders.length).toBeGreaterThan(0);
    expect(stage.orders.every((o) => o.implied)).toBe(true);
  });

  it("derives a message when order crosses columns", () => {
    const stage = stageOf(layered(), "L");

    expect(stage.messages.length).toBeGreaterThan(0);
    expect(stage.messages.every((m) => m.fromCol !== m.toCol)).toBe(true);
    const guarded = stage.messages.find((m) => m.edge?.id === "e2");
    expect(guardOf(layered(), guarded!.edge!)).toBe("ready");
    expect(guarded?.guard).toBe("ready");
  });

  it("dims inferred directed order", () => {
    const stage = stageOf(layered(), "L");
    const bare = stage.orders.find((o) => o.edge?.id === "e1");

    expect(bare?.inferred).toBe(true);
    expect(bare?.implied).toBe(false);
  });

  it("is empty for a layer that holds nothing", () => {
    const stage = stageOf(EMPTY, ROOT);

    expect(stage.occurrences).toEqual([]);
    expect(stage.columns).toEqual([]);
    expect(stage.orders).toEqual([]);
    expect(stage.messages).toEqual([]);
  });
});
