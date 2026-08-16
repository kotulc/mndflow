/** The project as a file.
 *
 *  Three properties are what the format exists for, and none of them is visible
 *  from a type: a file round-trips without loss, the same graph always writes
 *  the same bytes, and nothing still at its default is written down. Break the
 *  first and a project quietly loses something on save; break the second and
 *  every re-export shows a diff nobody made; break the third and the file stops
 *  being readable by a person. */

import { describe, expect, it } from "vitest";

import { hash, isWorkspace, needs, read, readable, write, writeWorkspace, SCHEMA } from "./file";
import { fold } from "./fold";
import { edge, element, refTo, step, ROOT, type Graph, type Mutation } from "./types";

/** A project with nesting, a note, a relationship, a typed field and a group —
 *  one of everything the layout has to place. */
function sample(): { graph: Graph; steps: number } {
  const a = element("Pump", { parent: null, x: 24, y: 48 });
  const b = element("Valve", { parent: a.id });
  const note = element("watch this", { form: "note", parent: null, x: 96, y: 96 });
  const group = element("Set", { form: "group", parent: null });
  const mutations: Mutation[] = [
    { op: "update_element", id: ROOT, label: "Rig" },
    { op: "set_vocabulary", vocabulary: "software" },
    { op: "add_element", element: a },
    { op: "add_element", element: b },
    { op: "add_element", element: note },
    { op: "add_element", element: group },
    { op: "join_group", id: a.id, group: group.id },
    { op: "link_elements", edge: edge(a.id, b.id, { type: "drives", form: "directed" }) },
    { op: "set_field", id: a.id, name: "mass", form: "number", value: "4", unit: "kg" },
  ];

  return { graph: fold([step("", "test", mutations)]), steps: 1 };
}

/** Compare graphs by content rather than by the order keys happen to sit in. */
const sorted = (value: unknown): unknown =>
  Array.isArray(value) ? value.map(sorted)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, held]) => [key, sorted(held)]))
    : value;

describe("the round trip", () => {
  it("loses nothing", () => {
    const { graph, steps } = sample();
    const back = read(JSON.parse(write(graph, "proj_test", steps)))!;

    expect(sorted(back.graph)).toEqual(sorted(graph));
  });

  it("writes the same bytes for the same graph, so nothing diffs on re-export", () => {
    const { graph, steps } = sample();
    const once = write(graph, "proj_test", steps);
    const back = read(JSON.parse(once))!;

    expect(write(back.graph, back.id, back.meta?.steps ?? 0)).toBe(once);
  });

  it("carries the project's id, so a rename breaks no reference into it", () => {
    const { graph, steps } = sample();

    expect(read(JSON.parse(write(graph, "proj_kept", steps)))!.id).toBe("proj_kept");
  });
});

describe("what is written", () => {
  const { graph, steps } = sample();
  const text = write(graph, "proj_test", steps);
  const held = JSON.parse(text);

  it("never writes a parent — position in the tree carries it", () => {
    expect(text).not.toContain('"parent"');
  });

  it("writes nothing still at its default", () => {
    expect(text).not.toContain("null");
    expect(text).not.toContain("[]");
  });

  it("puts definitions before the tree, and the tree before relationships", () => {
    expect(Object.keys(held.graph)).toEqual(
      Object.keys(held.graph).sort((a, b) =>
        ["vocabulary", "defs", "root", "edges"].indexOf(a) -
        ["vocabulary", "defs", "root", "edges"].indexOf(b)),
    );
  });

  it("nests a child inside the element that holds it", () => {
    const root = held.graph.root;
    const parent = Object.values(root.holds).find((n) => (n as { label: string }).label === "Pump");

    expect(Object.keys((parent as { holds: object }).holds)).toHaveLength(1);
  });

  it("is valid JSON as well as line-diffable, which are not in tension", () => {
    expect(text.split("\n").length).toBeGreaterThan(10);
    expect(() => JSON.parse(text)).not.toThrow();
  });
});

describe("a file written by an earlier build", () => {
  const { graph, steps } = sample();
  /** Exactly what 1.0 wrote: the module in the base, and no field 1.1 added. */
  const before = (() => {
    const held = JSON.parse(write(graph, "proj_old", steps));
    const { module: _new, ...meta } = held.meta;

    return { ...held, schema: "1.0", module: "block", meta };
  })();

  it("still opens — the gate compares the major, so a lower minor is fine", () => {
    expect(readable("1.0")).toBe(true);
    expect(read(before)).not.toBeNull();
  });

  it("comes back holding everything it held", () => {
    expect(sorted(read(before)!.graph)).toEqual(sorted(graph));
  });

  it("saves back out current, so opening one is how a project catches up", () => {
    const back = read(before)!;
    const again = JSON.parse(write(back.graph, back.id, back.meta?.steps ?? 0));

    expect(again.schema).toBe(SCHEMA);
    expect(again.module).toBeUndefined();
    expect(again.meta.module).toBeTruthy();
  });
});

describe("the module preference", () => {
  const { graph, steps } = sample();

  it("is written to meta, not to the base — it is a preference, not a classifier", () => {
    const held = JSON.parse(write(graph, "proj_test", steps));

    expect(held.module).toBeUndefined();
    expect(held.meta.module).toBeTruthy();
  });

  it("is still read from a file that carried it in the base", () => {
    const held = JSON.parse(write(graph, "proj_test", steps));
    const { module: _gone, ...meta } = held.meta;

    expect(read({ ...held, meta, module: "activity" })!.meta?.module).toBe("activity");
  });

  it("falls back rather than failing when a file names none", () => {
    const held = JSON.parse(write(graph, "proj_test", steps));

    expect(read({ ...held, meta: { steps: 1 } })!.meta?.module).toBeTruthy();
  });
});

