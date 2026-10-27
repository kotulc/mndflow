/** A definition's registry: its uses, in boxes of the models they sit in, read only. */

import { describe, expect, it } from "vitest";
import { FLOOR, modeled } from "@mnd/fixtures";
import { fold } from "@mnd/core";
import { registry_map, registry_scene, usage_box, usage_groups } from "../src/index";

const g = fold(modeled(), FLOOR);
const scene = registry_scene(g, "service")!;

describe("a definition's registry", () => {
  it("groups its uses by the model each sits in, across packages", () => {
    expect(usage_groups(g, "service").map((x) => x.model)).toEqual(["far", "shop"]);
  });

  it("weighs a use by what it holds, and a line as one", () => {
    const [shop] = usage_groups(g, "service").filter((x) => x.model === "shop");
    expect(shop!.uses.every((u) => u.weight >= 1)).toBe(true);
    expect(usage_groups(g, "calls")[0]!.uses).toEqual([
      { id: "call", model: "shop", weight: 1, kind: "relation" }]);
  });

  it("draws real uses as cards, in boxes of their own ids", () => {
    const ids = scene.nodes.map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(["gateway", "inner", "stand", "far_use",
                                                usage_box("service", "shop")]));
  });

  it("is read only, draws no lines, and matches the tray's small map", () => {
    expect(scene.slots).toEqual(["display"]);
    expect(scene.edges).toEqual([]);
    expect(scene.nodes.every((n) => n.draggable === false)).toBe(true);
    const tray = registry_map(g, "service", 400, 200).map((t) => t.id).sort();
    expect(scene.nodes.map((n) => n.id).sort()).toEqual(tray);
  });

  it("is nothing for a definition nothing uses", () => {
    expect(registry_scene(g, "unused")).toBeNull();
  });
});
