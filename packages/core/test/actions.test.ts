/** The action surface: `check` agrees with `run`, and every action is honest about whether it
 *  writes. */

import { describe, expect, it } from "vitest";
import { FLOOR, related } from "@mnd/fixtures";
import { MAIN, adjustments, all, children, def_named, fold,
         attributes_of, holders_in, offer, run, session,
         writes,
         type Context } from "../src/index";

const ctx = (picked: string[] = [], layer: string | null = "block_loop"): Context =>
  ({ graph: fold(related(), FLOOR), layer, picked });

/** A grid of three body cells under its headers, two filled, one picked. */
const gridded = (): Context => {
  const c = ctx(["block_pump"]);
  const b = c.graph.blocks;
  b["block_loop"] = { ...b["block_loop"]!, settings: { layout: { kind: "auto" } } };
  b["block_hot"] = { ...b["block_hot"]!, type: "grid", grid: { rows: 2, cols: 4 } };
  b["block_tank"] = { ...b["block_tank"]!, parent: "block_hot", cell: { r: 1, c: 1 } };
  b["block_valve"] = { ...b["block_valve"]!, parent: "block_hot", cell: { r: 1, c: 2 } };
  return { ...c, cells: [{ group: "block_hot", r: 1, c: 1 }] };
};

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
    const c = gridded();
    for (const a of all()) {
      const out = a.run(c, { id: "block_tank", to: "block_hx", from: "block_tank",
                             body: "x", text: "x", name: "f", owner: "block_tank",
                             target: "block_hx", parent: MAIN, holder: "block_tank",
                             members: ["block_tank"], group: "block_hot", dir: "forward",
                             module: "line", kind: "auto", flow: "in",
                             way: "row", at: "0,0", as: "row",
                             def: "block", form: "number" });
      expect(out.mutations.length > 0, a.name).toBe(writes(a.name));
    }
  });

  it("returns mutations and never applies them", () => {
    const before = fold(related(), FLOOR);
    const c: Context = { graph: before, layer: "block_loop", picked: [] };
    run("create", c, { name: "Filter" });
    expect(before).toEqual(fold(related(), FLOOR));
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

  /** A name is not an identity, so nothing is refused for wearing one. */
  it("allows a name a sibling already has", () => {
    expect(run("create", ctx(), { name: "Pump" })).not.toHaveProperty("refused");
    expect(run("rename", ctx(), { id: "block_hx", name: "Pump" }))
      .not.toHaveProperty("refused");
    expect(run("move", ctx(), { ids: ["block_pump"], parent: "block_hx" }))
      .not.toHaveProperty("refused");
  });

  it("refuses an action nobody registered", () => {
    expect(run("teleport", ctx(), {})).toHaveProperty("refused");
  });
});

describe("what an action absorbs", () => {
  it("move covers nesting, promotion and filing with one argument", () => {
    const s = session({ floor: FLOOR });
    s.go("create", { name: "Ledger" });
    const ledger = children(s.graph(), MAIN)[0]!.id;
    s.go("create", { name: "Auth", parent: ledger });
    const auth = children(s.graph(), ledger)[0]!.id;

    s.go("move", { id: auth, parent: MAIN });
    expect(s.graph().blocks[auth]!.parent).toBe(MAIN);

    s.go("move", { id: auth, parent: ledger });
    expect(s.graph().blocks[auth]!.parent).toBe(ledger);
  });

  /** Where it sits is where you put it. */
  it("orders siblings as they are added, and as they are dropped", () => {
    const s = session({ floor: FLOOR });
    for (const name of ["A", "B", "C"]) s.go("create", { name });
    const named = () => children(s.graph(), MAIN).map((b) => b.name);
    expect(named()).toEqual(["A", "B", "C"]);

    /** A gap left by a delete is not somewhere to put the next one. */
    s.go("delete", { ids: [children(s.graph(), MAIN)[1]!.id] });
    s.go("create", { name: "D" });
    expect(named()).toEqual(["A", "C", "D"]);

    const [a, c, d] = children(s.graph(), MAIN).map((b) => b.id);
    s.go("move", { id: d!, parent: MAIN, before: a });
    expect(named()).toEqual(["D", "A", "C"]);

    /** Nothing to go in front of is the end of the list. */
    s.go("move", { id: c!, parent: MAIN });
    expect(named()).toEqual(["D", "A", "C"]);
    s.go("move", { id: a!, parent: MAIN });
    expect(named()).toEqual(["D", "C", "A"]);
  });

  /** A reorder is not a move out of anywhere, so it shifts no card. */
  it("keeps where a block sits when it stays under the same parent", () => {
    const s = session({ floor: FLOOR });
    for (const name of ["A", "B"]) s.go("create", { name });
    const [a, b] = children(s.graph(), MAIN).map((x) => x.id);
    s.adjust("place", adjustments.place([{ id: a!, x: 96, y: 48 }]));

    s.go("move", { id: a!, parent: MAIN, before: b });
    expect(s.graph().blocks[a!]).toMatchObject({ x: 96, y: 48 });
  });

  it("appends what arrives from somewhere else", () => {
    const s = session({ floor: FLOOR });
    s.go("create", { name: "Shelf" });
    const shelf = children(s.graph(), MAIN)[0]!.id;
    for (const name of ["A", "B"]) s.go("create", { name, parent: shelf });
    s.go("create", { name: "Loose" });
    const loose = children(s.graph(), MAIN).find((b) => b.name === "Loose")!.id;

    s.go("move", { id: loose, parent: shelf });
    expect(children(s.graph(), shelf).map((b) => b.name)).toEqual(["A", "B", "Loose"]);
  });

  it("group makes a boundary without an into, and joins one with it", () => {
    const s = session({ floor: FLOOR });
    s.go("create", { name: "Loop" });
    const loop = children(s.graph(), MAIN)[0]!.id;
    s.look(loop);
    s.go("create", { name: "A" });
    s.go("create", { name: "B" });
    const [a, b] = children(s.graph(), loop).map((x) => x.id);

    s.go("group", { members: [a] });
    const group = holders_in(s.graph(), loop)[0]!;
    expect(s.graph().blocks[a!]!.parent).toBe(group.id);

    expect(s.go("group", { members: [b], into: group.id })).toBeNull();
    expect(holders_in(s.graph(), loop)).toHaveLength(1);
    expect(s.graph().blocks[b!]!.parent).toBe(group.id);
  });

});

