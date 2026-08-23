/** The renderer proves it draws **any** well-formed Scene — including
 *  hand-written ones no view module would produce.
 *
 *  It never imports a view module's tests, and no view module imports these.
 *  When they meet in the app there is nothing left to discover. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, fireEvent } from "@testing-library/react";

afterEach(cleanup);
import { faults, EMPTY, type Mark, type Scene } from "@mnd/views";
import { SceneView, at_scene } from "../src/index";

/** Every mark a Scene may carry. The conformance test is the promise that
 *  whatever a view module marks, the renderer draws — so this list grows with
 *  the union and never lags it. */
const MARKS: Mark[] = ["container", "reference", "missing", "note", "group", "interface",
                       "derived", "in", "out", "lane", "lifeline", "control", "fork",
                       "join", "decision", "merge", "header", "cell", "filled", "turned"];

function box(id: string, marks: Mark[] = [], x = 0, y = 0) {
  return { id, x, y, w: 168, h: 36, label: id, marks };
}

/** Click a point in **scene** coordinates. The viewBox is centred on the
 *  origin and padded, which is the mapping a viewer does for real. */
const PAD = 48;
function fit(svg: SVGSVGElement, s: Scene) {
  const w = Math.max(s.bounds.w, 200) + PAD * 2;
  const h = Math.max(s.bounds.h, 200) + PAD * 2;
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: w, height: h,
    right: w, bottom: h, x: 0, y: 0, toJSON: () => ({}) });
  return { w, h };
}

const client = (s: Scene, at: { x: number; y: number }) => {
  const w = Math.max(s.bounds.w, 200) + PAD * 2;
  const h = Math.max(s.bounds.h, 200) + PAD * 2;
  return { clientX: at.x + w / 2, clientY: at.y + h / 2 };
};

export function press(svg: SVGSVGElement, s: Scene, at: { x: number; y: number }) {
  fit(svg, s);
  fireEvent.pointerDown(svg, { ...client(s, at), button: 0 });
}
export function move(svg: SVGSVGElement, s: Scene, at: { x: number; y: number }) {
  fit(svg, s);
  fireEvent.pointerMove(svg, { ...client(s, at), button: 0 });
}
export function release(svg: SVGSVGElement, s: Scene, at: { x: number; y: number }) {
  fit(svg, s);
  fireEvent.pointerUp(svg, { ...client(s, at), button: 0 });
}

function click_at(svg: SVGSVGElement, s: Scene, at: { x: number; y: number }): void {
  const w = Math.max(s.bounds.w, 200) + PAD * 2;
  const h = Math.max(s.bounds.h, 200) + PAD * 2;
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: w, height: h,
    right: w, bottom: h, x: 0, y: 0, toJSON: () => ({}) });
  fireEvent.pointerDown(svg, { clientX: at.x + w / 2, clientY: at.y + h / 2, button: 0 });
}

function scene(over: Partial<Scene> = {}): Scene {
  return { ...EMPTY, bounds: { w: 480, h: 320 }, ...over };
}

function draw(s: Scene) {
  expect(faults(s), "the fixture scene is not well-formed").toEqual([]);
  return render(<SceneView scene={s} />);
}

describe("every element kind draws", () => {
  it.each(MARKS)("a box marked %s", (mark) => {
    const { container } = draw(scene({
      boxes: [box("a", [mark])],
      hits: [{ on: "a", kind: "box", region: { x: 0, y: 0, w: 168, h: 36 } }],
    }));
    expect(container.querySelector(`.card.${mark}`)).not.toBeNull();
  });

  it.each(["line", "directed", "reference", "tie"] as const)("a route of module %s", (module) => {
    const { container } = draw(scene({
      boxes: [box("a"), box("b", [], 300, 0)],
      routes: [{ id: "r", from: "a", to: "b", module, dir: "none",
                 points: [{ x: 168, y: 18 }, { x: 300, y: 18 }] }],
      hits: [{ on: "r", kind: "route", region: { x: 160, y: 10, w: 150, h: 16 } }],
    }));
    expect(container.querySelector(`.route.${module}`)).not.toBeNull();
  });

  it("a route with many bends", () => {
    const { container } = draw(scene({
      boxes: [box("a"), box("b", [], 300, 200)],
      routes: [{ id: "r", from: "a", to: "b", module: "line", dir: "none", points: [
        { x: 168, y: 18 }, { x: 240, y: 18 }, { x: 240, y: 218 }, { x: 300, y: 218 }] }],
      hits: [],
    }));
    expect(container.querySelector(".route path")?.getAttribute("d")).toContain("L");
  });

  it("arrowheads on a directed route, and both ways when told", () => {
    const both = scene({
      boxes: [box("a"), box("b", [], 300, 0)],
      routes: [{ id: "r", from: "a", to: "b", module: "line", dir: "both",
                 points: [{ x: 168, y: 18 }, { x: 300, y: 18 }] }],
      hits: [],
    });
    const { container } = draw(both);
    const path = container.querySelector(".route path")!;
    expect(path.getAttribute("marker-end")).toBeTruthy();
    expect(path.getAttribute("marker-start")).toBeTruthy();
  });

  it("a route's label where it carries one", () => {
    const { container } = draw(scene({
      boxes: [box("a"), box("b", [], 300, 0)],
      routes: [{ id: "r", from: "a", to: "b", module: "line", dir: "none", label: "depends on",
                 points: [{ x: 168, y: 18 }, { x: 300, y: 18 }] }],
      hits: [],
    }));
    expect(container.textContent).toContain("depends on");
  });

  it("an empty scene, without throwing", () => {
    const { container } = render(<SceneView scene={scene()} />);
    expect(container.querySelector(".scene")).not.toBeNull();
  });
});

