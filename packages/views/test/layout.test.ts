/** Placement and routing, as properties.
 *
 *  Nothing here asserts a coordinate. What is pinned is that cards do not
 *  overlap, that routes terminate on the cards they name, that every elbow is a
 *  right angle, and that reordering the input does not move the output. */

import { describe, expect, it } from "vitest";
import { fixture, related } from "@mnd/fixtures";
import { children, fold, is_grid, is_interface, module_of,
         type Arrangement, type Graph, type Id } from "@mnd/core";
import { cell_box } from "../src/size";
import { bounds, boundary, laid, nearest_seat, seated, size_of, snap, tidy, GAP, CELL, UNIT,
         SEAT, assign_seats, type Perch, type Placed } from "../src/index";

const ARRANGEMENTS: Arrangement[] = ["free", "grid"];

function layer_of(name: string): { graph: Graph; layer: Id } {
  const graph = fold(fixture(name));
  const layer = children(graph, graph.root)[0]!.id;
  return { graph, layer };
}

function under(graph: Graph, layer: Id, how: Arrangement): Placed[] {
  const g: Graph = structuredClone(graph);
  g.blocks[layer]!.arrangement = how;
  return laid(g, layer);
}

function overlaps(a: Placed, b: Placed): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** A group is drawn **round** what it holds, so it overlaps its members by
 *  definition and sits on the lattice by its rim rather than by its middle.
 *  Every property below is about the things a layer places. */
function placed(graph: Graph, spots: Placed[]): Placed[] {
  return spots.filter((p) => module_of(graph, p.id) !== "group");
}

describe("size", () => {
  it("gives a container more room than a leaf", () => {
    const { graph } = layer_of("nested");
    expect(size_of(graph, "block_edge").h).toBeGreaterThan(size_of(graph, "block_auth").h);
  });

  it("snaps to the grid", () => {
    for (const n of [0, 1, 13, 25, -37]) expect(snap(n) % UNIT === 0).toBe(true);
  });
});

describe("placement", () => {
  it.each(ARRANGEMENTS)("places every unit exactly once under %s", (how) => {
    const { graph, layer } = layer_of("related");
    const spots = under(graph, layer, how);
    const want = children(graph, layer).filter((b) => !is_interface(b)).map((b) => b.id);
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

  /** **Only under `free`.** A block slotted into the lattice is centred in its
   *  cell, which leaves it half a step off the backdrop dots — the cell is what
   *  places it, and re-snapping is what pushed a centred block into a corner. */
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
    placed.blocks[layer]!.arrangement = "free";
    const free = laid(placed, layer);
    placed.blocks[layer]!.arrangement = "grid";
    laid(placed, layer);
    placed.blocks[layer]!.arrangement = "free";
    expect(laid(placed, layer)).toEqual(free);
  });

  it("stays centred on the layer as it grows", () => {
    const { graph, layer } = layer_of("related");
    const spots = placed(graph, under(graph, layer, "grid"));
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
    const graph = fold(related());
    for (const p of under(graph, "block_loop", "grid")) {
      expect(Math.abs(p.x % UNIT), `${p.id} x`).toBe(0);
      expect(Math.abs(p.y % UNIT), `${p.id} y`).toBe(0);
    }
  });

  it("reads left to right, then down a row", () => {
    const graph = fold(related());
    const spots = under(graph, "block_loop", "grid");
    const rows = new Map<number, number[]>();
    for (const p of spots) rows.set(p.y, [...(rows.get(p.y) ?? []), p.x]);
    /** Every row is a run of distinct columns, and the rows step down. */
    for (const xs of rows.values()) expect(new Set(xs).size).toBe(xs.length);
    expect([...rows.keys()].length).toBeGreaterThan(0);
  });

  it("is its cells, and its cells are whole units", () => {
    const { graph, layer } = layer_of("gridded");
    for (const p of under(graph, layer, "grid")) {
      const g = graph.blocks[p.id]!;
      if (!is_grid(g)) continue;
      expect(p.w).toBe((g.cols ?? 1) * CELL.w);
      expect(p.h).toBe((g.rows ?? 1) * CELL.h);
      expect(CELL.w % UNIT).toBe(0);
      expect(CELL.h % UNIT).toBe(0);
    }
  });

  it("gives a block seated in a cell a gap of air on every side", () => {
    const { graph, layer } = layer_of("gridded");
    const spots = under(graph, layer, "grid");
    const at = new Map(spots.map((p) => [p.id, p]));
    for (const b of Object.values(graph.blocks)) {
      if (!b.cell || !b.group) continue;
      const grid = at.get(b.group);
      const p = at.get(b.id);
      if (!grid || !p) continue;
      const box = cell_box(graph.blocks[b.group]!, b.cell.r, b.cell.c);
      expect(p.x - (grid.x + box.x), `${b.id} left`).toBe(GAP);
      expect(p.y - (grid.y + box.y), `${b.id} top`).toBe(GAP);
    }
  });

  it("gives a band no cell of its own — it is its members' bounds", () => {
    const graph = fold(related());
    const spots = under(graph, "block_loop", "grid");
    const band = spots.find((p) => p.id === "block_hot")!;
    const members = Object.values(graph.blocks)
      .filter((b) => b.group === "block_hot").map((b) => b.id);
    for (const m of spots.filter((p) => members.includes(p.id))) {
      expect(m.x).toBeGreaterThanOrEqual(band.x);
      expect(m.x + m.w).toBeLessThanOrEqual(band.x + band.w);
    }
  });

  it("grows a square rather than a line", () => {
    const graph = fold(related());
    const spots = placed(graph, under(graph, "block_loop", "grid"));
    if (spots.length < 4) return;
    expect(new Set(spots.map((p) => p.y)).size).toBeGreaterThan(1);
  });
});


