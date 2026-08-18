/** The block view module's projection surface, gesture map and configured half.
 *
 *  The surface seam is settled for surround / viewport / chrome / asking.
 *  The map seam settles that a diagram declares its adjustments and binds
 *  gestures to actions. The configured half settles the claim that today's
 *  card is one configuration among others, and that relationships paint from
 *  `lookOf`. */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { lookup } from "../../../src/actions/index";
import "../../../src/actions/groups";
import { note, read } from "../../../src/actions/feedback";
import type { Picked } from "../../../src/actions";
import { CELL } from "../../../src/geometry/layout";
import { cardOf, outline, PLAIN } from "../../../src/modules/card";
import { lookOf } from "../../../src/modules/style";
import { definition, edge, element, EMPTY, ROOT } from "../../../src/graph/types";
import type { Graph } from "../../../src/graph/types";
import {
  ADJUSTMENTS, BAND, candidatesFor, CHROME, DEPTH, DIAGRAM, EDGES, LEAST, MAP,
  MARGIN, noteTypePick, NOTE, NODES, edgesOf, extentOf, fill_args, floorOf,
  framed, laidOf, nodesOf, paint, PAPER, rankedTypes, reaches, restOf,
  shapeOf, stageOf, svgOf, takes, TYPE_CAP, type OfferTarget, type SvgLook,
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
          line: "dashed", head: "open",
          components: { style: { slot: "secondary", emphasis: "strong" } },
        },
      },
      elements: { ...EMPTY.elements, e1: held },
    };
    const look = lookOf(graph, held);
    const own = paint(look, false);
    const away = paint(look, true);

    // The slot the definition picked, resolved to a ramp step — never a colour.
    expect(own.stroke).toContain(look.slot);
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

  it("inlines the look it was handed, and never a variable", () => {
    const look: SvgLook = {
      frame: "#010203", band: "#040506", fill: "#070809",
      stroke: "#0a0b0c", ink: "#0d0e0f", route: "#101112",
    };
    const markup = svgOf(layered(), "L", look);

    // A file has no page, so nothing may leave as something to resolve later.
    expect(markup).not.toContain("var(--");
    // Every part this scene draws — a band needs a group, which it has none of.
    for (const part of ["frame", "fill", "stroke", "ink", "route"] as const) {
      expect(markup).toContain(look[part]);
    }
  });

  it("falls back to a look that reads on paper when handed none", () => {
    const markup = svgOf(layered(), "L");

    expect(markup).toContain(PAPER.fill);
    expect(markup).not.toContain("var(--");
  });

  it("still returns an svg when the layer is empty", () => {
    const markup = svgOf(EMPTY, ROOT);

    expect(markup.startsWith("<svg ")).toBe(true);
    expect(markup).toContain("</svg>");
  });
});

/** The list-of-types rule (docs/plan.md): what the selection strip, the edge
 *  menu and the relation-types group all rest on. Properties only — nothing
 *  here asserts a cap of three or a particular ranked position, since tuning
 *  is free to change either. */
