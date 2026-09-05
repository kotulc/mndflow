/** The action surface: `check` agrees with `run`, and every action is honest
 *  about whether it writes. */

import { describe, expect, it } from "vitest";
import { related } from "@mnd/fixtures";
import { ROOT, adjustments, all, children, fold, offer, run, session, writes,
         type Context } from "../src/index";

const ctx = (picked: string[] = [], layer: string | null = "block_loop"): Context =>
  ({ graph: fold(related()), layer, picked });

/** The same layer with its boundary made into a grid, two cells filled and the
 *  reading direction — what the grid actions are about. */
const gridded = (): Context => {
  const c = ctx(["block_pump"]);
  const b = c.graph.blocks;
  b["block_loop"] = { ...b["block_loop"]!, arrangement: "grid" };
  b["block_hot"] = { ...b["block_hot"]!, type: "grid", rows: 1, cols: 2 };
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
                             label: "x", body: "x", text: "x", name: "f", owner: "block_tank",
                             target: "block_hx", parent: ROOT, holder: "block_tank",
                             members: ["block_tank"], group: "block_hot", dir: "forward",
                             module: "line", arrangement: "down", flow: "in",
                             way: "row", at: "0,0", as: "row",
                             def: "block", form: "number" });
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

  /** **A name is not an identity, so nothing is refused for wearing one.** Two
   *  parts of an assembly are called the same thing all the time, and the rule
   *  that said otherwise was about typing rather than about the model. */
  it("allows a name a sibling already has", () => {
    expect(run("create", ctx(), { label: "Pump" })).not.toHaveProperty("refused");
    expect(run("rename", ctx(), { id: "block_hx", label: "Pump" }))
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

  /** **A group is the layer's, the way an address is the group's.** A block
   *  that kept its old grid on the way out was placed by an address in a grid
   *  the new layer does not hold, so the drawing had nowhere to put it and drew
   *  nothing while the tree went on listing it. */
  it("drops the place and the group it had when it leaves a layer", () => {
    const s = session();
    for (const label of ["Alpha", "Beta"]) s.go("create", { label });
    const at = (label: string) => children(s.graph(), ROOT).find((b) => b.label === label)!.id;
    const alpha = at("Alpha"), beta = at("Beta");
    s.go("group", { members: [alpha], rows: 2, cols: 2 });
    const grid = Object.values(s.graph().blocks).find((b) => b.type === "grid")!.id;
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
    for (const label of ["A", "B"]) s.go("create", { label });
    const [a, b] = children(s.graph(), ROOT).map((x) => x.id);
    s.adjust("place", adjustments.place([{ id: a!, x: 96, y: 48 }]));

    s.go("move", { id: a!, parent: ROOT, before: b });
    expect(s.graph().blocks[a!]).toMatchObject({ x: 96, y: 48 });
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
    expect(s.graph().blocks[a!]!.group).toBe(group.id);

    expect(s.go("group", { members: [b], into: group.id })).toBeNull();
    expect(children(s.graph(), loop).filter((x) => x.type === "group")).toHaveLength(1);
    expect(s.graph().blocks[b!]!.group).toBe(group.id);
  });

  it("dissolves a group when the last member leaves", () => {
    const s = session();
    s.go("create", { label: "A" });
    const a = children(s.graph(), ROOT)[0]!.id;
    s.go("group", { members: [a] });
    const group = children(s.graph(), ROOT).find((x) => x.type === "group")!.id;

    expect(s.go("leave", { ids: [a] })).toBeNull();
    expect(s.graph().blocks[group]).toBeUndefined();
    expect(s.graph().blocks[a]!.group).toBeUndefined();
  });

  it("dissolves an empty group shell when it leaves its parent", () => {
    const s = session();
    s.go("create", { label: "A" });
    s.go("create", { label: "B" });
    const [a, b] = children(s.graph(), ROOT).map((x) => x.id);
    s.go("group", { members: [a] });
    const inner = children(s.graph(), ROOT).find((x) => x.type === "group")!.id;
    s.go("group", { members: [b] });
    const outer = children(s.graph(), ROOT).find((x) => x.type === "group" && x.id !== inner)!.id;
    s.go("group", { members: [inner], into: outer });
    s.go("leave", { ids: [a] });

    expect(s.go("leave", { ids: [inner] })).toBeNull();
    expect(s.graph().blocks[inner]).toBeUndefined();
    expect(s.graph().blocks[outer]).toBeTruthy();
    expect(s.graph().blocks[b]!.group).toBe(outer);
  });

  it("dissolves inner when the last block moves to the outer group", () => {
    const s = session();
    s.go("create", { label: "A" });
    s.go("create", { label: "Temp" });
    const [a, temp] = children(s.graph(), ROOT).map((x) => x.id);
    s.go("group", { members: [a] });
    const inner = children(s.graph(), ROOT).find((x) => x.type === "group")!.id;
    s.go("group", { members: [temp] });
    const outer = children(s.graph(), ROOT).find((x) => x.type === "group" && x.id !== inner)!.id;
    s.go("group", { members: [inner], into: outer });
    s.go("leave", { ids: [temp] });

    expect(s.go("group", { members: [a], into: outer })).toBeNull();
    expect(s.graph().blocks[inner]).toBeUndefined();
    expect(s.graph().blocks[a]!.group).toBe(outer);
  });

  it("dissolves empty groups up to the layer", () => {
    const s = session();
    s.go("create", { label: "A" });
    s.go("create", { label: "Temp" });
    const [a, temp] = children(s.graph(), ROOT).map((x) => x.id);
    s.go("group", { members: [a] });
    const inner = children(s.graph(), ROOT).find((x) => x.type === "group")!.id;
    s.go("group", { members: [temp] });
    const outer = children(s.graph(), ROOT).find((x) => x.type === "group" && x.id !== inner)!.id;
    s.go("group", { members: [inner], into: outer });
    s.go("leave", { ids: [temp] });

    expect(s.go("leave", { ids: [a] })).toBeNull();
    expect(s.graph().blocks[inner]).toBeUndefined();
    expect(s.graph().blocks[outer]).toBeUndefined();
    expect(s.graph().blocks[a]!.group).toBeUndefined();
  });

  it("dissolves a nested group when its last member leaves", () => {
    const s = session();
    s.go("create", { label: "A" });
    s.go("create", { label: "B" });
    const [a, b] = children(s.graph(), ROOT).map((x) => x.id);
    s.go("group", { members: [a] });
    const inner = children(s.graph(), ROOT).find((x) => x.type === "group")!.id;
    s.go("group", { members: [b] });
    const outer = children(s.graph(), ROOT).find((x) => x.type === "group" && x.id !== inner)!.id;
    s.go("group", { members: [inner], into: outer });

    expect(s.go("leave", { ids: [a] })).toBeNull();
    expect(s.graph().blocks[inner]).toBeUndefined();
    expect(s.graph().blocks[outer]).toBeTruthy();
    expect(s.graph().blocks[b]!.group).toBe(outer);
  });

  it("draws a second boundary on the layer instead of nesting inside the first", () => {
    const s = session();
    s.go("create", { label: "Loop" });
    const loop = children(s.graph(), ROOT)[0]!.id;
    s.look(loop);
    s.go("create", { label: "A" });
    s.go("create", { label: "B" });
    s.go("create", { label: "C" });
    const [a, b, c] = children(s.graph(), loop).map((x) => x.id);
    s.go("group", { members: [a, b, c] });
    const outer = children(s.graph(), loop).find((x) => x.type === "group")!.id;

    s.go("group", { members: [a!, b!] });
    const groups = children(s.graph(), loop).filter((x) => x.type === "group");
    expect(groups).toHaveLength(2);
    const inner = groups.find((g) => g.id !== outer)!;
    expect(s.graph().blocks[a!]!.group).toBe(inner.id);
    expect(s.graph().blocks[b!]!.group).toBe(inner.id);
    expect(s.graph().blocks[c!]!.group).toBe(outer);
    expect(s.graph().blocks[inner.id]!.group).toBeUndefined();
  });

  it("merges two group boundaries into one", () => {
    const s = session();
    s.go("create", { label: "Loop" });
    const loop = children(s.graph(), ROOT)[0]!.id;
    s.look(loop);
    s.go("create", { label: "A" });
    s.go("create", { label: "B" });
    s.go("create", { label: "C" });
    s.go("create", { label: "D" });
    const [a, b, c, d] = children(s.graph(), loop).map((x) => x.id);
    s.go("group", { members: [a, b] });
    const g1 = children(s.graph(), loop).find((x) => x.type === "group")!.id;
    s.go("group", { members: [c, d] });
    const g2 = children(s.graph(), loop).find((x) => x.type === "group" && x.id !== g1)!.id;

    expect(s.go("group", { members: [g1, g2] })).toBeNull();
    const groups = children(s.graph(), loop).filter((x) => x.type === "group");
    expect(groups).toHaveLength(1);
    const merged = groups[0]!.id;
    expect(s.graph().blocks[a!]!.group).toBe(merged);
    expect(s.graph().blocks[b!]!.group).toBe(merged);
    expect(s.graph().blocks[c!]!.group).toBe(merged);
    expect(s.graph().blocks[d!]!.group).toBe(merged);
    expect(s.graph().blocks[g1]).toBeUndefined();
    expect(s.graph().blocks[g2]).toBeUndefined();
  });

  it("nests a group inside another when dragged in", () => {
    const s = session();
    s.go("create", { label: "Loop" });
    const loop = children(s.graph(), ROOT)[0]!.id;
    s.look(loop);
    s.go("create", { label: "A" });
    s.go("create", { label: "B" });
    s.go("create", { label: "C" });
    const [a, b, c] = children(s.graph(), loop).map((x) => x.id);
    s.go("group", { members: [a, b] });
    const outer = children(s.graph(), loop).find((x) => x.type === "group")!.id;
    s.go("group", { members: [c] });
    const inner = children(s.graph(), loop).find((x) => x.type === "group" && x.id !== outer)!.id;

    expect(s.go("group", { members: [inner], into: outer })).toBeNull();
    expect(s.graph().blocks[inner]!.group).toBe(outer);
    expect(s.graph().blocks[c!]!.group).toBe(inner);
    expect(children(s.graph(), loop).filter((x) => x.type === "group")).toHaveLength(2);
  });

  it("puts a grid inside a group", () => {
    const s = session();
    s.go("create", { label: "Loop" });
    const loop = children(s.graph(), ROOT)[0]!.id;
    s.look(loop);
    s.go("create", { label: "A" });
    s.go("create", { label: "B" });
    const [a, b] = children(s.graph(), loop).map((x) => x.id);
    s.go("group", { members: [a], rows: 2, cols: 2 });
    const grid = children(s.graph(), loop).find((x) => x.type === "grid")!.id;
    s.go("group", { members: [b] });
    const band = children(s.graph(), loop).find((x) => x.type === "group")!.id;
    expect(s.go("group", { members: [grid], into: band })).toBeNull();
    expect(s.graph().blocks[grid]!.group).toBe(band);
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
    const at = (label: string) => children(s.graph(), loop).find((b) => b.label === label)!.id;
    /** **A note is always about something**, so making one names what. */
    s.go("note", { about: at("Tank"), text: "runs clockwise" });
    const note = children(s.graph(), loop).find((b) => b.type === "note")!.id;

    const before = new Set(Object.keys(s.graph().edges));
    s.go("relate", { from: note, to: at("Pump"), module: "directed" });
    const edge = Object.values(s.graph().edges).find((e) => !before.has(e.id))!;
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
    const pump = children(s.graph(), loop).find((b) => b.label === "Pump")!;
    s.go("note", { about: pump.id, text: "runs clockwise" });
    const note = children(s.graph(), loop).find((b) => b.type === "note")!;

    const before = new Set(Object.keys(s.graph().edges));
    s.go("relate", { from: pump.id, to: note.id, module: "line" });
    expect(Object.values(s.graph().edges).find((e) => !before.has(e.id))!.module).toBe("tie");
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

describe("interfaces sit on blocks, not boundaries", () => {
  it("refuses a group for an owner", () => {
    const s = session();
    s.go("create", { label: "A" });
    s.go("create", { label: "B" });
    const ids = children(s.graph(), ROOT).map((b) => b.id);
    s.go("group", { members: ids });
    const group = Object.values(s.graph().blocks).find((b) => b.type === "group")!;
    expect(s.go("interface", { owner: group.id, side: "right" }))
      .toMatch(/boundary cannot have an interface/);
  });
});

describe("a field on a layer", () => {
  /** A fresh workspace has no floor until an app hands one in — core may not
   *  reach for the package that supplies it. */
  const seeded = () => session({ defs: ["block", "note"].map((name) => ({
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
    expect(s.go("field", { holder: "block", name: "mass", form: "number",
                           unit: "kg" })).toBeNull();
    expect(s.graph().defs["block"]!.fields)
      .toEqual([{ name: "mass", form: "number", unit: "kg", choices: undefined }]);
    expect(s.go("unfield", { holder: "block", name: "mass" })).toBeNull();
    expect(s.graph().defs["block"]!.fields).toEqual([]);
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
