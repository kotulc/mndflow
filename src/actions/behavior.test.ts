/** Properties of `infer` — deterministic over the selection, home only for
 *  tier-1 flows, compose to state when the selection is actions. */

import { beforeEach, describe, expect, it } from "vitest";

import { lookup, run, writes, type Context } from "./index";
import "./behavior";
import { fold } from "../graph/fold";
import {
  edge, element, refTo, step, type Mutation,
} from "../graph/types";

function at(graph: Context["graph"], project = "proj_a"): Context {
  return { graph, view: null, picked: null, project };
}

function graph_of(...mutations: Mutation[]) {
  return fold([step("", "test", mutations)]);
}

beforeEach(() => {
  expect(lookup("infer")?.name).toBe("infer");
});

describe("infer", () => {
  it("is on the registry", () => {
    expect(lookup("infer")?.name).toBe("infer");
  });

  it("refuses an empty selection", () => {
    const graph = graph_of();
    const done = run("infer", at(graph), {});
    expect(done).toMatchObject({ refused: expect.any(String) });
  });

  it("is deterministic over selection order — click order does not matter", () => {
    const a = element("A", { parent: null, x: 0, y: 0 });
    const b = element("B", { parent: null, x: 100, y: 0 });
    const graph = graph_of(
      { op: "add_element", element: a },
      { op: "add_element", element: b },
    );
    const ctx = at(graph);
    const first = run("infer", ctx, { of: [a.id, b.id], into: "proj_behave" });
    const second = run("infer", ctx, { of: [b.id, a.id], into: "proj_behave" });

    expect("refused" in first).toBe(false);
    expect("refused" in second).toBe(false);
    if ("refused" in first || "refused" in second) return;

    // Same shape: same number of adds and links, same into — not the same
    // minted ids (re-infer makes a new block).
    expect(first.mutations.filter((m) => m.op === "add_element").length)
      .toBe(second.mutations.filter((m) => m.op === "add_element").length);
    expect(first.mutations.filter((m) => m.op === "link_elements").length)
      .toBe(second.mutations.filter((m) => m.op === "link_elements").length);
    expect(first.into).toBe("proj_behave");
    expect(second.into).toBe(first.into);

    const first_ids = first.mutations
      .filter((m) => m.op === "add_element")
      .map((m) => m.element.id)
      .sort();
    const second_ids = second.mutations
      .filter((m) => m.op === "add_element")
      .map((m) => m.element.id)
      .sort();
    expect(first_ids).not.toEqual(second_ids);
  });

  it("writes home only for a directed relationship that isa flow", () => {
    const pump = element("Pump", { parent: null, x: 0, y: 0 });
    const hx = element("HX", { parent: null, x: 200, y: 0 });
    const flow = edge(pump.id, hx.id, {
      form: "directed", dir: "forward", type: "control flow",
    });
    const plain = edge(pump.id, hx.id, {
      form: "directed", dir: "forward", type: "satisfy",
    });

    const with_flow = graph_of(
      { op: "add_element", element: pump },
      { op: "add_element", element: hx },
      { op: "link_elements", edge: flow },
    );
    const with_plain = graph_of(
      { op: "add_element", element: { ...pump } },
      { op: "add_element", element: { ...hx } },
      { op: "link_elements", edge: plain },
    );

    const flowed = run("infer", at(with_flow), {
      of: [pump.id, hx.id], into: "proj_b",
    });
    const plained = run("infer", at(with_plain), {
      of: [pump.id, hx.id], into: "proj_b",
    });

    expect("refused" in flowed).toBe(false);
    expect("refused" in plained).toBe(false);
    if ("refused" in flowed || "refused" in plained) return;

    expect(Boolean(flowed.home?.length)).toBe(true);
    expect(flowed.home!.every((b) => b.mutations.some((m) => m.op === "add_element"))).toBe(true);
    expect(plained.home ?? []).toHaveLength(0);
  });

  it("composes a selection of actions into a state block", () => {
    const one = element("step", {
      parent: null, type: refTo("def_action", "pkg_behavior"),
    });
    const two = element("next", {
      parent: null, type: refTo("def_action", "pkg_behavior"), x: 100,
    });
    const graph = graph_of(
      { op: "add_element", element: one },
      { op: "add_element", element: two },
    );

    const done = run("infer", at(graph), { of: [one.id, two.id], into: "proj_s" });
    expect("refused" in done).toBe(false);
    if ("refused" in done) return;

    expect(typeof done.say).toBe("string");
    expect(done.say!.length).toBeGreaterThan(0);
    const typed = done.mutations.flatMap((m) =>
      m.op === "add_element" && m.element.form === "block" ? [m.element.type] : []);
    expect(typed.some((t) => t.includes("def_state"))).toBe(true);
    expect(writes(done)).toBe(true);
  });

  it("mints a behavior project when into is omitted", () => {
    const leaf = element("Alone", { parent: null });
    const graph = graph_of({ op: "add_element", element: leaf });
    const done = run("infer", at(graph), { of: [leaf.id] });
    expect("refused" in done).toBe(false);
    if ("refused" in done) return;
    expect(typeof done.into).toBe("string");
    expect(done.into!.length).toBeGreaterThan(0);
    expect(done.mutations.some((m) => m.op === "add_element")).toBe(true);
  });
});
