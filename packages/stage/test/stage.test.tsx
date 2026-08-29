/** The stage, driven on its own.
 *
 *  What is pinned: the left button works what is there and the right button
 *  makes something new, every gesture leaves as an action name, and the stage
 *  writes nothing itself. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { fold } from "@mnd/core";
import { related } from "@mnd/fixtures";
import { block, type Scene } from "@mnd/views";
import { Stage } from "../src/index";

afterEach(cleanup);
beforeEach(() => { vi.spyOn(window, "prompt").mockReturnValue("Typed"); });

const PAD = 48;

function mount(over: Partial<Parameters<typeof Stage>[0]> = {}) {
  const graph = fold(related());
  const scene = block.project(graph, "block_loop");
  const onAct = vi.fn();
  const onPick = vi.fn();
  const view = render(
    <Stage scene={scene} picked={[]} onAct={onAct} onPick={onPick} {...over} />,
  );
  return { ...view, scene, graph, onAct, onPick };
}

/** Click a point in scene coordinates, the way a viewer maps one. */
function at(view: { container: HTMLElement }, scene: Scene,
            p: { x: number; y: number },
            opts: { button?: number; double?: boolean; on?: Element } = {}) {
  /** **The drawing, by its own class** — the chrome around it draws marks of
   *  its own, so the first `svg` on the page is not necessarily the scene. */
  const svg = view.container.querySelector("svg.scene")!;
  const w = Math.max(scene.bounds.w, 200) + PAD * 2;
  const h = Math.max(scene.bounds.h, 200) + PAD * 2;
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: w, height: h,
    right: w, bottom: h, x: 0, y: 0, toJSON: () => ({}) });
  /** The stub box is square with the viewBox, so the mapping is one to one. */
  const e = { clientX: p.x + w / 2, clientY: p.y + h / 2, button: opts.button ?? 0 };
  /** What the pointer is **on** is its own question: a label sits inside the
   *  card it names, so where the click lands and what it lands on differ. */
  const target = opts.on ?? svg;
  if (opts.double) fireEvent.doubleClick(target, e);
  else fireEvent.pointerDown(target, e);
}

/** The frame's own name, as drawn — the one name on the stage. */
const frame_name = (view: { container: HTMLElement }) =>
  view.container.querySelector(".frame text")!;

const middle = (scene: Scene, id: string) => {
  const b = scene.boxes.find((x) => x.id === id)!;
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
};

describe("the left button works what is already there", () => {
  it("picks what was clicked", () => {
    const view = mount();
    at(view, view.scene, middle(view.scene, "block_pump"));
    expect(view.onPick).toHaveBeenCalledWith(["block_pump"]);
  });

  it("clears the selection on empty space", () => {
    const view = mount();
    at(view, view.scene, { x: view.scene.bounds.w / 2 - 4, y: view.scene.bounds.h / 2 - 4 });
    expect(view.onPick).toHaveBeenCalledWith([]);
  });

  it("descends into a card on a double click", () => {
    const view = mount();
    at(view, view.scene, middle(view.scene, "block_pump"), { double: true });
    expect(view.onAct).toHaveBeenCalledWith("open", { id: "block_pump" });
  });

  /** The one place two clicks mean edit rather than descend, and it is a name
   *  rather than a card — so renaming a block is done from inside it. */
  it("renames the layer on a double click on the frame's name", () => {
    const view = mount();
    at(view, view.scene, middle(view.scene, "block_pump"),
       { double: true, on: frame_name(view) });
    expect(view.onAct).toHaveBeenCalledWith("rename",
      { id: "block_loop", label: "Typed" });
    expect(view.onAct).not.toHaveBeenCalledWith("open", expect.anything());
  });

  it("comes back out on a double click outside", () => {
    const view = mount();
    at(view, view.scene, { x: view.scene.bounds.w / 2 - 4, y: view.scene.bounds.h / 2 - 4 },
       { double: true });
    expect(view.onAct).toHaveBeenCalledWith("up");
  });
});

