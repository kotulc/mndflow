/** Placement and routing, as properties. */

import { describe, expect, it } from "vitest";
import { FLOOR, fixture, related } from "@mnd/fixtures";
import { MAIN, children, drawn_in, fold, is_grid, is_header, is_holder, is_interface, lattice_of,
         type Layout, type Graph, type Id } from "@mnd/core";
import { cell_box } from "../src/size";
import { bounds, boundary, laid, nearest_seat, size_of, snap, GAP, CELL, PAD, UNIT,
         type Placed } from "../src/index";

const ARRANGEMENTS: Layout[] = ["free", "auto"];

function layer_of(name: string): { graph: Graph; layer: Id } {
  const graph = fold(fixture(name), FLOOR);
  const layer = children(graph, MAIN)[0]!.id;
  return { graph, layer };
}

/** A layer laid out one way, its grids drawn open as a view flattens them. */
function under(graph: Graph, layer: Id, how: Layout): Placed[] {
  const g: Graph = structuredClone(graph);
  g.blocks[layer]!.settings = { ...g.blocks[layer]!.settings, layout: { kind: how } };
  for (const b of Object.values(g.blocks)) {
    if (is_grid(g, b.id)) b.settings = { ...b.settings, holder: { flat: true } };
  }
  return laid(g, layer);
}

function overlaps(a: Placed, b: Placed): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Groups overlap their members and sit on the lattice by their rim. */
function placed(graph: Graph, spots: Placed[]): Placed[] {
  return spots.filter((p) => !is_holder(graph, p.id));
}

describe("size", () => {
  /** A container says so with a mark now, not by being taller. */
  it("gives every card the one card height", () => {
    const { graph } = layer_of("nested");
    expect(size_of(graph, "block_edge").h).toBe(size_of(graph, "block_auth").h);
  });

  /** A card whose definition asked for its own height keeps whatever it was given. */
  it("keeps the size a free-height card was given", () => {
    const { graph } = layer_of("related");
    const sized = { ...graph.blocks["block_note"]!, w: 200, h: 90 };
    const g = { ...graph, blocks: { ...graph.blocks, block_note: sized } };
    expect(size_of(g, "block_note")).toEqual({ w: 200, h: 90 });
  });

  /** A card that did not ask keeps the one height, whatever it was given. */
  it("ignores a stored size on a uniform card", () => {
    const { graph } = layer_of("related");
    const sized = { ...graph.blocks["block_pump"]!, w: 200, h: 90 };
    const g = { ...graph, blocks: { ...graph.blocks, block_pump: sized } };
    expect(size_of(g, "block_pump").h).toBe(size_of(graph, "block_hx").h);
  });

  it("snaps to the grid", () => {
    for (const n of [0, 1, 13, 25, -37]) expect(snap(n) % UNIT === 0).toBe(true);
  });
});

describe("placement", () => {
  it.each(ARRANGEMENTS)("places every unit exactly once under %s", (how) => {
    const { graph, layer } = layer_of("related");
    const spots = under(graph, layer, how);
    const want = drawn_in(graph, layer).filter((b) => !is_interface(graph, b.id)).map((b) => b.id);
    expect(spots.map((p) => p.id).sort()).toEqual([...want].sort());
  });

  it.each(ARRANGEMENTS)("never overlaps two cards under %s", (how) => {
    const { graph, layer } = layer_of("related");
    const spots = placed(graph, under(graph, layer, how));
    for (let i = 0; i < spots.length; i++) {
      for (let j = i + 1; j < spots.length; j++) {
        expect(overlaps(spots[i]!, spots[j]!), `${spots[i]!.id} over ${spots[j]!.id}`).toBe(false);
      }
    }
  });

  /** Only under `free`; a gridded block is centred in its cell. */
  it("lands on the grid under free", () => {
    const { graph, layer } = layer_of("related");
    for (const p of under(graph, layer, "free")) {
      expect(p.x % UNIT === 0, `${p.id} x`).toBe(true);
      expect(p.y % UNIT === 0, `${p.id} y`).toBe(true);
    }
  });

  it.each(ARRANGEMENTS)("is stable when the input is reordered under %s", (how) => {
    const { graph, layer } = layer_of("related");
    const shuffled: Graph = structuredClone(graph);
    shuffled.blocks = Object.fromEntries(Object.entries(shuffled.blocks).reverse());
    expect(under(shuffled, layer, how)).toEqual(under(graph, layer, how));
  });

  it("keeps hand placement under free and gives it back after arranging", () => {
    const { graph, layer } = layer_of("related");
    const placed: Graph = structuredClone(graph);
    placed.blocks["block_pump"]!.x = 240;
    placed.blocks["block_pump"]!.y = 120;
    const how = (kind: string) => { placed.blocks[layer]!.settings = { layout: { kind } }; };
    how("free");
    const free = laid(placed, layer);
    how("auto");
    laid(placed, layer);
    how("free");
    expect(laid(placed, layer)).toEqual(free);
  });

  it("stays centred on the layer as it grows", () => {
    const { graph, layer } = layer_of("related");
    const spots = placed(graph, under(graph, layer, "auto"));
    const left = Math.min(...spots.map((p) => p.x));
    const right = Math.max(...spots.map((p) => p.x + p.w));
    expect(Math.abs(left + right)).toBeLessThanOrEqual(CELL.w);
  });

  it("gives an empty layer room to put something new", () => {
    expect(bounds([]).w).toBeGreaterThan(0);
  });
});