describe("what a definition declares", () => {
  /** Everything a definition can say, so the round trip has all of it to lose. */
  const spoken: Mutation[] = [
    { op: "set_def", id: "def_decision", name: "decision", form: "block",
      body: "a branch in a flow", size: { w: 48, h: 48 },
      names: { sysml: "DecisionNode" },
      components: { card: { layout: "shape", shape: "diamond" },
                    rules: { degree: { in: [1, 1] } } } },
  ];
  const graph = fold([step("", "test", spoken)]);
  const text = write(graph, "proj_test", 1);

  it("keeps every field it declares through a round trip", () => {
    expect(read(JSON.parse(text))!.graph.defs.def_decision).toMatchObject({
      body: "a branch in a flow", size: { w: 48, h: 48 },
      names: { sysml: "DecisionNode" },
      components: { card: { layout: "shape", shape: "diamond" },
                    rules: { degree: { in: [1, 1] } } },
    });
  });

  it("writes none of them when a definition says nothing", () => {
    const bare = fold([step("", "test",
                            [{ op: "set_def", id: "def_part", name: "part", form: "block" }])]);
    const written = write(bare, "proj_test", 1);

    for (const said of ["body", "size", "names", "components", "icon"]) {
      expect(written).not.toContain(`"${said}"`);
    }
  });
});

describe("the schema gate", () => {
  it("reads its own", () => {
    expect(readable(SCHEMA)).toBe(true);
  });

  it("reads a higher minor, so an additive change is not a break", () => {
    const [major] = SCHEMA.split(".");

    expect(readable(`${major}.99`)).toBe(true);
  });

  it("refuses a different major", () => {
    const next = Number(SCHEMA.split(".")[0]) + 1;

    expect(readable(`${next}.0`)).toBe(false);
    expect(read({ schema: `${next}.0`, graph: {} })).toBeNull();
  });

  it.each([null, [], "text", { graph: {} }])("refuses what is not a file: %s", (raw) => {
    expect(read(raw)).toBeNull();
  });
});

describe("the state hash", () => {
  it("is the same for the same text and different for different text", () => {
    const { graph, steps } = sample();
    const text = write(graph, "proj_test", steps);

    expect(hash(text)).toBe(hash(text));
    expect(hash(text)).not.toBe(hash(`${text} `));
  });
});

describe("what a project depends on", () => {
  it("names every external project a proxy points at, and nothing local", () => {
    const stand = element("", {
      form: "proxy",
      parent: null,
      of: refTo(ROOT, "proj_other"),
    });
    const local = element("Pump", { parent: null });
    const graph = fold([step("", "test", [
      { op: "add_element", element: stand },
      { op: "add_element", element: local },
    ])]);

    expect(needs(graph)).toEqual(["proj_other"]);
  });

  it("is empty when nothing points outside", () => {
    const { graph } = sample();

    expect(needs(graph)).toEqual([]);
  });
});

describe("a bundle", () => {
  const primary = sample();
  const other = element("Tank", { parent: null });
  const dep = fold([step("", "test", [
    { op: "update_element", id: ROOT, label: "Other" },
    { op: "add_element", element: other },
  ])]);
  const stand = element("", {
    form: "proxy",
    parent: null,
    of: refTo(ROOT, "proj_dep"),
  });
  const withProxy = fold([step("", "test", [
    { op: "update_element", id: ROOT, label: "Rig" },
    { op: "add_element", element: stand },
  ])]);

  it("carries companions so the file stands alone, and round-trips them", () => {
    const text = write(withProxy, "proj_main", 1, {
      proj_dep: { graph: dep, steps: 1 },
    });
    const back = read(JSON.parse(text))!;

    expect(back.id).toBe("proj_main");
    expect(Object.keys(back.projects ?? {})).toEqual(["proj_dep"]);
    expect(sorted(back.projects!.proj_dep.graph)).toEqual(sorted(dep));
    expect(isWorkspace(back)).toBe(false);
  });

  it("omits projects when nothing is bundled — a lone export stays a lone envelope", () => {
    const held = JSON.parse(write(primary.graph, "proj_test", primary.steps));

    expect(held.projects).toBeUndefined();
  });

  it("writes the same bytes for the same bundle", () => {
    const others = { proj_dep: { graph: dep, steps: 1 } };
    const once = write(withProxy, "proj_main", 1, others);

    expect(write(withProxy, "proj_main", 1, others)).toBe(once);
  });
});

describe("a workspace export", () => {
  const shell = fold([step("", "test", [
    { op: "update_element", id: ROOT, label: "Workspace" },
    { op: "add_element", element: element("", {
      form: "proxy", parent: null, of: refTo(ROOT, "proj_a"),
    }) },
  ])]);
  const a = fold([step("", "test", [
    { op: "update_element", id: ROOT, label: "A" },
  ])]);

  it("marks itself as a workspace and lists open projects beside the shell", () => {
    const text = writeWorkspace(
      { id: "proj_ws", graph: shell, steps: 1 },
      { proj_a: { graph: a, steps: 2 } },
    );
    const back = read(JSON.parse(text))!;

    expect(isWorkspace(back)).toBe(true);
    expect(back.id).toBe("proj_ws");
    expect(sorted(back.projects!.proj_a.graph)).toEqual(sorted(a));
  });
});
