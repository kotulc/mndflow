/** The explorer, driven on its own.
 *
 *  What is pinned: it shows structure and only structure, it emits action names
 *  and mutates nothing, and the two states it draws are told apart. */

import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, createEvent, render, fireEvent, screen } from "@testing-library/react";
import { fold, ROOT, type Graph } from "@mnd/core";
import { flat, nested, related } from "@mnd/fixtures";
import { Explorer, tree_of } from "../src/index";

function mount(graph: Graph, over: Partial<Parameters<typeof Explorer>[0]> = {}) {
  const onAct = vi.fn();
  const onPick = vi.fn();
  const onFold = vi.fn();
  const view = render(
    <Explorer graph={graph} open={null} picked={[]} folded={[]}
              onAct={onAct} onPick={onPick} onFold={onFold} {...over} />,
  );
  return { ...view, onAct, onPick, onFold };
}

beforeEach(() => {
  vi.spyOn(window, "prompt").mockReturnValue("Typed");
});

afterEach(cleanup);

describe("it shows structure and only structure", () => {
  it("lists blocks nested to any depth", () => {
    const rows = tree_of(fold(nested()), []);
    expect(rows.map((r) => r.label)).toContain("Rate Limit");
    expect(rows.find((r) => r.label === "Rate Limit")!.depth).toBeGreaterThan(1);
  });

  it("never lists a boundary, a note or a reference", () => {
    const rows = tree_of(fold(related()), []);
    expect(rows.map((r) => r.label)).not.toContain("Hot side");
    expect(rows.map((r) => r.label)).not.toContain("the loop runs clockwise");
  });

  it("stops at a folded branch", () => {
    const graph = fold(nested());
    const all = tree_of(graph, []).length;
    const shut = tree_of(graph, ["block_ledger"]).length;
    expect(shut).toBeLessThan(all);
    expect(tree_of(graph, ["block_ledger"]).map((r) => r.label)).not.toContain("Edge");
  });

  it("marks a container differently from a leaf, and a folder from both", () => {
    const rows = tree_of(fold(nested()), []);
    const mark = (label: string) => rows.find((r) => r.label === label)!.mark;
    expect(mark("Shelf")).toBe("folder");
    expect(mark("Edge")).toBe("container");
    expect(mark("Auth")).toBe("leaf");
  });
});