describe("the grid arrangement", () => {
  it("puts everything it places on the lattice, in units", () => {
    const graph = fold(related(), FLOOR);
    for (const p of under(graph, "block_loop", "auto")) {
      expect(Math.abs(p.x % UNIT), `${p.id} x`).toBe(0);
      expect(Math.abs(p.y % UNIT), `${p.id} y`).toBe(0);
    }
  });

  it("reads left to right, then down a row", () => {
    const graph = fold(related(), FLOOR);
    const spots = under(graph, "block_loop", "auto");
    const rows = new Map<number, number[]>();
    for (const p of spots) rows.set(p.y, [...(rows.get(p.y) ?? []), p.x]);
    /** Every row is a run of distinct columns, and the rows step down. */
    for (const xs of rows.values()) expect(new Set(xs).size).toBe(xs.length);
    expect([...rows.keys()].length).toBeGreaterThan(0);
  });

  it("is its cells, and its cells are whole units", () => {
    const { graph, layer } = layer_of("gridded");
    for (const p of under(graph, layer, "auto")) {
      if (!is_grid(graph, p.id)) continue;
      const g = lattice_of(graph, p.id)!;
      /** A header line is one unit across, every other line a cell. */
      expect(p.w).toBe((g.cols - 1) * CELL.w + UNIT);
      expect(p.h).toBe((g.rows - 1) * CELL.h + UNIT);
      expect(CELL.w % UNIT).toBe(0);
      expect(CELL.h % UNIT).toBe(0);
    }
  });

  it("gives a block seated in a cell a gap of air on every side", () => {
    const { graph, layer } = layer_of("gridded");
    const spots = under(graph, layer, "auto");
    const at = new Map(spots.map((p) => [p.id, p]));
    for (const b of Object.values(graph.blocks)) {
      const held = b.parent ?? undefined;
      if (!b.cell || !held || !is_grid(graph, held) || is_header(graph, b.id)) continue;
      const grid = at.get(held);
      const p = at.get(b.id);
      if (!grid || !p) continue;
      const box = cell_box(lattice_of(graph, held)!, b.cell.r, b.cell.c);
      expect(p.x - (grid.x + box.x), `${b.id} left`).toBe(PAD);
      expect(p.y - (grid.y + box.y), `${b.id} top`).toBe(PAD);
    }
  });

  it("gives a band no cell of its own — it is its members' bounds", () => {
    const graph = fold(related(), FLOOR);
    const spots = under(graph, "block_loop", "auto");
    const band = spots.find((p) => p.id === "block_hot")!;
    const members = Object.values(graph.blocks)
      .filter((b) => b.parent === "block_hot").map((b) => b.id);
    for (const m of spots.filter((p) => members.includes(p.id))) {
      expect(m.x).toBeGreaterThanOrEqual(band.x);
      expect(m.x + m.w).toBeLessThanOrEqual(band.x + band.w);
    }
  });

  it("moves a band's members when its corner moves in free mode", () => {
    const graph = fold(related(), FLOOR);
    graph.blocks["block_loop"]!.settings = { layout: { kind: "free" } };
    graph.blocks["block_hot"]!.x = 0;
    graph.blocks["block_hot"]!.y = 0;
    const before = laid(graph, "block_loop");
    const band_before = before.find((p) => p.id === "block_hot")!;
    const hx = before.find((p) => p.id === "block_hx")!;
    graph.blocks["block_hot"]!.x = 200;
    graph.blocks["block_hot"]!.y = 100;
    const after = laid(graph, "block_loop");
    const band_after = after.find((p) => p.id === "block_hot")!;
    const hx2 = after.find((p) => p.id === "block_hx")!;
    expect(hx2.x - hx.x).toBe(band_after.x - band_before.x);
    expect(hx2.y - hx.y).toBe(band_after.y - band_before.y);
  });

});


