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

  /** **Where it sits is where you put it.** A block keeps the number it was
   *  made with, which among a new set of siblings is somebody else's place — so
   *  arriving renumbers the list, at the end unless a drop said otherwise. */
  it("orders siblings as they are added, and as they are dropped", () => {
    const s = session();
    for (const label of ["A", "B", "C"]) s.go("create", { label });
    const named = () => children(s.graph(), ROOT).map((b) => b.label);
    expect(named()).toEqual(["A", "B", "C"]);

    /** A gap left by a delete is not somewhere to put the next one. */
    s.go("delete", { ids: [children(s.graph(), ROOT)[1]!.id] });
    s.go("create", { label: "D" });
    expect(named()).toEqual(["A", "C", "D"]);

    const [a, c, d] = children(s.graph(), ROOT).map((b) => b.id);
    s.go("move", { id: d!, parent: ROOT, before: a });
    expect(named()).toEqual(["D", "A", "C"]);

    /** Nothing to go in front of is the end of the list. */
    s.go("move", { id: c!, parent: ROOT });
    expect(named()).toEqual(["D", "A", "C"]);
    s.go("move", { id: a!, parent: ROOT });
    expect(named()).toEqual(["D", "C", "A"]);
  });

  it("appends what arrives from somewhere else", () => {
    const s = session();
    s.go("create", { label: "Shelf" });
    const shelf = children(s.graph(), ROOT)[0]!.id;
    for (const label of ["A", "B"]) s.go("create", { label, parent: shelf });
    s.go("create", { label: "Loose" });
    const loose = children(s.graph(), ROOT).find((b) => b.label === "Loose")!.id;

    s.go("move", { id: loose, parent: shelf });
    expect(children(s.graph(), shelf).map((b) => b.label)).toEqual(["A", "B", "Loose"]);
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

  /** **What the ends decide is not on offer.** A relationship is a tie because
   *  one end of it is a note, whichever end that is and however the line came
   *  to be there. */
  it("ties a relationship to a note whichever end the note is", () => {
    const s = session();
    s.go("create", { label: "Loop" });
    const loop = children(s.graph(), ROOT)[0]!.id;
    s.look(loop);
    s.go("create", { label: "Pump" });
    s.go("create", { label: "Tank" });
    s.go("note", { text: "runs clockwise" });
    const at = (label: string) => children(s.graph(), loop).find((b) => b.label === label)!.id;
    const note = children(s.graph(), loop).find((b) => b.type === "note")!.id;

    s.go("relate", { from: note, to: at("Pump"), module: "directed" });
    const edge = Object.values(s.graph().edges)[0]!;
    expect(edge.module).toBe("tie");

    /** Asked to be a plain line, it says what it is instead of writing a step. */
    s.go("direct", { id: edge.id, dir: "none" });
    expect(s.graph().edges[edge.id]!.module).toBe("tie");

    /** And an end taken off the note is an ordinary line again. */
    s.go("relink", { id: edge.id, end: "from", to: at("Tank") });
    expect(s.graph().edges[edge.id]!.module).toBe("line");

    /** An end taken back onto it ties it again. */
    s.go("relink", { id: edge.id, end: "from", to: note });
    expect(s.graph().edges[edge.id]!.module).toBe("tie");
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

describe("the way out of a layer", () => {
  /** An interface is drawn in two layers at once: on its owner's border, out in
   *  the layer that holds the owner, and in that owner's own wall seen from
   *  inside. Its parent is only one of those two. */
  const seated = () => {
    const s = session();
    s.go("create", { label: "Loop" });
    const loop = children(s.graph(), ROOT)[0]!.id;
    s.look(loop);
    s.go("create", { label: "Pump" });
    const pump = children(s.graph(), loop)[0]!.id;
    s.go("interface", { owner: pump, side: "right" });
    const port = children(s.graph(), pump)[0]!.id;
    return { s, loop, pump, port };
  };

  it("comes back to the layer an interface was opened from", () => {
    const { s, loop, port } = seated();
    s.go("open", { id: port });
    expect(s.layer()).toBe(port);
    s.go("open");
    expect(s.layer()).toBe(loop);
  });

  it("comes back into the card when that is where the interface was opened", () => {
    const { s, pump, port } = seated();
    s.look(pump);
    s.go("open", { id: port });
    s.go("open");
    expect(s.layer()).toBe(pump);
  });

  it("leaves an ordinary block for what holds it", () => {
    const { s, loop, pump } = seated();
    s.go("open", { id: pump });
    s.go("open");
    expect(s.layer()).toBe(loop);
    s.go("open");
    expect(s.layer()).toBe(ROOT);
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

describe("a field on a layer", () => {
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
    expect(s.go("field", { holder: loop, name: "vocabulary",
                           value: "structure note" })).toBeNull();
    const field = s.graph().blocks[loop]!.fields!.find((f) => f.name === "vocabulary")!;
    expect(field.value).toBe("structure note");
  });

  /** **A definition holder declares rather than sets.** The same act, told
   *  about a definition instead of a usage. */
  it("adds a field to a definition when the holder is one", () => {
    const s = seeded();
    expect(s.go("field", { holder: "structure", name: "mass", form: "number",
                           unit: "kg" })).toBeNull();
    expect(s.graph().defs["structure"]!.fields)
      .toEqual([{ name: "mass", form: "number", unit: "kg", choices: undefined }]);
    expect(s.go("unfield", { holder: "structure", name: "mass" })).toBeNull();
    expect(s.graph().defs["structure"]!.fields).toEqual([]);
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

  /** **Navigation is a gesture, not a menu entry.** Leaving a layer is `open`
   *  with nothing to open, which nothing but a gesture can say — so it is never
   *  in the offered list, and there is no scope where it would be wrong. */
  it("offers no way out at layer scope", () => {
    expect(offer(ctx([], null)).map((a) => a.name)).not.toContain("open");
    expect(offer(ctx([], "block_loop")).map((a) => a.name)).not.toContain("open");
    expect(offer(ctx(["block_pump"])).map((a) => a.name)).toContain("open");
  });
});
