/** The definition model and the rules around it: defaults, derived relation kinds, notes, pins,
 *  saved and removed definitions, tags, batches, grafts and the group rule. */

import { describe, expect, it } from "vitest";
import { seed } from "@mnd/defs";
import { FLOOR } from "@mnd/fixtures";
import { BLOCK_MODULES, ROOT, check, children, def_of, default_for, edge_module, open, session,
         write, type Id, type Session } from "../src/index";

/** A seeded session holding blocks of these names on the root layer. */
function made(...names: string[]): { s: Session; at: (name: string) => Id } {
  const s = session({ defs: seed() });
  for (const name of names) s.go("create", { name });
  const at = (name: string) => children(s.graph(), ROOT).find((b) => b.name === name)!.id;
  return { s, at };
}

/** The relation the last step added. */
const newest = (s: Session): Id => Object.keys(s.graph().edges).at(-1)!;

describe("defaults", () => {
  it.each(BLOCK_MODULES)("lays one default for the %s kind", (kind) => {
    const { s } = made();
    expect(default_for(s.graph(), kind)).toBeDefined();
  });

  it("resolves a plain block through its kind's default", () => {
    const { s, at } = made("Pump");
    expect(def_of(s.graph(), at("Pump"))).toBe(default_for(s.graph(), "block"));
  });

  it("writes no untouched default into a file", () => {
    const { s } = made("Pump");
    const file = JSON.parse(write(s.graph()));
    expect(Object.values(file.graph.defs)).toEqual([]);
  });
});

describe("a relation's kind", () => {
  it.each([
    ["two blocks", false, false, "line"],
    ["a note and a block", true, false, "tie"],
    ["a block and a note", false, true, "tie"],
  ])("is read from its ends: %s make a %s", (_, from_note, to_note, want) => {
    const { s, at } = made("A", "B");
    const end = (name: string, noted: boolean) => {
      if (!noted) return at(name);
      s.go("note", { about: at(name), text: `about ${name}` });
      return children(s.graph(), ROOT).find((b) => b.type === "note" && b.body === `about ${name}`)!.id;
    };
    s.go("relate", { from: end("A", from_note), to: end("B", to_note) });
    expect(edge_module(s.graph(), newest(s))).toBe(want);
    expect("module" in s.graph().edges[newest(s)]!).toBe(false);
  });

  it("changes with its ends", () => {
    const { s, at } = made("A", "B");
    s.go("note", { about: at("A"), text: "why" });
    const tie = newest(s);
    s.go("relink", { id: tie, end: "from", to: at("B") });
    expect(edge_module(s.graph(), tie)).toBe("line");
  });
});

describe("notes and ends", () => {
  it("refuses a note about a relation", () => {
    const { s, at } = made("A", "B");
    s.go("relate", { from: at("A"), to: at("B") });
    expect(s.go("note", { about: newest(s), text: "why" })).not.toBeNull();
  });

  it.each(["relate", "relink"])("%s refuses a relation as an end", (name) => {
    const { s, at } = made("A", "B", "C");
    s.go("relate", { from: at("A"), to: at("B") });
    const line = newest(s);
    const args = name === "relate" ? { from: at("C"), to: line } : { id: line, end: "to", to: line };
    expect(s.go(name, args)).not.toBeNull();
  });

  it("refuses promoting an end that is already an interface", () => {
    const { s, at } = made("A", "B");
    s.go("relate", { from: at("A"), to: at("B") });
    const line = newest(s);
    expect(s.go("interface", { edge: line, end: "to" })).toBeNull();
    expect(s.go("interface", { edge: line, end: "to" })).not.toBeNull();
  });

  it("drops a relation whose end is not there, at the door", () => {
    const { s, at } = made("A");
    const graph = structuredClone(s.graph());
    graph.edges["edge_x"] = { id: "edge_x", from: at("A"), to: "block_gone" };
    const got = check([{ id: "s", action: "t", at: 0, status: "applied",
                         mutations: [{ op: "checkpoint", graph }] }], FLOOR);
    expect(got.faults.map((f) => f.kind)).toContain("dropped");
  });
});

