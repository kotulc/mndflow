/** The seam's contract, from the outside.
 *
 *  **A producer proves its output satisfies the invariants; a consumer proves
 *  it handles anything that does.** This is the consumer half, and the producer
 *  is a translator that does not live here — so what is held to is the *shape*
 *  a translator hands over, never a particular one, and nothing in this file
 *  imports one.
 *
 *  The names below are the ones `@mnd/kit` re-exports and nothing else. That is
 *  the point of running it: an outside tool reaches only these, so if the round
 *  trip needs anything else the seam is short a name. */

import { describe, expect, it } from "vitest";
import { open, review, validate, write } from "@mnd/core";
import { TIER, translated } from "@mnd/fixtures";
import { SHEET, block, draw_svg } from "@mnd/views";

const graph = translated();
/** One layer is a block and its direct children, so the pages are drawn from
 *  the folder holding them rather than from the tier root above it. */
const scene = block.project(graph, "set_guides", {});

describe("a translator's graph", () => {
  it("passes the door", () => {
    expect(validate(graph)).toEqual([]);
  });

  it("passes its own vocabulary's checks", () => {
    expect(review(graph)).toEqual([]);
  });

  it("survives a file round trip", () => {
    const back = open(write(graph, "handbook"));
    expect(back.faults).toEqual([]);
    expect(back.graph.blocks).toEqual(graph.blocks);
    expect(back.graph.defs).toEqual(graph.defs);
  });

  it("projects the layer it filed its vocabulary on", () => {
    const tier = block.project(graph, TIER, {});
    expect(tier.boxes.map((b) => b.id)).toEqual(["set_guides"]);
  });
});

/** **Where a block came from is a field, and following one is a renderer's.**
 *  A translator makes a box clickable by saying so in the graph — never by
 *  reaching into a drawing — so these are the tests that keep that true. */
describe("a drawing as navigation", () => {
  it("carries the source link on every navigable box", () => {
    for (const box of scene.boxes) expect(box.link).toBeTruthy();
  });

  it("wraps a linked box in an anchor", () => {
    expect(draw_svg(scene)).toContain(`<a href="/guides/getting-started"`);
  });
});

/** A page holding the drawing is Markdown or MDX, and MDX reads a brace as the
 *  start of an expression. Neither the markup nor a label may hand it one. */
describe("a drawing inlined in a page", () => {
  it("drops the stylesheet when one is supplied empty", () => {
    expect(draw_svg(scene, { style: "" })).toContain("<style></style>");
    expect(SHEET).toContain("svg.scene");
  });

  it("leaves no brace behind when the sheet is carried by the page", () => {
    const braced = { ...scene,
                     boxes: scene.boxes.map((b) => ({ ...b, label: `{${b.label}}` })) };
    expect(draw_svg(braced, { style: "" })).not.toMatch(/[{}]/);
  });

  it("prefixes generated ids so two drawings share a page", () => {
    expect(draw_svg(scene, { id: "one" })).toContain(`id="one-arrow"`);
  });
});
