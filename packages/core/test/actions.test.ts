/** The action surface: `check` agrees with `run`, and every action is honest
 *  about whether it writes. */

import { describe, expect, it } from "vitest";
import { related } from "@mnd/fixtures";
import { ROOT, all, children, fold, offer, run, session, writes,
         type Context } from "../src/index";

const ctx = (picked: string[] = [], layer: string | null = "block_loop"): Context =>
  ({ graph: fold(related()), layer, picked });

describe("the registry", () => {
  it("gives every action a sentence, a scope and a run", () => {
    for (const a of all()) {
      expect(a.about.length, a.name).toBeGreaterThan(10);
      expect(a.on.length, a.name).toBeGreaterThan(0);
      expect(typeof a.run, a.name).toBe("function");
    }
  });

  it("names every action once", () => {
    const names = all().map((a) => a.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("marks navigation as writing nothing, and everything else as writing", () => {
    const c = ctx(["block_pump"]);
    for (const a of all()) {
      const out = a.run(c, { id: "block_pump", to: "block_hx", from: "block_pump",
                             label: "x", body: "x", text: "x", name: "f", owner: "block_pump",
                             target: "block_hx", parent: ROOT, holder: "block_pump",
                             members: ["block_pump"], group: "block_hot", dir: "forward",
                             module: "line", arrangement: "grid", flow: "in",
                             def: "structure", form: "number" });
      expect(out.mutations.length > 0, a.name).toBe(writes(a.name));
    }
  });

  it("returns mutations and never applies them", () => {
    const before = fold(related());
    const c: Context = { graph: before, layer: "block_loop", picked: [] };
    run("create", c, { label: "Filter" });
    expect(before).toEqual(fold(related()));
  });
});

describe("check agrees with run", () => {
  it.each([
    ["a block cannot contain itself", "move", { id: "block_pump", parent: "block_pump" }],
    ["a block cannot be moved inside itself", "move", { id: "block_loop", parent: "block_pump" }],
    ["a block cannot relate to itself", "relate", { from: "block_pump", to: "block_pump" }],
    ["a layer cannot hold a stand-in for itself", "refer", { target: "block_loop" }],
    ["a note is its text", "note", { text: "  " }],
  ])("refuses in words: %s", (_why, name, args) => {
    const out = run(name, ctx(), args);
    expect(out).toHaveProperty("refused");
  });

  it("refuses a name a sibling already has", () => {
    expect(run("create", ctx(), { label: "Pump" })).toHaveProperty("refused");
    expect(run("create", ctx(), { label: "Filter" })).not.toHaveProperty("refused");
  });

  it("refuses an action nobody registered", () => {
    expect(run("teleport", ctx(), {})).toHaveProperty("refused");
  });
});

describe("what an action absorbs", () => {
  it("move covers nesting, promotion and filing with one argument", () => {
    const s = session();
    s.go("create", { label: "Ledger" });
    const ledger = children(s.graph(), ROOT)[0]!.id;
    s.go("create", { label: "Auth", parent: ledger });
    const auth = children(s.graph(), ledger)[0]!.id;

    s.go("move", { id: auth, parent: ROOT });
    expect(s.graph().blocks[auth]!.parent).toBe(ROOT);

    s.go("move", { id: auth, parent: ledger });
    expect(s.graph().blocks[auth]!.parent).toBe(ledger);
  });

  it("group makes a boundary without an into, and joins one with it", () => {
    const s = session();
    s.go("create", { label: "Loop" });
    const loop = children(s.graph(), ROOT)[0]!.id;
    s.look(loop);
    s.go("create", { label: "A" });
    s.go("create", { label: "B" });
    const [a, b] = children(s.graph(), loop).map((x) => x.id);

    s.go("group", { members: [a] });
    const group = children(s.graph(), loop).find((x) => x.type === "group")!;
    expect(s.graph().blocks[a!]!.groups).toContain(group.id);

    s.go("group", { members: [b], into: group.id });
    expect(children(s.graph(), loop).filter((x) => x.type === "group")).toHaveLength(1);
    expect(s.graph().blocks[b!]!.groups).toContain(group.id);
  });

  it("relate assigns tie and reference from the ends rather than taking them", () => {
    const s = session();
    s.go("create", { label: "Loop" });
    const loop = children(s.graph(), ROOT)[0]!.id;
    s.look(loop);
    s.go("create", { label: "Pump" });
    s.go("note", { text: "runs clockwise" });
    const pump = children(s.graph(), loop).find((b) => b.label === "Pump")!;
    const note = children(s.graph(), loop).find((b) => b.type === "note")!;

    s.go("relate", { from: pump.id, to: note.id, module: "line" });
    expect(Object.values(s.graph().edges)[0]!.module).toBe("tie");
  });
});

describe("pin keeps a layer as a view", () => {
  const kept = () => {
    const s = session();
    s.go("create", { label: "Loop" });
    const loop = children(s.graph(), ROOT)[0]!.id;
    s.look(loop);
    s.go("create", { label: "Pump" });
    s.go("create", { label: "Valve" });
    s.go("pin", { name: "Wet side" });
    return { s, loop };
  };

  it("makes a view block holding one reference per thing shown", () => {
    const { s } = kept();
    const view = Object.values(s.graph().blocks).find((b) => b.type === "view")!;
    const inside = children(s.graph(), view.id);
    expect(inside).toHaveLength(2);
    expect(inside.every((b) => b.of !== undefined)).toBe(true);
  });

  it("files it beside what it looks at, never inside it", () => {
    const { s, loop } = kept();
    const view = Object.values(s.graph().blocks).find((b) => b.type === "view")!;
    expect(view.parent).toBe(ROOT);
    expect(children(s.graph(), loop).some((b) => b.type === "view")).toBe(false);
  });

  it("refuses to keep a layer holding nothing, and one with no name", () => {
    const s = session();
    expect(s.go("pin", { name: "Nothing" })).toMatch(/nothing here/);
    s.go("create", { label: "A" });
    expect(s.go("pin", { name: "" })).toMatch(/needs a name/);
  });

  it("undoes like anything else", () => {
    const { s } = kept();
    s.undo();
    expect(Object.values(s.graph().blocks).some((b) => b.type === "view")).toBe(false);
  });
});

describe("vocabulary", () => {
  /** A fresh workspace has no floor until an app hands one in — core may not
   *  reach for the package that supplies it. */
  const seeded = () => session({ defs: ["structure", "note"].map((name) => ({
    op: "set_def" as const,
    def: { id: name, home: ROOT, group: "block" as const, name },
  })) });

  it("records what a layer draws definitions from", () => {
    const s = seeded();
    s.go("create", { label: "Loop" });
    const loop = children(s.graph(), ROOT)[0]!.id;
    s.look(loop);
    expect(s.go("vocabulary", { packages: "structure note" })).toBeNull();
    const field = s.graph().blocks[loop]!.fields!.find((f) => f.name === "vocabulary")!;
    expect(field.value).toBe("structure note");
  });

  it("refuses a package that is not there, and says which", () => {
    expect(seeded().go("vocabulary", { packages: "structure nowhere" })).toMatch(/nowhere/);
  });
});

describe("a null layer is the root layer", () => {
  it.each(["create", "note", "group", "refer"])(
    "%s never makes a second root", (name) => {
      const s = session();
      s.go("create", { label: "Ledger" });
      const ledger = children(s.graph(), ROOT)[0]!.id;
      s.look(null);
      s.go(name, { label: "A", text: "a note", members: [ledger], target: ledger });
      const roots = Object.values(s.graph().blocks).filter((b) => b.parent === null);
      expect(roots.map((b) => b.id)).toEqual([ROOT]);
    });

  it("arranges the root layer rather than nothing", () => {
    const s = session();
    s.look(null);
    s.go("arrange", { arrangement: "grid" });
    expect(s.graph().blocks[ROOT]!.arrangement).toBe("grid");
  });
});

describe("offer", () => {
  it("is membership only, with no ordering of its own", () => {
    const named = offer(ctx(["block_pump"])).map((a) => a.name);
    expect([...named].sort()).toEqual(named);
  });

  it("narrows by what is picked", () => {
    const none = offer(ctx([])).map((a) => a.name);
    const one = offer(ctx(["block_pump"])).map((a) => a.name);
    expect(none).not.toContain("rename");
    expect(one).toContain("rename");
  });

  it("does not offer up from the top", () => {
    expect(offer(ctx([], null)).map((a) => a.name)).not.toContain("up");
    expect(offer(ctx([], "block_loop")).map((a) => a.name)).toContain("up");
  });
});
