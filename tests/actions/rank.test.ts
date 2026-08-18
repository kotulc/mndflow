/** Properties of the rail's ranked list, now that it lives beside `offer()`
 *  rather than under `terminal/` (X.1).
 *
 *  Properties only — nothing here asserts a particular action name's fixed
 *  position or a raw score, since both are free to be tuned. */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { note, shape_of } from "../../src/actions/feedback";
import { rank } from "../../src/actions/fill";
import type { Context } from "../../src/actions/index";
import { ready, scored } from "../../src/actions/rank";
import "../../src/actions/groups";
import "../../src/actions/elements";
import "../../src/actions/fields";
import "../../src/actions/edges";
import { fold } from "../../src/graph/fold";
import { element, step, type Mutation } from "../../src/graph/types";

function graph_of(...mutations: Mutation[]) {
  return fold([step("", "test", mutations)]);
}

/** A layer holding two blocks, a note and a group with one member — the same
 *  shape `tests/actions/fill.test.ts` scores its own properties against. */
function scene() {
  return graph_of(
    { op: "add_element", element: element("A", { id: "a" }) },
    { op: "add_element", element: element("B", { id: "b" }) },
    { op: "add_element", element: element("N", { id: "n", form: "note" }) },
    { op: "add_element", element: element("G", { id: "g", form: "group" }) },
    { op: "join_group", id: "a", group: "g" },
  );
}

function ctx_at(graph: Context["graph"], id: string): Context {
  return { graph, view: null, picked: { kind: "node", id } };
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

describe("navigation stays off the ranked list", () => {
  it("never offers open, up or reveal", () => {
    const ctx = ctx_at(scene(), "a");
    const names = scored(ctx, "", []).map((r) => r.action.name);

    expect(names).not.toContain("open");
    expect(names).not.toContain("up");
    expect(names).not.toContain("reveal");
  });
});

describe("cold idle order", () => {
  it("falls back to the fixed rank() order when nothing has been learned", () => {
    const ctx = ctx_at(scene(), "a");
    const names = scored(ctx, "", []).map((r) => r.action.name);
    const by_rank = [...names].sort((x, y) => rank(x) - rank(y));

    expect(names).toEqual(by_rank);
  });

  it("scores everything at zero preference", () => {
    const ctx = ctx_at(scene(), "a");
    const scores = scored(ctx, "", []).map((r) => r.score);

    expect(scores.every((s) => s === 0)).toBe(true);
  });
});

describe("learned preference", () => {
  it("raises a chosen action's score and never lowers its position", () => {
    const ctx = ctx_at(scene(), "a");
    const before = scored(ctx, "", []);
    expect(before.length).toBeGreaterThan(1);

    // The action rank() alone puts last — the one preference has the most
    // room to move.
    const target = before[before.length - 1].action.name;
    const shape = shape_of(ctx);
    for (let i = 0; i < 3; i++) {
      note({ chose: target, ranked: before[0].action.name, entry: "", shape });
    }

    const after = scored(ctx, "", []);
    const before_score = before.find((r) => r.action.name === target)!.score;
    const after_score = after.find((r) => r.action.name === target)!.score;
    const before_at = before.findIndex((r) => r.action.name === target);
    const after_at = after.findIndex((r) => r.action.name === target);

    expect(after_score).toBeGreaterThan(before_score);
    expect(after_at).toBeLessThanOrEqual(before_at);
  });
});

describe("ready", () => {
  it("is false while a required text argument is unfilled, true once it is", () => {
    const ctx = ctx_at(scene(), "a");
    const create = scored(ctx, "", []).map((r) => r.action).find((a) => a.name === "create")!;

    expect(ready(create, {})).toBe(false);
    expect(ready(create, { label: "Pump" })).toBe(true);
  });
});
