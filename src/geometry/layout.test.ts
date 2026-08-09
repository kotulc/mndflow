/** Placement, and the lattice everything lands on.
 *
 *  Pure geometry, so the temptation is to assert coordinates — which would
 *  break on every tuning pass and prove nothing. What has to hold instead is
 *  that placement is repeatable, that nothing lands on top of anything else,
 *  that a position somebody chose is honoured, and that a seat is on the
 *  lattice. Those are the promises the layout model is built on. */

import { describe, expect, it } from "vitest";

import { around, cell, pack, place, seatAt, seatMarks, sizeOf, tile, CELL, CHIP_CAP,
         type Box } from "./layout";
import { fold } from "../graph/fold";
import { element, step, type Element, type Graph, type Mutation } from "../graph/types";

/** A layer of loose blocks, plus any the caller has already placed. */
function layer(loose: number, placed: Array<{ x: number; y: number }> = []) {
  const made: Element[] = [
    ...Array.from({ length: loose }, (_, at) => element(`n${at}`, { parent: null })),
    ...placed.map((at, i) => element(`p${i}`, { parent: null, ...at })),
  ];
  const graph = fold([step("", "test",
    made.map((it) => ({ op: "add_element", element: it }) as Mutation))]);

  return { graph, nodes: made.map((n) => graph.elements[n.id]) };
}

const boxOf = (graph: Graph, node: Element, at: { x: number; y: number }): Box =>
  ({ ...at, ...sizeOf(graph, node) });

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

describe("place", () => {
  it("is repeatable — the same layer twice lands the same way", () => {
    const { graph, nodes } = layer(8);

    expect(place(graph, nodes)).toEqual(place(graph, nodes));
  });

  it("puts nothing on top of anything else", () => {
    const { graph, nodes } = layer(12);
    const spots = place(graph, nodes);
    const boxes = nodes.map((n) => boxOf(graph, n, spots[n.id]));

    for (let a = 0; a < boxes.length; a += 1) {
      for (let b = a + 1; b < boxes.length; b += 1) {
        expect(overlaps(boxes[a], boxes[b]), `${a} overlaps ${b}`).toBe(false);
      }
    }
  });

  it("honours a position somebody chose — a hand-laid thing is a hard constraint", () => {
    // Snapped to the lattice rather than kept exactly, so what has to hold is
    // that it lands near where it was asked and that *nothing else on the
    // layer can move it*. The second is the constraint; the first is only
    // evidence the right node was found.
    const at = { x: 240, y: 240 };
    const few = layer(2, [at]);
    const many = layer(10, [at]);
    const held = (l: ReturnType<typeof layer>) => l.nodes.find((n) => n.x !== null)!;
    const spot = place(few.graph, few.nodes)[held(few).id];

    expect(place(many.graph, many.nodes)[held(many).id]).toEqual(spot);
    expect(Math.abs(spot.x - at.x)).toBeLessThan(CELL);
    expect(Math.abs(spot.y - at.y)).toBeLessThan(CELL);
  });

  it("keeps clear of ground it was told is taken", () => {
    const { graph, nodes } = layer(4);
    const blocked: Box = { x: 0, y: 0, w: 480, h: 480 };
    const spots = place(graph, nodes, [blocked]);

    for (const node of nodes) {
      expect(overlaps(boxOf(graph, node, spots[node.id]), blocked)).toBe(false);
    }
  });

  it("places every node it is given, and only those", () => {
    const { graph, nodes } = layer(5);

    expect(Object.keys(place(graph, nodes)).sort()).toEqual(nodes.map((n) => n.id).sort());
  });
});

describe("the lattice", () => {
  it("snaps to the cell in both directions", () => {
    expect(cell(0)).toBe(0);
    expect(cell(CELL)).toBe(CELL);
    expect(Math.abs(cell(CELL * 2 - 1) % CELL)).toBe(0);
    expect(Math.abs(cell(-CELL * 3 + 1) % CELL)).toBe(0);
  });

  it("puts every seat inside the edge it belongs to, in order", () => {
    const marks = seatMarks(0, 240);

    expect(marks.length).toBeGreaterThan(0);
    expect([...marks].sort((a, b) => a - b)).toEqual(marks);
    expect(Math.min(...marks)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...marks)).toBeLessThanOrEqual(240);
  });

  it("returns a fraction that lands back on a seat, so a resize cannot drift it", () => {
    const extent = 240;
    const marks = seatMarks(0, extent);

    for (const at of [0, 0.13, 0.5, 0.77, 1]) {
      expect(marks).toContain(seatAt(at, extent) * extent);
    }
  });

  it("gives a fraction inside the edge even where there is barely room", () => {
    const at = seatAt(0.5, CELL);

    expect(at).toBeGreaterThanOrEqual(0);
    expect(at).toBeLessThanOrEqual(1);
  });
});

describe("the treemap", () => {
  it.each([1, 2, 3, 5, CHIP_CAP])("fills its box exactly with %i chips", (count) => {
    const box = { w: 168, h: 48 };
    const cells = pack(count, box);

    expect(cells).toHaveLength(count);
    const area = cells.reduce((sum, c) => sum + c.w * c.h, 0);
    expect(area).toBeCloseTo(box.w * box.h, 3);
  });

  it("divides the same way every time, so a container reads as a shape", () => {
    expect(pack(6, { w: 168, h: 48 })).toEqual(pack(6, { w: 168, h: 48 }));
  });

  it("asks for enough rows and columns to hold what it was given", () => {
    for (const count of [1, 4, 9, 20]) {
      const { cols, rows } = tile(count);
      expect(cols * rows).toBeGreaterThanOrEqual(count);
    }
  });
});

describe("around", () => {
  it("encloses everything it was given, plus the padding", () => {
    const boxes: Box[] = [{ x: 0, y: 0, w: 10, h: 10 }, { x: 100, y: 50, w: 10, h: 10 }];
    const held = around(boxes, 4)!;

    for (const box of boxes) {
      expect(held.x).toBeLessThanOrEqual(box.x);
      expect(held.y).toBeLessThanOrEqual(box.y);
      expect(held.x + held.w).toBeGreaterThanOrEqual(box.x + box.w);
      expect(held.y + held.h).toBeGreaterThanOrEqual(box.y + box.h);
    }
  });

  it("is nothing around nothing", () => {
    expect(around([], 4)).toBeNull();
  });
});
