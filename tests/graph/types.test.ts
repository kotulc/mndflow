/** The closed sets and the factories that fill them.
 *
 *  Small surface, but two rules here are load-bearing everywhere else: an id
 *  says what it points at, and a factory leaves nothing undefined. Both are
 *  quiet when they break — a wrong prefix only misleads a reader, and a missing
 *  default only throws somewhere far away. */

import { describe, expect, it } from "vitest";

import { edge, element, field, definition, newId, asTarget, refAt, refTo, rootElement, ROOT, EMPTY,
         type ElemForm } from "../../src/graph/types";

const FORMS: ElemForm[] = ["block", "note", "group", "proxy"];

describe("newId", () => {
  it.each(FORMS)("prefixes an element made as %s with its own form", (form) => {
    expect(element("x", { form }).id.startsWith(`${form}_`)).toBe(true);
  });

  it("never repeats, which is what stops two sessions fusing elements", () => {
    const many = Array.from({ length: 2000 }, () => newId("block"));

    expect(new Set(many).size).toBe(many.length);
  });

  it("keeps a caller's own id, so a fold can rebuild what a log named", () => {
    expect(element("x", { id: "block_kept" }).id).toBe("block_kept");
  });
});

describe("factories", () => {
  it("leave no required field undefined", () => {
    for (const made of [element("x"), edge("a", "b"), field("f"), definition("d")]) {
      for (const [key, value] of Object.entries(made)) {
        expect(value, `${key} was undefined`).toBeDefined();
      }
    }
  });

  it("default a field to text, which is what an untyped value always was", () => {
    expect(field("f").form).toBe("text");
  });

  it("let a caller override any default", () => {
    expect(element("x", { form: "note" }).form).toBe("note");
    expect(field("f", { form: "number", unit: "kg" }).unit).toBe("kg");
  });
});

describe("the empty project", () => {
  it("is root and nothing else", () => {
    expect(Object.keys(EMPTY.elements)).toEqual([ROOT]);
    expect(Object.keys(EMPTY.edges)).toHaveLength(0);
    expect(Object.keys(EMPTY.defs)).toHaveLength(0);
  });

  it("gives root the reserved id and no parent", () => {
    expect(rootElement().id).toBe(ROOT);
    expect(rootElement().parent).toBeNull();
  });
});

describe("a reference that may leave the project", () => {
  it("stays a bare id when it does not, so everything written before still reads", () => {
    expect(refTo("def_pump")).toBe("def_pump");
    expect(refAt("def_pump")).toEqual({ id: "def_pump" });
  });

  it("round-trips a reference into another project", () => {
    const held = refTo("def_pump", "proj_a9f");

    expect(refAt(held)).toEqual({ project: "proj_a9f", id: "def_pump" });
  });

  it.each(["of", "type", "a ref field's value"])(
    "reads the same wherever one is held — %s", () => {
      expect(refAt(refTo("block_1", "proj_2")).id).toBe("block_1");
    },
  );

  it("names a proxy's halves project and element", () => {
    expect(asTarget(refTo("block_1", "proj_2"))).toEqual({
      project: "proj_2", element: "block_1",
    });
    expect(asTarget("block_1")).toEqual({ element: "block_1" });
  });
});
