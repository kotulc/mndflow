/** The registry, and the four rules that make it a seam rather than a list.
 *
 *  None is visible from a type: scope decides what is shown, `check` decides
 *  what happens, an action that writes nothing is navigation, and what a
 *  sentence can reach falls out of the argument types rather than a flag
 *  somebody has to keep true. */

import { beforeEach, describe, expect, it } from "vitest";

import { inScope, register, run, sayable, writes,
         type Action, type Context, type Effect } from "../src/actions/index";
import { offer } from "../src/actions/offer";
import { fold } from "../src/graph/fold";
import { element, step, type Mutation } from "../src/graph/types";

/** A layer holding one block, one note and one group, so scope has something to
 *  tell apart. */
function layer() {
  const block = element("Pump", { parent: null });
  const note = element("watch", { form: "note", parent: null });
  const group = element("Set", { form: "group", parent: null });
  const port = element("in", { parent: block.id, side: "left", at: 24 });
  const mutations: Mutation[] = [block, note, group, port]
    .map((it) => ({ op: "add_element" as const, element: it }));

  return { graph: fold([step("", "test", mutations)]), block, note, group, port };
}

const at = (graph: Context["graph"], id: string | null, locked = false): Context =>
  ({ graph, view: null, picked: id ? { kind: "node", id } : null, locked });

/** Two actions that differ only in what they need, which is the whole point. */
const named: Action = {
  name: "test.named", label: "Named", about: "makes a thing from a name",
  scope: { on: "layer" }, args: [{ kind: "text", name: "label" }],
  check: (_ctx, args) => (args.label ? null : "Needs a name."),
  run: (_ctx, args) => ({ mutations: [{ op: "set_body", id: "root", body: String(args.label) }] }),
};

const placed: Action = {
  name: "test.placed", label: "Placed", about: "makes a thing where you pointed",
  scope: { on: "layer" },
  args: [{ kind: "text", name: "label" }, { kind: "spot", name: "at" }],
  run: () => ({ mutations: [] }),
};

const onlyNotes: Action = {
  name: "test.notes", label: "Notes", about: "does something to a note",
  scope: { on: "element", form: "note" }, args: [],
  run: () => ({ mutations: [] }),
};

const goes: Action = {
  name: "test.goes", label: "Goes", about: "opens a layer and selects nothing",
  scope: { on: "element" }, args: [],
  run: (ctx) => ({ mutations: [], open: ctx.picked?.id ?? null }),
};

beforeEach(() => register(named, placed, onlyNotes, goes));

describe("scope", () => {
  it("offers a layer action with nothing selected", () => {
    const { graph } = layer();

    expect(offer(at(graph, null)).map((a) => a.name)).toContain("test.named");
  });

  it("keeps a form-narrowed action away from the wrong form", () => {
    const { graph, block, note } = layer();

    expect(inScope(onlyNotes.scope, at(graph, block.id))).toBe(false);
    expect(inScope(onlyNotes.scope, at(graph, note.id))).toBe(true);
  });

  it("reads an interface as one, which is derived and never a form", () => {
    const { graph, port, block } = layer();
    const scope = { on: "element", form: "interface" } as const;

    expect(inScope(scope, at(graph, port.id))).toBe(true);
    expect(inScope(scope, at(graph, block.id))).toBe(false);
  });

  it("lets one scope name more than one thing", () => {
    const { graph, block } = layer();
    const scope = { on: ["element", "edge"] } as const;
    const edge: Context = { graph, view: null, picked: { kind: "edge", id: "e1" } };

    expect(inScope(scope, at(graph, block.id))).toBe(true);
    expect(inScope(scope, edge)).toBe(true);
    expect(inScope({ on: "element" }, edge)).toBe(false);
  });

  it("offers nothing element-scoped when nothing is selected", () => {
    const { graph } = layer();
    const names = offer(at(graph, null)).map((a) => a.name);

    expect(names).not.toContain("test.notes");
  });
});

describe("refusing", () => {
  it("comes back as a reason rather than as silence", () => {
    const { graph } = layer();

    expect(run("test.named", at(graph, null), {})).toEqual({ refused: "Needs a name." });
  });

  it("does not hide the action — a refusal is an answer, not an absence", () => {
    const { graph } = layer();

    expect(offer(at(graph, null)).map((a) => a.name)).toContain("test.named");
  });

  it("says so when nothing is registered under that name", () => {
    const { graph } = layer();

    expect(run("test.missing", at(graph, null))).toHaveProperty("refused");
  });

  it("refuses a write on a locked project and offers unlock or fork", () => {
    const { graph } = layer();
    const refused = run("test.named", at(graph, null, true), { label: "x" });

    expect(refused).toEqual({
      refused: "This package is locked.",
      offer: ["unlock", "fork"],
    });
  });

  it("still lets navigation run when the project is locked", () => {
    const { graph, block } = layer();
    const done = run("test.goes", at(graph, block.id, true));

    expect(done).toEqual({ mutations: [], open: block.id });
  });

  it("keeps writing actions offered when locked — the refusal is the answer", () => {
    const { graph } = layer();

    expect(offer(at(graph, null, true)).map((a) => a.name)).toContain("test.named");
  });
});

describe("what a sentence can reach", () => {
  it("takes an action whose arguments are all sayable", () => {
    expect(sayable(named)).toBe(true);
  });

  it("leaves one that needs a position to the gesture that has one", () => {
    expect(sayable(placed)).toBe(false);
  });

  it("takes one whose position is optional, since the layer can place it", () => {
    expect(sayable({ ...placed, args: [{ kind: "spot", name: "at", optional: true }] })).toBe(true);
  });
});

describe("what is worth a step", () => {
  it("is anything that changed the project", () => {
    const { graph } = layer();
    const done = run("test.named", at(graph, null), { label: "x" });

    expect(writes(done as { mutations: Mutation[] })).toBe(true);
  });

  it("is not going somewhere — navigation is not history", () => {
    const { graph, block } = layer();
    const done = run("test.goes", at(graph, block.id)) as { mutations: Mutation[]; open?: string };

    expect(done.open).toBe(block.id);
    expect(writes(done)).toBe(false);
  });
});

describe("where a step lands", () => {
  it("lets an effect name the project the mutations land in", () => {
    const homes: Action = {
      name: "test.home", label: "Home", about: "writes a fact into another project",
      scope: { on: "layer" }, args: [],
      run: () => ({
        mutations: [{ op: "set_body", id: "root", body: "stated" }],
        into: "proj_structure",
        say: "home: interface",
      }),
    };
    register(homes);

    const { graph } = layer();
    const done = run("test.home", at(graph, null));

    expect(done).toMatchObject({
      into: "proj_structure",
      say: "home: interface",
    });
    expect(writes(done as { mutations: Mutation[] })).toBe(true);
  });

  it("counts home batches as writing", () => {
    const homes: Action = {
      name: "test.home.batch", label: "Home batch", about: "writes home only",
      scope: { on: "layer" }, args: [],
      run: () => ({
        mutations: [],
        home: [{
          into: "proj_structure",
          mutations: [{ op: "set_body", id: "root", body: "stated" }],
        }],
      }),
    };
    register(homes);

    const { graph } = layer();
    const done = run("test.home.batch", at(graph, null));

    expect(writes(done as Effect)).toBe(true);
  });
});
