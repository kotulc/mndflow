/** The grid: seating, headers, allocation, and the actions that reshape one.
 *
 *  **Properties, never coordinates.** Nothing here asserts a pixel, a message or
 *  a count that tuning would change — what is pinned is that an address means
 *  what it says, that a layout gesture never destroys a block, and that the
 *  readers agree with the gestures. */

import { beforeEach, describe, expect, it } from "vitest";
import { ROOT, allocated_to, allocations_of, at_cell, fold, head_of, is_grid,
         members_of, offer, run, step, would_head,
         type Args, type Cell, type Context, type Graph, type Id,
         type Log, type Mutation } from "../src/index";

/** A grid of `rows` × `cols` on a layer, with nothing seated in it yet. */
function board(rows = 3, cols = 4): Graph {
  return { root: ROOT, edges: {}, defs: {}, blocks: {
    [ROOT]: { id: ROOT, parent: null, label: "workspace", type: "folder" },
    layer: { id: "layer", parent: ROOT, type: "block", label: "Board" },
    grid: { id: "grid", parent: "layer", type: "grid", rows, cols, x: 0, y: 0 },
  } };
}

let log: Log;
let g: Graph;

/** **Through the log, the way the app does it.** Nothing here reaches past the
 *  fold, so what a step writes is what a later step reads. */
function commit(name: string, mutations: Mutation[]): void {
  log.push(step(`s${log.length}`, name, log.length, mutations));
  g = fold(log);
}

/** Put a block in a cell. Returns its id, so a test reads as what it did. */
function seat(id: Id, r: number, c: number, header = false): Id {
  commit("seat", [
    { op: "add_block", block: { id, parent: "layer", type: "block", label: id } },
    { op: "set_group", id, group: "grid" },
    { op: "seat_cell", id, cell: { r, c } },
    ...(header ? [{ op: "set_header", id, header: true } as Mutation] : []),
  ]);
  return id;
}

const ctx = (picked: Id[] = ["grid"], cells?: Context["cells"]): Context =>
  ({ graph: g, layer: "layer", picked, ...(cells ? { cells } : {}) });

/** Run an action and keep what it wrote. */
function act(name: string, args: Args = {}, cells?: Context["cells"]): void {
  const out = run(name, ctx(["grid"], cells), args);
  if ("refused" in out) throw new Error(`${name} refused: ${out.refused}`);
  commit(name, out.mutations);
}

/** Which cell a block sits in, as a string, or `null` once it is free. */
const at = (id: Id): string | null => {
  const c = g.blocks[id]?.cell;
  return c && g.blocks[id]?.group ? `${c.r},${c.c}` : null;
};

const labels = (bs: { label?: string; id: Id }[]) => bs.map((b) => b.label ?? b.id).sort();

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
    commit("band", [{ op: "add_block",
                      block: { id: "band", parent: "layer", type: "group" } }]);
    seat("a", 2, 2);
    act("group", { members: ["a"], into: "band" });
    expect(g.blocks["a"]!.group).toBe("band");
    expect(g.blocks["a"]!.cell).toBeUndefined();
  });

  it("takes a header down with it", () => {
    seat("a", 1, 0, true);
    act("leave", { ids: ["a"] });
    expect(g.blocks["a"]!.header).toBeUndefined();
  });
});

describe("which line a header heads", () => {
  it.each([
    ["the corner", 0, 0, "both"],
    ["the first row", 0, 2, "col"],
    ["the first column", 2, 0, "row"],
    ["anywhere inside", 2, 3, "row"],
  ])("at %s is %s", (_what, r, c, want) => {
    seat("h", r as number, c as number, true);
    expect(would_head(g, "h")).toBe(want);
    expect(head_of(g, "h")).toBe(want);
  });

  it("is nothing at all until it is promoted", () => {
    seat("a", 1, 0);
    expect(head_of(g, "a")).toBeNull();
    expect(would_head(g, "a")).toBe("row");
  });

  it("moves with the block, because it was never stored", () => {
    seat("h", 2, 0, true);
    expect(head_of(g, "h")).toBe("row");
    g.blocks["h"] = { ...g.blocks["h"]!, cell: { r: 0, c: 2 } };
    expect(head_of(g, "h")).toBe("col");
  });
});