describe("the right button makes something new", () => {
  it("creates where you pointed, and carries the spot", () => {
    const view = mount();
    at(view, view.scene, { x: view.scene.bounds.w / 2 - 4, y: view.scene.bounds.h / 2 - 4 },
       { button: 2 });
    expect(view.onAct).toHaveBeenCalledWith("create",
      expect.objectContaining({ label: "Typed", spot: expect.anything() }));
  });

  it("makes nothing when the name is abandoned", () => {
    vi.spyOn(window, "prompt").mockReturnValue(null);
    const view = mount();
    at(view, view.scene, { x: view.scene.bounds.w / 2 - 4, y: view.scene.bounds.h / 2 - 4 },
       { button: 2 });
    expect(view.onAct).not.toHaveBeenCalled();
  });

  it("relates one card to another when dragged between them", () => {
    const view = mount();
    /** **The drawing, by its own class** — the chrome around it draws marks of
   *  its own, so the first `svg` on the page is not necessarily the scene. */
  const svg = view.container.querySelector("svg.scene")!;
    const w = view.scene.bounds.w + PAD * 2;
    const h = view.scene.bounds.h + PAD * 2;
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: w, height: h,
      right: w, bottom: h, x: 0, y: 0, toJSON: () => ({}) });
    const a = middle(view.scene, "block_pump");
    const b = middle(view.scene, "block_valve");
    fireEvent.pointerDown(svg, { clientX: a.x + w / 2, clientY: a.y + h / 2, button: 2 });
    fireEvent.pointerUp(svg, { clientX: b.x + w / 2, clientY: b.y + h / 2, button: 2 });
    expect(view.onAct).toHaveBeenCalledWith("relate",
      { from: "block_pump", to: "block_valve" });
  });
});

describe("the keyboard", () => {
  const press = (key: string, extra: Partial<KeyboardEventInit> = {}) =>
    fireEvent.keyDown(window, { key, ...extra });

  it("clears the selection on Escape", () => {
    const view = mount({ picked: ["block_pump"] });
    press("Escape");
    expect(view.onPick).toHaveBeenCalledWith([]);
  });

  it("renames the picked block on Enter", () => {
    const view = mount({ picked: ["block_pump"] });
    press("Enter");
    expect(view.onAct).toHaveBeenCalledWith("rename",
      { id: "block_pump", label: "Typed" });
  });

  it("deletes a block but unlinks a relation", () => {
    const one = mount({ picked: ["block_pump"] });
    press("Delete");
    expect(one.onAct).toHaveBeenCalledWith("delete", { id: "block_pump" });
    cleanup();

    const other = mount({ picked: ["edge_a"] });
    press("Backspace");
    expect(other.onAct).toHaveBeenCalledWith("unlink", { id: "edge_a" });
  });

  it("groups the selection", () => {
    const view = mount({ picked: ["block_pump", "block_valve"] });
    press("g", { ctrlKey: true });
    expect(view.onAct).toHaveBeenCalledWith("group",
      { members: ["block_pump", "block_valve"] });
  });

  it("selects everything on the layer", () => {
    const view = mount();
    press("a", { ctrlKey: true });
    expect(view.onPick).toHaveBeenCalledWith(view.scene.boxes.map((b) => b.id));
  });

  it("does nothing for a key it does not own", () => {
    const view = mount({ picked: ["block_pump"] });
    press("q");
    expect(view.onAct).not.toHaveBeenCalled();
  });
});

describe("the surrounds", () => {
  it("draws a crumb per layer, and climbs", () => {
    const view = mount();
    fireEvent.click(view.getByText("workspace"));
    expect(view.onAct).toHaveBeenCalledWith("open", { id: "ws" });
    fireEvent.click(view.getByTitle(/up one layer/));
    expect(view.onAct).toHaveBeenCalledWith("up");
  });

  it("says what the app is saying, in one place, and dismisses it", () => {
    const onSaid = vi.fn();
    const view = mount({ said: "that name is taken", onSaid });
    expect(view.container.textContent).toContain("that name is taken");
    fireEvent.click(view.getByTitle("dismiss"));
    expect(onSaid).toHaveBeenCalled();
  });

  it("says nothing when there is nothing to say", () => {
    expect(mount().container.querySelector(".strip")).toBeNull();
  });
});

describe("it writes nothing itself", () => {
  it("leaves the graph untouched whatever is done to it", () => {
    const view = mount();
    const before = structuredClone(view.graph);
    at(view, view.scene, middle(view.scene, "block_pump"));
    at(view, view.scene, middle(view.scene, "block_pump"), { double: true });
    fireEvent.keyDown(window, { key: "Delete" });
    expect(view.graph).toEqual(before);
  });
});