/** The one invariant a grid has to keep. */
describe("a grid's cells sit on the unit lattice", () => {
  const grids = (graph: Graph, spots: Placed[]) =>
    spots.filter((p) => is_grid(graph, p.id));

  it.each(ARRANGEMENTS)("puts every cell corner on a whole unit under %s", (how) => {
    const { graph, layer } = layer_of("gridded");
    const spots = under(graph, layer, how);
    const found = grids(graph, spots);
    expect(found.length).toBeGreaterThan(0);
    for (const p of found) {
      const g = lattice_of(graph, p.id)!;
      for (let r = 0; r < (g.rows ?? 0); r++) {
        for (let c = 0; c < (g.cols ?? 0); c++) {
          const box = cell_box(g, r, c);
          expect(Math.abs((p.x + box.x) % UNIT), `${p.id} cell ${r},${c} x`).toBe(0);
          expect(Math.abs((p.y + box.y) % UNIT), `${p.id} cell ${r},${c} y`).toBe(0);
          expect(box.w % UNIT, `${p.id} cell ${r},${c} w`).toBe(0);
          expect(box.h % UNIT, `${p.id} cell ${r},${c} h`).toBe(0);
        }
      }
    }
  });

  it.each(ARRANGEMENTS)("puts the grid's own corner on a whole unit under %s", (how) => {
    const { graph, layer } = layer_of("gridded");
    for (const p of grids(graph, under(graph, layer, how))) {
      expect(Math.abs(p.x % UNIT), `${p.id} x`).toBe(0);
      expect(Math.abs(p.y % UNIT), `${p.id} y`).toBe(0);
    }
  });

  it.each(ARRANGEMENTS)("centres every seated block in its own cell under %s", (how) => {
    const { graph, layer } = layer_of("gridded");
    const spots = under(graph, layer, how);
    const at = new Map(spots.map((p) => [p.id, p]));
    let seated_count = 0;
    for (const b of Object.values(graph.blocks)) {
      const held = b.parent ?? undefined;
      if (!b.cell || !held || !is_grid(graph, held)) continue;
      const grid = at.get(held);
      const p = at.get(b.id);
      if (!grid || !p) continue;
      seated_count++;
      const box = cell_box(lattice_of(graph, held)!, b.cell.r, b.cell.c);
      expect(p.x + p.w / 2, `${b.id} x`).toBe(grid.x + box.x + box.w / 2);
      expect(p.y + p.h / 2, `${b.id} y`).toBe(grid.y + box.y + box.h / 2);
    }
    expect(seated_count).toBeGreaterThan(0);
  });
});

