/** Placement, and the lattice everything lands on.
 *
 *  Pure geometry, so the temptation is to assert coordinates — which would
 *  break on every tuning pass and prove nothing. The acceptance bar is the
 *  cluster model: an exact ring comes out as a ring, an exact chain as a
 *  series, and anything else (hub-and-spoke included) falls through to the
 *  layer's arrangement rather than being forced into a shape it is not. The
 *  older promises still hold beside that — placement is repeatable, nothing
 *  lands on top of anything else, a hand-laid position is honoured, and a
 *  seat is on the lattice. */

import { describe, expect, it } from "vitest";

import { around, cell, pack, place, arranged, seatAt, seatMarks, sizeOf, tile, CELL, CHIP_CAP,
         type Box } from "../../src/geometry/layout";
import { fold } from "../../src/graph/fold";
import { edge, element, step, type Element, type Graph, type Layout, type Mutation,
         type Spot } from "../../src/graph/types";

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

/** Loose blocks joined by the given pairs — the cluster harness. */
function linked(count: number, pairs: [number, number][],
                form: "line" | "directed" = "line") {
  const made = Array.from({ length: count }, (_, at) =>
    element(`n${at}`, { parent: null, id: `n${at}` }));
  const graph = fold([step("", "test", [
    ...made.map((it) => ({ op: "add_element", element: it }) as Mutation),
    ...pairs.map(([a, b]) => ({
      op: "link_elements",
      edge: edge(made[a].id, made[b].id, { form }),
    }) as Mutation),
  ])]);

  return { graph, nodes: made.map((n) => graph.elements[n.id]) };
}

const boxOf = (graph: Graph, node: Element, at: { x: number; y: number }): Box =>
  ({ ...at, ...sizeOf(graph, node) });

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const centre = (graph: Graph, node: Element, at: Spot) => {
  const size = sizeOf(graph, node);

  return { id: node.id, x: at.x + size.w / 2, y: at.y + size.h / 2 };
};

/** Undirected pair keys for the links that were asked for. */
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Angular order around the pack's middle — how a ring reads as a ring. */
function byAngle(centres: { id: string; x: number; y: number }[]) {
  const cx = centres.reduce((sum, c) => sum + c.x, 0) / centres.length;
  const cy = centres.reduce((sum, c) => sum + c.y, 0) / centres.length;

  return [...centres].sort(
    (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx),
  );
}

/** Whether every angular neighbour is joined — the ring property. */
function angularNeighboursJoined(
  centres: { id: string; x: number; y: number }[],
  pairs: [string, string][],
) {
  const joined = new Set(pairs.map(([a, b]) => pairKey(a, b)));
  const order = byAngle(centres);

  return order.every((here, at) => {
    const next = order[(at + 1) % order.length];

    return joined.has(pairKey(here.id, next.id));
  });
}

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

