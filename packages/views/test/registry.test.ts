/** A definition's usages, grouped by the place each is drawn (the tray's usages); never a view. */

import { describe, expect, it } from "vitest";
import { FLOOR, modeled } from "@mnd/fixtures";
import { fold } from "@mnd/core";
import { registry_scene, usage_groups } from "../src/index";

const g = fold(modeled(), FLOOR);
describe("a definition's usages", () => {
  it("groups its uses by the place each is drawn, across packages", () => {
    expect(usage_groups(g, "service").map((x) => x.place).sort()).toEqual(["far", "pattern", "shop", "stage"]);
  });

  it("weighs a use by what it holds, and a line as one", () => {
    const [shop] = usage_groups(g, "service").filter((x) => x.place === "shop");
    expect(shop!.uses.every((u) => u.weight >= 1)).toBe(true);
    expect(usage_groups(g, "calls")[0]!.uses).toEqual([
      { id: "call", place: "shop", weight: 1, kind: "relation" }]);
  });

  it("are never drawn as a view of their own", () => {
    expect(registry_scene(g, "service")).toBeNull();
  });
});
