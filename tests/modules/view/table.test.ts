/** The table view module's surface, map and row composition.
 *
 *  The surface seam is settled — surround / viewport / chrome / asking — and
 *  the map settles that a table accepts none of the four adjustments. Rows
 *  are the claim that a reference draws as a line rather than a card. */

import { describe, expect, it } from "vitest";

import { element, EMPTY, ROOT, refTo } from "../../../src/graph/types";
import type { Graph } from "../../../src/graph/types";
import { MAP, TABLE, reaches, rowsOf, takes, kindsOf, trailOf } from "../../../src/modules/view/table/index";

describe("the table module's surface", () => {
  it("is rows with a scrollbar, no frame, and a place to ask", () => {
    expect(TABLE.surround).toBe("none");
    expect(TABLE.viewport).toBe("scroll");
    expect(TABLE.asks).toBe(true);
    expect(TABLE.chrome).toContain("crumbs");
    expect(TABLE.chrome).not.toContain("axis");
    expect(TABLE.chrome).not.toContain("arrange");
  });

});

describe("the table module's gesture map", () => {
  it("accepts none of the four adjustments", () => {
    expect(MAP.adjustments).toEqual([]);
    expect(takes("place")).toBe(false);
    expect(takes("size")).toBe(false);
    expect(takes("seat")).toBe(false);
    expect(takes("wall")).toBe(false);
  });

  it("binds row selection and open, and referring from the explorer", () => {
    expect(reaches("left", "click", "row")).toBe("selection");
    expect(reaches("left", "double", "row")).toBe("open");
    expect(reaches("left", "drop", "explorer")).toBe("refer");
    expect(reaches("right", "click", "empty")).toBe("create");
  });

});

describe("row composition", () => {
  /** A layer with a block and a reference standing in for another. */
  function layered(): Graph {
    const layer = element("layer", { id: "L", parent: ROOT, form: "block" });
    const a = element("pump", { id: "a", parent: "L", form: "block", type: "def_1" });
    const stand = element("", {
      id: "p1", parent: "L", form: "proxy", of: refTo("elsewhere", "proj_other"),
    });

    return {
      ...EMPTY,
      defs: { def_1: { id: "def_1", name: "Part", form: "block", fields: [] } },
      elements: { ...EMPTY.elements, L: layer, a, p1: stand },
    };
  }

  it("lists every block and reference, and marks a reference as one", () => {
    const graph = layered();
    const rows = rowsOf(graph, "L");

    expect(rows.map((r) => r.id).sort()).toEqual(["a", "p1"].sort());
    expect(rows.find((r) => r.id === "a")?.form).toBe("block");
    expect(rows.find((r) => r.id === "a")?.name).toBe("pump");
    expect(rows.find((r) => r.id === "a")?.type).toBeTruthy();
    expect(rows.find((r) => r.id === "p1")?.form).toBe("proxy");
    expect(rows.find((r) => r.id === "p1")?.type).toBe("");
    expect(rows.find((r) => r.id === "p1")?.name).toBe("closed");
  });

  it("shows a cross-project reference's target name when that project is open", () => {
    const graph = layered();
    const elsewhere = element("valve", { id: "elsewhere", parent: null, form: "block" });
    const open = {
      proj_other: { ...EMPTY, elements: { ...EMPTY.elements, elsewhere } },
    };

    const rows = rowsOf(graph, "L", open);

    expect(rows.find((r) => r.id === "p1")?.name).toBe("valve");
  });

  it("is empty for a layer that holds nothing", () => {
    expect(rowsOf(EMPTY, ROOT)).toEqual([]);
  });

  it("lists the definition names present for the types chrome", () => {
    const rows = rowsOf(layered(), "L");

    expect(kindsOf(rows)).toContain("Part");
    expect(kindsOf(rows).every((name) => name.length > 0)).toBe(true);
  });

  it("builds a crumb trail from the open layer up to the project", () => {
    const trail = trailOf(layered(), "L");

    expect(trail[trail.length - 1]).toBe("L");
    expect(trail.length).toBeGreaterThan(0);
  });
});