describe("every hit binds", () => {
  const s = scene({
    boxes: [box("a"), box("b", [], 300, 0)],
    routes: [{ id: "r", from: "a", to: "b", module: "line", dir: "none",
               points: [{ x: 168, y: 18 }, { x: 300, y: 18 }] }],
    hits: [
      { on: "a", kind: "box", region: { x: 0, y: 0, w: 168, h: 36 } },
      { on: "r", kind: "route", region: { x: 168, y: 12, w: 132, h: 12 } },
    ],
  });

  function click(button = 0, count: 1 | 2 = 1) {
    const onGesture = vi.fn();
    const { container } = render(<SceneView scene={s} onGesture={onGesture} />);
    const svg = container.querySelector("svg")!;
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: s.bounds.w + 96,
      height: s.bounds.h + 96, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) });
    const at = { clientX: (s.bounds.w + 96) / 2, clientY: (s.bounds.h + 96) / 2, button };
    if (count === 2) fireEvent.doubleClick(svg, at);
    else fireEvent.pointerDown(svg, at);
    return onGesture;
  }

  it("names what was meant and writes nothing", () => {
    const got = click();
    expect(got).toHaveBeenCalledOnce();
    expect(got.mock.calls[0]![0]).toMatchObject({ button: "left", count: 1 });
  });

  it("tells the right button from the left", () => {
    expect(click(2).mock.calls[0]![0].button).toBe("right");
  });

  it("tells a double click from a single one", () => {
    expect(click(0, 2).mock.calls[0]![0].count).toBe(2);
  });

  it("reports empty where nothing is under the pointer", () => {
    const onGesture = vi.fn();
    const { container } = render(<SceneView scene={scene()} onGesture={onGesture} />);
    const svg = container.querySelector("svg")!;
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100,
      right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerDown(svg, { clientX: 50, clientY: 50, button: 0 });
    expect(onGesture.mock.calls[0]![0]).toMatchObject({ on: null, kind: "empty" });
  });

  it("picks the innermost thing when two regions overlap", () => {
    const nested = scene({
      boxes: [box("outer", ["group"]), box("inner", [], 20, 8)],
      hits: [
        { on: "outer", kind: "box", region: { x: -100, y: -60, w: 400, h: 200 } },
        { on: "inner", kind: "box", region: { x: 20, y: 8, w: 168, h: 36 } },
      ],
    });
    const onGesture = vi.fn();
    const { container } = render(<SceneView scene={nested} onGesture={onGesture} />);
    click_at(container.querySelector("svg")!, nested, { x: 60, y: 20 });
    expect(onGesture.mock.calls[0]![0].on).toBe("inner");
  });

  it("reports the position a gesture landed on, in scene coordinates", () => {
    const onGesture = vi.fn();
    const { container } = render(<SceneView scene={s} onGesture={onGesture} />);
    click_at(container.querySelector("svg")!, s, { x: 40, y: 12 });
    const at = onGesture.mock.calls[0]![0].at;
    expect(at.x).toBeCloseTo(40, 0);
    expect(at.y).toBeCloseTo(12, 0);
  });
});

