/** The block view module's projection surface, gesture map and configured half.
 *
 *  The surface seam is settled for surround / viewport / chrome / asking.
 *  The map seam settles that a diagram declares its adjustments and binds
 *  gestures to actions. The configured half settles the claim that today's
 *  card is one configuration among others, and that relationships paint from
 *  `lookOf`. */

import { describe, expect, it } from "vitest";

import { lookup } from "../../../src/actions/index";
import "../../../src/actions/groups";
import { CELL } from "../../../src/geometry/layout";
import { cardOf, outline, PLAIN } from "../../../src/modules/card";
import { lookOf } from "../../../src/modules/style";
import { element, EMPTY, ROOT } from "../../../src/graph/types";
import type { Graph } from "../../../src/graph/types";
import {
  ADJUSTMENTS, BAND, CHROME, DEPTH, DIAGRAM, EDGES, LEAST, MAP, MARGIN, NOTE,
  NODES, edgesOf, extentOf, fill_args, floorOf, framed, laidOf, nodesOf, paint,
  reaches, restOf, stageOf, svgOf, takes, type OfferTarget,
} from "../../../src/modules/view/diagram/index";

describe("the block module's surface", () => {
  it("is the framed camera with the full chrome and a place to ask", () => {
    expect(DIAGRAM.surround).toBe("frame");
    expect(DIAGRAM.viewport).toBe("camera");
    expect(DIAGRAM.asks).toBe(true);
    expect([...DIAGRAM.chrome].sort()).toEqual([...CHROME].sort());
  });

});

describe("the block module's gesture map", () => {
  it("accepts every adjustment, and only the closed four", () => {
    expect([...MAP.adjustments].sort()).toEqual([...ADJUSTMENTS].sort());
    for (const name of MAP.adjustments) expect(ADJUSTMENTS).toContain(name);
    expect(takes("place")).toBe(true);
    expect(takes("size")).toBe(true);
    expect(takes("seat")).toBe(true);
    expect(takes("wall")).toBe(true);
  });

  it("declines an adjustment another map withholds", () => {
    const none = { ...MAP, adjustments: [] as const };

    expect(takes("place", none)).toBe(false);
    expect(takes("seat", none)).toBe(false);
  });

  it("binds right-click: create on empty, offer the list on what exists", () => {
    expect(reaches("right", "click", "empty")).toBe("create");
    expect(reaches("right", "click", "card")).toBe("offer");
    expect(reaches("right", "click", "frame")).toBe("offer");
    expect(reaches("right", "click", "edge")).toBe("offer");
    expect(reaches("right", "click", "selection")).toBe("offer");
    expect(reaches("right", "click", "name")).toBe("offer");
    expect(reaches("right", "click", "interface")).toBe("offer");
    expect(reaches("right", "click", "group")).toBe("offer");
    expect(reaches("right", "click", "note")).toBe("offer");
  });

  it("binds left navigation and placement", () => {
    expect(reaches("left", "double", "card")).toBe("open");
    expect(reaches("left", "double", "outside")).toBe("up");
    expect(reaches("left", "drag", "card")).toBe("place");
    expect(reaches("left", "drag", "note")).toBe("place");
    expect(reaches("left", "drop", "explorer")).toBe("refer");
    expect(reaches("left", "drop", "chip")).toBe("move");
  });

  it("binds the keyboard shortcuts the canvas owns", () => {
    expect(reaches("key", "Escape", "any")).toBe("abandon");
    expect(reaches("key", "Enter", "card")).toBe("rename");
    expect(reaches("key", "G", "any")).toBe("group");
    expect(reaches("key", "A", "any")).toBe("selection");
    expect(reaches("key", "F", "any")).toBe("fit");
    expect(reaches("key", "Delete", "any")).toBe("delete");
  });

});