/** **The one invariant a grid has to keep.** Its cells are the layer's own
 *  lattice, drawn — so every line in one falls on a line the backdrop already
 *  draws, whatever placed the grid and whichever way the layer is arranged. A
 *  grid half a unit off its own guides is the failure this pins down. */
describe("a grid's cells sit on the unit lattice", () => {
  const grids = (graph: Graph, spots: Placed[]) =>
    spots.filter((p) => is_grid(graph.blocks[p.id]!));

  it.each(ARRANGEMENTS)("puts every cell corner on a whole unit under %s", (how) => {
    const { graph, layer } = layer_of("gridded");
    const spots = under(graph, layer, how);
    const found = grids(graph, spots);
    expect(found.length).toBeGreaterThan(0);
    for (const p of found) {
      const g = graph.blocks[p.id]!;
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
      if (!b.cell || !b.group) continue;
      const grid = at.get(b.group);
      const p = at.get(b.id);
      if (!grid || !p) continue;
      seated_count++;
      const box = cell_box(graph.blocks[b.group]!, b.cell.r, b.cell.c);
      expect(p.x + p.w / 2, `${b.id} x`).toBe(grid.x + box.x + box.w / 2);
      expect(p.y + p.h / 2, `${b.id} y`).toBe(grid.y + box.y + box.h / 2);
    }
    expect(seated_count).toBeGreaterThan(0);
  });
});

/** **Room between one thing and the next.** A block is smaller than its cell
 *  and a grid keeps a ring inside its box, so what is *drawn* always stands
 *  clear of its neighbours — never touching, never sharing a line. */
