/** The tree-root mark, and adding structure from the explorer header. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ROOT, type Log, type Storage } from "@mnd/core";
import { App } from "../src/App";

let held: Log = [];
const storage: Storage = { read: () => held, write: (next) => { held = structuredClone(next); },
                           clear: () => { held = []; } };

beforeEach(() => {
  held = [{
    id: "s1", action: "build", at: 1, status: "applied", mutations: [
      { op: "add_block", block: { id: "shelf", parent: ROOT, name: "Shelf", type: "folder",
                                  order: 1 } },
      { op: "add_block", block: { id: "layer", parent: "shelf", name: "Layer", order: 1 } },
      { op: "add_block", block: { id: "pump", parent: ROOT, name: "Pump", def: {}, order: 2 } },
    ],
  }];
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

/** The tree rows of this name. */
function rows(view: { getAllByText: (text: string) => HTMLElement[] }, name: string) {
  return view.getAllByText(name).filter((el) => el.classList.contains("label"))
    .map((el) => el.closest("li")!);
}

describe("adding structure", () => {
  it("marks the workspace outside structure, and a definition once it holds a block", () => {
    const view = render(<App storage={storage} />);
    for (const row of rows(view, "workspace")) fireEvent.click(row.querySelector(".mark")!);
    expect(rows(view, "workspace").filter((row) => row.querySelector(".stamp"))).toHaveLength(1);
    expect(rows(view, "Shelf").some((row) => row.querySelector(".stamp"))).toBe(false);
    expect(rows(view, "Pump")[0]!.querySelector(".stamp")).toBeNull();

    fireEvent.click(rows(view, "Pump")[0]!);
    fireEvent.click(view.getByTitle("add structure to Pump"));
    const root = view.getByTitle("add structure to the definition in focus");
    expect(root).toHaveProperty("disabled", true);

    fireEvent.click(view.getByTitle("add a block in Pump"));
    const named = view.getByLabelText("name the block");
    fireEvent.change(named, { target: { value: "Motor" } });
    fireEvent.keyDown(named, { key: "Enter" });

    expect(rows(view, "Pump").filter((row) => row.querySelector("[title='roots structure']")))
      .toHaveLength(1);
    const motor = held.flatMap((s) => s.mutations).find((m) =>
      m.op === "add_block" && m.block.name === "Motor");
    expect(motor && motor.op === "add_block" ? motor.block.parent : null).toBe("pump");
  });
});