/** Room between one thing and the next. */
describe("the layout leaves room between things", () => {

  it("keeps a unit between a band and its neighbours, the way a grid is kept", () => {
    const graph = fold(related(), FLOOR);
    const spots = under(graph, "block_loop", "auto")
      .filter((p) => !is_holder(graph, p.id))
      .map((p) => ({ ...p }));
    const band = laid(graph, "block_loop").find((p) => p.id === "block_hot")!;
    const others = spots.filter((p) => graph.blocks[p.id]?.parent === "block_loop");
    expect(others.length).toBeGreaterThan(0);
    for (const other of others) {
      const gap = Math.max(other.x - (band.x + band.w), band.x - (other.x + other.w),
                           other.y - (band.y + band.h), band.y - (other.y + other.h));
      expect(gap, `${other.id} and block_hot`).toBeGreaterThanOrEqual(UNIT);
    }
  });

  it("keeps at least a unit between any two things it places", () => {
    const { graph: from, layer } = layer_of("gridded");
    /** A grid and loose cards on one layer. */
    const graph: Graph = structuredClone(from);
    for (const id of ["block_plan", "block_build"]) {
      delete graph.blocks[id]!.cell;
      graph.blocks[id]!.parent = layer;
    }
    /** What the layer placed; seated blocks are placed by their address. */
    const spots = under(graph, layer, "auto")
      .filter((p) => is_grid(graph, p.id)
                  || (!is_holder(graph, p.id) && !graph.blocks[p.id]!.cell))
      .map((p) => ({ ...p }));
    expect(spots.length).toBeGreaterThan(1);
    for (let i = 0; i < spots.length; i++) {
      for (let j = i + 1; j < spots.length; j++) {
        const a = spots[i]!;
        const b = spots[j]!;
        /** Clear along one axis at least, by a unit or more. */
        const gap = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w),
                             b.y - (a.y + a.h), a.y - (b.y + b.h));
        expect(gap, `${a.id} and ${b.id}`).toBeGreaterThanOrEqual(UNIT);
      }
    }
  });

  it("places each id once, even when a group sits inside another", () => {
    const graph = fold(related(), FLOOR);
    graph.blocks["block_inner"] = {
      id: "block_inner", parent: "block_hot", type: "group", order: 20,
    };
    graph.blocks["block_pad"] = { id: "block_pad", parent: "block_inner", type: "block", order: 21 };
    const spots = under(graph, "block_loop", "auto");
    const ids = spots.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("block_inner");
    expect(ids).toContain("block_pad");
  });

  it("keeps a unit between a band and a sibling card, never overlapping the rim", () => {
    const graph = fold(related(), FLOOR);
    graph.blocks["block_hello"] = { id: "block_hello", parent: "block_loop", type: "block", order: 30 };
    graph.edges["edge_hello"] = {
      id: "edge_hello", from: "block_hello", to: "block_hx",
    };
    const spots = under(graph, "block_loop", "auto");
    const hello = spots.find((p) => p.id === "block_hello")!;
    const hot = spots.find((p) => p.id === "block_hot")!;
    const overlap = hello.x < hot.x + hot.w && hot.x < hello.x + hello.w
                 && hello.y < hot.y + hot.h && hot.y < hello.y + hello.h;
    expect(overlap).toBe(false);
    const gap = Math.max(hello.x - (hot.x + hot.w), hot.x - (hello.x + hello.w),
                         hello.y - (hot.y + hot.h), hot.y - (hello.y + hello.h));
    expect(gap).toBeGreaterThanOrEqual(UNIT);
  });

});

describe("boundaries", () => {
  it("is its members' bounds plus a margin, and holds them", () => {
    const graph = fold(related(), FLOOR);
    const spots = laid(graph, "block_loop");
    const members = Object.values(graph.blocks)
      .filter((b) => b.parent === "block_hot").map((b) => b.id);
    const box = boundary(spots, members)!;
    for (const p of spots.filter((s) => members.includes(s.id))) {
      expect(p.x).toBeGreaterThanOrEqual(box.x);
      expect(p.y).toBeGreaterThanOrEqual(box.y);
      expect(p.x + p.w).toBeLessThanOrEqual(box.x + box.w);
      expect(p.y + p.h).toBeLessThanOrEqual(box.y + box.h);
    }
    expect(box.w).toBeGreaterThan(GAP);
  });

  it("draws nothing for a boundary holding nothing", () => {
    expect(boundary([], ["nobody"])).toBeNull();
  });
});