describe("it emits action names and mutates nothing", () => {
  it("leaves the graph untouched whatever is clicked", () => {
    const graph = fold(nested());
    const before = structuredClone(graph);
    const { onAct } = mount(graph);
    fireEvent.click(screen.getByText("Ledger"));
    fireEvent.doubleClick(screen.getByText("Ledger"));
    expect(graph).toEqual(before);
    expect(onAct).toHaveBeenCalled();
  });

  it("reveals what was clicked, and picks it", () => {
    const { onAct, onPick } = mount(fold(nested()));
    fireEvent.click(screen.getByText("Ledger"));
    expect(onPick).toHaveBeenCalledWith(["block_ledger"]);
    expect(onAct).toHaveBeenCalledWith("reveal", { id: "block_ledger" });
  });

  it("never opens a row on a click, however many rows are clicked", () => {
    const { onAct } = mount(fold(nested()));
    for (const label of ["Ledger", "Edge", "Auth"]) fireEvent.click(screen.getByText(label));
    expect(onAct).not.toHaveBeenCalledWith("open", expect.anything());
  });

  it("reveals before it picks, so what is picked survives the navigation", () => {
    const order: string[] = [];
    const onAct = vi.fn((name: string) => order.push(`act:${name}`));
    const onPick = vi.fn(() => order.push("pick"));
    render(<Explorer graph={fold(nested())} open={null} picked={[]} folded={[]}
                     onAct={onAct} onPick={onPick} onFold={vi.fn()} />);
    fireEvent.click(screen.getByText("Ledger"));
    expect(order).toEqual(["act:reveal", "pick"]);
  });

  /** **A name is typed where it is read**, on the tree as on the drawing: two
   *  clicks open the row's own name, and what was typed is said when it is
   *  left. */
  it("renames in place on a double click", () => {
    const { onAct, container } = mount(fold(nested()));
    fireEvent.doubleClick(screen.getByText("Auth"));
    const field = container.querySelector(".label.mnd-naming")!;
    field.textContent = "Typed";
    fireEvent.blur(field);
    expect(onAct).toHaveBeenCalledWith("rename", { id: "block_auth", label: "Typed" });
  });

  /** **The mark is the fold, and it says which way it is set.** One icon for
   *  what the row is and whether you are seeing all of it. */
  it("folds a branch from its mark, which reads as open until it is shut", () => {
    const { onFold, container } = mount(fold(nested()));
    const row = container.querySelector('li[data-mark="container"]')!;
    expect(row.querySelector(".mark.on")).toBeTruthy();
    fireEvent.click(row.querySelector(".mark")!);
    expect(onFold).toHaveBeenCalledWith(expect.any(String), true);
  });

  it("folds nothing from a row that lists nothing", () => {
    const { onFold, container } = mount(fold(nested()));
    const leaf = container.querySelector('li[data-mark="leaf"]')!;
    expect(leaf.querySelector(".mark.on")).toBeNull();
    fireEvent.click(leaf.querySelector(".mark")!);
    expect(onFold).not.toHaveBeenCalled();
  });

  it("counts what it holds", () => {
    const rows = tree_of(fold(nested()), []);
    expect(rows.find((r) => r.label === "Edge")!.kids).toBe(2);
  });

  it("creates under whatever is picked", () => {
    const { onAct } = mount(fold(nested()), { picked: ["block_edge"] });
    fireEvent.click(screen.getByTitle(/add a block/));
    expect(onAct).toHaveBeenCalledWith("create",
      { label: "Typed", parent: "block_edge", type: undefined });
  });

  /** **Where you are, when you have picked nothing.** The canvas makes a block
   *  in the layer it is showing; the tree said the workspace, so adding one
   *  from in a layer put it somewhere you were not looking. */
  it("creates where the stage is pointed when nothing is picked", () => {
    const { onAct } = mount(fold(nested()), { open: "block_edge" });
    fireEvent.click(screen.getByTitle(/add a block/));
    expect(onAct.mock.calls[0]![1]).toMatchObject({ parent: "block_edge" });
  });

  it("creates at the workspace when nothing is picked and nothing is open", () => {
    const { onAct } = mount(fold(nested()));
    fireEvent.click(screen.getByTitle(/add a block/));
    expect(onAct.mock.calls[0]![1]).toMatchObject({ parent: ROOT });
  });

  it("has a folder shortcut that reaches the same create", () => {
    const { onAct } = mount(fold(nested()));
    fireEvent.click(screen.getByTitle(/add a folder/));
    expect(onAct).toHaveBeenCalledWith("create",
      { label: "Typed", parent: ROOT, type: "folder" });
  });

  it("makes nothing when the name is abandoned", () => {
    vi.spyOn(window, "prompt").mockReturnValue(null);
    const { onAct } = mount(fold(nested()));
    fireEvent.click(screen.getByTitle(/add a block/));
    expect(onAct).not.toHaveBeenCalled();
  });

  it("offers no delete when nothing is picked", () => {
    expect(mount(fold(nested())).getByTitle(/delete/).hasAttribute("disabled")).toBe(true);
  });

  it("deletes what is picked", () => {
    const { onAct, getByTitle } = mount(fold(nested()), { picked: ["block_auth"] });
    fireEvent.click(getByTitle(/delete/));
    expect(onAct).toHaveBeenCalledWith("delete", { id: "block_auth" });
  });
});

