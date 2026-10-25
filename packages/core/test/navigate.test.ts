/** Opening and leaving keep definitions and structure as two trees. */

import { describe, expect, it } from "vitest";
import { FLOOR } from "@mnd/fixtures";
import { EDITOR, branch_of, fold, held_at, in_section, leave_at, open_at, roots_structure,
         stamps_of, ROOT, type Log } from "../src/index";

/** A definitions folder holding two definitions, one holding a part, and a structure folder
 *  holding a layer. */
function workspace() {
  const log: Log = [{
    id: "s1", action: "build", at: 1, status: "applied", mutations: [
      { op: "add_block", block: { id: "cards", parent: ROOT, name: "Cards", type: "folder",
                                  tree: "definitions", order: 1 } },
      { op: "add_block", block: { id: "scenes", parent: ROOT, name: "Scenes", type: "folder",
                                  order: 2 } },
      { op: "add_block", block: { id: "large", parent: "cards", name: "Large", def: {},
                                  order: 1 } },
      { op: "add_block", block: { id: "kinds", parent: "scenes", name: "Kinds", type: "block",
                                  order: 2 } },
      { op: "add_block", block: { id: "pattern", parent: "cards", name: "Pattern", def: {},
                                  order: 3 } },
      { op: "add_block", block: { id: "part", parent: "pattern", name: "Part", type: "block",
                                  order: 1 } },
    ],
  }];
  return fold(log, FLOOR);
}

const here = (at: number) => ({ at, kind: "folder" as const, layer: ROOT, pick: null });

describe("definitions and structure open apart", () => {
  it("opens a folder as a stop in the room its box is drawn in", () => {
    const g = workspace();
    expect(open_at(g, EDITOR, {}, "cards", 0, here(0))).toMatchObject({ at: 0, layer: "cards" });
  });

  it("opens a definition from the library on the view its chain names", () => {
    const g = workspace();
    expect(open_at(g, EDITOR, {}, "pattern", 0, here(0)))
      .toMatchObject({ at: 0, kind: "internal", layer: "pattern" });
  });

  it("leaves a definition for the layer holding it, still in the library", () => {
    const g = workspace();
    const left = leave_at(g, EDITOR, {},
                          { at: 0, kind: "internal", layer: "pattern", pick: null });
    expect(left).toMatchObject({ at: 0, layer: ROOT, pick: "pattern" });
  });

  it("lists a definition's parts in the library, and never in the model", () => {
    const g = workspace();
    expect(in_section(g, "part", null, null, "domain")).toBe(true);
    expect(in_section(g, "part", null, null, "structure")).toBe(false);
    expect(in_section(g, "pattern", null, null, "structure")).toBe(false);
    expect(in_section(g, "kinds", null, null, "structure")).toBe(true);
  });

  it("holds an open definition in the library", () => {
    const g = workspace();
    const view = { at: 0, kind: "internal" as const, layer: "large", pick: null };
    expect(held_at(g, EDITOR, view)).toMatchObject({ at: 0 });
  });
});

describe("the structure mark", () => {
  it("is the workspace, and a definition that holds structure", () => {
    const g = workspace();
    expect(roots_structure(g, ROOT)).toBe(true);
    expect(stamps_of(g, ROOT)).toContain("structure");
    expect(roots_structure(g, "pattern")).toBe(true);
    expect(stamps_of(g, "pattern")).toContain("structure");
    expect(roots_structure(g, "large")).toBe(false);
    expect(stamps_of(g, "large")).not.toContain("structure");
    expect(roots_structure(g, "cards")).toBe(false);
    expect(stamps_of(g, "cards")).not.toContain("structure");
    expect(roots_structure(g, "part")).toBe(false);
    expect(stamps_of(g, "base")).not.toContain("structure");
  });

  it("ignores a definition whose only children are ports", () => {
    const log: Log = [{
      id: "s1", action: "build", at: 1, status: "applied", mutations: [
        { op: "add_block", block: { id: "porty", parent: ROOT, name: "Porty", def: {},
                                    ports: [{ id: "pin", name: "in", flow: "in" }] } },
      ],
    }];
    const g = fold(log, FLOOR);
    expect(roots_structure(g, "porty")).toBe(false);
  });

  it("lists no definition in the model, nor the folders holding only definitions", () => {
    const log: Log = [{
      id: "s1", action: "build", at: 1, status: "applied", mutations: [
        { op: "add_block", block: { id: "shelf", parent: ROOT, name: "Shelf", type: "folder",
                                    tree: "definitions" } },
        { op: "add_block", block: { id: "only", parent: "shelf", name: "Only", def: {} } },
      ],
    }];
    const g = fold(log, FLOOR);
    expect(in_section(g, "only", null, null, "structure")).toBe(false);
    expect(in_section(g, "shelf", null, null, "structure")).toBe(false);
    const under = branch_of(g, "shelf", null, null, new Set(), "domain");
    expect(under.own.map((b) => b.id)).toEqual(["only"]);
  });
});
