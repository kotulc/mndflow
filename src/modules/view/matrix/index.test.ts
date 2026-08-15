/** The matrix view module's surface, map and grid composition.
 *
 *  The surface seam is settled — surround / viewport / chrome / asking — and
 *  the map settles that a matrix accepts none of the four adjustments. The
 *  grid is the claim that the same members a table lists become both axes,
 *  with relationships drawn in the cells. */

import { describe, expect, it } from "vitest";

import { element, EMPTY, ROOT } from "../../../graph/types";
import type { Graph } from "../../../graph/types";
import { named } from "../index";
import { CHROME } from "../diagram/surface";
import { MAP, MATRIX, gridOf, reaches, takes } from "./index";

describe("the matrix module's surface", () => {
  it("is a grid with a scrollbar, no frame, and a place to ask", () => {
    expect(MATRIX.surround).toBe("none");
    expect(MATRIX.viewport).toBe("scroll");
    expect(MATRIX.asks).toBe(true);
    expect(MATRIX.chrome).toContain("crumbs");
    expect(MATRIX.chrome).not.toContain("axis");
    expect(MATRIX.chrome).not.toContain("arrange");
  });

  it("is what the registered matrix module carries", () => {
    expect(named("matrix")?.surface).toEqual(MATRIX);
    expect(named("matrix")?.kind).toBe("structure");
  });

  it("names no chrome kind outside the open set", () => {
    for (const kind of MATRIX.chrome) {
      expect(CHROME).toContain(kind);
    }
  });
});

describe("the matrix module's gesture map", () => {
  it("accepts none of the four adjustments", () => {
    expect(MAP.adjustments).toEqual([]);
    expect(takes("place")).toBe(false);
    expect(takes("size")).toBe(false);
    expect(takes("seat")).toBe(false);
    expect(takes("wall")).toBe(false);
  });

  it("binds axis selection and open, and relating from a cell", () => {
    expect(reaches("left", "click", "axis")).toBe("selection");
    expect(reaches("left", "double", "axis")).toBe("open");
    expect(reaches("right", "click", "cell")).toBe("relate");
    expect(reaches("left", "drop", "explorer")).toBe("refer");
  });

  it("answers null for a gesture it does not bind", () => {
    expect(reaches("left", "drag", "cell")).toBeNull();
    expect(reaches("key", "F", "any")).toBeNull();
  });
});

describe("grid composition", () => {
  /** A layer with two blocks and one relationship between them. */
  function layered(): Graph {
    const layer = element("layer", { id: "L", parent: ROOT, form: "block" });
    const a = element("pump", { id: "a", parent: "L", form: "block", type: "def_1" });
    const b = element("tank", { id: "b", parent: "L", form: "block", type: "def_1" });

    return {
      ...EMPTY,
      defs: {
        def_1: { id: "def_1", name: "Part", form: "block", fields: [] },
        def_rel: { id: "def_rel", name: "flow", form: "directed", fields: [] },
      },
      elements: { ...EMPTY.elements, L: layer, a, b },
      edges: {
        e1: {
          id: "e1", source: "a", target: "b", type: "def_rel", form: "directed", dir: "forward",
        },
      },
    };
  }

  it("puts every block and proxy on both axes", () => {
    const grid = gridOf(layered(), "L");

    expect(grid.rows.map((r) => r.id).sort()).toEqual(["a", "b"]);
    expect(grid.cols.map((c) => c.id).sort()).toEqual(["a", "b"]);
    expect(grid.cells).toHaveLength(grid.rows.length);
    expect(grid.cells[0]).toHaveLength(grid.cols.length);
  });

  it("puts a relationship in the cell from its source to its target", () => {
    const grid = gridOf(layered(), "L");
    const ai = grid.rows.findIndex((r) => r.id === "a");
    const bi = grid.cols.findIndex((c) => c.id === "b");
    const cell = grid.cells[ai][bi];

    expect(cell.edges.map((e) => e.id)).toContain("e1");
    expect(cell.marks.length).toBeGreaterThan(0);
    expect(grid.cells[bi][ai].edges).toHaveLength(0);
  });

  it("is empty for a layer that holds nothing", () => {
    const grid = gridOf(EMPTY, ROOT);

    expect(grid.rows).toEqual([]);
    expect(grid.cols).toEqual([]);
    expect(grid.cells).toEqual([]);
  });
});
