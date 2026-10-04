/** The grid: seating, headers, allocation, and the actions that reshape one. */

import { beforeEach, describe, expect, it } from "vitest";
import { FLOOR } from "@mnd/fixtures";
import { MAIN, allocated_to, allocations_of, at_cell, edge_base, fold, head_of, is_grid,
         lattice_of, members_of, offer, run, step,
         type Args, type Cell, type Context, type Graph, type Grid, type Id,
         type Log, type Mutation } from "../src/index";

/** A grid of `rows` × `cols` on a layer, with nothing seated in it yet. */
function board(rows = 3, cols = 4): Graph {
  return { root: MAIN, edges: {},
    blocks: {
      [MAIN]: { id: MAIN, parent: null, name: "workspace", type: "folder" },
      layer: { id: "layer", parent: MAIN, type: "block", name: "Board" },
      lanes: { id: "lanes", parent: "layer", type: "grid", grid: { rows, cols }, x: 0, y: 0 },
    } };
}

let log: Log;
let g: Graph;

/** Through the log, the way the app does it. */
function commit(name: string, mutations: Mutation[]): void {
  log.push(step(`s${log.length}`, name, log.length, mutations));
  g = fold(log, FLOOR);
}

/** Put a block in a cell — a reference to `of` where it says one. Returns its id. */
function seat(id: Id, r: number, c: number, of?: Id): Id {
  commit("seat", [
    { op: "add_block", block: { id, parent: "layer", type: "block", name: id,
                                ...(of ? { of } : {}) } },
    { op: "set_group", id, group: "lanes" },
    { op: "seat_cell", id, cell: { r, c } },
  ]);
  return id;
}

/** A block on the layer, seated nowhere. */
function loose(id: Id): Id {
  commit("make", [{ op: "add_block", block: { id, parent: "layer", name: id } }]);
  return id;
}

const ctx = (picked: Id[] = ["lanes"], cells?: Context["cells"]): Context =>
  ({ graph: g, layer: "layer", picked, ...(cells ? { cells } : {}) });

/** Run an action and keep what it wrote. */
function act(name: string, args: Args = {}, cells?: Context["cells"]): void {
  const out = run(name, ctx(["lanes"], cells), args);
  if ("refused" in out) throw new Error(`${name} refused: ${out.refused}`);
  commit(name, out.mutations);
}

/** Which cell a block sits in, as a string, or `null` once it is free. */
const at = (id: Id): string | null => {
  const c = g.blocks[id]?.cell;
  return c && g.blocks[id]?.group ? `${c.r},${c.c}` : null;
};

const lattice = (): Grid => lattice_of(g, "lanes")!;

const labels = (bs: { id: Id }[]) => bs.map((b) => b.id).sort();

beforeEach(() => {
  log = [];
  commit("board", [{ op: "checkpoint", graph: board() }]);
});

describe("an address", () => {
  it("is nothing without a group, and leaving one drops both", () => {
    seat("a", 1, 1);
    expect(at("a")).not.toBeNull();
    act("leave", { ids: ["a"] });
    expect(g.blocks["a"]).toBeTruthy();
    expect(at("a")).toBeNull();
  });

  it("is dropped when a block moves to another holder, never carried over", () => {
    commit("band", [{ op: "add_block", block: { id: "band", parent: "layer", type: "group" } }]);
    seat("a", 2, 2);
    act("group", { members: ["a"], into: "band" });
    expect(g.blocks["a"]!.group).toBe("band");
    expect(g.blocks["a"]!.cell).toBeUndefined();
  });
});

describe("which line a header heads", () => {
  it.each([
    ["the corner", 0, 0, "both"],
    ["the top row", 0, 2, "col"],
    ["the left column", 2, 0, "row"],
    ["anywhere inside", 2, 3, null],
  ])("at %s is %s", (_what, r, c, want) => {
    act("heads", { way: "top", on: "yes" });
    act("heads", { way: "left", on: "yes" });
    seat("h", r as number, c as number, loose("x"));
    expect(head_of(g, "h")).toBe(want);
  });

  it("is nothing at all until the line is made a header", () => {
    seat("a", 1, 0);
    expect(head_of(g, "a")).toBeNull();
  });
});