describe("the pointer maps into the scene", () => {
  const view = { x: -100, y: -100, w: 200, h: 200 };

  it("reads the middle as the middle, whatever the element's shape", () => {
    for (const box of [{ left: 0, top: 0, width: 200, height: 200 },
                       { left: 0, top: 0, width: 800, height: 200 },
                       { left: 0, top: 0, width: 200, height: 800 },
                       { left: 37, top: 91, width: 613, height: 219 }]) {
      const at = at_scene(view, box, box.left + box.width / 2, box.top + box.height / 2);
      expect(at.x, `${box.width}x${box.height}`).toBeCloseTo(0, 6);
      expect(at.y, `${box.width}x${box.height}`).toBeCloseTo(0, 6);
    }
  });

  it("accounts for the bars a wide element leaves down its sides", () => {
    /** 800x200 over a square scene: the drawing is 200 wide, centred, so the
     *  left edge of the element is well outside the scene. */
    const box = { left: 0, top: 0, width: 800, height: 200 };
    expect(at_scene(view, box, 0, 100).x).toBeLessThan(view.x);
    expect(at_scene(view, box, 300, 100).x).toBeCloseTo(-100, 6);
    expect(at_scene(view, box, 500, 100).x).toBeCloseTo(100, 6);
  });

  it("keeps the scale square, so nothing is stretched on one axis", () => {
    const box = { left: 0, top: 0, width: 800, height: 200 };
    const a = at_scene(view, box, 400, 100);
    const b = at_scene(view, box, 420, 120);
    expect(b.x - a.x).toBeCloseTo(b.y - a.y, 6);
  });
});

describe("what is picked reads as picked", () => {
  it("marks a picked box and a picked route", () => {
    const s = scene({
      boxes: [box("a"), box("b", [], 300, 0)],
      routes: [{ id: "r", from: "a", to: "b", module: "line", dir: "none",
                 points: [{ x: 168, y: 18 }, { x: 300, y: 18 }] }],
      hits: [],
    });
    const { container } = render(<SceneView scene={s} picked={["a", "r"]} />);
    expect(container.querySelector(".card.picked")).not.toBeNull();
    expect(container.querySelector(".route.picked")).not.toBeNull();
  });

  it("lights a drop target while a drag is under way, and lets go after", () => {
    const s = scene({
      boxes: [box("a"), box("b", [], 260, 0)],
      hits: [{ on: "a", kind: "box", region: { x: 0, y: 0, w: 168, h: 36 } },
             { on: "b", kind: "box", region: { x: 260, y: 0, w: 168, h: 36 } }],
    });
    const { container } = render(<SceneView scene={s} onDrag={vi.fn()} />);
    const svg = container.querySelector("svg")!;
    press(svg, s, { x: 80, y: 18 });
    move(svg, s, { x: 340, y: 18 });
    expect(container.querySelector(".card.over")).not.toBeNull();
    expect(container.querySelector(".card.moving")).not.toBeNull();
    release(svg, s, { x: 340, y: 18 });
    expect(container.querySelector(".card.over")).toBeNull();
    expect(container.querySelector(".card.moving")).toBeNull();
  });
});

describe("a left drag is an adjustment, and never a mutation", () => {
  const two = scene({
    boxes: [box("a"), box("b", [], 300, 0)],
    hits: [{ on: "a", kind: "box", region: { x: 0, y: 0, w: 168, h: 36 } },
           { on: "b", kind: "box", region: { x: 300, y: 0, w: 168, h: 36 } }],
  });

  function drag(s: Scene, from: { x: number; y: number }, to: { x: number; y: number }) {
    const onDrag = vi.fn();
    const { container } = render(<SceneView scene={s} onDrag={onDrag} />);
    const svg = container.querySelector("svg")!;
    press(svg, s, from);
    move(svg, s, to);
    release(svg, s, to);
    return onDrag;
  }

  it("moves a card, and says what it came to rest over", () => {
    const got = drag(two, { x: 80, y: 18 }, { x: 380, y: 18 });
    expect(got.mock.calls[0]![0]).toMatchObject({ kind: "move", on: "a", over: "b" });
  });

  it("moves a card to empty space, over nothing", () => {
    const got = drag(two, { x: 80, y: 18 }, { x: 80, y: 200 });
    expect(got.mock.calls[0]![0]).toMatchObject({ kind: "move", on: "a", over: null });
  });

  it("sweeps a selection from empty space, catching what it encloses whole", () => {
    const got = drag(two, { x: -40, y: -40 }, { x: 200, y: 80 });
    expect(got.mock.calls[0]![0]).toMatchObject({ kind: "sweep", caught: ["a"] });
  });

  it("catches nothing it merely brushes", () => {
    const got = drag(two, { x: -40, y: -40 }, { x: 100, y: 80 });
    expect(got.mock.calls[0]![0].caught).toEqual([]);
  });

  it("drops on a box and never on the frame, however big the frame is", () => {
    const framed = scene({
      frame: { x: -200, y: -100, w: 800, h: 400, label: "Layer" },
      boxes: [box("a"), box("b", [], 300, 0)],
      hits: [{ on: "layer", kind: "frame", region: { x: -200, y: -100, w: 800, h: 400 } },
             { on: "a", kind: "box", region: { x: 0, y: 0, w: 168, h: 36 } },
             { on: "b", kind: "box", region: { x: 300, y: 0, w: 168, h: 36 } }],
    });
    /** Landing on empty space inside the frame is over nothing — otherwise
     *  every drop would read as a re-parent into the layer it is already in. */
    expect(drag(framed, { x: 80, y: 18 }, { x: 80, y: 250 }).mock.calls[0]![0].over).toBeNull();
    expect(drag(framed, { x: 80, y: 18 }, { x: 380, y: 18 }).mock.calls[0]![0].over).toBe("b");
  });

  it("never reads a card as dropped on itself", () => {
    const got = drag(two, { x: 20, y: 10 }, { x: 120, y: 28 });
    expect(got.mock.calls[0]![0].over).toBeNull();
  });

  it("is a click, not a drag, under the slop", () => {
    const got = drag(two, { x: 80, y: 18 }, { x: 82, y: 19 });
    expect(got).not.toHaveBeenCalled();
  });

  it("reports the drag and writes nothing of its own", () => {
    const before = structuredClone(two);
    drag(two, { x: 80, y: 18 }, { x: 380, y: 18 });
    expect(two).toEqual(before);
  });
});

