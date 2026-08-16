/** The activity view module's surface, map and stage composition.
 *
 *  The surface seam is settled — surround / viewport / chrome / asking — and
 *  the map settles that an activity accepts `place`. Control nodes, lanes and
 *  dimmed labels are counts over the layer, never stored elements. */

import { describe, expect, it } from "vitest";

import { edge, element, EMPTY, ROOT, field } from "../../../graph/types";
import type { Graph } from "../../../graph/types";
import { named } from "../index";
import { CHROME } from "../diagram/surface";
import { SHAPES } from "../../card";
import {
  ACTIVITY, CONTROLS, DIM, MAP, VERB, controlsOf, guardOf, lanesOf, reaches,
  stageOf, takes,
} from "./index";

describe("the activity module's surface", () => {
  it("is a framed plane with a camera, and a place to ask", () => {
    expect(ACTIVITY.surround).toBe("frame");
    expect(ACTIVITY.viewport).toBe("camera");
    expect(ACTIVITY.asks).toBe(true);
    expect(ACTIVITY.chrome).toContain("crumbs");
    expect(ACTIVITY.chrome).not.toContain("interfaces");
  });

  it("is what the registered activity module carries", () => {
    expect(named("activity")?.surface).toEqual(ACTIVITY);
    expect(named("activity")?.kind).toBe("behavior");
    expect(named("activity")?.creates).toBe("action");
    expect(named("activity")?.word).toBe("activity");
  });

  it("names no chrome kind outside the open set", () => {
    for (const kind of ACTIVITY.chrome) {
      expect(CHROME).toContain(kind);
    }
  });
});

describe("the activity module's gesture map", () => {
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

  it("answers null for a gesture it does not bind", () => {
    expect(reaches("right", "click", "frame")).toBeNull();
    expect(reaches("left", "drag", "edge")).toBeNull();
  });
});

describe("stage composition", () => {
  /** Three actions in a chain, one with a branching guard. */
  function layered(): Graph {
    const layer = element("flow", { id: "L", parent: ROOT, form: "block" });
    const a = element("", { id: "a", parent: "L", form: "block", type: "def_action" });
    const b = element("", { id: "b", parent: "L", form: "block", type: "def_action" });
    const c = element("", { id: "c", parent: "L", form: "block", type: "def_action" });
    const d = element("", { id: "d", parent: "L", form: "block", type: "def_action" });
    const pa = element("", {
      id: "pa", parent: "a", form: "proxy", of: "proj/pump",
    });
    const pb = element("", {
      id: "pb", parent: "b", form: "proxy", of: "proj/tank",
    });
    const pc = element("", {
      id: "pc", parent: "c", form: "proxy", of: "proj/pump",
    });
    const pd = element("", {
      id: "pd", parent: "d", form: "proxy", of: "proj/valve",
    });
    const group = element("Cabin", { id: "g1", parent: "L", form: "group" });
    a.groups = ["g1"];
    b.groups = ["g1"];

    const e1 = edge("a", "b", {
      id: "e1", form: "directed", dir: "forward",
    });
    const e2 = edge("b", "c", {
      id: "e2", form: "directed", dir: "forward",
      fields: [field("guard", { value: "ready" })],
    });
    const e3 = edge("b", "d", {
      id: "e3", form: "directed", dir: "forward",
      fields: [field("guard", { value: "else" })],
    });

    return {
      ...EMPTY,
      defs: {
        def_action: { id: "def_action", name: "action", form: "block", fields: [] },
      },
      elements: {
        ...EMPTY.elements, L: layer, a, b, c, d, pa, pb, pc, pd, g1: group,
      },
      edges: { e1, e2, e3 },
    };
  }

  it("derives a dimmed label from the verb and the participant ref", () => {
    const stage = stageOf(layered(), "L");
    const action = stage.actions.find((row) => row.id === "a");

    expect(action?.derived).toBe(true);
    expect(action?.label.startsWith(`${VERB} `)).toBe(true);
    expect(stage.dim).toEqual(DIM);
    expect(typeof DIM.color).toBe("string");
    expect(DIM.opacity).toBeGreaterThan(0);
    expect(DIM.opacity).toBeLessThan(1);
  });

  it("uses a typed label without marking it derived", () => {
    const graph = layered();
    graph.elements.a = { ...graph.elements.a, label: "circulate" };
    const action = stageOf(graph, "L").actions.find((row) => row.id === "a");

    expect(action?.derived).toBe(false);
    expect(action?.label).toBe("circulate");
  });

  it("builds lanes from refs, sharing one when two actions hold the same", () => {
    const lanes = lanesOf(layered(), "L");

    expect(lanes.length).toBeGreaterThan(0);
    expect(lanes.every((lane) => lane.ref.length > 0)).toBe(true);
    expect(lanes.every((lane) => lane.actions.length > 0)).toBe(true);
    const shared = lanes.find((lane) => lane.actions.includes("a") && lane.actions.includes("c"));
    expect(shared).toBeTruthy();
  });

  it("keeps groups as groups, not as lanes", () => {
    const stage = stageOf(layered(), "L");

    expect(stage.groups.map((g) => g.id)).toContain("g1");
    expect(stage.lanes.some((lane) => lane.ref === "g1")).toBe(false);
  });

  it("reads guards as edge fields and dims inferred order", () => {
    const stage = stageOf(layered(), "L");
    const branch = stage.orders.find((o) => o.edge.id === "e2");
    const bare = stage.orders.find((o) => o.edge.id === "e1");

    expect(guardOf(layered(), branch!.edge)).toBe("ready");
    expect(branch?.guard).toBe("ready");
    expect(bare?.inferred).toBe(true);
    expect(branch?.inferred).toBe(true);
  });

  it("counts a decision where outgoing orders carry guards", () => {
    const held = controlsOf(layered(), "L");
    const kinds = new Set(held.map((c) => c.kind));

    expect(kinds.has("decision")).toBe(true);
    expect(held.every((c) => CONTROLS.includes(c.kind))).toBe(true);
    expect(held.every((c) => SHAPES.includes(c.card.shape))).toBe(true);
  });

  it("counts a fork when parallel outs carry no guards", () => {
    const graph = layered();
    graph.edges.e2 = { ...graph.edges.e2, fields: undefined };
    graph.edges.e3 = { ...graph.edges.e3, fields: undefined };
    const held = controlsOf(graph, "L");

    expect(held.some((c) => c.kind === "fork" && c.at === "b")).toBe(true);
    expect(held.some((c) => c.kind === "decision" && c.at === "b")).toBe(false);
  });

  it("counts initial and final on the chain's ends", () => {
    const held = controlsOf(layered(), "L");

    expect(held.some((c) => c.kind === "initial")).toBe(true);
    expect(held.some((c) => c.kind === "final")).toBe(true);
  });

  it("is empty for a layer that holds nothing", () => {
    const stage = stageOf(EMPTY, ROOT);

    expect(stage.actions).toEqual([]);
    expect(stage.lanes).toEqual([]);
    expect(stage.orders).toEqual([]);
    expect(stage.controls).toEqual([]);
  });
});
