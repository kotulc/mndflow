/** The definition model and the rules around it: derived relation kinds, notes, pins, defined
 *  and removed definitions, tags, batches, grafts and the group rule. */

import { describe, expect, it } from "vitest";
import { FLOOR } from "@mnd/fixtures";
import { MAIN, ROOT, check, children, def_of, holders_in, is_grid,
         session, type Id, type Session } from "../src/index";

/** A seeded session holding blocks of these names in `main`. */
function made(...names: string[]): { s: Session; at: (name: string) => Id } {
  const s = session({ floor: FLOOR });
  for (const name of names) s.go("create", { name });
  const at = (name: string) => children(s.graph(), MAIN).find((b) => b.name === name)!.id;
  return { s, at };
}

/** The relation the last step added. */
const newest = (s: Session): Id => Object.keys(s.graph().edges).at(-1)!;

describe("a plain block", () => {
  it("resolves through its base while nobody has said otherwise", () => {
    const { s, at } = made("Pump");
    expect(def_of(s.graph(), at("Pump"))).toBe("block");
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
  it("defines from a block, which then follows the definition", () => {
    const { s, at } = made("Pump");
    s.go("look", { ids: [at("Pump")], key: "style", name: "fill", value: "solid" });
    expect(s.go("define_from", { id: at("Pump"), name: "Machine" })).toBeNull();
    const type = s.graph().blocks[at("Pump")]!.type!;
    expect(s.graph().blocks[type]!.name).toBe("Machine");
    expect(s.graph().blocks[type]!.parent).toBe(ROOT);
  });

  it("refuses to change what a package brought", () => {
    const { s } = made();
    expect(s.go("rename", { id: "block", name: "thing" })).not.toBeNull();
    expect(s.go("look", { ids: ["block"], key: "style", name: "family", value: "away" }))
      .not.toBeNull();
  });
});

describe("tags", () => {
  it("go on blocks and relations alike, trimmed and deduplicated, each word a tag", () => {
    const { s, at } = made("A", "B");
    s.go("relate", { from: at("A"), to: at("B") });
    s.go("tag", { ids: [at("A"), newest(s)], tags: "hot, hot , wet" });
    const names = (ids: string[] | undefined) => (ids ?? []).map((id) => s.graph().blocks[id]?.name);
    expect(names(s.graph().blocks[at("A")]!.tags)).toEqual(["hot", "wet"]);
    expect(names(s.graph().edges[newest(s)]!.tags)).toEqual(["hot", "wet"]);
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
    expect(children(s.graph(), MAIN)).toEqual([]);
  });
});

describe("a group", () => {

  it("stands when it was made empty", () => {
    const { s } = made();
    s.go("group", { rows: 1, cols: 1 });
    expect(holders_in(s.graph(), MAIN).some((h) => is_grid(s.graph(), h.id))).toBe(true);
  });
});
