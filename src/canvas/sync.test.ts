/** Carrying React Flow's state across a node rebuild.
 *
 *  Small module, one real hazard: dropping `measured` makes relationships
 *  disappear, and it does it *silently* — the library cannot find the handles,
 *  so it draws no line, raises nothing, and logs nothing. The tests are here
 *  because nothing else would catch it going wrong again. */

import { describe, expect, it } from "vitest";

import { restated } from "./sync";

type Node = {
  id: string;
  width?: number;
  height?: number;
  selected?: boolean;
  measured?: { width?: number; height?: number };
  position: { x: number; y: number };
};

const node = (id: string, extra: Partial<Node> = {}): Node => ({
  id,
  width: 168,
  height: 48,
  position: { x: 0, y: 0 },
  ...extra,
});

describe("restated", () => {
  it("keeps a measurement, so the handles a line attaches to survive a rebuild", () => {
    // The bug this exists for: hovering a contents row rebuilds every node,
    // and a node rebuilt without its measurement has no handles the library
    // can find — so every relationship on the layer stops being drawn.
    const current = [node("a", { measured: { width: 168, height: 48 } })];
    const [held] = restated(current, [node("a")], null);

    expect(held.measured).toEqual({ width: 168, height: 48 });
  });

  it("drops a measurement when the node is no longer that size", () => {
    // Keeping a stale one would remember the handles where they used to be.
    const current = [node("a", { measured: { width: 168, height: 48 } })];
    const [held] = restated(current, [node("a", { width: 240 })], null);

    expect(held.measured).toBeUndefined();
  });

  it("has nothing to keep for a node that was not there before", () => {
    const [held] = restated([], [node("fresh")], null);

    expect(held.measured).toBeUndefined();
    expect(held.selected).toBe(false);
  });

  it("keeps what is selected, and deselects what is not", () => {
    const current = [node("a", { selected: true }), node("b", { selected: false })];
    const held = restated(current, [node("a"), node("b")], null);

    expect(held.map((n) => n.selected)).toEqual([true, false]);
  });

  it("leaves a dragged node where React Flow is holding it", () => {
    // The graph owns positions except while a drag is in flight, or hovering a
    // drop target would snap the card back to where it started.
    const current = [node("a", { position: { x: 300, y: 300 } })];
    const [held] = restated(current, [node("a")], new Set(["a"]));

    expect(held.position).toEqual({ x: 300, y: 300 });
  });

  it("takes the graph's position for everything not being dragged", () => {
    const current = [node("a", { position: { x: 300, y: 300 } })];
    const [held] = restated(current, [node("a", { position: { x: 24, y: 24 } })], new Set(["b"]));

    expect(held.position).toEqual({ x: 24, y: 24 });
  });

  it("returns exactly what was built, in that order", () => {
    const held = restated([node("a"), node("gone")], [node("a"), node("fresh")], null);

    expect(held.map((n) => n.id)).toEqual(["a", "fresh"]);
  });
});