describe("the layout leaves room between things", () => {

  it("keeps a unit between a band and its neighbours, the way a grid is kept", () => {
    const graph = fold(related());
    const spots = under(graph, "block_loop", "grid")
      .filter((p) => module_of(graph, p.id) !== "group")
      .map((p) => ({ ...p }));
    const band = laid(graph, "block_loop").find((p) => p.id === "block_hot")!;
    const others = spots.filter((p) => !graph.blocks[p.id]?.group);
    expect(others.length).toBeGreaterThan(0);
    for (const other of others) {
      const gap = Math.max(other.x - (band.x + band.w), band.x - (other.x + other.w),
                           other.y - (band.y + band.h), band.y - (other.y + other.h));
      expect(gap, `${other.id} and block_hot`).toBeGreaterThanOrEqual(UNIT);
    }
  });

  it("keeps at least a unit between any two things it places", () => {
    const { graph: from, layer } = layer_of("gridded");
    /** A grid and some loose cards on one layer, which is the case this is
     *  about: the fixture seats everything it has. */
    const graph: Graph = structuredClone(from);
    for (const id of ["block_plan", "block_build"]) {
      delete graph.blocks[id]!.cell;
      delete graph.blocks[id]!.group;
    }
    /** **What the layer placed**, which is not the same as what it holds: a
     *  block seated in a grid is placed by its address inside it and is drawn
     *  over the band on purpose. A band is its members' bounds and has no place
     *  of its own either. */
    const spots = under(graph, layer, "grid")
      .filter((p) => is_grid(graph.blocks[p.id]!)
                  || (!graph.blocks[p.id]!.cell && module_of(graph, p.id) !== "group"))
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
});

describe("boundaries", () => {
  it("is its members' bounds plus a margin, and holds them", () => {
    const graph = fold(related());
    const spots = laid(graph, "block_loop");
    const members = Object.values(graph.blocks)
      .filter((b) => b.group === "block_hot").map((b) => b.id);
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

  it("puts a lone line on the centre of its wall", () => {
    const graph = fold(related());
    const spots = laid(graph, "block_loop");
    const boxes = new Map(spots.map((p) => [p.id, p]));
    const links = Object.values(graph.edges);
    const { perches } = assign_seats(graph, links, spots, boxes);
    const by_wall = new Map<string, Perch[]>();
    for (const p of perches) {
      const key = `${p.on}|${p.side}`;
      by_wall.set(key, [...(by_wall.get(key) ?? []), p]);
    }
    for (const group of by_wall.values()) {
      if (group.length !== 1) continue;
      expect(Math.abs(group[0]!.at - 0.5)).toBeLessThan(0.01);
    }
  });

  it("fans several ends out from the centre of one wall", () => {
    const graph = fold(related());
    const spots = laid(graph, "block_loop");
    const boxes = new Map(spots.map((p) => [p.id, p]));
    const links = Object.values(graph.edges);
    const { perches } = assign_seats(graph, links, spots, boxes);
    const by_wall = new Map<string, number[]>();
    for (const p of perches) {
      const key = `${p.on}|${p.side}`;
      by_wall.set(key, [...(by_wall.get(key) ?? []), p.at]);
    }
    const crowded = [...by_wall.entries()].find(([, ats]) => ats.length > 1);
    expect(crowded).toBeDefined();
    const [key, ats] = crowded!;
    const [on, side] = key.split("|") as [string, string];
    const box = boxes.get(on)!;
    const extent = side === "left" || side === "right" ? box.h : box.w;
    const sorted = [...ats].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      expect((sorted[i]! - sorted[i - 1]!) * extent).toBeGreaterThanOrEqual(SEAT - 1e-6);
    }
  });

  it("never gives two ends the same seat on one wall", () => {
    const graph = fold(related());
    const spots = laid(graph, "block_loop");
    const boxes = new Map(spots.map((p) => [p.id, p]));
    const links = Object.values(graph.edges);
    const { perches } = assign_seats(graph, links, spots, boxes);
    const seen = new Set<string>();
    for (const p of perches) {
      const key = `${p.on}|${p.side}|${p.at}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });

  it("keeps related loose cards beside each other under grid", () => {
    const graph = fold(related());
    const spots = under(graph, "block_loop", "grid");
    const at = new Map(spots.map((p) => [p.id, p]));
    const gap = (a: Placed, b: Placed) => Math.max(
      b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));
    const pump = at.get("block_pump")!;
    const hot = at.get("block_hot")!;
    /** Pump feeds the hot-side band — they should be neighbours, not across the layer. */
    expect(gap(pump, hot)).toBeGreaterThanOrEqual(GAP);
    expect(gap(pump, hot)).toBeLessThanOrEqual(GAP + UNIT);
  });

  it("places a tied note beside what it is about", () => {
    const graph = fold(related());
    graph.edges["edge_note"] = { id: "edge_note", from: "block_note", to: "block_pump", module: "tie" };
    const spots = under(graph, "block_loop", "grid");
    const at = new Map(spots.map((p) => [p.id, p]));
    const gap = (a: Placed, b: Placed) => Math.max(
      b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));
    const note = at.get("block_note")!;
    const pump = at.get("block_pump")!;
    expect(gap(note, pump)).toBeGreaterThanOrEqual(GAP);
    expect(gap(note, pump)).toBeLessThanOrEqual(GAP + UNIT);
  });

  it("pulls a tied note beside its subject even when it was dropped far away", () => {
    const graph = fold(related());
    graph.edges["edge_note"] = { id: "edge_note", from: "block_note", to: "block_pump", module: "tie" };
    graph.blocks["block_note"]!.x = 2000;
    graph.blocks["block_note"]!.y = 2000;
    const spots = under(graph, "block_loop", "grid");
    const at = new Map(spots.map((p) => [p.id, p]));
    const gap = (a: Placed, b: Placed) => Math.max(
      b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));
    const note = at.get("block_note")!;
    const pump = at.get("block_pump")!;
    expect(gap(note, pump)).toBeGreaterThanOrEqual(GAP);
    expect(gap(note, pump)).toBeLessThanOrEqual(GAP + UNIT);
  });

  it("tidies a tied note beside what it is about", () => {
    const graph = fold(related());
    graph.edges["edge_note"] = { id: "edge_note", from: "block_note", to: "block_pump", module: "tie" };
    graph.blocks["block_note"]!.x = 2000;
    graph.blocks["block_note"]!.y = 2000;
    const spots = laid(graph, "block_loop");
    const at = new Map(spots.map((p) => [p.id, p]));
    const tidy_at = tidy(graph, "block_loop");
    const gap = (a: { x: number; y: number; w: number; h: number },
                 b: { x: number; y: number; w: number; h: number }) => Math.max(
      b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));
    const note = tidy_at.find((p) => p.id === "block_note")!;
    const pump = tidy_at.find((p) => p.id === "block_pump")!;
    const note_s = at.get("block_note")!;
    const pump_s = at.get("block_pump")!;
    expect(gap({ ...note, w: note_s.w, h: note_s.h }, { ...pump, w: pump_s.w, h: pump_s.h }))
      .toBeGreaterThanOrEqual(GAP);
    expect(gap({ ...note, w: note_s.w, h: note_s.h }, { ...pump, w: pump_s.w, h: pump_s.h }))
      .toBeLessThanOrEqual(GAP + UNIT);
  });

  it("places a tied note below a grid, aligned with the block it is about", () => {
    const graph = fold(fixture("gridded"));
    graph.blocks["block_note"] = { id: "block_note", parent: "block_board", type: "note", num: 99 };
    graph.edges["edge_note"] = { id: "edge_note", from: "block_note", to: "block_draft", module: "tie" };
    const spots = under(graph, "block_board", "grid");
    const at = new Map(spots.map((p) => [p.id, p]));
    const gap = (a: Placed, b: Placed) => Math.max(
      b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));
    const note = at.get("block_note")!;
    const draft = at.get("block_draft")!;
    const lanes = at.get("block_lanes")!;
    expect(note.x).toBe(draft.x);
    expect(gap(note, lanes)).toBeGreaterThanOrEqual(GAP);
    expect(gap(note, lanes)).toBeLessThanOrEqual(GAP + UNIT);
  });

  it("places a reference below a grid, aligned with the block it stands for", () => {
    const graph = fold(fixture("gridded"));
    graph.blocks["block_ref"] = { id: "block_ref", parent: "block_board", of: "block_draft", num: 99 };
    const spots = under(graph, "block_board", "grid");
    const at = new Map(spots.map((p) => [p.id, p]));
    const gap = (a: Placed, b: Placed) => Math.max(
      b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));
    const ref = at.get("block_ref")!;
    const draft = at.get("block_draft")!;
    const lanes = at.get("block_lanes")!;
    expect(ref.x).toBe(draft.x);
    expect(gap(ref, lanes)).toBeGreaterThanOrEqual(GAP);
    expect(gap(ref, lanes)).toBeLessThanOrEqual(GAP + UNIT);
  });

  it("places a reference beside what it stands for", () => {
    const graph = fold(related());
    graph.blocks["block_ref"] = { id: "block_ref", parent: "block_loop", of: "block_pump", num: 99 };
    const spots = under(graph, "block_loop", "grid");
    const at = new Map(spots.map((p) => [p.id, p]));
    const gap = (a: Placed, b: Placed) => Math.max(
      b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));
    const ref = at.get("block_ref")!;
    const pump = at.get("block_pump")!;
    expect(gap(ref, pump)).toBeGreaterThanOrEqual(GAP);
    expect(gap(ref, pump)).toBeLessThanOrEqual(GAP + UNIT);
  });

  it("pulls a reference beside its target even when it was dropped far away", () => {
    const graph = fold(related());
    graph.blocks["block_ref"] = { id: "block_ref", parent: "block_loop", of: "block_pump", num: 99,
                                  x: 2000, y: 2000 };
    const spots = under(graph, "block_loop", "grid");
    const at = new Map(spots.map((p) => [p.id, p]));
    const gap = (a: Placed, b: Placed) => Math.max(
      b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));
    const ref = at.get("block_ref")!;
    const pump = at.get("block_pump")!;
    expect(gap(ref, pump)).toBeGreaterThanOrEqual(GAP);
    expect(gap(ref, pump)).toBeLessThanOrEqual(GAP + UNIT);
  });

  it("seats every interface on the card it belongs to, and nowhere else", () => {
    const graph = fold(fixture("interfaced"));
    const spots = laid(graph, "block_loop");
    const ports = seated(graph, spots);
    expect(ports.map((p) => p.id).sort()).toEqual(["port_in", "port_out"]);
    for (const port of ports) {
      const on = spots.find((p) => p.id === graph.blocks[port.id]!.parent)!;
      const mid = { x: port.x + port.w / 2, y: port.y + port.h / 2 };
      expect(mid.x).toBeGreaterThanOrEqual(on.x);
      expect(mid.x).toBeLessThanOrEqual(on.x + on.w);
      expect(mid.y).toBeGreaterThanOrEqual(on.y);
      expect(mid.y).toBeLessThanOrEqual(on.y + on.h);
    }
  });

  it("lays out none of them — an interface is seated, never placed", () => {
    const graph = fold(fixture("interfaced"));
    const spots = laid(graph, "block_loop");
    expect(spots.some((p) => is_interface(graph.blocks[p.id]!))).toBe(false);
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
