/** Properties of local overrule feedback, the store `rank.ts` learns from.
 *
 *  Properties only — nothing asserts a stored count `rank.ts` is free to
 *  change, or a particular shape string tuning is free to relabel. */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { note, read, shape_of } from "../../src/actions/feedback";
import type { Context } from "../../src/actions/index";
import { fold } from "../../src/graph/fold";
import { element, step, type Mutation } from "../../src/graph/types";

function graph_of(...mutations: Mutation[]) {
  return fold([step("", "test", mutations)]);
}

/** An in-memory localStorage so the suite does not need a browser. */
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

describe("recording an overrule", () => {
  it("starts empty and is read back exactly as noted", () => {
    expect(read()).toHaveLength(0);

    note({ chose: "delete", ranked: "rename", entry: "remove it", shape: "block" });

    const hits = read();
    expect(hits).toHaveLength(1);
    expect(hits[0]).toEqual(
      { chose: "delete", ranked: "rename", entry: "remove it", shape: "block" },
    );
  });

  it("appends rather than replacing what came before", () => {
    note({ chose: "a", ranked: "b", entry: "", shape: "block" });
    note({ chose: "c", ranked: "d", entry: "", shape: "edge" });

    expect(read()).toHaveLength(2);
  });
});

describe("shape_of", () => {
  it("is deterministic for the same context", () => {
    const graph = graph_of({ op: "add_element", element: element("A", { id: "a" }) });
    const ctx: Context = { graph, view: null, picked: { kind: "node", id: "a" } };

    expect(shape_of(ctx)).toBe(shape_of(ctx));
  });

  it("tells an edge, a field and an element selection apart", () => {
    const graph = graph_of({ op: "add_element", element: element("A", { id: "a" }) });
    const edge_ctx: Context = { graph, view: null, picked: { kind: "edge", id: "e" } };
    const attr_ctx: Context = { graph, view: null, picked: { kind: "attr", id: "a.f" } };
    const node_ctx: Context = { graph, view: null, picked: { kind: "node", id: "a" } };

    const shapes = new Set([shape_of(edge_ctx), shape_of(attr_ctx), shape_of(node_ctx)]);
    expect(shapes.size).toBe(3);
  });

  it("tells the open layer apart from the project with nothing picked", () => {
    const graph = graph_of();
    const layer_ctx: Context = { graph, view: "x", picked: null };
    const project_ctx: Context = { graph, view: null, picked: null };

    expect(shape_of(layer_ctx)).not.toBe(shape_of(project_ctx));
  });
});