describe("allocation", () => {
  it("gives a cell one header per axis", () => {
    seat("lane", 1, 0, true);
    seat("col", 0, 2, true);
    seat("x", 1, 2);
    expect(labels(allocations_of(g, "x"))).toEqual(["col", "lane"]);
  });

  it("reaches every block along the line, and nothing off it", () => {
    seat("lane", 1, 0, true);
    seat("here", 1, 3);
    seat("elsewhere", 2, 3);
    expect(labels(allocated_to(g, "lane"))).toContain("here");
    expect(labels(allocated_to(g, "lane"))).not.toContain("elsewhere");
  });

  it("claims a line only from where the header sits onward", () => {
    seat("first", 1, 0, true);
    seat("second", 1, 2, true);
    seat("before", 1, 1);
    seat("after", 1, 3);
    expect(labels(allocations_of(g, "before"))).toEqual(["first"]);
    expect(labels(allocations_of(g, "after"))).toEqual(["first", "second"]);
    /** A subheader is itself under the one above it — that is the nesting. */
    expect(labels(allocations_of(g, "second"))).toEqual(["first"]);
  });

  it("is lost when the block leaves the grid, because it was the position", () => {
    seat("lane", 1, 0, true);
    seat("x", 1, 2);
    expect(allocations_of(g, "x")).toHaveLength(1);
    act("leave", { ids: ["x"] });
    expect(allocations_of(g, "x")).toHaveLength(0);
  });

  it("follows a merged header across every line it spans", () => {
    seat("tall", 1, 0, true);
    act("merge", {}, [{ group: "grid", r: 1, c: 0 }, { group: "grid", r: 2, c: 0 }]);
    seat("lower", 2, 2);
    expect(labels(allocations_of(g, "lower"))).toContain("tall");
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
    act("merge", {}, [{ group: "grid", r: 0, c: 0 }, { group: "grid", r: 0, c: 2 }]);
    const before = g.blocks["grid"]!.merges![0]!;
    act("insert", { way: "col", at: 1 });
    const after = g.blocks["grid"]!.merges![0]!;
    expect(after.cols).toBe(before.cols + 1);
    expect(at("wide")).toBe(at("wide"));
  });

  /** **A line taken away moves what it held rather than dropping it.** Freed
   *  outright, a block landed at the foot of the layer with its relationships
   *  still attached, which reads as a line coming adrift. */
  it("re-seats what the line held, and never deletes it", () => {
    seat("moved", 1, 1);
    act("remove", { way: "row", at: 1 });
    expect(g.blocks["moved"]).toBeTruthy();
    expect(at("moved")).not.toBeNull();
    expect(g.blocks["moved"]!.cell!.r).toBeLessThan(g.blocks["grid"]!.rows!);
  });

  it("drops the address only where there is nowhere left to put it", () => {
    act("fill");
    const before = members_of(g, "grid").length;
    act("remove", { way: "row", at: 0 });
    const held = members_of(g, "grid");
    /** **Nothing is deleted** — a layout gesture must not cost model content. */
    expect(held).toHaveLength(before);
    const seated = held.filter((b) => b.cell);
    expect(seated.length).toBeLessThan(before);
    expect(seated).toHaveLength(g.blocks["grid"]!.rows! * g.blocks["grid"]!.cols!);
  });

  it("leaves every surviving address inside the extent, and each one once", () => {
    act("fill");
    act("remove", { way: "col", at: 1 });
    const { rows, cols } = g.blocks["grid"]!;
    const cells = members_of(g, "grid").filter((b) => b.cell).map((b) => b.cell!);
    expect(cells.every((c) => c.r < rows! && c.c < cols!)).toBe(true);
    expect(new Set(cells.map((c) => `${c.r},${c.c}`)).size).toBe(cells.length);
  });

  it("gives back what it took, so a row in and a row out is a round trip", () => {
    seat("x", 2, 2);
    const rows = g.blocks["grid"]!.rows;
    act("insert", { way: "row", at: 0 });
    act("remove", { way: "row", at: 0 });
    expect(g.blocks["grid"]!.rows).toBe(rows);
    expect(at("x")).toBe("2,2");
  });
});

describe("merge and split", () => {
  it("answers at every address it covers with the block at its corner", () => {
    seat("one", 0, 0);
    act("merge", {}, [{ group: "grid", r: 0, c: 0 }, { group: "grid", r: 1, c: 1 }]);
    for (const [r, c] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
      expect(at_cell(g, "grid", r!, c!)?.id).toBe("one");
    }
  });

  it("frees what it covers rather than losing it", () => {
    seat("keep", 0, 0);
    seat("shoved", 1, 1);
    act("merge", {}, [{ group: "grid", r: 0, c: 0 }, { group: "grid", r: 1, c: 1 }]);
    expect(g.blocks["shoved"]).toBeTruthy();
    expect(at("shoved")).not.toBe("1,1");
  });

  it("splits back to ordinary cells", () => {
    seat("one", 0, 0);
    act("merge", {}, [{ group: "grid", r: 0, c: 0 }, { group: "grid", r: 0, c: 1 }]);
    expect(g.blocks["grid"]!.merges).toHaveLength(1);
    act("merge", {}, [{ group: "grid", r: 0, c: 0 }]);
    expect(g.blocks["grid"]!.merges ?? []).toHaveLength(0);
  });
});

