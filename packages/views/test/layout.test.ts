/** Placement and routing, as properties.
 *
 *  Nothing here asserts a coordinate. What is pinned is that cards do not
 *  overlap, that routes terminate on the cards they name, that every elbow is a
 *  right angle, and that reordering the input does not move the output. */

import { describe, expect, it } from "vitest";
import { fixture, related } from "@mnd/fixtures";
import { children, fold, is_interface,
         type Arrangement, type Graph, type Id } from "@mnd/core";
import { bounds, boundary, laid, nearest_seat, seated, size_of, snap, GRID, GAP,
         type Placed } from "../src/index";

const ARRANGEMENTS: Arrangement[] = ["free", "grid", "right", "left", "down", "up"];

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

describe("size", () => {
  it("gives a container more room than a leaf", () => {
    const { graph } = layer_of("nested");
    expect(size_of(graph, "block_edge").h).toBeGreaterThan(size_of(graph, "block_auth").h);
  });

  it("snaps to the grid", () => {
    for (const n of [0, 1, 13, 25, -37]) expect(snap(n) % GRID === 0).toBe(true);
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
    const spots = under(graph, layer, how);
    for (let i = 0; i < spots.length; i++) {
      for (let j = i + 1; j < spots.length; j++) {
        expect(overlaps(spots[i]!, spots[j]!), `${spots[i]!.id} over ${spots[j]!.id}`).toBe(false);
      }
    }
  });

  it.each(ARRANGEMENTS)("lands on the grid under %s", (how) => {
    const { graph, layer } = layer_of("related");
    for (const p of under(graph, layer, how)) {
      expect(p.x % GRID === 0, `${p.id} x`).toBe(true);
      expect(p.y % GRID === 0, `${p.id} y`).toBe(true);
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
    const spots = under(graph, layer, "grid");
    const left = Math.min(...spots.map((p) => p.x));
    const right = Math.max(...spots.map((p) => p.x + p.w));
    expect(Math.abs(left + right)).toBeLessThanOrEqual(GRID);
  });

  it("gives an empty layer room to put something new", () => {
    expect(bounds([]).w).toBeGreaterThan(0);
  });
});

describe("a directional arrangement reads one way", () => {
  it("puts what nothing points at first, and ranks along the direction", () => {
    const graph = fold(related());
    const spots = under(graph, "block_loop", "right");
    const at = (id: string) => spots.find((p) => p.id === id)!;
    expect(at("block_pump").x).toBeLessThan(at("block_hx").x);
    expect(at("block_hx").x).toBeLessThan(at("block_tank").x);
  });

  it("reverses under the opposite direction", () => {
    const graph = fold(related());
    const at = (spots: Placed[], id: string) => spots.find((p) => p.id === id)!;
    const right = under(graph, "block_loop", "right");
    const left = under(graph, "block_loop", "left");
    expect(at(right, "block_pump").x < at(right, "block_hx").x)
      .toBe(at(left, "block_pump").x > at(left, "block_hx").x);
  });

  it("ranks down the page rather than across when told to", () => {
    const graph = fold(related());
    const spots = under(graph, "block_loop", "down");
    const at = (id: string) => spots.find((p) => p.id === id)!;
    expect(at("block_pump").y).toBeLessThan(at("block_hx").y);
  });
});


describe("boundaries", () => {
  it("is its members' bounds plus a margin, and holds them", () => {
    const graph = fold(related());
    const spots = laid(graph, "block_loop");
    const members = Object.values(graph.blocks)
      .filter((b) => b.groups?.includes("block_hot")).map((b) => b.id);
    const box = boundary(spots, members)!;
    for (const p of spots.filter((s) => members.includes(s.id))) {
      expect(p.x).toBeGreaterThanOrEqual(box.x);
      expect(p.y).toBeGreaterThanOrEqual(box.y);
      expect(p.x + p.w).toBeLessThanOrEqual(box.x + box.w);
      expect(p.y + p.h).toBeLessThanOrEqual(box.y + box.h);
    }
    expect(box.w).toBeGreaterThan(GAP.member);
  });

  it("draws nothing for a boundary holding nothing", () => {
    expect(boundary([], ["nobody"])).toBeNull();
  });
});

describe("seats", () => {
  const card: Placed = { id: "block_pump", x: 0, y: 0, w: 168, h: 36 };

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