describe("definitions", () => {
  it("saves a look as an unpinned definition the element then follows", () => {
    const { s, at } = made("Pump");
    s.go("look", { ids: [at("Pump")], key: "style", name: "fill", value: "solid" });
    expect(s.go("save_def", { id: at("Pump"), name: "Machine" })).toBeNull();
    const type = s.graph().blocks[at("Pump")]!.type!;
    expect(s.graph().defs[type]!.name).toBe("Machine");
    expect(s.graph().blocks[ROOT]!.pinned ?? []).not.toContain(type);
  });

  it("pins and unpins, and never pins a default", () => {
    const { s, at } = made("Pump");
    s.go("save_def", { id: at("Pump"), name: "Machine" });
    const type = s.graph().blocks[at("Pump")]!.type!;
    s.go("pin", { id: type, on: "yes" });
    expect(s.graph().blocks[ROOT]!.pinned).toEqual([type]);
    s.go("pin", { id: type, on: "no" });
    expect(s.graph().blocks[ROOT]!.pinned).toBeUndefined();
    expect(s.go("pin", { id: default_for(s.graph(), "block")! })).not.toBeNull();
  });

  it("removes a definition, handing its looks back to what named it", () => {
    const { s, at } = made("Pump");
    s.go("look", { ids: [at("Pump")], key: "style", name: "fill", value: "solid" });
    s.go("save_def", { id: at("Pump"), name: "Machine" });
    const type = s.graph().blocks[at("Pump")]!.type!;
    expect(s.go("remove_def", { id: type })).toBeNull();
    expect(s.graph().defs[type]).toBeUndefined();
    expect(s.graph().blocks[at("Pump")]!.type).toBeUndefined();
    expect(s.graph().blocks[at("Pump")]!.looks?.["style"]?.["fill"]).toBe("solid");
  });

  it("requires a group to define", () => {
    const { s } = made();
    expect(s.go("define", { name: "Machine" })).not.toBeNull();
    expect(s.go("define", { name: "Machine", group: "block" })).toBeNull();
  });
});

describe("tags", () => {
  it("go on blocks and relations alike, trimmed and deduplicated", () => {
    const { s, at } = made("A", "B");
    s.go("relate", { from: at("A"), to: at("B") });
    s.go("tag", { ids: [at("A"), newest(s)], tags: "hot, hot , wet" });
    expect(s.graph().blocks[at("A")]!.tags).toEqual(["hot", "wet"]);
    expect(s.graph().edges[newest(s)]!.tags).toEqual(["hot", "wet"]);
  });
});

describe("a batch", () => {
  it("lands as one step and undoes as one", () => {
    const { s } = made();
    const was = s.log().length;
    s.batch(() => {
      s.go("create", { name: "A" });
      s.go("create", { name: "B" });
    });
    expect(s.log().length).toBe(was + 1);
    s.undo();
    expect(children(s.graph(), ROOT)).toEqual([]);
  });
});

describe("a group", () => {
  it("goes with its last member", () => {
    const { s, at } = made("A", "B");
    s.go("group", { members: [at("A"), at("B")] });
    const group = s.graph().blocks[at("A")]!.group!;
    s.go("leave", { ids: [at("A")] });
    expect(s.graph().blocks[group]).toBeDefined();
    s.go("leave", { ids: [at("B")] });
    expect(s.graph().blocks[group]).toBeUndefined();
  });

  it("stands when it was made empty", () => {
    const { s } = made();
    s.go("group", { rows: 1, cols: 1 });
    expect(Object.values(s.graph().blocks).some((b) => b.type === "grid")).toBe(true);
  });
});

describe("a graft", () => {
  it("brings elements in beside what is there, and replaces nothing", () => {
    const { s: other, at: there } = made("Pump");
    other.go("save_def", { id: there("Pump"), name: "Machine" });
    const { s, at } = made("Tank");
    s.go("save_def", { id: at("Tank"), name: "Vessel" });
    const mine = { ...s.graph().defs };
    expect(s.graft(write(other.graph()))).toEqual([]);
    const names = children(s.graph(), ROOT).map((b) => b.name).sort();
    expect(names).toEqual(["Pump", "Tank"]);
    for (const [id, d] of Object.entries(mine)) expect(s.graph().defs[id]).toEqual(d);
    expect(open(write(s.graph()), FLOOR).faults).toEqual([]);
  });
});
