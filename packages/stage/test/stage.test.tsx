/** The stage, driven on its own.
 *
 *  What is pinned: the left button works what is there and the right button
 *  makes something new, every gesture leaves as an action name, and the stage
 *  writes nothing itself.
 *
 *  **Nothing here computes a coordinate.** The canvas is React Flow's, so a
 *  card is found by the block it draws and clicked where it is — which is both
 *  closer to what a person does and immune to how anything is laid out. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { fold } from "@mnd/core";
import { related } from "@mnd/fixtures";
import { block } from "@mnd/views";
import { Stage } from "../src/index";

afterEach(cleanup);
beforeEach(() => { vi.spyOn(window, "prompt").mockReturnValue("Typed"); });

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

/** One card on the canvas, by the block it draws. React Flow puts the id on
 *  the node it renders, so nothing here has to know where anything sits. */
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

/** Typing a name in place: the field is the element the name was read from,
 *  and leaving it is what says the name was typed. */
function typing(el: Element, text: string) {
  el.textContent = text;
  fireEvent.blur(el);
}

/** **A card says what it is without being read.** One mark per sort of block,
 *  in the corner, and the same set the tree draws down its left edge. */
describe("what a card wears", () => {
  const worn = (view: { container: HTMLElement }) =>
    Array.from(view.container.querySelectorAll(".react-flow__node .mnd-role"),
               (el) => el.getAttribute("data-role"));

  it("marks every card, and the layer it is drawn in", () => {
    const view = mount();
    expect(worn(view)).toContain("note");
    expect(worn(view)).toContain("group");
    expect(worn(view)).toContain("block");
    /** The frame is the block you are inside, and it is still one. */
    expect(view.container.querySelector(".mnd-frame .mnd-role")).toBeTruthy();
  });

  /** **Never the word the mark already says.** A folder wearing the folder mark
   *  and the word *folder* says it twice. */
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

  /** **The canvas never reports back what it was told.**
   *
   *  Selection is held in two places — the app's log and React Flow's own copy
   *  — and every jam this canvas has had came from writing each one into the
   *  other. Clicking what is already picked changes nothing, so it must say
   *  nothing: a report here is the start of a round trip, and a round trip that
   *  begins with no news is a loop. */
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

  /** The one place two clicks mean edit rather than descend, and it is a name
   *  rather than a card — so renaming a block is done from inside it.
   *
   *  **A name is typed where it is read**: two clicks open the name itself, and
   *  what was typed is said once when it is left. */
  it("renames the layer where its name is read", () => {
    const view = mount();
    fireEvent.doubleClick(frame_name(view));
    typing(field(view), "Typed");
    expect(view.onAct.mock.calls.filter((c) => c[0] === "rename"))
      .toEqual([["rename", { id: "block_loop", label: "Typed" }]]);
    expect(view.onAct).not.toHaveBeenCalledWith("open", expect.anything());
  });

  /** A name left as it was is not a rename: it is a log entry and an undo step
   *  for a name that already read that way. */
  it("says nothing when a name is left as it was", () => {
    const view = mount();
    fireEvent.doubleClick(frame_name(view));
    fireEvent.blur(field(view));
    expect(view.onAct).not.toHaveBeenCalledWith("rename", expect.anything());
  });

  /** **The band is a place, not an element.** Two clicks land in it or they do
   *  not, and asking the browser which element the pair had in common answers
   *  *the ground* for two clicks on different cards — which used to take you up
   *  a layer when all you did was pick two things quickly. */
  it("comes back out on a double click in the band", () => {
    const view = mount();
    fireEvent.doubleClick(ground(view), { clientX: 9000, clientY: 9000 });
    expect(view.onAct).toHaveBeenCalledWith("up");
  });

  it("stays put on a double click inside the frame", () => {
    const view = mount();
    const f = view.scene.frame!;
    fireEvent.doubleClick(ground(view),
      { clientX: f.x + f.w / 2, clientY: f.y + f.h / 2 });
    expect(view.onAct).not.toHaveBeenCalledWith("up");
  });
});

/** **Two things here need a real browser and are driven in one.**
 *
 *  Making a block with the right button, and drawing a relationship between
 *  two cards, both go through React Flow's own pointer machinery — which reads
 *  handle positions off measured DOM. Nothing measures anything under
 *  happy-dom, so the library correctly declines to route an edge or to place a
 *  connection, and a test asserting otherwise would be asserting against the
 *  test environment rather than against the app.
 *
 *  This is the line `packages/README.md` already draws: the stage is **driven,
 *  not asserted**. What is left in this file is everything that holds without
 *  a viewport — which is most of it. */

describe("the keyboard", () => {
  const press = (key: string, extra: Partial<KeyboardEventInit> = {}) =>
    fireEvent.keyDown(window, { key, ...extra });

  it("clears the selection on Escape", () => {
    const view = mount({ picked: ["block_pump"] });
    press("Escape");
    expect(view.onPick).toHaveBeenCalledWith([]);
  });

  /** **Descending has three ways in, and this is the one you can find.** A
   *  double click is the same gesture as picking a card twice quickly, so it
   *  cannot be the only one. */
  it("descends into the picked block on Enter", () => {
    const view = mount({ picked: ["block_pump"] });
    press("Enter");
    expect(view.onAct).toHaveBeenCalledWith("open", { id: "block_pump" });
  });

  it("opens the picked block's name for typing on F2", () => {
    const view = mount({ picked: ["block_pump"] });
    press("F2");
    expect(card(view, "block_pump").querySelector(".mnd-naming")).toBeTruthy();
    typing(field(view), "Typed");
    expect(view.onAct).toHaveBeenCalledWith("rename",
      { id: "block_pump", label: "Typed" });
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

describe("what the canvas draws", () => {
  it("draws one node per box, and the frame besides", () => {
    const view = mount();
    const drawn = view.container.querySelectorAll(".react-flow__node");
    expect(drawn.length).toBe(view.scene.nodes.length + 1);
    expect(view.container.querySelector(".mnd-frame")).not.toBeNull();
  });

  /** The edge elements themselves need measured handles, so what is checked
   *  here is that every route was handed over — React Flow builds one arrow
   *  marker per marker kind it was actually given. */
  it("hands every route to the canvas", () => {
    const view = mount();
    expect(view.scene.edges.length).toBeGreaterThan(0);
    expect(view.container.querySelector(".react-flow__edges")).not.toBeNull();
    expect(view.container.querySelector(".react-flow__arrowhead")).not.toBeNull();
  });

  /** The viewport is React Flow's, and its presence is the whole point of it
   *  being React Flow's — none of this existed on the hand-rolled canvas. */
  it("offers the viewport controls the library brings", () => {
    const view = mount();
    expect(view.container.querySelector(".react-flow__background")).not.toBeNull();
    expect(view.container.querySelectorAll(".react-flow__controls button").length)
      .toBeGreaterThan(0);
    /** **No map of the layer.** A layer is one screenful by construction — the
     *  frame is fitted to the panel — so a second, smaller copy of it in the
     *  corner shows what is already there and covers the drawing to do it. */
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
