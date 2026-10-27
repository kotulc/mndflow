/** The models and the library, driven through the shell: what each section's add makes, and that
 *  only a model wears the tree. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ROOT, type Block, type Log, type Storage } from "@mnd/core";
import { App } from "../src/App";

let held: Log = [];
const storage: Storage = { read: () => held, write: (next) => { held = structuredClone(next); },
                           clear: () => { held = []; } };

beforeEach(() => {
  held = [{
    id: "s1", action: "build", at: 1, status: "applied", mutations: [
      { op: "add_block", block: { id: "plant", parent: ROOT, name: "Plant", type: "model",
                                  def: {}, order: 1 } },
      { op: "add_block", block: { id: "loop", parent: "plant", name: "Loop", order: 1 } },
      { op: "add_block", block: { id: "valve", parent: "loop", name: "Valve", order: 1 } },
      { op: "add_block", block: { id: "pump", parent: ROOT, name: "Pump", def: {}, order: 2 } },
    ],
  }];
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

/** The tree rows of this name. */
function rows(view: { queryAllByText: (text: string) => HTMLElement[] }, name: string) {
  return view.queryAllByText(name).filter((el) => el.classList.contains("label"))
    .map((el) => el.closest("li")!);
}

/** Everything the log has made, by name. */
function made(name: string): Block | undefined {
  const m = held.flatMap((s) => s.mutations)
    .find((x) => x.op === "add_block" && x.block.name === name);
  return m && m.op === "add_block" ? m.block : undefined;
}

describe("the two sections", () => {
  it("lists a model in both, and its parts only in the models", () => {
    const view = render(<App storage={storage} />);
    for (const row of rows(view, "workspace")) fireEvent.click(row.querySelector(".mark")!);
    expect(rows(view, "Plant")).toHaveLength(2);
    for (const row of rows(view, "Plant")) {
      if (row.querySelector(".mark.shut")) fireEvent.click(row.querySelector(".mark")!);
    }
    expect(rows(view, "Loop")).toHaveLength(1);
    expect(rows(view, "Pump")).toHaveLength(1);
  });

  it("adds a model in the models, and a part in a definition in the library", () => {
    const view = render(<App storage={storage} />);
    for (const row of rows(view, "workspace")) fireEvent.click(row.querySelector(".mark")!);
    fireEvent.click(rows(view, "workspace")[1]!);
    fireEvent.click(view.getByTitle("add a model in workspace"));
    const named = view.getByLabelText("name the model");
    fireEvent.change(named, { target: { value: "Mill" } });
    fireEvent.keyDown(named, { key: "Enter" });
    expect(made("Mill")).toMatchObject({ type: "model", def: {}, parent: ROOT });

    fireEvent.click(rows(view, "Pump")[0]!);
    fireEvent.click(view.getByTitle("add a part in Pump"));
    const part = view.getByLabelText("name the block");
    fireEvent.change(part, { target: { value: "Motor" } });
    fireEvent.keyDown(part, { key: "Enter" });
    expect(made("Motor")?.parent).toBe("pump");
  });
});
