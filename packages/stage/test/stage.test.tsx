/** The stage, driven on its own. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { fold } from "@mnd/core";
import { FLOOR, gridded, related } from "@mnd/fixtures";
import { project } from "@mnd/views";
import { Stage } from "../src/index";

afterEach(cleanup);
beforeEach(() => { vi.spyOn(window, "prompt").mockReturnValue("Typed"); });

function mount(over: Partial<Parameters<typeof Stage>[0]> = {}) {
  const graph = fold(related(), FLOOR);
  const scene = project(graph, "block_loop");
  const onAct = vi.fn();
  const onPick = vi.fn();
  const view = render(
    <Stage scene={scene} graph={graph} picked={[]} onAct={onAct} onPick={onPick} {...over} />,
  );
  return { ...view, scene, graph, onAct, onPick };
}

/** One card on the canvas, by the block it draws. */
const card = (view: { container: HTMLElement }, id: string) =>
  view.container.querySelector(`.react-flow__node[data-id="${id}"]`)!;

/** The ground: everywhere that is not a card. */
const ground = (view: { container: HTMLElement }) =>
  view.container.querySelector(".react-flow__pane")!;

/** The frame's own name — the one name drawn on the stage. */
const frame_name = (view: { container: HTMLElement }) =>
  view.container.querySelector(".mnd-frame-name")!;

/** The name that is open for typing, wherever it is drawn. */
const field = (view: { container: HTMLElement }) =>
  view.container.querySelector(".mnd-naming")!;

/** Typing a name in place: the field is the element the name was read from, and leaving it is what
 *  says the name was typed. */
function typing(el: Element, text: string) {
  el.textContent = text;
  fireEvent.blur(el);
}

/** A card says what it is without being read. */
describe("what a card wears", () => {
  /** The closed set of system marks: one to a card, and it says what the card stands in for. */
  const MARKS = ["reference", "definition", "package", "external"];
  const worn = (view: { container: HTMLElement }) =>
    Array.from(view.container.querySelectorAll(".react-flow__node .mnd-role"),
               (el) => el.getAttribute("data-role"));
  const stamped = (view: { container: HTMLElement }) =>
    Array.from(view.container.querySelectorAll(".react-flow__node .mnd-mark"),
               (el) => el.getAttribute("data-mark"));

  /** The top corner says what a card is; every card has one. */
  it("gives every card an icon for what it is", () => {
    const view = mount();
    expect(worn(view)).toContain("note");
    expect(worn(view)).toContain("group");
    expect(worn(view)).toContain("block");
    /** The frame is the block you are inside, and it is still one. */
    expect(view.container.querySelector(".mnd-frame .mnd-role")).toBeTruthy();
  });

  /** The bottom corner is the app's, and it is empty unless the card stands in for something. */
  it("marks only what a card stands in for", () => {
    const view = mount();
    expect(card(view, "block_pump").querySelector(".mnd-mark")).toBeNull();
    expect(card(view, "block_note").querySelector(".mnd-mark")).toBeNull();
    /** Holding parts is not a mark — the frame holds everything and wears none. */
    expect(view.container.querySelector(".mnd-frame .mnd-mark")).toBeNull();
    expect(stamped(view).every((m) => m !== null && MARKS.includes(m))).toBe(true);
  });

  /** Holding parts fills the card's own icon instead. */
  it("fills the icon of the layer you are inside", () => {
    const view = mount();
    expect(view.container.querySelector(".mnd-frame .mnd-role svg")?.getAttribute("fill"))
      .toBe("currentColor");
    expect(card(view, "block_pump").querySelector(".mnd-role svg")?.getAttribute("fill"))
      .toBe("none");
  });

  /** Never the word the mark already says. */
  it("drops the subtype word where the mark says the same thing", () => {
    const view = mount();
    for (const el of Array.from(view.container.querySelectorAll(".mnd-head"))) {
      const word = el.querySelector(".mnd-kind")?.textContent;
      const role = el.querySelector(".mnd-role")?.getAttribute("data-role");
      expect(word === undefined || word !== role).toBe(true);
    }
  });
});

