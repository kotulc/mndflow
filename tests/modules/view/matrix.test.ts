/** The matrix view module's surface, map and grid composition.
 *
 *  The surface seam is settled — surround / viewport / chrome / asking — and
 *  the map settles that a matrix accepts none of the four adjustments. The
 *  grid is the claim that the same members a table lists become both axes,
 *  with relationships drawn in the cells. */

import { describe, expect, it } from "vitest";

import { element, EMPTY, ROOT } from "../../../src/graph/types";
import type { Graph } from "../../../src/graph/types";
import {
  MAP, MATRIX, gridOf, reaches, takes, kindsOf, trailOf, bandsOf,
} from "../../../src/modules/view/matrix/index";

describe("the matrix module's surface", () => {
  it("is a grid with a scrollbar, no frame, and a place to ask", () => {
    expect(MATRIX.surround).toBe("none");
    expect(MATRIX.viewport).toBe("scroll");
    expect(MATRIX.asks).toBe(true);
    expect(MATRIX.chrome).toContain("crumbs");
    expect(MATRIX.chrome).not.toContain("axis");
    expect(MATRIX.chrome).not.toContain("arrange");
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

  it("puts every block and reference on both axes", () => {
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

  it("lists the relationship marks present for the types chrome", () => {
    const grid = gridOf(layered(), "L");

    expect(kindsOf(grid).length).toBeGreaterThan(0);
    expect(kindsOf(grid).every((name) => name.length > 0)).toBe(true);
  });

  it("builds a crumb trail from the open layer up to the project", () => {
    const trail = trailOf(layered(), "L");

    expect(trail[trail.length - 1]).toBe("L");
    expect(trail.length).toBeGreaterThan(0);
  });
});

describe("cell heat (W.4)", () => {
  /** A layer with one cell holding two relationship kinds — `flow` twice,
   *  `carry` once — each kind styled to a different slot on the ramp. */
  function heated(): Graph {
    const layer = element("layer", { id: "L", parent: ROOT, form: "block" });
    const a = element("pump", { id: "a", parent: "L", form: "block", type: "def_1" });
    const b = element("tank", { id: "b", parent: "L", form: "block", type: "def_1" });

    return {
      ...EMPTY,
      defs: {
        def_1: { id: "def_1", name: "Part", form: "block", fields: [] },
        def_flow: {
          id: "def_flow", name: "flow", form: "directed", fields: [],
          components: { style: { slot: "secondary" } },
        },
        def_carry: {
          id: "def_carry", name: "carry", form: "directed", fields: [],
          components: { style: { slot: "tertiary" } },
        },
      },
      elements: { ...EMPTY.elements, L: layer, a, b },
      edges: {
        e1: { id: "e1", source: "a", target: "b", type: "def_flow", form: "directed", dir: "forward" },
        e2: { id: "e2", source: "a", target: "b", type: "def_flow", form: "directed", dir: "forward" },
        e3: { id: "e3", source: "a", target: "b", type: "def_carry", form: "directed", dir: "forward" },
      },
    };
  }

  it("draws one band per kind held, never per edge", () => {
    const graph = heated();
    const cell = gridOf(graph, "L").cells.flat().find((c) => c.edges.length > 0)!;
    const bands = bandsOf(graph, cell);

    expect(bands).toHaveLength(2);
    expect(new Set(bands.map((b) => b.type)).size).toBe(bands.length);
  });

  it("a single kind degrades to one band — the solid-cell case", () => {
    const graph = heated();
    const cell = gridOf(graph, "L").cells.flat().find((c) => c.edges.length > 0)!;
    const solo = { ...cell, edges: cell.edges.filter((e) => e.type === "def_flow") };

    expect(bandsOf(graph, solo)).toHaveLength(1);
  });

  it("opacity climbs with count, transparent at zero and never solid", () => {
    const graph = heated();
    const cell = gridOf(graph, "L").cells.flat().find((c) => c.edges.length > 0)!;
    const light = bandsOf(
      graph, { ...cell, edges: cell.edges.filter((e) => e.type === "def_carry") },
    )[0];
    const heavy = bandsOf(
      graph, { ...cell, edges: cell.edges.filter((e) => e.type === "def_flow") },
    )[0];
    const empty = bandsOf(graph, { ...cell, edges: [] });

    expect(empty).toHaveLength(0);
    expect(light.count).toBeLessThan(heavy.count);
    expect(light.opacity).toBeGreaterThan(0);
    expect(light.opacity).toBeLessThan(heavy.opacity);
    expect(heavy.opacity).toBeLessThan(1);
  });

  it("kinds on different slots paint different fills", () => {
    const graph = heated();
    const cell = gridOf(graph, "L").cells.flat().find((c) => c.edges.length > 0)!;
    const bands = bandsOf(graph, cell);

    expect(new Set(bands.map((b) => b.fill)).size).toBe(bands.length);
  });
});
