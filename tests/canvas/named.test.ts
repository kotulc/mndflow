/** Cross-project naming — `shownName` and `stoodFor`. */

import { describe, expect, it } from "vitest";

import { element, EMPTY, ROOT, refTo } from "../../src/graph/types";
import { shownName, stoodFor } from "../../src/canvas/named";

describe("cross-project naming", () => {
  it("reads a bare reference through the local fold", () => {
    const target = element("pump", { id: "a", parent: null, form: "block" });
    const stand = element("", { id: "p1", parent: "L", form: "proxy", of: "a" });
    const layer = element("layer", { id: "L", parent: ROOT, form: "block" });
    const graph = {
      ...EMPTY,
      elements: { ...EMPTY.elements, L: layer, a: target, p1: stand },
    };

    expect(shownName(graph, {}, stand)).toBe("pump");
    expect(stoodFor(graph, {}, "p1")?.id).toBe("a");
  });

  it("reads a foreign path when that project is open", () => {
    const layer = element("layer", { id: "L", parent: ROOT, form: "block" });
    const stand = element("", {
      id: "p1", parent: "L", form: "proxy", of: refTo("valve", "proj_b"),
    });
    const graph = {
      ...EMPTY,
      elements: { ...EMPTY.elements, L: layer, p1: stand },
    };
    const open = {
      proj_b: {
        ...EMPTY,
        elements: {
          ...EMPTY.elements,
          valve: element("valve", { id: "valve", parent: null, form: "block" }),
        },
      },
    };

    expect(shownName(graph, open, stand)).toBe("valve");
    expect(stoodFor(graph, open, "p1")?.id).toBe("valve");
  });

  it("draws missing when the target project is not open", () => {
    const layer = element("layer", { id: "L", parent: ROOT, form: "block" });
    const stand = element("", {
      id: "p1", parent: "L", form: "proxy", of: refTo("valve", "proj_closed"),
    });
    const graph = {
      ...EMPTY,
      elements: { ...EMPTY.elements, L: layer, p1: stand },
    };

    expect(shownName(graph, {}, stand)).toBe("missing");
    expect(stoodFor(graph, {}, "p1")).toBeUndefined();
  });
});