describe("clusters", () => {
  /** A cycle of `n` — exact ring topology. */
  const cycle = (n: number): [number, number][] =>
    Array.from({ length: n }, (_, at) => [at, (at + 1) % n]);

  /** A path of `n` — exact chain topology. */
  const path = (n: number): [number, number][] =>
    Array.from({ length: n - 1 }, (_, at) => [at, at + 1]);

  it("seats an exact ring as a ring — angular neighbours are the cycle", () => {
    for (const n of [3, 4, 5, 6]) {
      const pairs = cycle(n);
      const { graph, nodes } = linked(n, pairs);
      const spots = arranged(graph, nodes, "grid");
      const centres = nodes.map((node) => centre(graph, node, spots[node.id]));
      const linkedIds = pairs.map(([a, b]) => [nodes[a].id, nodes[b].id] as [string, string]);

      expect(angularNeighboursJoined(centres, linkedIds), `ring of ${n}`).toBe(true);
    }
  });

  it("keeps a loose ring as a ring under resting fill too", () => {
    const pairs = cycle(5);
    const { graph, nodes } = linked(5, pairs);
    const spots = place(graph, nodes);
    const centres = nodes.map((node) => centre(graph, node, spots[node.id]));
    const linkedIds = pairs.map(([a, b]) => [nodes[a].id, nodes[b].id] as [string, string]);

    expect(angularNeighboursJoined(centres, linkedIds)).toBe(true);
  });

  it("seats an exact chain as a series — order along the axis matches the path", () => {
    for (const shape of ["across", "down"] as Layout[]) {
      const n = 5;
      const pairs = path(n);
      const { graph, nodes } = linked(n, pairs, "directed");
      const spots = arranged(graph, nodes, shape);
      const centres = nodes.map((node) => centre(graph, node, spots[node.id]));
      const along = shape === "across" ? "x" : "y";
      const acrossAxis = shape === "across" ? "y" : "x";
      const ordered = [...centres].sort((a, b) => a[along] - b[along]);
      const walk = nodes.map((node) => node.id);
      const ids = ordered.map((c) => c.id);
      const spanAlong = ordered[ordered.length - 1][along] - ordered[0][along];
      const spanAcross = Math.max(...centres.map((c) => c[acrossAxis]))
        - Math.min(...centres.map((c) => c[acrossAxis]));

      const forward = walk.join("\0");
      const reverse = [...walk].reverse().join("\0");
      expect(ids.join("\0") === forward || ids.join("\0") === reverse, shape).toBe(true);
      // A series reads as one row (or column): the axis it runs along dominates.
      expect(spanAlong > spanAcross, shape).toBe(true);
    }
  });

  it("does not seat a hub-and-spoke as a ring — spoke tips are not joined", () => {
    // Hub at 0, three spokes. Angular neighbours among the tips are not edges,
    // so the ring property must fail — otherwise ranking flattened a star into
    // a cycle nobody drew.
    const pairs: [number, number][] = [[0, 1], [0, 2], [0, 3]];
    const { graph, nodes } = linked(4, pairs);
    const spots = arranged(graph, nodes, "grid");
    const centres = nodes.map((node) => centre(graph, node, spots[node.id]));
    const linkedIds = pairs.map(([a, b]) => [nodes[a].id, nodes[b].id] as [string, string]);

    expect(angularNeighboursJoined(centres, linkedIds)).toBe(false);
  });

  it("shapes each cluster on its own — two rings each keep their cycle", () => {
    const a = linked(4, cycle(4));
    const bMade = Array.from({ length: 4 }, (_, at) =>
      element(`m${at}`, { parent: null, id: `m${at}` }));
    const bPairs = cycle(4);
    const graph = fold([step("", "test", [
      ...a.nodes.map((it) => ({ op: "add_element", element: it }) as Mutation),
      ...bMade.map((it) => ({ op: "add_element", element: it }) as Mutation),
      ...cycle(4).map(([i, j]) => ({
        op: "link_elements",
        edge: edge(a.nodes[i].id, a.nodes[j].id),
      }) as Mutation),
      ...bPairs.map(([i, j]) => ({
        op: "link_elements",
        edge: edge(bMade[i].id, bMade[j].id),
      }) as Mutation),
    ])]);
    const nodes = [...a.nodes, ...bMade].map((n) => graph.elements[n.id]);
    const spots = arranged(graph, nodes, "grid");

    for (const pack of [a.nodes, bMade.map((n) => graph.elements[n.id])]) {
      const centres = pack.map((node) => centre(graph, node, spots[node.id]));
      const linkedIds = cycle(4).map(([i, j]) =>
        [pack[i].id, pack[j].id] as [string, string]);

      expect(angularNeighboursJoined(centres, linkedIds)).toBe(true);
    }
  });

  it("leaves a hand-laid member of a cluster where it was", () => {
    // A mixed cluster falls through to unit-by-unit fill; the placed card is
    // still a hard constraint, topology or not.
    const at = { x: 240, y: 240 };
    const made = Array.from({ length: 4 }, (_, i) =>
      element(`n${i}`, { parent: null, id: `n${i}`, ...(i === 0 ? at : {}) }));
    const graph = fold([step("", "test", [
      ...made.map((it) => ({ op: "add_element", element: it }) as Mutation),
      ...cycle(4).map(([i, j]) => ({
        op: "link_elements",
        edge: edge(made[i].id, made[j].id),
      }) as Mutation),
    ])]);
    const nodes = made.map((n) => graph.elements[n.id]);
    const spot = place(graph, nodes)[made[0].id];

    expect(Math.abs(spot.x - at.x)).toBeLessThan(CELL);
    expect(Math.abs(spot.y - at.y)).toBeLessThan(CELL);
  });

  it("arranges a thirty-node layer without stalling", () => {
    // Acceptance bar, not a micro-benchmark: a busy layer of recognisable
    // clusters has to finish in well under a frame budget's worth of work.
    const pairs: [number, number][] = [
      ...cycle(5),
      ...path(6).map(([a, b]) => [a + 5, b + 5] as [number, number]),
      ...cycle(4).map(([a, b]) => [a + 11, b + 11] as [number, number]),
      ...[[15, 16], [15, 17], [15, 18], [15, 19]] as [number, number][],
    ];
    const { graph, nodes } = linked(30, pairs);
    const start = performance.now();
    const spots = arranged(graph, nodes, "across");
    const elapsed = performance.now() - start;

    expect(Object.keys(spots)).toHaveLength(30);
    expect(place(graph, nodes)).toBeTruthy();
    expect(elapsed, `arranged 30 nodes in ${elapsed.toFixed(1)}ms`).toBeLessThan(250);
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