describe("the left button works what is already there", () => {
  it("picks what was clicked", () => {
    const view = mount();
    fireEvent.click(card(view, "block_pump"));
    expect(view.onPick).toHaveBeenCalledWith(["block_pump"]);
  });

  it("reports a selection once, however many things it holds", () => {
    const view = mount();
    fireEvent.click(card(view, "block_pump"));
    const picks = view.onPick.mock.calls.filter((c) => c[0].length);
    expect(picks).toEqual([[["block_pump"]]]);
  });

  /** The canvas never reports back what it was told. */
  it("says nothing when the click changes nothing", () => {
    const view = mount({ picked: ["block_pump"] });
    view.onPick.mockClear();
    fireEvent.click(card(view, "block_pump"));
    expect(view.onPick).not.toHaveBeenCalled();
  });

  it("clears the selection on empty space", () => {
    const view = mount({ picked: ["block_pump"] });
    fireEvent.click(ground(view));
    expect(view.onPick).toHaveBeenCalledWith([]);
  });

  it("descends into a card on a double click", () => {
    const view = mount();
    fireEvent.doubleClick(card(view, "block_pump"));
    expect(view.onAct).toHaveBeenCalledWith("open", { id: "block_pump" });
  });

  /** Two clicks on the frame's name rename the layer. */
  it("renames the layer where its name is read", () => {
    const view = mount();
    fireEvent.doubleClick(frame_name(view));
    typing(field(view), "Typed");
    expect(view.onAct.mock.calls.filter((c) => c[0] === "rename"))
      .toEqual([["rename", { id: "block_loop", name: "Typed" }]]);
    expect(view.onAct).not.toHaveBeenCalledWith("open", expect.anything());
  });

  /** A name left unchanged writes nothing. */
  it("says nothing when a name is left as it was", () => {
    const view = mount();
    fireEvent.doubleClick(frame_name(view));
    fireEvent.blur(field(view));
    expect(view.onAct).not.toHaveBeenCalledWith("rename", expect.anything());
  });

  /** The band is a place, not an element. */
  it("comes back out on a double click in the band", () => {
    const view = mount();
    fireEvent.doubleClick(ground(view), { clientX: 9000, clientY: 9000 });
    expect(view.onAct).toHaveBeenCalledWith("open");
  });

  it("stays put on a double click inside the frame", () => {
    const view = mount();
    const f = view.scene.frame!;
    fireEvent.doubleClick(ground(view),
      { clientX: f.x + f.w / 2, clientY: f.y + f.h / 2 });
    expect(view.onAct).not.toHaveBeenCalledWith("open");
  });
});

/** Two things here need a real browser and are driven in one. */

describe("the keyboard", () => {
  const press = (key: string, extra: Partial<KeyboardEventInit> = {}) =>
    fireEvent.keyDown(window, { key, ...extra });

  it("clears the selection on Escape", () => {
    const view = mount({ picked: ["block_pump"] });
    press("Escape");
    expect(view.onPick).toHaveBeenCalledWith([]);
  });

  /** Descending has three ways in, and this is the one you can find. */
  it("descends into the picked block on Enter", () => {
    const view = mount({ picked: ["block_pump"] });
    press("Enter");
    expect(view.onAct).toHaveBeenCalledWith("open", { id: "block_pump" });
  });

  it("does not descend into a grid on a double click", () => {
    const graph = fold(gridded(), FLOOR);
    const scene = project(graph, "block_board");
    const onAct = vi.fn();
    const view = render(
      <Stage scene={scene} graph={graph} picked={[]} onAct={onAct} onPick={vi.fn()} />,
    );
    fireEvent.doubleClick(card(view, "block_lanes"));
    expect(onAct).not.toHaveBeenCalledWith("open", expect.anything());
    cleanup();
  });

  it("opens the picked block's name for typing on F2", () => {
    const view = mount({ picked: ["block_pump"] });
    press("F2");
    expect(card(view, "block_pump").querySelector(".mnd-naming")).toBeTruthy();
    typing(field(view), "Typed");
    expect(view.onAct).toHaveBeenCalledWith("rename",
      { id: "block_pump", name: "Typed" });
  });

  it("deletes everything picked, blocks and relations alike", () => {
    const one = mount({ picked: ["block_pump"] });
    press("Delete");
    expect(one.onAct).toHaveBeenCalledWith("delete", { ids: ["block_pump"] });
    cleanup();

    const many = mount({ picked: ["block_pump", "edge_a"] });
    press("Backspace");
    expect(many.onAct).toHaveBeenCalledWith("delete",
      { ids: ["block_pump", "edge_a"] });
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
    expect(view.onPick).toHaveBeenCalledWith(view.scene.nodes.map((n) => n.id));
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
    expect(view.onAct).toHaveBeenCalledWith("open");
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

describe("what the canvas draws", () => {
  it("draws one node per box, and the frame besides", () => {
    const view = mount();
    const drawn = view.container.querySelectorAll(".react-flow__node");
    expect(drawn.length).toBe(view.scene.nodes.length + 1);
    expect(view.container.querySelector(".mnd-frame")).not.toBeNull();
  });

  /** Every route is handed over and the heads are on the page. */
  it("hands every route to the canvas", () => {
    const view = mount();
    expect(view.scene.edges.length).toBeGreaterThan(0);
    expect(view.container.querySelector(".react-flow__edges")).not.toBeNull();
    expect(view.container.querySelector("#mnd-head-arrow")).not.toBeNull();
    expect(view.container.querySelector("#mnd-head-diamond")).not.toBeNull();
  });

  /** The viewport controls come with React Flow. */
  it("offers the viewport controls the library brings", () => {
    const view = mount();
    expect(view.container.querySelector(".react-flow__background")).not.toBeNull();
    expect(view.container.querySelectorAll(".react-flow__controls button").length)
      .toBeGreaterThan(0);
    /** No minimap: a layer is one screenful. */
    expect(view.container.querySelector(".react-flow__minimap")).toBeNull();
  });
});

describe("it writes nothing itself", () => {
  it("leaves the graph untouched whatever is done to it", () => {
    const view = mount();
    const before = structuredClone(view.graph);
    fireEvent.click(card(view, "block_pump"));
    fireEvent.doubleClick(card(view, "block_pump"));
    fireEvent.keyDown(window, { key: "Delete" });
    expect(view.graph).toEqual(before);
  });
});