describe("allocation", () => {
  const headed = () => {
    act("heads", { way: "top", on: "yes" });
    act("heads", { way: "left", on: "yes" });
  };

  it("gives a cell the block each of its headers stands for", () => {
    headed();
    seat("lane", 1, 0, loose("owner"));
    seat("col", 0, 2, loose("phase"));
    seat("x", 1, 2);
    expect(labels(allocations_of(g, "x"))).toEqual(["lanes", "owner", "phase"]);
  });

  it("reaches every block along the line, and nothing off it", () => {
    headed();
    seat("lane", 1, 0, loose("owner"));
    seat("here", 1, 3);
    seat("elsewhere", 2, 3);
    expect(labels(allocated_to(g, "owner"))).toEqual(["here"]);
  });

  it("is lost when the block leaves the grid, because it was the position", () => {
    headed();
    seat("lane", 1, 0, loose("owner"));
    seat("x", 1, 2);
    act("leave", { ids: ["x"] });
    expect(allocations_of(g, "x")).toHaveLength(0);
  });

  it("follows a merged header across every line it spans", () => {
    headed();
    seat("tall", 1, 0, loose("owner"));
    act("merge", {}, [{ group: "lanes", r: 1, c: 0 }, { group: "lanes", r: 2, c: 0 }]);
    seat("lower", 2, 2);
    expect(labels(allocations_of(g, "lower"))).toContain("owner");
  });

  it("puts every member under the holder it sits in", () => {
    seat("cell", 1, 2);
    expect(labels(allocated_to(g, "lanes"))).toEqual(["cell"]);
  });
});

describe("insert and remove", () => {
  it("moves what sits after the line, and leaves what sits before it", () => {
    seat("above", 0, 1);
    seat("below", 2, 1);
    act("insert", { way: "row", at: 1 });
    expect(at("above")).toBe("0,1");
    expect(at("below")).toBe("3,1");
  });

  it("stretches a merge it passes through rather than splitting it", () => {
    seat("wide", 0, 0);
    act("merge", {}, [{ group: "lanes", r: 0, c: 0 }, { group: "lanes", r: 0, c: 2 }]);
    const before = lattice().merges![0]!;
    act("insert", { way: "col", at: 1 });
    expect(lattice().merges![0]!.cols).toBe(before.cols + 1);
  });

  /** A line taken away moves what it held rather than dropping it. */
  it("re-seats what the line held, and never deletes it", () => {
    seat("moved", 1, 1);
    act("remove", { way: "row", at: 1 });
    expect(g.blocks["moved"]).toBeTruthy();
    expect(g.blocks["moved"]!.cell!.r).toBeLessThan(lattice().rows);
  });

  it("takes a block out of the grid only where there is nowhere left to put it", () => {
    act("fill");
    const before = members_of(g, "lanes").map((b) => b.id);
    act("remove", { way: "row", at: 0 });
    const held = members_of(g, "lanes");
    /** Nothing is deleted — a layout gesture must not cost model content. */
    expect(before.every((id) => g.blocks[id])).toBe(true);
    /** And a member always sits in a cell. */
    expect(held.every((b) => b.cell)).toBe(true);
    expect(held).toHaveLength(lattice().rows * lattice().cols);
  });

  it("leaves every surviving address inside the extent, and each one once", () => {
    act("fill");
    act("remove", { way: "col", at: 1 });
    const { rows, cols } = lattice();
    const cells = members_of(g, "lanes").filter((b) => b.cell).map((b) => b.cell!);
    expect(cells.every((c) => c.r < rows && c.c < cols)).toBe(true);
    expect(new Set(cells.map((c) => `${c.r},${c.c}`)).size).toBe(cells.length);
  });

  it("gives back what it took, so a row in and a row out is a round trip", () => {
    seat("x", 2, 2);
    const rows = lattice().rows;
    act("insert", { way: "row", at: 0 });
    act("remove", { way: "row", at: 0 });
    expect(lattice().rows).toBe(rows);
    expect(at("x")).toBe("2,2");
  });
});

describe("merge and split", () => {
  it("answers at every address it covers with the block at its corner", () => {
    seat("one", 0, 0);
    act("merge", {}, [{ group: "lanes", r: 0, c: 0 }, { group: "lanes", r: 1, c: 1 }]);
    for (const [r, c] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
      expect(at_cell(g, "lanes", r!, c!)?.id).toBe("one");
    }
  });

  it("frees what it covers rather than losing it", () => {
    seat("keep", 0, 0);
    seat("shoved", 1, 1);
    act("merge", {}, [{ group: "lanes", r: 0, c: 0 }, { group: "lanes", r: 1, c: 1 }]);
    expect(g.blocks["shoved"]).toBeTruthy();
    expect(at("shoved")).not.toBe("1,1");
  });

  it("splits back to ordinary cells", () => {
    act("merge", {}, [{ group: "lanes", r: 0, c: 0 }, { group: "lanes", r: 0, c: 1 }]);
    expect(lattice().merges).toHaveLength(1);
    act("merge", {}, [{ group: "lanes", r: 0, c: 0 }]);
    expect(lattice().merges ?? []).toHaveLength(0);
  });
});

