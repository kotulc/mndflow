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

import { beforeEach, describe, expect, it } from "vitest";

import { entering } from "../src/graph/check";
import * as file from "../src/graph/file";
import { fold, stepsIn } from "../src/graph/fold";
import { edge, element, step, ROOT, stemOf, type Graph, type Mutation, type Step } from "../src/graph/types";
import { loadProject, saveProject } from "../src/graph/store";
import * as workspace from "../src/workspace";

/** localStorage for a test process, so the storage journey can be driven. */
function memory(): Storage {
  const held = new Map<string, string>();

  return {
    get length() { return held.size; },
    clear() { held.clear(); },
    getItem(key: string) { return held.get(key) ?? null; },
    setItem(key: string, value: unknown) { held.set(key, String(value)); },
    removeItem(key: string) { held.delete(key); },
    key(index: number) { return [...held.keys()][index] ?? null; },
  } as unknown as Storage;
}

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
    one({ op: "link_elements", edge: edge(pump.id, valve.id, { type: "drives", form: "directed" }) }),
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

describe("a project from an older build", () => {
  /** One element as an earlier build wrote it — every field spelled out, since
   *  nothing was left at a default then, and `element` where `form` is now. */
  const was = (id: string, label: string) => ({
    id, element: "block", label, type: "", body: "", x: null, y: null, w: null, h: null,
    side: null, at: null, flow: null, num: 1, axis: null, groups: [], of: null,
  });

  /** A project as an earlier build held one: `element` before it was `form`,
   *  `attrs` before fields carried one, and `kind`/`relation` on the edge. This
   *  is the whole of what still has to open — the log format that came before
   *  checkpoints is gone, and a checkpoint is what a file has always been. */
  const old = {
    op: "checkpoint",
    at: 4,
    graph: {
      defs: {},
      vocabulary: "software",
      elements: {
        [ROOT]: { ...was(ROOT, "Rig"), parent: null },
        n_1: { ...was("n_1", "Pump"), parent: null },
        n_2: { ...was("n_2", "Valve"), parent: "n_1", type: "part", color: "#d9a441",
               attrs: [{ name: "mass", value: "4", tags: [] }] },
      },
      edges: {
        e_1: { id: "e_1", source: "n_1", target: "n_2",
               relation: "drives", dir: "forward", kind: "flow" },
      },
    },
  };

  const came = entering([step("", "checkpoint", [old as unknown as Mutation])])!;
  const graph = fold(came.steps);

  it("opens, and says what it had to repair", () => {
    expect(came.faults.length).toBeGreaterThan(0);
    expect(came.faults.every((f) => f.healed)).toBe(true);
  });

  it("arrives in the shape this build reads", () => {
    expect(graph.elements.n_2.form).toBe("block");
    expect(graph.elements.n_2.fields[0]).toMatchObject({ name: "mass", form: "text" });
    expect(graph.edges.e_1.form).toBe("directed");
    expect(graph.vocabulary.every((id) => id.startsWith("pkg_"))).toBe(true);
    expect(stemOf(graph.vocabulary)).toBe("software");
  });

  it("saves out in the current format, which is how a project stops being old", () => {
    const text = file.write(graph, "proj_old", stepsIn(came.steps));
    const back = file.read(JSON.parse(text))!;

    expect(back.schema).toBe(file.SCHEMA);
    expect(back.graph.elements.n_2.form).toBe("block");
  });
});


/** The journey the unit tests could not see: through *storage*, not through the
 *  file format. A project is only really saved when a reload finds it again,
 *  and every module below was green while nothing survived one.
 *
 *  This is the test the import bug walked through. `file.write` / `file.read`
 *  round-tripped perfectly the whole time; `saveProject` dropped the log and
 *  reported success, so the work existed only until the tab was closed. */
describe("work, reload, still there", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: memory(), configurable: true, writable: true,
    });
  });

  /** Reading a keyed slot the way the page does on a fresh load. */
  const reopen = (id: string): Graph => {
    const came = entering(loadProject(id));

    return fold(came ? came.steps : []);
  };

  it("finds the work again after a reload", () => {
    const steps = built();
    saveProject("proj_rig", steps);

    const back = reopen("proj_rig");
    expect(sorted(back)).toEqual(sorted(fold(steps)));
  });

  it("finds an imported project again after a reload", () => {
    // What import writes: the whole graph as one checkpoint, and nothing else.
    const graph = fold(built());
    saveProject("proj_taken", opened(graph, stepsIn(built())));

    const back = reopen("proj_taken");
    expect(Object.keys(back.elements).length).toBe(Object.keys(graph.elements).length);
    expect(back.elements[ROOT].label).toBe("Rig");
  });

  it("keeps a project that was named and nothing more", () => {
    // Naming is a project's first step, and what makes it real enough to keep.
    saveProject("proj_named", workspace.started("coolant loop"));

    expect(reopen("proj_named").elements[ROOT].label).toBe("coolant loop");
  });

  it("keeps a project nobody opened out of storage entirely", () => {
    saveProject("proj_untouched", opened(fold([]), 0));

    expect(localStorage.getItem("mndflow.steps.proj_untouched.v1")).toBeNull();
  });

  it("keeps two projects' work apart across a reload", () => {
    saveProject("proj_one", built());
    saveProject("proj_two", workspace.started("other"));

    expect(reopen("proj_one").elements[ROOT].label).toBe("Rig");
    expect(reopen("proj_two").elements[ROOT].label).toBe("other");
  });

  it("refuses a second project the name one already has", () => {
    const taken = workspace.names({ proj_one: fold(workspace.started("coolant loop")) });

    expect(workspace.mayName(taken, "coolant loop")).not.toBeNull();
    expect(workspace.mayName(taken, "Coolant Loop")).not.toBeNull();
    expect(workspace.mayName(taken, "telemetry")).toBeNull();
    expect(workspace.mayName(taken, "   ")).not.toBeNull();
  });

  it("lets a project keep its own name when renamed to it", () => {
    const taken = workspace.names({ proj_one: fold(workspace.started("coolant loop")) });

    expect(workspace.mayName(taken, "coolant loop", "proj_one")).toBeNull();
  });
});
