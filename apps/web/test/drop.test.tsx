/** The one thing the shell decides about a drop, driven through the shell. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { nested } from "@mnd/fixtures";
import type { Log, Storage } from "@mnd/core";
import { App } from "../src/App";

const DRAGGED = "text/mnd-block";

/** A storage seeded the way a returning tab is, rather than built through the UI. */
let held: Log = [];
const storage: Storage = { read: () => held, write: (next) => { held = structuredClone(next); },
                           clear: () => { held = []; } };

beforeEach(() => {
  held = nested();
  /** Nothing is fetched in a test, and the catalogue is optional. */
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const log = (): Log => held;
const since = (was: number) => log().slice(was).map((s) => s.action);

/** A drop on the drawing, carrying a block the way a dragged row does. */
function drop(view: { container: HTMLElement }, id: string) {
  const flow = view.container.querySelector(".react-flow")!;
  const data = new DataTransfer();
  data.setData(DRAGGED, id);
  fireEvent.drop(flow, { dataTransfer: data });
}

/** What the open layer holds that stands for something else. */
const refs = (id: string) =>
  Object.values(fold_of()).filter((b) => b.parent === id && b.of).map((b) => b.of);

function fold_of(): Record<string, { parent: string | null; of?: string }> {
  const blocks: Record<string, { parent: string | null; of?: string }> = {};
  for (const step of log()) {
    for (const m of step.mutations) {
      if (m.op === "add_block") blocks[m.block.id] = m.block as never;
      if (m.op === "move_block") blocks[m.id] = { ...blocks[m.id]!, parent: m.parent };
      if (m.op === "delete_block") delete blocks[m.id];
    }
  }
  return blocks;
}

/** The tree row of this name. A folder that holds structure is also drawn on the canvas, so the
 *  name is no longer unique. */
function open_row(view: { getAllByText: (text: string) => HTMLElement[] }, name: string) {
  fireEvent.doubleClick(row_of(view, name));
}

/** Unfold a tree row's branch. A folder never opens: its box is drawn on its parent's layer. */
function unfold_row(view: { getAllByText: (text: string) => HTMLElement[] }, name: string) {
  fireEvent.click(row_of(view, name).closest("li")!.querySelector(".mark")!);
}

function row_of(view: { getAllByText: (text: string) => HTMLElement[] }, name: string) {
  const row = view.getAllByText(name).find((el) => el.classList.contains("label"));
  if (!row) throw new Error(`${name} is not in the tree`);
  return row;
}

describe("a block dropped from the tree onto the drawing", () => {
  /** Ledger draws Billing. The canvas opens on the workspace, so the layer is opened first. */
  it("refers to a child of something drawn in this layer", () => {
    const view = render(<App storage={storage} />);
    unfold_row(view, "Shelf");
    open_row(view, "Ledger");
    const was = log().length;
    drop(view, "block_billing");
    expect(since(was)).toEqual(["refer"]);
    expect(refs("block_ledger")).toContain("block_billing");
    /** A reference is an appearance, so the block stays where it lives. */
    expect(fold_of()["block_billing"]!.parent).toBe("block_ledger");
  });

  it("refers to a block from deeper in the tree", () => {
    const view = render(<App storage={storage} />);
    unfold_row(view, "Shelf");
    open_row(view, "Ledger");
    const was = log().length;
    drop(view, "block_rate");
    expect(since(was)).toEqual(["refer"]);
    expect(refs("block_ledger")).toContain("block_rate");
    expect(fold_of()["block_rate"]!.parent).toBe("block_edge");
  });

});
