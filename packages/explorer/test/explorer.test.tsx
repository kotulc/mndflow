/** The explorer, driven on its own. */

import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, createEvent, render, fireEvent, screen } from "@testing-library/react";
import { fold, ROOT, type Graph } from "@mnd/core";
import { FLOOR, flat, nested, related } from "@mnd/fixtures";
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
    const rows = tree_of(fold(nested(), FLOOR), []);
    expect(rows.map((r) => r.label)).toContain("Rate Limit");
    expect(rows.find((r) => r.label === "Rate Limit")!.depth).toBeGreaterThan(1);
  });

  it("never lists a boundary, a note or a reference", () => {
    const rows = tree_of(fold(related(), FLOOR), []);
    expect(rows.map((r) => r.label)).not.toContain("Hot side");
    expect(rows.map((r) => r.label)).not.toContain("the loop runs clockwise");
  });

  it("stops at a folded branch", () => {
    const graph = fold(nested(), FLOOR);
    const all = tree_of(graph, []).length;
    const shut = tree_of(graph, ["block_ledger"]).length;
    expect(shut).toBeLessThan(all);
    expect(tree_of(graph, ["block_ledger"]).map((r) => r.label)).not.toContain("Edge");
  });

  /** A mark says what a row is; holding parts is said by filling it, not by changing it. */
  it("marks a folder apart, and leaves holding parts to the fill", () => {
    const rows = tree_of(fold(nested(), FLOOR), []);
    const mark = (label: string) => rows.find((r) => r.label === label)!.mark;
    expect(mark("Shelf")).toBe("folder");
    expect(mark("Edge")).toBe("leaf");
    expect(mark("Auth")).toBe("leaf");
  });

  it("fills the icon of a row that holds parts, and only that", () => {
    const { container } = mount(fold(nested(), FLOOR));
    const filled = (label: string) => container
      .querySelector(`li:has(.label)`) && Array.from(container.querySelectorAll("li"))
      .find((li) => li.textContent?.startsWith(label))
      ?.querySelector(".mark svg")?.getAttribute("fill");
    expect(filled("Edge")).toBe("currentColor");
    expect(filled("Auth")).toBe("none");
    /** The workspace row holds everything, but its mark is a word — filling one blots it out. */
    expect(filled("workspace")).toBe("none");
  });
});

