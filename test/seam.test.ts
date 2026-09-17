/** The seam's contract, from the outside. */

import { describe, expect, it } from "vitest";
import { open, review, validate, write } from "@mnd/core";
import { FLOOR, TIER, translated } from "@mnd/fixtures";
import { SHEET, draw_svg, project } from "@mnd/views";

const graph = translated();
/** Drawn from the folder holding the pages. */
const scene = project(graph, "set_guides", {});

describe("a translator's graph", () => {
  it("passes the door", () => {
    expect(validate(graph)).toEqual([]);
  });

  it("passes its own vocabulary's checks", () => {
    expect(review(graph)).toEqual([]);
  });

  it("survives a file round trip", () => {
    const back = open(write(graph, "handbook"), FLOOR);
    expect(back.faults).toEqual([]);
    expect(back.graph.blocks).toEqual(graph.blocks);
    expect(back.graph.defs).toMatchObject(graph.defs);
  });

  it("projects the layer it filed its vocabulary on", () => {
    const tier = project(graph, TIER, {});
    expect(tier.nodes.map((n) => n.id)).toEqual(["set_guides"]);
  });
});

/** Where a block came from is a field, and following one is a renderer's. */
describe("a drawing as navigation", () => {
  it("carries the source link on every navigable box", () => {
    for (const n of scene.nodes) expect(n.data.link).toBeTruthy();
  });

  it("wraps a linked box in an anchor", () => {
    expect(draw_svg(scene)).toContain(`<a href="/guides/getting-started"`);
  });
});

/** Inlined in MDX, where a brace starts an expression. */
describe("a drawing inlined in a page", () => {
  it("drops the stylesheet when one is supplied empty", () => {
    expect(draw_svg(scene, { style: "" })).toContain("<style></style>");
    expect(SHEET).toContain("svg.scene");
  });

  it("leaves no brace behind when the sheet is carried by the page", () => {
    const braced = { ...scene,
                     nodes: scene.nodes.map((n) => ({ ...n, data: { ...n.data, label: `{${n.data.label}}` } })) };
    expect(draw_svg(braced, { style: "" })).not.toMatch(/[{}]/);
  });

  it("prefixes generated ids so two drawings share a page", () => {
    expect(draw_svg(scene, { id: "one" })).toContain(`id="one-arrow"`);
  });
});