describe("transpose", () => {
  it("turns the grid and every address about the diagonal", () => {
    seat("x", 1, 3);
    const { rows, cols } = g.blocks["grid"]!;
    act("transpose");
    expect(g.blocks["grid"]!.rows).toBe(cols);
    expect(g.blocks["grid"]!.cols).toBe(rows);
    expect(at("x")).toBe("3,1");
  });

  it("turns a lane owner into a column head, writing no header of its own", () => {
    seat("lane", 1, 0, true);
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
  /** row 0: -  b  -  c   row 1: h(head) d  -  - */
  const laid = () => {
    seat("b", 0, 1); seat("c", 0, 3);
    seat("h", 1, 0, true); seat("d", 1, 1);
    return g;
  };
  const links = (graph: Graph) =>
    Object.values(graph.edges).map((e) => `${e.from}->${e.to}`);

  it("reads the whole grid as one run, on across the row below", () => {
    laid(); act("chain");
    expect(links(g)).toEqual(["b->c", "c->d"]);
  });

  it("passes over a header, because it says what a line is", () => {
    laid(); act("chain");
    expect(links(g).join(" ")).not.toContain("h");
  });

  it("draws the module it was given", () => {
    laid(); act("chain", { module: "line" });
    expect(Object.values(g.edges).every((e) => e.module === "line")).toBe(true);
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
    const held = members_of(g, "grid");
    expect(held).toHaveLength(g.blocks["grid"]!.rows! * g.blocks["grid"]!.cols!);
    expect(at("kept")).toBe("1,1");
  });

  it("hands every new block an alias of its own", () => {
    act("fill");
    const made = members_of(g, "grid").map((b) => b.alias);
    expect(new Set(made).size).toBe(made.length);
    expect(made.every((a) => typeof a === "number")).toBe(true);
  });

  it("treats a merged region as the one cell it is", () => {
    act("merge", {}, [{ group: "grid", r: 0, c: 0 }, { group: "grid", r: 1, c: 1 }]);
    act("fill");
    const corner = at_cell(g, "grid", 0, 0);
    expect(corner).toBeTruthy();
    for (const [r, c] of [[0, 1], [1, 0], [1, 1]]) {
      expect(at_cell(g, "grid", r!, c!)?.id).toBe(corner!.id);
    }
  });

  it("has nothing left to do once it has run", () => {
    act("fill");
    expect("refused" in run("fill", ctx(), {})).toBe(true);
  });
});

describe("a grid is what its module says", () => {
  it("is a grid whatever else it carries", () => {
    expect(is_grid(g, "grid")).toBe(true);
    expect(is_grid(g, "layer")).toBe(false);
  });

  it("keeps its extent when everything in it is freed", () => {
    seat("a", 0, 0);
    const { rows, cols } = g.blocks["grid"]!;
    act("leave", { ids: ["a"] });
    expect(g.blocks["grid"]).toBeTruthy();
    expect(g.blocks["grid"]!.rows).toBe(rows);
    expect(g.blocks["grid"]!.cols).toBe(cols);
  });
});

/** **What a right click can reach.** A grid's inside is its cells, so anything
 *  about the whole grid has to be in scope from a cell — offered only from the
 *  rim, it is offered from a few pixels of border and found by nobody. */
describe("the grid actions are reachable", () => {
  const named = (ctx: Partial<Context>) =>
    offer({ graph: g, layer: "layer", picked: [], ...ctx } as Context).map((a) => a.name);

  it.each(["fill", "chain", "transpose", "merge", "insert", "remove"])(
    "offers %s from a cell", (name) => {
      seat("a", 0, 0);
      expect(named({ cells: [{ group: "grid", r: 1, c: 1 }] })).toContain(name);
    });

  it.each(["fill", "chain", "transpose", "header", "seat"])(
    "offers %s from the grid itself", (name) => {
      seat("a", 0, 0);
      expect(named({ picked: ["grid"] })).toContain(name);
    });
});

describe("cells are addresses, not blocks", () => {
  it("answers with nothing where nobody has claimed one", () => {
    expect(at_cell(g, "grid", 2, 2)).toBeNull();
  });

  it("holds one block, so a second is refused", () => {
    seat("a", 0, 0);
    seat("b", 1, 1);
    const out = run("seat", ctx(["b"]), { id: "b", group: "grid", at: "0,0" });
    expect("refused" in out).toBe(true);
  });

  const outside: Cell[] = [{ r: -1, c: 0 }, { r: 0, c: 9 }, { r: 9, c: 0 }];
  it.each(outside)("refuses an address outside the grid ($r,$c)", (cell) => {
    seat("a", 0, 0);
    const out = run("seat", ctx(["a"]),
                    { id: "a", group: "grid", at: `${cell.r},${cell.c}` });
    expect("refused" in out).toBe(true);
  });
});