describe("re-filing", () => {
  /** A drop a fraction of the way down a row. A row in a headless DOM has no
   *  size of its own, and where you let go is the whole question here. */
  function drop_at(el: Element, down: number) {
    el.getBoundingClientRect = () => ({ top: 0, height: 100 }) as DOMRect;
    const drop = createEvent.drop(el);
    /** Written on rather than passed in: a headless `DragEvent` takes no
     *  pointer of its own, and where you let go is the whole question here. */
    Object.defineProperty(drop, "clientY", { value: down * 100 });
    fireEvent(el, drop);
  }

  const drag = (label: string) => {
    fireEvent.dragStart(screen.getByText(label).closest("li")!);
    return (to: string) => screen.getByText(to).closest("li")!;
  };

  it("moves a row dropped onto another row", () => {
    const { onAct } = mount(fold(nested()));
    drop_at(drag("Auth")("Billing"), 0.5);
    expect(onAct).toHaveBeenCalledWith("move", { ids: ["block_auth"], parent: "block_billing" });
  });

  /** **On a row is into it; between two rows is beside them.** */
  it("puts a row in front of the one it was dropped above", () => {
    const { onAct } = mount(fold(nested()));
    drop_at(drag("Auth")("Billing"), 0.1);
    expect(onAct).toHaveBeenCalledWith("move",
      { ids: ["block_auth"], parent: "block_ledger", before: "block_billing" });
  });

  it("puts a row last when it was dropped below the last of them", () => {
    const { onAct } = mount(fold(nested()));
    drop_at(drag("Auth")("Billing"), 0.9);
    expect(onAct).toHaveBeenCalledWith("move", { ids: ["block_auth"], parent: "block_ledger" });
  });

  /** **One place down, not to the end.** Below a row whose next sibling is the
   *  block in hand, that block was asked to go in front of itself. */
  it("puts a row one place down when it is dropped below the one above it", () => {
    const { onAct } = mount(fold(related()));
    drop_at(drag("Heat Exchanger")("Pump"), 0.9);
    expect(onAct).toHaveBeenCalledWith("move",
      { ids: ["block_hx"], parent: "block_loop", before: "block_tank" });
  });

  /** **Everything that is not a row is the workspace**, which is how a block
   *  is dragged out of what holds it. */
  it.each([[".floor"], [".explorer"], [".tree"]])(
    "makes a block a project when it is dropped on %s", (where) => {
      const { onAct, container } = mount(fold(nested()));
      fireEvent.dragStart(screen.getByText("Auth").closest("li")!);
      fireEvent.drop(container.querySelector(where)!);
      expect(onAct).toHaveBeenCalledWith("move", { ids: ["block_auth"], parent: ROOT });
    });

  it("does nothing when a row is dropped on itself", () => {
    const { onAct } = mount(fold(nested()));
    const row = screen.getByText("Auth").closest("li")!;
    fireEvent.dragStart(row);
    drop_at(row, 0.5);
    expect(onAct).not.toHaveBeenCalledWith("move", expect.anything());
  });
});

describe("the two states read differently", () => {
  it("draws open as a wash and picked as the accent, and stacks them", () => {
    const { container } = mount(fold(nested()),
      { open: "block_ledger", picked: ["block_auth"] });
    expect(container.querySelector("li.open")).not.toBeNull();
    expect(container.querySelector("li.picked")).not.toBeNull();
    expect(container.querySelector("li.open.picked")).toBeNull();
  });

  it("says nothing is selected when nothing is", () => {
    const { container } = mount(fold(nested()), { open: "block_ledger" });
    expect(container.querySelector("li.picked")).toBeNull();
  });
});

describe("folding", () => {
  it("asks for one branch to shut when its mark is clicked", () => {
    const { onFold, onAct } = mount(fold(nested()));
    fireEvent.click(screen.getByText("Ledger").closest("li")!.querySelector(".mark")!);
    expect(onFold).toHaveBeenCalledWith("block_ledger", true);
    expect(onAct).not.toHaveBeenCalled();
  });

  it("reads anything open at all, so it can always open again", () => {
    const shut = tree_of(fold(nested()), ["block_shelf", "block_site"]);
    expect(shut.every((r) => r.depth === 0)).toBe(true);
  });
});

describe("an empty workspace", () => {
  it("draws without a row, and still offers create", () => {
    const { container, getByTitle } = mount(fold([]));
    expect(container.querySelectorAll("li:not(.floor)")).toHaveLength(0);
    expect(getByTitle(/add a block/).hasAttribute("disabled")).toBe(false);
  });

  it("lists a flat project's children under it", () => {
    expect(tree_of(fold(flat()), []).map((r) => r.label))
      .toEqual(["Ledger", "Edge", "Auth", "Billing"]);
  });
});