describe("the way out of a layer", () => {
  /** An interface is drawn on its owner's border and in its owner's own wall. */
  const seated = () => {
    const s = session({ floor: FLOOR });
    s.go("create", { name: "Loop" });
    const loop = children(s.graph(), MAIN)[0]!.id;
    s.look(loop);
    s.go("create", { name: "Pump" });
    const pump = children(s.graph(), loop)[0]!.id;
    s.go("interface", { owner: pump });
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
    expect(s.layer()).toBe(MAIN);
  });
});

describe("interfaces sit where a capability allows them", () => {
  /** The refusal is a capability the base package states, so the floor has to be under it. */
  it("refuses a group for an owner", () => {
    const s = session({ floor: FLOOR });
    s.go("create", { name: "A" });
    s.go("create", { name: "B" });
    const ids = children(s.graph(), MAIN).map((b) => b.id);
    s.go("group", { members: ids });
    const group = holders_in(s.graph(), MAIN)[0]!;
    expect(s.go("interface", { owner: group.id }))
      .toMatch(/takes no interfaces/);
  });
});

describe("a field on a layer", () => {
  const seeded = () => session({ floor: FLOOR });

  it("records what a layer draws definitions from", () => {
    const s = seeded();
    s.go("create", { name: "Loop" });
    const loop = children(s.graph(), MAIN)[0]!.id;
    s.look(loop);
    expect(s.go("field", { holder: loop, name: "vocabulary",
                           value: "structure note" })).toBeNull();
    const field = s.graph().blocks[loop]!.values!.find((f) => f.name === "vocabulary")!;
    expect(field.value).toBe("structure note");
  });

  /** A definition holder declares rather than sets. */
  it("declares an attribute on a definition when the holder is one", () => {
    const s = seeded();
    s.go("define", { name: "Machine", domain: "block" });
    const id = def_named(s.graph(), "Machine", "block")!.id;
    expect(s.go("field", { holder: id, name: "mass", type: "number",
                           unit: "kg" })).toBeNull();
    expect(s.graph().blocks[id]!.def!.attributes)
      .toEqual([{ name: "mass", type: "number", unit: "kg" }]);
    expect(s.go("unfield", { holder: id, name: "mass" })).toBeNull();
    expect(s.graph().blocks[id]!.def!.attributes).toBeUndefined();
  });

  /** The floor is never written: a base is extended, never edited. */
  it("refuses an attribute on a base, and a subtype reads its own", () => {
    const s = seeded();
    expect(s.go("field", { holder: "block", name: "mass", type: "number" })).not.toBeNull();
    s.go("define", { name: "Machine", domain: "block" });
    const machine = def_named(s.graph(), "Machine", "block")!.id;
    s.go("field", { holder: machine, name: "mass", type: "number" });
    expect(attributes_of(s.graph(), machine).map((f) => f.name)).toContain("mass");
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

  /** Navigation is a gesture, not a menu entry. */
  it("offers no way out at layer scope", () => {
    expect(offer(ctx([], null)).map((a) => a.name)).not.toContain("open");
    expect(offer(ctx([], "block_loop")).map((a) => a.name)).not.toContain("open");
    expect(offer(ctx(["block_pump"])).map((a) => a.name)).toContain("open");
  });
});
