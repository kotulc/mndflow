/** The explorer, driven on its own.
 *
 *  What is pinned: it shows structure and only structure, it emits action names
 *  and mutates nothing, and the two states it draws are told apart. */

import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, fireEvent, screen } from "@testing-library/react";
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
    const rows = tree_of(fold(nested()), [], true);
    expect(rows.map((r) => r.label)).toContain("Rate Limit");
    expect(rows.find((r) => r.label === "Rate Limit")!.depth).toBeGreaterThan(1);
  });

  it("never lists a boundary, a note or a reference", () => {
    const rows = tree_of(fold(related()), [], true);
    expect(rows.map((r) => r.label)).not.toContain("Hot side");
    expect(rows.map((r) => r.label)).not.toContain("the loop runs clockwise");
  });

  it("stops at a folded branch", () => {
    const graph = fold(nested());
    const all = tree_of(graph, [], true).length;
    const shut = tree_of(graph, ["block_ledger"], true).length;
    expect(shut).toBeLessThan(all);
    expect(tree_of(graph, ["block_ledger"], true).map((r) => r.label)).not.toContain("Edge");
  });

  it("hides what holds nothing when told to, but never a top-level block", () => {
    const graph = fold(nested());
    const lean = tree_of(graph, [], false).map((r) => r.label);
    expect(lean).not.toContain("Auth");
    expect(lean).toContain("Site");
  });

  it("marks a container differently from a leaf, and a folder from both", () => {
    const rows = tree_of(fold(nested()), [], true);
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

  it("opens what was clicked, and picks it", () => {
    const { onAct, onPick } = mount(fold(nested()));
    fireEvent.click(screen.getByText("Ledger"));
    expect(onPick).toHaveBeenCalledWith(["block_ledger"]);
    expect(onAct).toHaveBeenCalledWith("open", { id: "block_ledger" });
  });

  it("opens before it picks, so what is picked survives the navigation", () => {
    const order: string[] = [];
    const onAct = vi.fn((name: string) => order.push(`act:${name}`));
    const onPick = vi.fn(() => order.push("pick"));
    render(<Explorer graph={fold(nested())} open={null} picked={[]} folded={[]}
                     onAct={onAct} onPick={onPick} onFold={vi.fn()} />);
    fireEvent.click(screen.getByText("Ledger"));
    expect(order).toEqual(["act:open", "pick"]);
  });

  it("renames on a double click", () => {
    const { onAct } = mount(fold(nested()));
    fireEvent.doubleClick(screen.getByText("Auth"));
    expect(onAct).toHaveBeenCalledWith("rename", { id: "block_auth", label: "Typed" });
  });

  it("creates under whatever is picked", () => {
    const { onAct } = mount(fold(nested()), { picked: ["block_edge"] });
    fireEvent.click(screen.getByTitle(/add a block/));
    expect(onAct).toHaveBeenCalledWith("create",
      { label: "Typed", parent: "block_edge", type: undefined });
  });

  it("creates at the workspace when nothing is picked", () => {
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
  it("moves a row dropped onto another row", () => {
    const { onAct } = mount(fold(nested()));
    fireEvent.dragStart(screen.getByText("Auth").closest("li")!);
    fireEvent.drop(screen.getByText("Billing").closest("li")!);
    expect(onAct).toHaveBeenCalledWith("move", { id: "block_auth", parent: "block_billing" });
  });

  it("makes a block a project when it is dropped in the clear space below", () => {
    const { onAct, container } = mount(fold(nested()));
    fireEvent.dragStart(screen.getByText("Auth").closest("li")!);
    fireEvent.drop(container.querySelector(".floor")!);
    expect(onAct).toHaveBeenCalledWith("move", { id: "block_auth", parent: ROOT });
  });

  it("does nothing when a row is dropped on itself", () => {
    const { onAct } = mount(fold(nested()));
    const row = screen.getByText("Auth").closest("li")!;
    fireEvent.dragStart(row);
    fireEvent.drop(row);
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
    const shut = tree_of(fold(nested()), ["block_shelf", "block_site"], true);
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
    expect(tree_of(fold(flat()), [], true).map((r) => r.label))
      .toEqual(["Ledger", "Edge", "Auth", "Billing"]);
  });
});