describe("offer fill_args", () => {
  it("never fills optional into with a non-group focus", () => {
    const a = element("A", { id: "a", parent: null });
    const b = element("B", { id: "b", parent: null, x: 40 });
    const graph: Graph = { ...EMPTY, elements: { ...EMPTY.elements, a, b } };
    const action = lookup("group")!;
    const targets: OfferTarget[] = [
      { kind: "selection", id: "", members: ["a", "b"] },
      { kind: "card", id: "a", members: ["a", "b"] },
    ];

    for (const target of targets) {
      const picked = target.kind === "selection" ? null : { kind: "node" as const, id: target.id };
      const args = fill_args(action, { graph, view: null, picked }, target);
      expect(args.into == null || graph.elements[String(args.into)]?.form === "group").toBe(true);
      expect(Array.isArray(args.members) && (args.members as string[]).length > 0).toBe(true);
    }
  });

  it("fills into when the target is already a group", () => {
    const a = element("A", { id: "a", parent: null });
    const g = element("", { id: "g", form: "group", parent: null });
    const graph: Graph = { ...EMPTY, elements: { ...EMPTY.elements, a, g } };
    const action = lookup("group")!;
    const target: OfferTarget = { kind: "group", id: "g", members: ["a"] };
    const args = fill_args(
      action,
      { graph, view: null, picked: { kind: "node", id: "g" } },
      target,
    );

    expect(args.into).toBe("g");
  });
});

describe("the surround", () => {
  it("sizes a frame onto the grid, never smaller than the floor", () => {
    const box = framed([{ x: 0, y: 0, w: 100, h: 80 }], { w: 800, h: 600 });

    expect(box.w).toBeGreaterThanOrEqual(LEAST.w);
    expect(box.h).toBeGreaterThanOrEqual(LEAST.h);
    // On the lattice the cards use.
    expect(Math.abs(box.x % CELL)).toBe(0);
    expect(Math.abs(box.y % CELL)).toBe(0);
    expect(Math.abs(box.w % CELL)).toBe(0);
    expect(Math.abs(box.h % CELL)).toBe(0);
  });

  it("keeps the band and margin as the frame's own constants", () => {
    expect(BAND).toBeGreaterThan(0);
    expect(MARGIN).toBeGreaterThan(0);
  });
});

describe("the viewport", () => {
  it("floors zoom so the frame fits with the band", () => {
    const frame = { x: 0, y: 0, w: 520, h: 320 };
    const floor = floorOf(frame, [], { w: 800, h: 600 });
    const rest = restOf(floor, frame, [], { w: 800, h: 600 });

    expect(floor).toBeGreaterThan(0);
    expect(rest?.zoom).toBe(floor);
  });

  it("extends past the frame just far enough to push a card up", () => {
    const frame = { x: 0, y: 0, w: 520, h: 320 };
    const [[x0, y0], [x1, y1]] = extentOf(frame, []);

    expect(x0).toBeLessThan(frame.x);
    expect(y0).toBeLessThan(frame.y);
    expect(x1).toBeGreaterThan(frame.x + frame.w);
    expect(y1).toBeGreaterThan(frame.y + frame.h);
  });
});

describe("the configured half", () => {
  it("maps every drawn form to a renderer", () => {
    expect(Object.keys(NODES).sort()).toEqual(["card", "frame", "note", "region"].sort());
    expect(Object.keys(EDGES)).toEqual(["wire"]);
    // memo() wraps components as objects; presence is the contract.
    for (const draw of [...Object.values(NODES), ...Object.values(EDGES)]) {
      expect(draw).toBeTruthy();
    }
  });

  it("reads the plain card as the default composition", () => {
    const held = element("a thing", { id: "b1", type: "" });
    const graph: Graph = { ...EMPTY, elements: { ...EMPTY.elements, b1: held } };

    expect(cardOf(graph, held)).toEqual(PLAIN);
    expect(outline(PLAIN.shape, { w: 100, h: 40 }).kind).toBe("rect");
  });

  it("paints from lookOf, and a reference still overrides", () => {
    const held = element("", { id: "e1", type: "def_1" });
    const graph: Graph = {
      ...EMPTY,
      defs: {
        def_1: {
          id: "def_1", name: "satisfy", form: "line", fields: [],
          color: "#abc", line: "dashed", head: "open",
        },
      },
      elements: { ...EMPTY.elements, e1: held },
    };
    const look = lookOf(graph, held);
    const own = paint(look, false);
    const away = paint(look, true);

    expect(own.stroke).toBe(look.color);
    expect(own.dash).toBeDefined();
    expect(own.head("forward")).toBeTruthy();
    // Derived presentation wins over the definition's look.
    expect(away.stroke).not.toBe(own.stroke);
    expect(away.dash).toBeDefined();
  });
});

