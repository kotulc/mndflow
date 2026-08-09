/** A project's whole life, across the modules rather than within one.
 *
 *  The unit tests each hold one module to its contract; this holds the seams
 *  between them, which is where a refactor that satisfies every type still goes
 *  wrong. Two journeys matter: work → file → work again, and a log written by
 *  an older build → the current one. Both are what a user does, and neither is
 *  visible from inside a single module.
 *
 *  Deliberately the only integration test. One that says something is worth
 *  more than a suite that restates the units in a wider scope. */

import { describe, expect, it } from "vitest";

import { entering } from "../src/graph/check";
import * as file from "../src/graph/file";
import { fold, relationNames, stepsIn } from "../src/graph/fold";
import { edge, element, step, ROOT, type Graph, type Mutation, type Step } from "../src/graph/types";

/** Building a project the way the app does: one gesture, one step. */
function built(): Step[] {
  const pump = element("Pump", { parent: null, x: 24, y: 48 });
  const valve = element("Valve", { parent: pump.id });
  const port = element("inlet", { parent: pump.id, side: "left", at: 0.5, flow: "in" });
  const note = element("check the seal", { form: "note", parent: null, x: 96, y: 96 });
  const one = (...mutations: Mutation[]) => step("", "test", mutations);

  return [
    one({ op: "update_element", id: ROOT, label: "Rig" }),
    one({ op: "add_element", element: pump }),
    one({ op: "add_element", element: valve }),
    one({ op: "add_element", element: port }),
    one({ op: "add_element", element: note }),
    one({ op: "link_elements", edge: edge(pump.id, valve.id, { type: "drives", form: "flow" }) }),
    one({ op: "set_field", id: pump.id, name: "mass", form: "number", value: "4", unit: "kg" }),
  ];
}

/** Compare graphs by content, not by the order keys happen to sit in. */
const sorted = (value: unknown): unknown =>
  Array.isArray(value) ? value.map(sorted)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, held]) => [key, sorted(held)]))
    : value;

/** Opening a file is a checkpoint — the one mutation carrying a whole graph. */
const opened = (graph: Graph, steps: number): Step[] =>
  [step("opened", "checkpoint", [{ op: "checkpoint", graph, at: steps }])];

describe("work, save, open, work again", () => {
  const steps = built();
  const graph = fold(steps);
  const text = file.write(graph, "proj_rig", stepsIn(steps));

  it("comes back as the project that was saved", () => {
    const back = file.read(JSON.parse(text))!;

    expect(sorted(fold(opened(back.graph, 0)))).toEqual(sorted(graph));
  });

  it("keeps working afterwards — a reopened project takes new steps", () => {
    const back = file.read(JSON.parse(text))!;
    const fresh = element("Filter", { parent: null });
    const after = fold([...opened(back.graph, back.meta?.steps ?? 0),
                        step("", "test", [{ op: "add_element", element: fresh }])]);

    expect(after.elements[fresh.id]).toBeDefined();
    expect(Object.keys(after.elements).length).toBe(Object.keys(graph.elements).length + 1);
  });

  it("carries how much work went into it across the round trip", () => {
    const back = file.read(JSON.parse(text))!;

    expect(stepsIn(opened(back.graph, back.meta?.steps ?? 0))).toBe(stepsIn(steps));
  });

  it("saves again to the same bytes when nothing changed", () => {
    const back = file.read(JSON.parse(text))!;

    expect(file.write(back.graph, back.id, back.meta?.steps ?? 0)).toBe(text);
  });

  it("shows only what changed when something did", () => {
    // The point of the whole format: a diff names the element that moved, and
    // says nothing about the ones that did not.
    const moved = fold([...steps,
      step("", "test", [{ op: "place_element", id: Object.values(graph.elements)
        .find((n) => n.label === "Pump")!.id, x: 240, y: 240 }])]);
    const before = text.split("\n");
    const after = file.write(moved, "proj_rig", stepsIn(steps) + 1).split("\n");
    const changed = after.filter((line, at) => line !== before[at]);

    expect(changed.length).toBeLessThan(before.length / 4);
  });
});

describe("a log from an older build", () => {
  /** How the same project looked before `form`, `fields` and definitions. */
  const legacy = [{
    id: "s_1", question: "", prompt: "", input: "", action: "test", status: "applied",
    mutations: [
      { op: "set_domain", domain: "software" },
      { op: "add_node", node: { id: "n_1", label: "Pump", parent: null } },
      { op: "add_element", element: {
        id: "n_2", element: "block", label: "Valve", type: "part", parent: "n_1", body: "",
        x: null, y: null, w: null, h: null, side: null, at: null, flow: null, num: 1,
        axis: null, groups: [], of: null, color: "#d9a441",
        attrs: [{ name: "mass", value: "4", tags: [] }],
      } },
      { op: "link_nodes", edge: { id: "e_1", source: "n_1", target: "n_2",
                                  relation: "drives", dir: "forward", kind: "flow" } },
    ],
  }];

  const came = entering(legacy)!;
  const graph = fold(came.steps);

  it("opens, and says what it had to repair", () => {
    expect(came.faults.length).toBeGreaterThan(0);
    expect(came.faults.every((f) => f.healed)).toBe(true);
  });

  it("arrives in the shape this build reads", () => {
    expect(graph.elements.n_2.form).toBe("block");
    expect(graph.elements.n_2.fields[0]).toMatchObject({ name: "mass", form: "text" });
    expect(graph.edges.e_1.form).toBe("flow");
    expect(graph.vocabulary).toBe("software");
  });

  it("turns its bare relation names into definitions", () => {
    expect(relationNames(graph)).toContain("drives");
    expect(graph.defs[graph.edges.e_1.type]).toBeDefined();
  });

  it("saves out in the current format, which is how a project stops being old", () => {
    const text = file.write(graph, "proj_old", stepsIn(came.steps));
    const back = file.read(JSON.parse(text))!;

    expect(back.schema).toBe(file.SCHEMA);
    expect(sorted(fold(opened(back.graph, 0)))).toEqual(sorted(graph));
  });
});
