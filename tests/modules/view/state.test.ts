/** The state view module's surface, map and stage composition.
 *
 *  The surface seam is settled — surround / viewport / chrome / asking — and
 *  the map settles that a state view accepts `place`. Reading A / B, dimmed
 *  labels and the empty offer are counts over the layer, never stored. */

import { describe, expect, it } from "vitest";

import { edge, element, EMPTY, ROOT, field, refTo } from "../../../src/graph/types";
import type { Graph } from "../../../src/graph/types";
import { named } from "../../../src/modules/view/index";
import { SHAPES } from "../../../src/modules/card";
import {
  STATE, DIM, MAP, MARKS, OFFER, guardOf, isState, marksOf, reaches,
  readingOf, stageOf, takes,
} from "../../../src/modules/view/state/index";

const STATE_TYPE = refTo("def_state", "pkg_behavior");
const ACTION_TYPE = refTo("def_action", "pkg_behavior");

describe("the state module's surface", () => {
  it("is a framed plane with a camera, and a place to ask", () => {
    expect(STATE.surround).toBe("frame");
    expect(STATE.viewport).toBe("camera");
    expect(STATE.asks).toBe(true);
    expect(STATE.chrome).toContain("crumbs");
    expect(STATE.chrome).not.toContain("interfaces");
  });

});

describe("the state module's gesture map", () => {
  it("accepts place and none of the other three adjustments", () => {
    expect(MAP.adjustments).toEqual(["place"]);
    expect(takes("place")).toBe(true);
    expect(takes("size")).toBe(false);
    expect(takes("seat")).toBe(false);
    expect(takes("wall")).toBe(false);
  });

  it("binds create, relate and open on the plane", () => {
    expect(reaches("right", "click", "empty")).toBe("create");
    expect(reaches("right", "drag", "card")).toBe("relate");
    expect(reaches("left", "double", "card")).toBe("open");
    expect(reaches("left", "drag", "card")).toBe("place");
  });

});

describe("stage composition", () => {
  /** Reading A: states with action proxies, bare directed transitions. */
  function reading_a(): Graph {
    const layer = element("machine", { id: "L", parent: ROOT, form: "block", type: STATE_TYPE });
    const a = element("", { id: "a", parent: "L", form: "block", type: STATE_TYPE });
    const b = element("named", { id: "b", parent: "L", form: "block", type: STATE_TYPE });
    const c = element("end", { id: "c", parent: "L", form: "block", type: STATE_TYPE });
    const pa = element("", { id: "pa", parent: "a", form: "proxy", of: "proj/pump" });
    const group = element("Cabin", { id: "g1", parent: "L", form: "group" });
    a.groups = ["g1"];
    b.groups = ["g1"];

    const e1 = edge("a", "b", { id: "e1", form: "directed", dir: "forward" });
    const e2 = edge("b", "c", {
      id: "e2", form: "directed", dir: "forward",
      fields: [field("guard", { value: "ready" })],
    });

    return {
      ...EMPTY,
      defs: {
        def_state: { id: "def_state", name: "state", form: "block", fields: [] },
        def_action: { id: "def_action", name: "action", form: "block", fields: [] },
      },
      elements: {
        ...EMPTY.elements, L: layer, a, b, c, pa, g1: group,
      },
      edges: { e1, e2 },
    };
  }

  /** Reading B: action-typed transitions between condition states. */
  function reading_b(): Graph {
    const layer = element("machine", { id: "L", parent: ROOT, form: "block", type: STATE_TYPE });
    const start = element("start", { id: "s0", parent: "L", form: "block", type: STATE_TYPE });
    const after = element("after step", { id: "s1", parent: "L", form: "block", type: STATE_TYPE });
    const e1 = edge("s0", "s1", {
      id: "e1", form: "directed", dir: "forward", type: ACTION_TYPE,
    });

    return {
      ...EMPTY,
      defs: {
        def_state: { id: "def_state", name: "state", form: "block", fields: [] },
        def_action: { id: "def_action", name: "action", form: "block", fields: [] },
      },
      elements: { ...EMPTY.elements, L: layer, s0: start, s1: after },
      edges: { e1 },
    };
  }

  it("offers infer when the layer holds no states", () => {
    const stage = stageOf(EMPTY, ROOT);

    expect(stage.states).toEqual([]);
    expect(stage.transitions).toEqual([]);
    expect(stage.reading).toBeNull();
    expect(stage.offer).toBe(OFFER);
    expect(OFFER.length).toBeGreaterThan(0);
  });

  it("ignores action-typed blocks — only states draw", () => {
    const layer = element("flow", { id: "L", parent: ROOT, form: "block" });
    const action = element("do", {
      id: "a", parent: "L", form: "block", type: ACTION_TYPE,
    });
    const graph: Graph = {
      ...EMPTY,
      defs: {
        def_action: { id: "def_action", name: "action", form: "block", fields: [] },
        def_state: { id: "def_state", name: "state", form: "block", fields: [] },
      },
      elements: { ...EMPTY.elements, L: layer, a: action },
    };

    expect(isState(graph, action)).toBe(false);
    expect(stageOf(graph, "L").states).toEqual([]);
    expect(stageOf(graph, "L").offer).toBe(OFFER);
  });

  it("reads Reading A from bare transitions and dims inferred order", () => {
    const graph = reading_a();
    const stage = stageOf(graph, "L");

    expect(readingOf(graph, "L")).toBe("A");
    expect(stage.reading).toBe("A");
    expect(stage.dim).toEqual(DIM);
    expect(DIM.opacity).toBeGreaterThan(0);
    expect(DIM.opacity).toBeLessThan(1);

    const bare = stage.transitions.find((t) => t.edge.id === "e1");
    expect(bare?.inferred).toBe(true);
    expect(guardOf(graph, stage.transitions.find((t) => t.edge.id === "e2")!.edge)).toBe("ready");
  });

  it("derives a dimmed label from the participant ref under Reading A", () => {
    const stage = stageOf(reading_a(), "L");
    const state = stage.states.find((row) => row.id === "a");

    expect(state?.derived).toBe(true);
    expect(state?.label.length).toBeGreaterThan(0);
    expect(state?.ref.length).toBeGreaterThan(0);
  });

  it("uses a typed label without marking it derived", () => {
    const state = stageOf(reading_a(), "L").states.find((row) => row.id === "b");

    expect(state?.derived).toBe(false);
    expect(state?.label).toBe("named");
  });

  it("reads Reading B when a transition is action-typed", () => {
    const graph = reading_b();
    const stage = stageOf(graph, "L");

    expect(readingOf(graph, "L")).toBe("B");
    expect(stage.reading).toBe("B");
    const t = stage.transitions[0];
    expect(t.inferred).toBe(false);
    expect(t.label.length).toBeGreaterThan(0);
  });

  it("keeps groups as groups", () => {
    const stage = stageOf(reading_a(), "L");

    expect(stage.groups.map((g) => g.id)).toContain("g1");
  });

  it("counts initial and final on the chain's ends", () => {
    const held = marksOf(reading_a(), "L");

    expect(held.some((m) => m.kind === "initial")).toBe(true);
    expect(held.some((m) => m.kind === "final")).toBe(true);
    expect(held.every((m) => MARKS.includes(m.kind))).toBe(true);
    expect(held.every((m) => SHAPES.includes(m.card.shape))).toBe(true);
  });
});
