/** The one thing the shell decides about a drop, driven through the shell.
 *
 *  **A block dropped onto the drawing arrives as a reference.** The only thing
 *  that is not is a block the layer already holds, and then nothing happens at
 *  all. Where the block came from, what holds it and how deep it sits change
 *  nothing — the rule has no other case, and this is here because it used to
 *  have three: a drop of a child of something drawn here promoted it a level
 *  instead of referring to it, and a drop of something already here silently
 *  re-placed the card.
 *
 *  Driven through `App` rather than through the action, because the branching
 *  that broke it lived in the shell and an action test would not have seen it. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { nested } from "@mnd/fixtures";
import type { Log } from "@mnd/core";
import { App } from "../src/App";

/** Where the browser port keeps the log. Named here so the test seeds the app
 *  the way a returning tab does, rather than driving the UI to build a graph. */
const KEY = "mnd.log.v2";
const DRAGGED = "text/mnd-block";

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(KEY, JSON.stringify(nested()));
  /** Nothing is fetched in a test, and the catalogue is optional. */
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const log = (): Log => JSON.parse(localStorage.getItem(KEY) ?? "[]") as Log;
const since = (was: number) => log().slice(was).map((s) => s.action);

/** A drop on the drawing, carrying a block the way a dragged row does. */
function drop(view: { container: HTMLElement }, id: string) {
  const flow = view.container.querySelector(".react-flow")!;
  const data = new DataTransfer();
  data.setData(DRAGGED, id);
  fireEvent.drop(flow, { dataTransfer: data });
}

/** What the open layer holds that stands for something else. */
const refs = (id: string | null) =>
  Object.values(fold_of()).filter((b) => b.parent === (id ?? "ws") && b.of).map((b) => b.of);

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

describe("a block dropped from the tree onto the drawing", () => {
  /** **The case that broke.** Ledger is held by Shelf, and Shelf is drawn in
   *  this layer — which used to be read as *bring it up a level*. */
  it("refers to a child of something drawn in this layer", () => {
    const view = render(<App />);
    const was = log().length;
    drop(view, "block_ledger");
    expect(since(was)).toEqual(["refer"]);
    expect(refs(null)).toContain("block_ledger");
    /** A reference is an appearance, so the block stays where it lives. */
    expect(fold_of()["block_ledger"]!.parent).toBe("block_shelf");
  });

  it("refers to a block from deeper in the tree", () => {
    const view = render(<App />);
    const was = log().length;
    drop(view, "block_rate");
    expect(since(was)).toEqual(["refer"]);
    expect(refs(null)).toContain("block_rate");
    expect(fold_of()["block_rate"]!.parent).toBe("block_edge");
  });

  /** **The one exception, and it is the whole of it.** Nothing arrives, and
   *  nothing already here is moved or re-placed either. */
  it("does nothing with a block this layer already holds", () => {
    const view = render(<App />);
    const was = log().length;
    drop(view, "block_shelf");
    expect(since(was)).toEqual([]);
    expect(refs(null)).toEqual([]);
  });
});
