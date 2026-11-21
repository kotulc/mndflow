/** The two maps: the models' a forest of every package holding a model, the library's chips sized
 *  and filled by their uses. */

import { describe, expect, it } from "vitest";
import { FLOOR, modeled } from "@mnd/fixtures";
import { definition_uses, fold, ROOT } from "@mnd/core";
import { facts_of, library_map, model_map, model_tree, type BoxNode } from "../src/index";

const g = fold(modeled(), FLOOR);
/** Every package shown, as a viewer toggling them all on sees them. */
const all = Object.fromEntries(Object.values(g.blocks).filter((b) => b.parent === null)
  .map((b) => [b.id, true]));
const node = (nodes: readonly BoxNode[], id: string) => nodes.find((n) => n.id === id);

describe("the models' map", () => {
  const scene = model_map(g, model_tree(g, all));

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
  const scene = library_map(g, undefined, undefined, all);

  it("counts a definition's uses in its facts, and draws an unused one no uses", () => {
    expect(facts_of(g, "service", true).counts[0]).toEqual(
      { n: definition_uses(g, "service").length, word: definition_uses(g, "service").length === 1 ? "use" : "uses" });
    expect(node(scene.nodes, "unused")?.data.tiles).toBeUndefined();
  });

  it("fills a definition's well with its uses alone", () => {
    const defs = scene.nodes.filter((n) => n.type === "chip" && g.blocks[n.id]?.def);
    for (const n of defs) {
      const uses = definition_uses(g, n.id).map((u) => u.id);
      expect(uses).toEqual(expect.arrayContaining((n.data.tiles ?? []).map((t) => t.id)));
    }
  });
});
