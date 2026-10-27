/** A definition's uses: the one query its chip, registry and tray read. */

import { describe, expect, it } from "vitest";
import { FLOOR, modeled } from "@mnd/fixtures";
import { definition_uses, fold } from "../src/index";

const g = fold(modeled(), FLOOR);
const ids = (def: string) => definition_uses(g, def).map((u) => u.id);

describe("definition_uses", () => {
  it.each([
    ["a typed usage, on a model's layer and inside its diagram", "service", "gateway"],
    ["a reference standing for it", "service", "stand"],
    ["a use in an imported package's model", "service", "far_use"],
    ["a line typed by it", "calls", "call"],
  ])("counts %s", (_, def, id) => {
    expect(ids(def)).toContain(id);
  });

  it.each([
    ["a subtype", "service", "sub"],
    ["a part of a definition that is not a model", "service", "pattern_part"],
  ])("leaves out %s", (_, def, id) => {
    expect(ids(def)).not.toContain(id);
  });

  it("says what each use is, and the same every time", () => {
    expect(definition_uses(g, "service")).toEqual([
      { id: "far_use", kind: "block" }, { id: "gateway", kind: "block" },
      { id: "inner", kind: "block" }, { id: "stand", kind: "reference" },
    ]);
    expect(definition_uses(g, "service")).toEqual(definition_uses(g, "service"));
  });

  it("finds nothing for a definition nothing uses", () => {
    expect(ids("unused")).toEqual([]);
  });
});