describe("it emits action names and mutates nothing", () => {
  it("leaves the graph untouched whatever is clicked", () => {
    const graph = fold(nested(), FLOOR);
    const before = structuredClone(graph);
    const { onAct } = mount(graph);
    fireEvent.click(screen.getByText("Ledger"));
    fireEvent.doubleClick(screen.getByText("Ledger"));
    expect(graph).toEqual(before);
    expect(onAct).toHaveBeenCalled();
  });

  it("reveals what was clicked, and picks it", () => {
    const { onAct, onPick } = mount(fold(nested(), FLOOR));
    fireEvent.click(screen.getByText("Ledger"));
    expect(onPick).toHaveBeenCalledWith(["block_ledger"]);
    expect(onAct).toHaveBeenCalledWith("reveal", { id: "block_ledger" });
  });

  it("never opens a row on a click, however many rows are clicked", () => {
    const { onAct } = mount(fold(nested(), FLOOR));
    for (const label of ["Ledger", "Edge", "Auth"]) fireEvent.click(screen.getByText(label));
    expect(onAct).not.toHaveBeenCalledWith("open", expect.anything());
  });

  it("reveals before it picks, so what is picked survives the navigation", () => {
    const order: string[] = [];
    const onAct = vi.fn((name: string) => order.push(`act:${name}`));
    const onPick = vi.fn(() => order.push("pick"));
    render(<Explorer graph={fold(nested(), FLOOR)} open={null} picked={[]} folded={[]}
                     onAct={onAct} onPick={onPick} onFold={vi.fn()} />);
    fireEvent.click(screen.getByText("Ledger"));
    expect(order).toEqual(["act:reveal", "pick"]);
  });

  /** Two clicks rename a row in place. */
  it("renames in place on a double click", () => {
    const { onAct, container } = mount(fold(nested(), FLOOR));
    fireEvent.doubleClick(screen.getByText("Auth"));
    const field = container.querySelector(".label.mnd-naming")!;
    field.textContent = "Typed";
    fireEvent.blur(field);
    expect(onAct).toHaveBeenCalledWith("rename", { id: "block_auth", name: "Typed" });
  });

  /** The mark is the fold, and it says which way it is set. */
  it("folds a branch from its mark, which reads as open until it is shut", () => {
    const { onFold, container } = mount(fold(nested(), FLOOR));
    /** A row that holds parts; its mark is the fold control. */
    const row = Array.from(container.querySelectorAll("li"))
      .find((li) => li.textContent?.startsWith("Edge"))!;
    expect(row.querySelector(".mark.on")).toBeTruthy();
    fireEvent.click(row.querySelector(".mark")!);
    expect(onFold).toHaveBeenCalledWith(expect.any(String), true);
  });

  it("folds nothing from a row that lists nothing", () => {
    const { onFold, container } = mount(fold(nested(), FLOOR));
    const leaf = Array.from(container.querySelectorAll("li"))
      .find((li) => li.textContent?.startsWith("Auth"))!;
    expect(leaf.querySelector(".mark.on")).toBeNull();
    fireEvent.click(leaf.querySelector(".mark")!);
    expect(onFold).not.toHaveBeenCalled();
  });

  it("counts what it holds", () => {
    const rows = tree_of(fold(nested(), FLOOR), []);
    expect(rows.find((r) => r.label === "Edge")!.kids).toBe(2);
  });

  it("creates under whatever is picked", () => {
    const { onAct } = mount(fold(nested(), FLOOR), { picked: ["block_edge"] });
    fireEvent.click(screen.getByTitle(/add a block/));
    expect(onAct).toHaveBeenCalledWith("create",
      { name: "Typed", parent: "block_edge", type: undefined });
  });

  /** Where you are, when you have picked nothing. */
  it("creates where the stage is pointed when nothing is picked", () => {
    const { onAct } = mount(fold(nested(), FLOOR), { open: "block_edge" });
    fireEvent.click(screen.getByTitle(/add a block/));
    expect(onAct.mock.calls[0]![1]).toMatchObject({ parent: "block_edge" });
  });

  it("creates at the workspace when nothing is picked and nothing is open", () => {
    const { onAct } = mount(fold(nested(), FLOOR));
    fireEvent.click(screen.getByTitle(/add a block/));
    expect(onAct.mock.calls[0]![1]).toMatchObject({ parent: ROOT });
  });

  it("has a folder shortcut that reaches the same create", () => {
    const { onAct } = mount(fold(nested(), FLOOR));
    fireEvent.click(screen.getByTitle(/add a folder/));
    expect(onAct).toHaveBeenCalledWith("create",
      { name: "Typed", parent: ROOT, type: "folder" });
  });

  it("makes nothing when the name is abandoned", () => {
    vi.spyOn(window, "prompt").mockReturnValue(null);
    const { onAct } = mount(fold(nested(), FLOOR));
    fireEvent.click(screen.getByTitle(/add a block/));
    expect(onAct).not.toHaveBeenCalled();
  });

  it("offers no delete when nothing is picked", () => {
    expect(mount(fold(nested(), FLOOR)).getByTitle(/delete/).hasAttribute("disabled")).toBe(true);
  });

  it("offers no delete for the workspace, which cannot be deleted", () => {
    expect(mount(fold(nested(), FLOOR), { picked: [ROOT] })
      .getByTitle(/delete/).hasAttribute("disabled")).toBe(true);
  });

  it("deletes what is picked", () => {
    const { onAct, getByTitle } = mount(fold(nested(), FLOOR), { picked: ["block_auth"] });
    fireEvent.click(getByTitle(/delete/));
    expect(onAct).toHaveBeenCalledWith("delete", { id: "block_auth" });
  });
});

