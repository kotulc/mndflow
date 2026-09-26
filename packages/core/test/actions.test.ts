/** The action surface: `check` agrees with `run`, and every action is honest about whether it
 *  writes. */

import { describe, expect, it } from "vitest";
import { FLOOR, related } from "@mnd/fixtures";
import { seed } from "@mnd/defs";
import { ROOT, adjustments, all, children, def_named, default_for, edge_base, fold,
         holders_in, offer, run, schema_of, session,
         writes,
         type Context } from "../src/index";

const ctx = (picked: string[] = [], layer: string | null = "block_loop"): Context =>
  ({ graph: fold(related(), FLOOR), layer, picked });

/** A grid of three cells, two filled, one picked. */
const gridded = (): Context => {
  const c = ctx(["block_pump"]);
  const b = c.graph.blocks;
  b["block_loop"] = { ...b["block_loop"]!, arrangement: "auto" };
  b["block_hot"] = { ...b["block_hot"]!, type: "grid", grid: { rows: 1, cols: 3 } };
  b["block_tank"] = { ...b["block_tank"]!, group: "block_hot", cell: { r: 0, c: 0 } };
  b["block_valve"] = { ...b["block_valve"]!, group: "block_hot", cell: { r: 0, c: 1 } };
  return { ...c, cells: [{ group: "block_hot", r: 0, c: 0 }] };
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
                             target: "block_hx", parent: ROOT, holder: "block_tank",
                             members: ["block_tank"], group: "block_hot", dir: "forward",
                             module: "line", arrangement: "down", flow: "in",
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
    const s = session();
    s.go("create", { name: "Ledger" });
    const ledger = children(s.graph(), ROOT)[0]!.id;
    s.go("create", { name: "Auth", parent: ledger });
    const auth = children(s.graph(), ledger)[0]!.id;

    s.go("move", { id: auth, parent: ROOT });
    expect(s.graph().blocks[auth]!.parent).toBe(ROOT);

    s.go("move", { id: auth, parent: ledger });
    expect(s.graph().blocks[auth]!.parent).toBe(ledger);
  });

  /** Where it sits is where you put it. */
  it("orders siblings as they are added, and as they are dropped", () => {
    const s = session();
    for (const name of ["A", "B", "C"]) s.go("create", { name });
    const named = () => children(s.graph(), ROOT).map((b) => b.name);
    expect(named()).toEqual(["A", "B", "C"]);

    /** A gap left by a delete is not somewhere to put the next one. */
    s.go("delete", { ids: [children(s.graph(), ROOT)[1]!.id] });
    s.go("create", { name: "D" });
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

  /** A group is the layer's, the way an address is the grid's. */
  it("drops the place and the group it had when it leaves a layer", () => {
    const s = session({ defs: seed() });
    for (const name of ["Alpha", "Beta"]) s.go("create", { name });
    const at = (name: string) => children(s.graph(), ROOT).find((b) => b.name === name)!.id;
    const alpha = at("Alpha"), beta = at("Beta");
    s.go("group", { members: [alpha], rows: 2, cols: 2 });
    const grid = holders_in(s.graph(), ROOT)[0]!.id;
    s.go("seat", { id: alpha, group: grid, at: "0,0" });
    expect(s.graph().blocks[alpha]!.group).toBe(grid);

    s.go("move", { id: alpha, parent: beta });
    const moved = s.graph().blocks[alpha]!;
    expect(moved.parent).toBe(beta);
    expect(moved.group).toBeUndefined();
    expect(moved.cell).toBeUndefined();
  });

  /** A reorder is not a move out of anywhere, so it shifts no card. */
  it("keeps where a block sits when it stays under the same parent", () => {
    const s = session();
    for (const name of ["A", "B"]) s.go("create", { name });
    const [a, b] = children(s.graph(), ROOT).map((x) => x.id);
    s.adjust("place", adjustments.place([{ id: a!, x: 96, y: 48 }]));

    s.go("move", { id: a!, parent: ROOT, before: b });
    expect(s.graph().blocks[a!]).toMatchObject({ x: 96, y: 48 });
  });

  it("appends what arrives from somewhere else", () => {
    const s = session();
    s.go("create", { name: "Shelf" });
    const shelf = children(s.graph(), ROOT)[0]!.id;
    for (const name of ["A", "B"]) s.go("create", { name, parent: shelf });
    s.go("create", { name: "Loose" });
    const loose = children(s.graph(), ROOT).find((b) => b.name === "Loose")!.id;

    s.go("move", { id: loose, parent: shelf });
    expect(children(s.graph(), shelf).map((b) => b.name)).toEqual(["A", "B", "Loose"]);
  });

  it("group makes a boundary without an into, and joins one with it", () => {
    const s = session({ defs: seed() });
    s.go("create", { name: "Loop" });
    const loop = children(s.graph(), ROOT)[0]!.id;
    s.look(loop);
    s.go("create", { name: "A" });
    s.go("create", { name: "B" });
    const [a, b] = children(s.graph(), loop).map((x) => x.id);

    s.go("group", { members: [a] });
    const group = holders_in(s.graph(), loop)[0]!;
    expect(s.graph().blocks[a!]!.group).toBe(group.id);

    expect(s.go("group", { members: [b], into: group.id })).toBeNull();
    expect(holders_in(s.graph(), loop)).toHaveLength(1);
    expect(s.graph().blocks[b!]!.group).toBe(group.id);
  });

  /** A holder is a block: it stays until it is deleted, and deleting it frees what it held. */
  it("keeps a group when its last member leaves", () => {
    const s = session({ defs: seed() });
    s.go("create", { name: "A" });
    const a = children(s.graph(), ROOT)[0]!.id;
    s.go("group", { members: [a] });
    const group = holders_in(s.graph(), ROOT)[0]!.id;

    expect(s.go("leave", { ids: [a] })).toBeNull();
    expect(s.graph().blocks[group]).toBeTruthy();
    expect(s.graph().blocks[a]!.group).toBeUndefined();
    expect(s.go("delete", { ids: [group] })).toBeNull();
    expect(s.graph().blocks[a]).toBeTruthy();
  });

  it("draws a second boundary on the layer instead of nesting inside the first", () => {
    const s = session({ defs: seed() });
    s.go("create", { name: "Loop" });
    const loop = children(s.graph(), ROOT)[0]!.id;
    s.look(loop);
    s.go("create", { name: "A" });
    s.go("create", { name: "B" });
    s.go("create", { name: "C" });
    const [a, b, c] = children(s.graph(), loop).map((x) => x.id);
    s.go("group", { members: [a, b, c] });
    const outer = holders_in(s.graph(), loop)[0]!.id;

    s.go("group", { members: [a!, b!] });
    const groups = holders_in(s.graph(), loop);
    expect(groups).toHaveLength(2);
    const inner = groups.find((g) => g.id !== outer)!;
    expect(s.graph().blocks[a!]!.group).toBe(inner.id);
    expect(s.graph().blocks[c!]!.group).toBe(outer);
    expect(inner.group).toBeUndefined();
  });

  it("nests a group inside another, and a grid inside nothing", () => {
    const s = session({ defs: seed() });
    s.go("create", { name: "Loop" });
    const loop = children(s.graph(), ROOT)[0]!.id;
    s.look(loop);
    s.go("create", { name: "A" });
    s.go("create", { name: "B" });
    s.go("create", { name: "C" });
    const [a, b, c] = children(s.graph(), loop).map((x) => x.id);
    s.go("group", { members: [a] });
    const outer = holders_in(s.graph(), loop)[0]!.id;
    s.go("group", { members: [b] });
    const inner = holders_in(s.graph(), loop).find((x) => x.id !== outer)!.id;
    s.go("group", { members: [c], rows: 1, cols: 1 });
    const grid = holders_in(s.graph(), loop).find((x) => ![outer, inner].includes(x.id))!.id;

    expect(s.go("group", { members: [inner], into: outer })).toBeNull();
    expect(s.graph().blocks[inner]!.group).toBe(outer);
    expect(s.go("group", { members: [grid], into: outer })).toMatch(/grid/);
    expect(s.go("group", { members: [a, grid] })).toMatch(/grid/);
  });

  /** What the ends decide is not on offer. */
  it("ties a relationship to a note whichever end the note is", () => {
    const s = session();
    s.go("create", { name: "Loop" });
    const loop = children(s.graph(), ROOT)[0]!.id;
    s.look(loop);
    s.go("create", { name: "Pump" });
    s.go("create", { name: "Tank" });
    const at = (name: string) => children(s.graph(), loop).find((b) => b.name === name)!.id;
    /** A note is always about something, so making one names what. */
    s.go("note", { about: at("Tank"), text: "runs clockwise" });
    const note = children(s.graph(), loop).find((b) => b.type === "note")!.id;

    const before = new Set(Object.keys(s.graph().edges));
    s.go("relate", { from: note, to: at("Pump"), module: "directed" });
    const edge = Object.values(s.graph().edges).find((e) => !before.has(e.id))!;
    expect(edge_base(s.graph(), edge.id)).toBe("tie");

    /** Asked to be a plain line, it says what it is instead of writing a step. */
    s.go("direct", { id: edge.id, dir: "none" });
    expect(edge_base(s.graph(), edge.id)).toBe("tie");

    /** And an end taken off the note is an ordinary line again. */
    s.go("relink", { id: edge.id, end: "from", to: at("Tank") });
    expect(edge_base(s.graph(), edge.id)).toBe("line");

    /** An end taken back onto it ties it again. */
    s.go("relink", { id: edge.id, end: "from", to: note });
    expect(edge_base(s.graph(), edge.id)).toBe("tie");
  });

  it("relate assigns tie from the ends rather than taking it", () => {
    const s = session();
    s.go("create", { name: "Loop" });
    const loop = children(s.graph(), ROOT)[0]!.id;
    s.look(loop);
    s.go("create", { name: "Pump" });
    const pump = children(s.graph(), loop).find((b) => b.name === "Pump")!;
    s.go("note", { about: pump.id, text: "runs clockwise" });
    const note = children(s.graph(), loop).find((b) => b.type === "note")!;

    const before = new Set(Object.keys(s.graph().edges));
    s.go("relate", { from: pump.id, to: note.id, module: "line" });
    const made = Object.values(s.graph().edges).find((e) => !before.has(e.id))!;
    expect(edge_base(s.graph(), made.id)).toBe("tie");
  });
});