describe("layer list composition", () => {
  /** Two cards in a layer, related — enough to exercise stage, seats and lists. */
  function layered(): Graph {
    const layer = element("layer", { id: "L", parent: ROOT, form: "block" });
    const a = element("a", { id: "a", parent: "L", form: "block", x: 0, y: 0 });
    const b = element("b", { id: "b", parent: "L", form: "block", x: 200, y: 0 });

    return {
      ...EMPTY,
      elements: { ...EMPTY.elements, L: layer, a, b },
      edges: {
        e1: {
          id: "e1", source: "a", target: "b", type: "", form: "line", dir: "forward",
        },
      },
    };
  }

  it("stages a box for every member, and sizes notes at least to NOTE", () => {
    expect(NOTE.w).toBeGreaterThan(0);
    expect(NOTE.h).toBeGreaterThan(0);

    const graph = layered();
    const stage = stageOf(graph, "L", { w: 800, h: 600 });

    expect(stage.members.map((m) => m.id).sort()).toEqual(["a", "b"]);
    for (const id of ["a", "b"]) {
      expect(stage.boxes[id].w).toBeGreaterThan(0);
      expect(stage.boxes[id].h).toBeGreaterThan(0);
    }
    expect(stage.frameBox).not.toBeNull();
  });

  it("stacks nodes in depth order and paints a wire for each drawn edge", () => {
    const graph = layered();
    const stage = stageOf(graph, "L", { w: 800, h: 600 });
    const laid = laidOf(graph, stage, "L", "none", false, () => true);
    const noop = () => {};
    const nodes = nodesOf(graph, "L", stage, laid, {
      unit: "block", axis: "none", showPorts: false, picked: null, grazed: null,
      dropping: null, joining: [], litSeats: new Set(), litEdges: new Set(),
      onPick: noop, onOpen: noop, onSlidePort: noop, onRename: noop,
      onNameAttr: noop, onSize: noop, onNameTaken: () => false, onSay: noop,
      onPromotePort: noop,
    });
    const edges = edgesOf(graph, "L", stage, laid, false, null, () => true);

    expect(DEPTH.frame).toBeLessThan(DEPTH.group);
    expect(DEPTH.group).toBeLessThan(DEPTH.card);
    expect(DEPTH.card).toBeLessThan(DEPTH.note);
    expect(DEPTH.note).toBeLessThan(DEPTH.edge);

    expect(nodes.some((n) => n.type === "frame" && n.zIndex === DEPTH.frame)).toBe(true);
    expect(nodes.filter((n) => n.type === "card")).toHaveLength(2);
    for (const card of nodes.filter((n) => n.type === "card")) {
      expect(card.zIndex).toBe(DEPTH.card);
    }
    expect(edges.some((e) => e.id === "e1" && e.type === "wire")).toBe(true);
    expect(laid.runs.e1).toBeTruthy();
  });
});

describe("SVG export of a layer", () => {
  function layered(): Graph {
    const layer = element("layer", { id: "L", parent: ROOT, form: "block" });
    const a = element("a", { id: "a", parent: "L", form: "block", x: 0, y: 0 });
    const b = element("b", { id: "b", parent: "L", form: "block", x: 200, y: 0 });

    return {
      ...EMPTY,
      elements: { ...EMPTY.elements, L: layer, a, b },
      edges: {
        e1: {
          id: "e1", source: "a", target: "b", type: "", form: "line", dir: "forward",
        },
      },
    };
  }

  it("emits an svg root with a card per member and a run per edge", () => {
    const markup = svgOf(layered(), "L");

    expect(markup.startsWith("<svg ")).toBe(true);
    expect(markup).toContain('data-kind="card"');
    expect(markup).toContain('data-id="a"');
    expect(markup).toContain('data-id="b"');
    expect(markup).toContain('data-kind="edge"');
    expect(markup).toContain('data-id="e1"');
    // Not a React Flow tree — plain SVG elements only.
    expect(markup).not.toContain("react-flow");
  });

  it("still returns an svg when the layer is empty", () => {
    const markup = svgOf(EMPTY, ROOT);

    expect(markup.startsWith("<svg ")).toBe(true);
    expect(markup).toContain("</svg>");
  });
});