describe("transpose", () => {
  it("turns the grid and every address about the diagonal", () => {
    seat("x", 1, 3);
    const { rows, cols } = lattice();
    act("transpose");
    expect(lattice().rows).toBe(cols);
    expect(lattice().cols).toBe(rows);
    expect(at("x")).toBe("3,1");
  });

  it("turns a row header into a column header", () => {
    act("heads", { way: "left", on: "yes" });
    seat("lane", 1, 0, loose("owner"));
    expect(head_of(g, "lane")).toBe("row");
    act("transpose");
    expect(head_of(g, "lane")).toBe("col");
  });

  it("is its own inverse", () => {
    seat("x", 1, 2);
    act("transpose");
    act("transpose");
    expect(at("x")).toBe("1,2");
  });
});

describe("chain", () => {
  /** row 0: - b - c; row 1: h(header) d - - */
  const laid = () => {
    act("heads", { way: "left", on: "yes" });
    seat("b", 0, 1); seat("c", 0, 3);
    seat("h", 1, 0, loose("owner")); seat("d", 1, 1);
    return g;
  };
  const links = (graph: Graph) =>
    Object.values(graph.edges).map((e) => `${e.from}->${e.to}`);

  it("reads the whole grid as one run, on across the row below, passing over headers", () => {
    laid(); act("chain");
    expect(links(g)).toEqual(["b->c", "c->d"]);
  });

  it("draws the module it was given", () => {
    laid(); act("chain", { module: "line" });
    expect(Object.keys(g.edges).every((id) => edge_base(g, id) === "line")).toBe(true);
  });

  it("adds nothing the second time", () => {
    laid(); act("chain");
    const was = Object.keys(g.edges).length;
    const again = run("chain", ctx(), {});
    if (!("refused" in again)) expect(again.mutations).toHaveLength(0);
    expect(Object.keys(g.edges)).toHaveLength(was);
  });
});

describe("fill", () => {
  it("puts a block in every empty cell and disturbs none that is taken", () => {
    seat("kept", 1, 1);
    act("fill");
    expect(members_of(g, "lanes")).toHaveLength(lattice().rows * lattice().cols);
    expect(at("kept")).toBe("1,1");
  });

  it("hands every new block an alias of its own", () => {
    act("fill");
    const made = members_of(g, "lanes").map((b) => b.alias);
    expect(new Set(made).size).toBe(made.length);
    expect(made.every((a) => typeof a === "number")).toBe(true);
  });

  it("treats a merged region as the one cell it is", () => {
    act("merge", {}, [{ group: "lanes", r: 0, c: 0 }, { group: "lanes", r: 1, c: 1 }]);
    act("fill");
    const corner = at_cell(g, "lanes", 0, 0);
    expect(corner).toBeTruthy();
    for (const [r, c] of [[0, 1], [1, 0], [1, 1]]) {
      expect(at_cell(g, "lanes", r!, c!)?.id).toBe(corner!.id);
    }
  });

  it("has nothing left to do once it has run", () => {
    act("fill");
    expect("refused" in run("fill", ctx(), {})).toBe(true);
  });
});

describe("a grid is what its definition says", () => {
  it("is a grid whatever else it carries", () => {
    expect(is_grid(g, "lanes")).toBe(true);
    expect(is_grid(g, "layer")).toBe(false);
  });

  it("keeps its extent when everything in it is freed", () => {
    seat("a", 0, 0);
    const { rows, cols } = lattice();
    act("leave", { ids: ["a"] });
    expect(lattice().rows).toBe(rows);
    expect(lattice().cols).toBe(cols);
  });
});

/** Whole-grid actions are reachable from a cell. */
describe("the grid actions are reachable", () => {
  const named = (ctx: Partial<Context>) =>
    offer({ graph: g, layer: "layer", picked: [], ...ctx } as Context).map((a) => a.name);

  it.each(["fill", "chain", "transpose", "merge", "insert", "remove"])(
    "offers %s from a cell", (name) => {
      expect(named({ cells: [{ group: "lanes", r: 1, c: 1 }] })).toContain(name);
    });

  it.each(["fill", "chain", "transpose", "heads", "seat"])(
    "offers %s from the grid itself", (name) => {
      expect(named({ picked: ["lanes"] })).toContain(name);
    });
});

describe("cells are addresses, not blocks", () => {
  it("answers with nothing where nobody has claimed one", () => {
    expect(at_cell(g, "lanes", 2, 2)).toBeNull();
  });

  it("holds one block, so a second is refused", () => {
    seat("a", 0, 0);
    seat("b", 1, 1);
    const out = run("seat", ctx(["b"]), { id: "b", group: "lanes", at: "0,0" });
    expect("refused" in out).toBe(true);
  });

  const outside: Cell[] = [{ r: -1, c: 0 }, { r: 0, c: 9 }, { r: 9, c: 0 }];
  it.each(outside)("refuses an address outside the grid ($r,$c)", (cell) => {
    seat("a", 0, 0);
    const out = run("seat", ctx(["a"]),
                    { id: "a", group: "lanes", at: `${cell.r},${cell.c}` });
    expect("refused" in out).toBe(true);
  });
});
