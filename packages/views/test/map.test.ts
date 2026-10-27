/** The two maps: the models' a forest of every package holding a model, the library's chips sized
 *  and filled by their uses. */

import { describe, expect, it } from "vitest";
import { FLOOR, modeled } from "@mnd/fixtures";
import { definition_uses, fold, ROOT } from "@mnd/core";
import { library_map, model_map, registry_map, type BoxNode } from "../src/index";

const g = fold(modeled(), FLOOR);
const node = (nodes: readonly BoxNode[], id: string) => nodes.find((n) => n.id === id);

describe("the models' map", () => {
  const scene = model_map(g);

  it("boxes every package holding a model, an imported one included", () => {
    const tops = scene.areas!.filter((a) => a.depth === 1).map((a) => a.id);
    expect(tops.sort()).toEqual(["lib", ROOT].sort());
  });

  it("draws models and diagrams, never a definition or a package's definitions", () => {
    const ids = scene.nodes.map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(["shop", "far"]));
    expect(ids).not.toContain("service");
    expect(ids).not.toContain("cards");
  });
});

describe("the library's map", () => {
  const scene = library_map(g);

  it("counts a definition's uses, and leaves an unused one empty", () => {
    expect(node(scene.nodes, "service")?.data.counts).toContain(
      `${definition_uses(g, "service").length} uses`);
    expect(node(scene.nodes, "unused")?.data.counts).toBe("0 uses");
    expect(node(scene.nodes, "unused")?.data.tiles).toEqual([]);
  });

  it("previews a definition's uses, the same ones its registry lays out", () => {
    const previewed = (node(scene.nodes, "service")?.data.tiles ?? []).map((t) => t.id).sort();
    const laid = registry_map(g, "service", 400, 200).map((t) => t.id).sort();
    expect(previewed).toEqual(laid);
  });
});