describe("a seat and a wall are drags like any other", () => {
  /** Hand-written: no view module has to have produced it for the renderer to
   *  be asked to draw it. */
  const seated = scene({
    boxes: [box("a"), { id: "p", x: 162, y: 12, w: 11, h: 11, label: "port",
                        on: "a", marks: ["interface", "out"] }],
    hits: [{ on: "a", kind: "box", region: { x: 0, y: 0, w: 168, h: 36 } },
           { on: "p", kind: "seat", region: { x: 162, y: 12, w: 11, h: 11 } }],
  });

  const lined = scene({
    boxes: [box("a"), box("b", [], 300, 0)],
    routes: [{ id: "e", from: "a", to: "b", module: "line" as const, dir: "none" as const,
               points: [{ x: 168, y: 18 }, { x: 300, y: 18 }] }],
    hits: [{ on: "a", kind: "box", region: { x: 0, y: 0, w: 168, h: 36 } },
           { on: "b", kind: "box", region: { x: 300, y: 0, w: 168, h: 36 } },
           { on: "e", kind: "route", region: { x: 162, y: 12, w: 144, h: 12 } }],
  });

  function drag(s: Scene, from: { x: number; y: number }, to: { x: number; y: number },
                picked: string[] = []) {
    const onDrag = vi.fn();
    const { container } = render(<SceneView scene={s} onDrag={onDrag} picked={picked} />);
    const svg = container.querySelector("svg")!;
    press(svg, s, from);
    move(svg, s, to);
    release(svg, s, to);
    return onDrag;
  }

  it("draws a seated box with no label to spill out of it", () => {
    const { container } = render(<SceneView scene={seated} />);
    expect(container.querySelector(".card.interface title")?.textContent).toBe("port");
    expect(container.querySelector(".card.interface text")).toBeNull();
  });

  it("slides one along its edge rather than moving it", () => {
    const got = drag(seated, { x: 167, y: 17 }, { x: 84, y: -20 });
    expect(got.mock.calls[0]![0]).toMatchObject({ kind: "seat", on: "p" });
  });

  it("takes a picked line's end to another wall", () => {
    const got = drag(lined, { x: 168, y: 18 }, { x: 84, y: -20 }, ["e"]);
    expect(got.mock.calls[0]![0]).toMatchObject({ kind: "wall", on: "e", end: "from" });
  });

  it("offers no handle on a line nobody picked — picking is what asks for one", () => {
    const got = drag(lined, { x: 168, y: 18 }, { x: 84, y: -20 });
    expect(got.mock.calls[0]![0].kind).not.toBe("wall");
  });
});

describe("a label stops at the edge of what holds it", () => {
  it("clips a name too long for its card, and says the whole of it on hover", () => {
    const long = "a name far longer than the card that is meant to hold it";
    const s = scene({
      boxes: [{ ...box("a"), label: long }],
      hits: [{ on: "a", kind: "box", region: { x: 0, y: 0, w: 168, h: 36 } }],
    });
    const { container } = draw(s);
    expect(container.querySelector(".card text")?.getAttribute("clip-path")).toContain("clip-a");
    expect(container.querySelector("clipPath#clip-a")).not.toBeNull();
    expect(container.querySelector(".card title")?.textContent).toBe(long);
  });

  it("turns a label that has to be read up its box", () => {
    const s = scene({
      boxes: [{ ...box("a"), marks: ["header", "turned"] }],
      hits: [{ on: "a", kind: "field", region: { x: 0, y: 0, w: 168, h: 36 } }],
    });
    const { container } = draw(s);
    expect(container.querySelector(".card text")?.getAttribute("transform"))
      .toContain("rotate(-90");
  });
});
