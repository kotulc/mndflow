/** Navigation over the library and the models: what each section lists, what reading a subject
 *  from each enters, and where leaving goes. */

import { describe, expect, it } from "vitest";
import { FLOOR, modeled } from "@mnd/fixtures";
import { EDITOR, first_model, fold, frozen, in_section, is_model, leave_at, lens_of, models,
         read_at, role_of, session, stamps_of, ROOT, type View } from "../src/index";

const g = fold(modeled(), FLOOR);
const [LIBRARY, MODELS] = [0, 1];
const map = (at: number, pick: string | null = null): View =>
  ({ at, kind: "map", layer: null, pick });

describe("models", () => {
  it("are definitions extending model, the base kind and other definitions apart", () => {
    expect(is_model(g, "shop")).toBe(true);
    expect(is_model(g, "model")).toBe(false);
    expect(is_model(g, "pattern")).toBe(false);
    expect(is_model(g, ROOT)).toBe(false);
  });

  it("are found in every package, the workspace's first, and an imported one frozen", () => {
    expect(models(g).map((m) => m.id)).toEqual(["far", "shop"]);
    expect(first_model(g)).toBe("shop");
    expect(frozen(g, "far")).toBe(true);
  });

  it("start a fresh workspace with one empty model", () => {
    const s = session({ floor: FLOOR });
    expect(is_model(s.graph(), "first")).toBe(true);
    expect(s.view()).toMatchObject({ kind: "map", pick: "first" });
  });

  it("wear the tree as their icon, and no stamp says structure", () => {
    expect(role_of(g, "shop")).toBe("model");
    expect(role_of(g, "pattern")).not.toBe("model");
    for (const id of ["shop", "pattern", ROOT]) {
      expect(stamps_of(g, id) as string[]).not.toContain("structure");
    }
  });
});

describe("the two sections", () => {
  it("list a model in both, its parts only in the models", () => {
    expect(in_section(g, "shop", null, null, "domain")).toBe(true);
    expect(in_section(g, "shop", null, null, "structure")).toBe(true);
    expect(in_section(g, "stage", null, null, "structure")).toBe(true);
    expect(in_section(g, "stage", null, null, "domain")).toBe(false);
  });

  it("list a definition's parts in the library only, and no package without a model", () => {
    expect(in_section(g, "pattern_part", null, null, "domain")).toBe(true);
    expect(in_section(g, "pattern_part", null, null, "structure")).toBe(false);
    expect(in_section(g, "pattern", null, null, "structure")).toBe(false);
    expect(in_section(g, "cards", null, null, "structure")).toBe(false);
    expect(in_section(g, "lib", null, null, "structure")).toBe(true);
  });
});

describe("what a subject opens on", () => {
  it("is, in the library, a definition's registry where it is used, else nothing", () => {
    expect(lens_of(g, "service", "domain")).toBe("registry");
    expect(lens_of(g, "shop", "domain")).toBeNull();
    expect(lens_of(g, "unused", "domain")).toBeNull();
  });

  it("is, in the models, a model's drawing, and nothing for any other definition", () => {
    expect(lens_of(g, "shop", "structure")).toBe("internal");
    expect(lens_of(g, "service", "structure")).toBeNull();
    expect(lens_of(g, ROOT, "structure")).toBeNull();
  });
});

describe("reading", () => {
  const read = (id: string, now: View, options = {}) => read_at(g, EDITOR, {}, now, id, options);

  it("enters a used definition's registry, and stays in the library", () => {
    expect(read("service", map(LIBRARY))).toMatchObject({ at: LIBRARY, kind: "registry",
                                                          layer: "service" });
  });

  it("enters nothing for an unused definition, a definition's part, a package or a folder", () => {
    expect(read("unused", map(LIBRARY))).toBeNull();
    expect(read("pattern_part", map(LIBRARY))).toBeNull();
    expect(read(ROOT, map(MODELS))).toBeNull();
    expect(read("cards", map(LIBRARY))).toBeNull();
  });

  it("hands a use read from a registry over to the models", () => {
    const registry: View = { at: LIBRARY, kind: "registry", layer: "service", pick: null };
    expect(read("gateway", registry)).toMatchObject({ at: MODELS, layer: "shop",
                                                      pick: "gateway" });
    expect(read("inner", registry)).toMatchObject({ at: MODELS, layer: "stage",
                                                    pick: "inner" });
  });

  it("enters a model and a diagram, and a tile as inside the block holding it", () => {
    expect(read("shop", map(MODELS))).toMatchObject({ at: MODELS, kind: "internal",
                                                      layer: "shop" });
    expect(read("stage", map(MODELS))).toMatchObject({ layer: "stage", pick: null });
    expect(read("inner", map(MODELS), { inner: true })).toMatchObject({ layer: "stage",
                                                                         pick: "inner" });
  });
});

describe("leaving", () => {
  it("goes from a registry to the library's map, the definition picked", () => {
    const registry: View = { at: LIBRARY, kind: "registry", layer: "service", pick: null };
    expect(leave_at(g, EDITOR, {}, registry)).toEqual(map(LIBRARY, "service"));
  });

  it("goes up a layer, and from a model to the models' map, the model picked", () => {
    const stage: View = { at: MODELS, kind: "internal", layer: "stage", pick: null };
    expect(leave_at(g, EDITOR, {}, stage)).toMatchObject({ layer: "shop", pick: "stage" });
    const shop: View = { at: MODELS, kind: "internal", layer: "shop", pick: null };
    expect(leave_at(g, EDITOR, {}, shop)).toEqual(map(MODELS, "shop"));
  });
});