describe("re-filing", () => {
  /** A drop a fraction of the way down a row. */
  function drop_at(el: Element, down: number) {
    el.getBoundingClientRect = () => ({ top: 0, height: 100 }) as DOMRect;
    const drop = createEvent.drop(el);
    /** Where the drop lands is written onto the event. */
    Object.defineProperty(drop, "clientY", { value: down * 100 });
    fireEvent(el, drop);
  }

  const drag = (label: string) => {
    fireEvent.dragStart(screen.getByText(label).closest("li")!);
    return (to: string) => screen.getByText(to).closest("li")!;
  };

  it("moves a row dropped onto another row", () => {
    const { onAct } = mount(fold(nested(), FLOOR));
    drop_at(drag("Auth")("Billing"), 0.5);
    expect(onAct).toHaveBeenCalledWith("move", { ids: ["block_auth"], parent: "block_billing" });
  });

  /** On a row is into it; between two rows is beside them. */
  it("puts a row in front of the one it was dropped above", () => {
    const { onAct } = mount(fold(nested(), FLOOR));
    drop_at(drag("Auth")("Billing"), 0.1);
    expect(onAct).toHaveBeenCalledWith("move",
      { ids: ["block_auth"], parent: "block_ledger", before: "block_billing" });
  });

  it("puts a row last when it was dropped below the last of them", () => {
    const { onAct } = mount(fold(nested(), FLOOR));
    drop_at(drag("Auth")("Billing"), 0.9);
    expect(onAct).toHaveBeenCalledWith("move", { ids: ["block_auth"], parent: "block_ledger" });
  });

  /** One place down, not to the end. */
  it("puts a row one place down when it is dropped below the one above it", () => {
    const { onAct } = mount(fold(related(), FLOOR));
    drop_at(drag("Heat Exchanger")("Pump"), 0.9);
    expect(onAct).toHaveBeenCalledWith("move",
      { ids: ["block_hx"], parent: "block_loop", before: "block_tank" });
  });

  /** Dropping outside the rows moves into the workspace. */
  it.each([[".floor"]])(
    "makes a block a project when it is dropped on %s", (where) => {
      const { onAct, container } = mount(fold(nested(), FLOOR));
      fireEvent.dragStart(screen.getByText("Auth").closest("li")!);
      fireEvent.drop(container.querySelector(where)!);
      expect(onAct).toHaveBeenCalledWith("move", { ids: ["block_auth"], parent: ROOT });
    });

  it("does nothing when a row is dropped on itself", () => {
    const { onAct } = mount(fold(nested(), FLOOR));
    const row = screen.getByText("Auth").closest("li")!;
    fireEvent.dragStart(row);
    drop_at(row, 0.5);
    expect(onAct).not.toHaveBeenCalledWith("move", expect.anything());
  });
});

describe("the two states read differently", () => {
  it("draws open as a wash and picked as the accent, and stacks them", () => {
    const { container } = mount(fold(nested(), FLOOR),
      { open: "block_ledger", picked: ["block_auth"] });
    expect(container.querySelector("li.open")).not.toBeNull();
    expect(container.querySelector("li.picked")).not.toBeNull();
    expect(container.querySelector("li.open.picked")).toBeNull();
  });

  it("says nothing is selected when nothing is", () => {
    const { container } = mount(fold(nested(), FLOOR), { open: "block_ledger" });
    expect(container.querySelector("li.picked")).toBeNull();
  });
});

describe("folding", () => {
  it("asks for one branch to shut when its mark is clicked", () => {
    const { onFold, onAct } = mount(fold(nested(), FLOOR));
    fireEvent.click(screen.getByText("Ledger").closest("li")!.querySelector(".mark")!);
    expect(onFold).toHaveBeenCalledWith("block_ledger", true);
    expect(onAct).not.toHaveBeenCalled();
  });

  it("reads anything open at all, so it can always open again", () => {
    const shut = tree_of(fold(nested(), FLOOR), ["block_shelf", "block_site"]);
    expect(shut.every((r) => r.depth <= 1)).toBe(true);
  });

  it("shuts the whole tree when the workspace itself is folded", () => {
    expect(tree_of(fold(nested(), FLOOR), [ROOT]).map((r) => r.id)).toEqual([ROOT]);
  });
});

describe("an empty workspace", () => {
  it("draws the workspace and nothing under it, and still offers create", () => {
    const { container, getByTitle } = mount(fold([]));
    expect(container.querySelectorAll("li:not(.floor)")).toHaveLength(1);
    expect(getByTitle(/add a block/).hasAttribute("disabled")).toBe(false);
  });

  it("lists a flat project's children under the one workspace root", () => {
    const rows = tree_of(fold(flat(), FLOOR), []);
    expect(rows.map((r) => r.label)).toEqual(["workspace", "Ledger", "Edge", "Auth", "Billing"]);
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 2, 2, 2]);
  });
});

describe("consumer tools flags", () => {
  it("hides create, remove and filter when asked, and keeps fold", () => {
    const { container, queryByTitle } = mount(fold(nested(), FLOOR), {
      tools: { create: false, remove: false, filter: false },
    });
    expect(queryByTitle(/add a block/)).toBeNull();
    expect(queryByTitle(/add a folder/)).toBeNull();
    expect(queryByTitle(/delete what is picked/)).toBeNull();
    expect(queryByTitle(/filter the workspace/)).toBeNull();
    expect(container.querySelector("button.fold")).not.toBeNull();
  });

  it("still fires rename with name when tools are hidden", () => {
    const { onAct, container } = mount(fold(nested(), FLOOR), {
      tools: { create: false, remove: false, filter: false },
    });
    fireEvent.doubleClick(screen.getByText("Auth"));
    const field = container.querySelector(".label.mnd-naming")!;
    field.textContent = "Typed";
    fireEvent.blur(field);
    expect(onAct).toHaveBeenCalledWith("rename", { id: "block_auth", name: "Typed" });
  });
});