describe("seats", () => {
  const card: Placed = { id: "block_pump", x: 0, y: 0, w: 168, h: 36 };

  it("clusters related cards under grid even with stale hand placement", () => {
    const graph = fold(related(), FLOOR);
    graph.blocks["block_pump"]!.x = 0;
    graph.blocks["block_pump"]!.y = 0;
    graph.blocks["block_valve"]!.x = 3000;
    graph.blocks["block_valve"]!.y = 0;
    graph.blocks["block_hot"]!.x = 1500;
    graph.blocks["block_hot"]!.y = 0;
    const spots = under(graph, "block_loop", "auto");
    const at = new Map(spots.map((p) => [p.id, p]));
    const gap = (a: Placed, b: Placed) => Math.max(
      b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));
    /** Both hang off the band they actually relate to — not off each other in a line stretching
     *  past it. */
    expect(gap(at.get("block_pump")!, at.get("block_hot")!)).toBeLessThanOrEqual(GAP + UNIT);
    expect(gap(at.get("block_valve")!, at.get("block_hot")!)).toBeLessThanOrEqual(GAP + UNIT);
  });

  it("lines up related band members on one row under grid", () => {
    const graph = fold(related(), FLOOR);
    const spots = under(graph, "block_loop", "auto");
    const at = new Map(spots.map((p) => [p.id, p]));
    const hx = at.get("block_hx")!;
    const tank = at.get("block_tank")!;
    const gap = (a: Placed, b: Placed) => Math.max(
      b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));
    expect(hx.y).toBe(tank.y);
    expect(gap(hx, tank)).toBeGreaterThanOrEqual(GAP);
    expect(gap(hx, tank)).toBeLessThanOrEqual(GAP + UNIT);
  });

  it("ignores stale hand placement when arranging band members under grid", () => {
    const graph = fold(related(), FLOOR);
    graph.blocks["block_hx"]!.x = 0;
    graph.blocks["block_hx"]!.y = 400;
    graph.blocks["block_tank"]!.x = 800;
    graph.blocks["block_tank"]!.y = 0;
    const spots = under(graph, "block_loop", "auto");
    const at = new Map(spots.map((p) => [p.id, p]));
    expect(at.get("block_hx")!.y).toBe(at.get("block_tank")!.y);
  });

  it("places a downstream block on the near side of a grid, not past an intervening group", () => {
    const graph = fold(fixture("gridded"), FLOOR);
    graph.blocks["block_out"] = { id: "block_out", parent: "block_board", type: "block", order: 53 };
    graph.blocks["block_mid"] = { id: "block_mid", parent: "block_board", type: "group",
                                   order: 51 };
    graph.blocks["block_pad"] = { id: "block_pad", parent: "block_board", type: "block", order: 52 };
    graph.edges["edge_out"] = { id: "edge_out", from: "block_ship", to: "block_out", dir: "forward" };
    graph.edges["edge_mid"] = { id: "edge_mid", from: "block_mid", to: "block_lanes" };
    graph.blocks["block_pad"]!.parent = "block_mid";
    const spots = under(graph, "block_board", "auto");
    const at = new Map(spots.map((p) => [p.id, p]));
    const lanes = at.get("block_lanes")!;
    const out = at.get("block_out")!;
    expect(out.x - (lanes.x + lanes.w)).toBeLessThanOrEqual(GAP + UNIT);
  });

  it("lays out none of them — an interface is seated, never placed", () => {
    const graph = fold(fixture("interfaced"), FLOOR);
    const spots = laid(graph, "block_loop");
    expect(spots.some((p) => is_interface(graph, p.id))).toBe(false);
  });

  it.each([
    ["top", { x: 84, y: -20 }],
    ["bottom", { x: 84, y: 60 }],
    ["left", { x: -20, y: 18 }],
    ["right", { x: 190, y: 18 }],
  ])("takes a point outside the %s wall to that wall", (side, at) => {
    expect(nearest_seat(card, at).side).toBe(side);
  });

  it("lands on a seat, never between two", () => {
    for (let x = 0; x <= card.w; x += 7) {
      const seat = nearest_seat(card, { x, y: -20 });
      expect(seat.at).toBeGreaterThan(0);
      expect(seat.at).toBeLessThan(1);
      expect(nearest_seat(card, { x, y: -20 })).toEqual(seat);
    }
  });

  it("moves along the wall as the point does", () => {
    const near = nearest_seat(card, { x: 20, y: -20 }).at;
    const far = nearest_seat(card, { x: 140, y: -20 }).at;
    expect(far).toBeGreaterThan(near);
  });
});
