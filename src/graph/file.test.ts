/** The project as a file.
 *
 *  Three properties are what the format exists for, and none of them is visible
 *  from a type: a file round-trips without loss, the same graph always writes
 *  the same bytes, and nothing still at its default is written down. Break the
 *  first and a project quietly loses something on save; break the second and
 *  every re-export shows a diff nobody made; break the third and the file stops
 *  being readable by a person. */

import { describe, expect, it } from "vitest";

import { hash, read, readable, write, SCHEMA } from "./file";
import { fold } from "./fold";
import { edge, element, step, ROOT, type Graph, type Mutation } from "./types";

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
    { op: "link_elements", edge: edge(a.id, b.id, { type: "drives", form: "flow" }) },
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