describe("the way out of a layer", () => {
  /** An interface is drawn on its owner's border and in its owner's own wall. */
  const seated = () => {
    const s = session();
    s.go("create", { name: "Loop" });
    const loop = children(s.graph(), ROOT)[0]!.id;
    s.look(loop);
    s.go("create", { name: "Pump" });
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

describe("interfaces sit where a capability allows them", () => {
  /** The refusal is a capability the base package states, so the floor has to be under it. */
  it("refuses a group for an owner", () => {
    const s = session({ defs: seed() });
    s.go("create", { name: "A" });
    s.go("create", { name: "B" });
    const ids = children(s.graph(), ROOT).map((b) => b.id);
    s.go("group", { members: ids });
    const group = holders_in(s.graph(), ROOT)[0]!;
    expect(s.go("interface", { owner: group.id, side: "right" }))
      .toMatch(/takes no interfaces/);
  });
});

describe("a field on a layer", () => {
  /** A session with a minimal floor handed in. */
  const seeded = () => session({ defs: ["block", "note"].map((name) => ({
    op: "set_def" as const,
    def: { id: name, group: "block" as const, name },
  })) });

  it("records what a layer draws definitions from", () => {
    const s = seeded();
    s.go("create", { name: "Loop" });
    const loop = children(s.graph(), ROOT)[0]!.id;
    s.look(loop);
    expect(s.go("field", { holder: loop, name: "vocabulary",
                           value: "structure note" })).toBeNull();
    const field = s.graph().blocks[loop]!.fields!.find((f) => f.name === "vocabulary")!;
    expect(field.value).toBe("structure note");
  });

  /** A definition holder declares rather than sets. */
  it("adds a field to a definition when the holder is one", () => {
    const s = seeded();
    s.go("define", { name: "Machine", group: "block" });
    const id = def_named(s.graph(), "Machine", "block")!.id;
    expect(s.go("field", { holder: id, name: "mass", form: "number",
                           unit: "kg" })).toBeNull();
    expect(s.graph().defs[id]!.fields)
      .toEqual([{ name: "mass", form: "number", unit: "kg", choices: undefined }]);
    expect(s.go("unfield", { holder: id, name: "mass" })).toBeNull();
    expect(s.graph().defs[id]!.fields).toEqual([]);
  });

  /** The floor is never written: the first edit to a base mints the workspace's own word for
   *  it, and everything that reaches that base reads it. */
  it("declares a field on the workspace's own word rather than on the base", () => {
    const s = seeded();
    expect(s.go("field", { holder: "block", name: "mass", form: "number" })).toBeNull();
    expect(s.graph().defs["block"]!.fields).toBeUndefined();
    const over = default_for(s.graph(), "block")!;
    expect(s.graph().defs[over]!.fields?.map((f) => f.name)).toEqual(["mass"]);
    /** A subtype of the base reads it too, not only a block that named nothing. */
    s.go("define", { name: "Machine", group: "block" });
    const machine = def_named(s.graph(), "Machine", "block")!.id;
    expect(schema_of(s.graph(), machine).map((f) => f.name)).toContain("mass");
  });
});

describe("a null layer is the root layer", () => {
  it.each(["create", "note", "group", "refer"])(
    "%s never makes a second root", (name) => {
      const s = session();
      s.go("create", { name: "Ledger" });
      const ledger = children(s.graph(), ROOT)[0]!.id;
      s.look(null);
      s.go(name, { name: "A", text: "a note", members: [ledger], target: ledger });
      const roots = Object.values(s.graph().blocks).filter((b) => b.parent === null);
      expect(roots.map((b) => b.id)).toEqual([ROOT]);
    });

  it("arranges the root layer rather than nothing", () => {
    const s = session();
    s.look(null);
    s.go("arrange", { arrangement: "auto" });
    expect(s.graph().blocks[ROOT]!.arrangement).toBe("auto");
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