describe("the list-of-types rule", () => {
  /** An in-memory localStorage so the suite does not need a browser — the
   *  same shape `tests/actions/feedback.test.ts` uses for the same store. */
  function memory(): Storage {
    const held = new Map<string, string>();

    return {
      get length() { return held.size; },
      clear() { held.clear(); },
      getItem(key: string) { return held.has(key) ? held.get(key)! : null; },
      setItem(key: string, value: string) { held.set(key, String(value)); },
      removeItem(key: string) { held.delete(key); },
      key(index: number) { return [...held.keys()][index] ?? null; },
    };
  }

  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: memory(), configurable: true, writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: undefined, configurable: true, writable: true,
    });
  });

  function vocab(): Graph {
    const block = element("A", { id: "a" });
    const kinds = [
      definition("Blockish", { id: "d1", form: "block" }),
      definition("Groupish", { id: "d2", form: "group" }),
      definition("Line", { id: "d3", form: "line" }),
      definition("Directed", { id: "d4", form: "directed" }),
    ];
    const e = edge("a", "a", { id: "e1" });

    return {
      ...EMPTY,
      elements: { ...EMPTY.elements, a: block },
      edges: { e1: e },
      defs: Object.fromEntries(kinds.map((d) => [d.id, d])),
    };
  }

  it("offers only element-form types for a node, only relation-form for an edge", () => {
    const graph = vocab();
    const node: Picked = { kind: "node", id: "a" };
    const line: Picked = { kind: "edge", id: "e1" };

    const elemPaths = candidatesFor(node, graph).map((c) => c.path);
    const edgePaths = candidatesFor(line, graph).map((c) => c.path);

    expect(elemPaths).toEqual(["d1", "d2"]);
    expect(edgePaths).toEqual(["d3", "d4"]);
    // The two families never overlap — a closed split, not a guess per node.
    expect(elemPaths.some((p) => edgePaths.includes(p))).toBe(false);
  });

  it("prefers a passed-in kinds list over the project's own defs for an edge", () => {
    const graph = vocab();
    const picked: Picked = { kind: "edge", id: "e1" };
    const given = [{ name: "Given", path: "pkg/given" }];

    expect(candidatesFor(picked, graph, given)).toEqual(given);
  });

  it("tells an edge, an interface and an ordinary element apart", () => {
    const graph = {
      ...vocab(),
      elements: {
        ...vocab().elements,
        p: element("P", { id: "p", side: "top", at: 0 }),
      },
    };
    const edgeShape = shapeOf({ kind: "edge", id: "e1" }, graph);
    const portShape = shapeOf({ kind: "node", id: "p" }, graph);
    const blockShape = shapeOf({ kind: "node", id: "a" }, graph);

    expect(new Set([edgeShape, portShape, blockShape]).size).toBe(3);
  });

  it("is deterministic and never collides with a bare action-ranking shape", () => {
    const graph = vocab();
    const picked: Picked = { kind: "node", id: "a" };

    expect(shapeOf(picked, graph)).toBe(shapeOf(picked, graph));
    // Action ranking's own shapes (feedback.shape_of) are bare form words.
    expect(shapeOf(picked, graph)).not.toBe("block");
  });

  it("falls back to the order candidates arrived in — vocabulary order cold", () => {
    const graph = vocab();
    const candidates = candidatesFor({ kind: "node", id: "a" }, graph);

    expect(rankedTypes(candidates, "retype:block").map((c) => c.path))
      .toEqual(candidates.map((c) => c.path));
  });

  it("ranks a learned preference first, and leaves the rest in place", () => {
    const graph = vocab();
    const candidates = candidatesFor({ kind: "node", id: "a" }, graph);
    const shape = shapeOf({ kind: "node", id: "a" }, graph);

    note({ chose: "d2", ranked: "d1", entry: "", shape });

    const ranked = rankedTypes(candidates, shape).map((c) => c.path);
    expect(ranked[0]).toBe("d2");
    expect(new Set(ranked)).toEqual(new Set(candidates.map((c) => c.path)));
  });

  it("never lets one shape's preference leak into another", () => {
    const graph = vocab();
    const candidates = candidatesFor({ kind: "node", id: "a" }, graph);

    note({ chose: "d2", ranked: "d1", entry: "", shape: "retype:edge" });

    expect(rankedTypes(candidates, "retype:block").map((c) => c.path))
      .toEqual(candidates.map((c) => c.path));
  });

  it("notes an overrule only when the pick was not what ranking put first", () => {
    const ranked = [{ path: "d1", name: "Blockish" }, { path: "d2", name: "Groupish" }];

    noteTypePick("retype:block", "d1", ranked);
    expect(read()).toHaveLength(0);

    noteTypePick("retype:block", "d2", ranked);
    expect(read()).toHaveLength(1);
    expect(read()[0]).toEqual({ chose: "d2", ranked: "d1", entry: "", shape: "retype:block" });
  });

  it("caps to a small, positive number of shown entries — expansion is what reveals the rest", () => {
    expect(TYPE_CAP).toBeGreaterThan(0);
    expect(TYPE_CAP).toBeLessThan(10);
  });
});
