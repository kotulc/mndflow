/** The list-of-types rule (docs/plan.md): what a selection could become,
 *  ranked by learned preference and capped.
 *
 *  Properties only — which family a pick draws from, that a handed-down
 *  vocabulary wins over the project's own, that preference is per shape, and
 *  that the cap is small. Never a particular type, order or number. */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { note, read } from "../../src/actions/feedback";
import type { Picked } from "../../src/actions";
import {
  candidatesFor, noteTypePick, rankedTypes, shapeOf, TYPE_CAP,
} from "../../src/actions/typelist";
import { definition, edge, element, EMPTY } from "../../src/graph/types";
import type { Graph } from "../../src/graph/types";

describe("the list-of-types rule", () => {
  /** An in-memory localStorage so the suite does not need a browser — the
   *  same shape `tests/actions/feedback.test.ts` uses for the same store. */
  function memory(): Storage {
    const held = new Map<string, string>();

    return {
      get length() { return held.size; },
      clear() { held.clear(); },
      getItem(key: string) { return held.has(key) ? held.get(key)! : null; },
      setItem(key: string, value: string) { held.set(key, String(value)); },
      removeItem(key: string) { held.delete(key); },
      key(index: number) { return [...held.keys()][index] ?? null; },
    };
  }

  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: memory(), configurable: true, writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: undefined, configurable: true, writable: true,
    });
  });

  function vocab(): Graph {
    const block = element("A", { id: "a" });
    const kinds = [
      definition("Blockish", { id: "d1", form: "block" }),
      definition("Groupish", { id: "d2", form: "group" }),
      definition("Line", { id: "d3", form: "line" }),
      definition("Directed", { id: "d4", form: "directed" }),
    ];
    const e = edge("a", "a", { id: "e1" });

    return {
      ...EMPTY,
      elements: { ...EMPTY.elements, a: block },
      edges: { e1: e },
      defs: Object.fromEntries(kinds.map((d) => [d.id, d])),
    };
  }

  it("offers only element-form types for a node, only relation-form for an edge", () => {
    const graph = vocab();
    const node: Picked = { kind: "node", id: "a" };
    const line: Picked = { kind: "edge", id: "e1" };

    const elemPaths = candidatesFor(node, graph).map((c) => c.path);
    const edgePaths = candidatesFor(line, graph).map((c) => c.path);

    expect(elemPaths).toEqual(["d1", "d2"]);
    expect(edgePaths).toEqual(["d3", "d4"]);
    // The two families never overlap — a closed split, not a guess per node.
    expect(elemPaths.some((p) => edgePaths.includes(p))).toBe(false);
  });

  it("prefers a handed-down vocabulary over the project's own, on either side", () => {
    const graph = vocab();
    const scope = {
      relations: [{ name: "Given", path: "pkg/given" }],
      elements: [{ name: "Stereotype", path: "pkg/stereo" }],
    };

    expect(candidatesFor({ kind: "edge", id: "e1" }, graph, scope)).toEqual(scope.relations);
    expect(candidatesFor({ kind: "node", id: "a" }, graph, scope)).toEqual(scope.elements);
  });

  it("falls back to the project's own definitions when a half is missing", () => {
    const graph = vocab();
    const scope = { relations: [{ name: "Given", path: "pkg/given" }] };
    const own = candidatesFor({ kind: "node", id: "a" }, graph).map((c) => c.path);

    expect(candidatesFor({ kind: "node", id: "a" }, graph, scope).map((c) => c.path))
      .toEqual(own);
  });

  it("tells an edge, an interface and an ordinary element apart", () => {
    const graph = {
      ...vocab(),
      elements: {
        ...vocab().elements,
        p: element("P", { id: "p", side: "top", at: 0 }),
      },
    };
    const edgeShape = shapeOf({ kind: "edge", id: "e1" }, graph);
    const portShape = shapeOf({ kind: "node", id: "p" }, graph);
    const blockShape = shapeOf({ kind: "node", id: "a" }, graph);

    expect(new Set([edgeShape, portShape, blockShape]).size).toBe(3);
  });

  it("is deterministic and never collides with a bare action-ranking shape", () => {
    const graph = vocab();
    const picked: Picked = { kind: "node", id: "a" };

    expect(shapeOf(picked, graph)).toBe(shapeOf(picked, graph));
    // Action ranking's own shapes (feedback.shape_of) are bare form words.
    expect(shapeOf(picked, graph)).not.toBe("block");
  });

  it("falls back to the order candidates arrived in — vocabulary order cold", () => {
    const graph = vocab();
    const candidates = candidatesFor({ kind: "node", id: "a" }, graph);

    expect(rankedTypes(candidates, "retype:block").map((c) => c.path))
      .toEqual(candidates.map((c) => c.path));
  });

  it("ranks a learned preference first, and leaves the rest in place", () => {
    const graph = vocab();
    const candidates = candidatesFor({ kind: "node", id: "a" }, graph);
    const shape = shapeOf({ kind: "node", id: "a" }, graph);

    note({ chose: "d2", ranked: "d1", entry: "", shape });

    const ranked = rankedTypes(candidates, shape).map((c) => c.path);
    expect(ranked[0]).toBe("d2");
    expect(new Set(ranked)).toEqual(new Set(candidates.map((c) => c.path)));
  });

  it("never lets one shape's preference leak into another", () => {
    const graph = vocab();
    const candidates = candidatesFor({ kind: "node", id: "a" }, graph);

    note({ chose: "d2", ranked: "d1", entry: "", shape: "retype:edge" });

    expect(rankedTypes(candidates, "retype:block").map((c) => c.path))
      .toEqual(candidates.map((c) => c.path));
  });

  it("notes an overrule only when the pick was not what ranking put first", () => {
    const ranked = [{ path: "d1", name: "Blockish" }, { path: "d2", name: "Groupish" }];

    noteTypePick("retype:block", "d1", ranked);
    expect(read()).toHaveLength(0);

    noteTypePick("retype:block", "d2", ranked);
    expect(read()).toHaveLength(1);
    expect(read()[0]).toEqual({ chose: "d2", ranked: "d1", entry: "", shape: "retype:block" });
  });

  it("caps to a small, positive number of shown entries — expansion is what reveals the rest", () => {
    expect(TYPE_CAP).toBeGreaterThan(0);
    expect(TYPE_CAP).toBeLessThan(10);
  });
});
