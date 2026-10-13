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
  it("opens a folder from structure onto the layers it holds", () => {
    const g = workspace();
    expect(open_at(g, EDITOR, {}, "cards", 1, here(1)))
      .toMatchObject({ at: 1, kind: "folder", layer: "cards" });
  });

  it("opens the same folder from definitions onto its definitions", () => {
    const g = workspace();
    expect(open_at(g, EDITOR, {}, "cards", 0, here(0)))
      .toMatchObject({ at: 0, kind: "folder", layer: "cards" });
  });

  it("keeps a double-click in the section the canvas is already on", () => {
    const g = workspace();
    expect(open_at(g, EDITOR, {}, "cards", undefined, here(1)))
      .toMatchObject({ at: 1, kind: "folder", layer: "cards" });
  });

  it("opens a definition from structure onto its structure", () => {
    const g = workspace();
    expect(open_at(g, EDITOR, {}, "pattern", 1, here(1)))
      .toMatchObject({ at: 1, kind: "internal", layer: "pattern" });
  });

  it("opens a definition from definitions onto its definition view", () => {
    const g = workspace();
    expect(open_at(g, EDITOR, {}, "pattern", 0, here(0)))
      .toMatchObject({ at: 0, kind: "definition", layer: "pattern" });
  });

  it("leaves a definition's structure for what holds it, still in structure", () => {
    const g = workspace();
    const left = leave_at(g, EDITOR, {},
                          { at: 1, kind: "internal", layer: "pattern", pick: null });
    expect(left).toMatchObject({ at: 1, kind: "folder", layer: "cards", pick: "pattern" });
  });

  it("opens a definition with no structure from the structure section", () => {
    const g = workspace();
    expect(open_at(g, EDITOR, {}, "large", 1, here(1)))
      .toMatchObject({ at: 1, kind: "internal", layer: "large" });
  });

  it("holds that open definition in the structure section", () => {
    const g = workspace();
    const view = { at: 1, kind: "internal" as const, layer: "large", pick: null };
    expect(held_at(g, EDITOR, view)).toEqual({ path: ["large", "large"], at: 1 });
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
        { op: "add_block", block: { id: "porty", parent: ROOT, name: "Porty", def: {} } },
        { op: "add_block", block: { id: "pin", parent: "porty", name: "in", type: "interface",
                                    flow: "in" } },
      ],
    }];
    const g = fold(log, FLOOR);
    expect(roots_structure(g, "porty")).toBe(false);
  });

  it("lists an open definition, and the folders on the way, before it holds anything", () => {
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
    expect(in_section(g, "only", null, null, "structure", "only")).toBe(true);
    expect(in_section(g, "shelf", null, null, "structure", "only")).toBe(true);
    const under = branch_of(g, ROOT, null, null, new Set(), "structure", "only");
    expect(under.own.map((b) => b.id)).toContain("shelf");
    const deeper = branch_of(g, "shelf", null, null, new Set(), "structure", "only");
    expect(deeper.own.map((b) => b.id)).toEqual(["only"]);
  });
});
