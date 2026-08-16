/** Where a line goes, worked out from the layer every time.
 *
 *  A route is derived and never stored, so the only thing worth pinning is
 *  that deriving it twice gives the same answer and that the answer is a
 *  legal path: it starts on one card, ends on the other, turns only at right
 *  angles, and does not cut through a block it has nothing to do with. Bend
 *  counts and corner positions are exactly the tuning this must not fix. */

import { describe, expect, it } from "vitest";

import { across, attach, lanes, route, runOf, type Box, type Planned } from "../../src/geometry/route";
import type { Spot } from "../../src/graph/types";

/** The whole line, end to end. `route` returns the pieces — two seats, two
 *  outward directions and the corners between — and `runOf` is what the canvas
 *  assembles them with, so the test measures the line that actually gets
 *  drawn rather than a second guess at it. */
const drawn = (held: Planned, from: Box, to: Box): Spot[] => runOf(
  attach(from, held.from.side, held.from.at), held.out,
  attach(to, held.to.side, held.to.at), held.back,
  held.corners,
);

const a: Box = { x: 0, y: 0, w: 120, h: 48 };
const b: Box = { x: 480, y: 0, w: 120, h: 48 };
/** Squarely between them, so any straight run has to go around it. */
const wall: Box = { x: 240, y: -200, w: 120, h: 500 };

const touches = (spot: { x: number; y: number }, box: Box) =>
  spot.x >= box.x - 1 && spot.x <= box.x + box.w + 1 &&
  spot.y >= box.y - 1 && spot.y <= box.y + box.h + 1;

const inside = (spot: { x: number; y: number }, box: Box) =>
  spot.x > box.x + 1 && spot.x < box.x + box.w - 1 &&
  spot.y > box.y + 1 && spot.y < box.y + box.h - 1;

describe("route", () => {
  it("is repeatable — the same layer twice draws the same line", () => {
    expect(route(a, b, [])).toEqual(route(a, b, []));
  });

  it("starts on one card and ends on the other", () => {
    const points = drawn(route(a, b, [])!, a, b);

    expect(touches(points[0], a)).toBe(true);
    expect(touches(points[points.length - 1], b)).toBe(true);
  });

  it("turns only at right angles", () => {
    const points = drawn(route(a, b, [wall])!, a, b);

    for (let at = 1; at < points.length; at += 1) {
      const from = points[at - 1];
      const to = points[at];
      const straight = Math.abs(from.x - to.x) < 1e-6 || Math.abs(from.y - to.y) < 1e-6;

      expect(straight, `segment ${at} runs diagonally`).toBe(true);
    }
  });

  it("goes around a block it does not attach to, where it can", () => {
    for (const point of drawn(route(a, b, [wall])!, a, b)) {
      expect(inside(point, wall)).toBe(false);
    }
  });

  it("never routes through the cards at its own ends", () => {
    // The one solid that is never given up: a line that cut back through the
    // block it left would read as leaving the wrong face.
    const hemmed: Box[] = [
      { x: 216, y: 168, w: 216, h: 48 }, { x: 216, y: 300, w: 216, h: 48 },
      { x: 144, y: 216, w: 48, h: 96 }, { x: 432, y: 216, w: 48, h: 96 },
    ];
    const from: Box = { x: 240, y: 240, w: 168, h: 36 };
    const to: Box = { x: 720, y: 240, w: 168, h: 36 };
    const points = drawn(route(from, to, hemmed)!, from, to);

    for (const point of points.slice(1, -1)) {
      expect(inside(point, from)).toBe(false);
      expect(inside(point, to)).toBe(false);
    }
  });

  it("draws a line even where the frame leaves no room to route one", () => {
    // A relationship that exists must be drawn. Staying inside the frame is a
    // rule about tidiness, and a short frame can leave no way round a card
    // between the two ends — where honouring it would mean drawing nothing.
    //
    // This is the bug where relationships vanished as the contents tray
    // opened: the tray reshapes the frame, and every route that stopped
    // fitting was silently dropped.
    for (const h of [480, 240, 120, 96, 72]) {
      const bounds: Box = { x: 0, y: 0, w: 720, h };

      expect(route(a, b, [wall], { bounds }), `frame ${h} tall`).not.toBeNull();
    }
  });

  it("draws a line for any two cards, however hemmed in", () => {
    // The property that matters, over layouts nobody chose. Constraints are
    // given up in turn — the frame first, then the other cards — because each
    // is about tidiness and none is worth an invisible relationship.
    //
    // Seeded, so a failure is reproducible rather than a flake. Before the
    // fallbacks existed this failed on roughly half of these.
    let seed = 12345;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const pick = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo));
    const box = (): Box => ({ x: pick(0, 600), y: pick(0, 400), w: pick(48, 200),
                              h: pick(24, 120) });
    let missing = 0;

    for (let round = 0; round < 120; round += 1) {
      const obstacles = Array.from({ length: pick(0, 9) }, box);
      const bounds = rnd() < 0.6
        ? { x: pick(-100, 50), y: pick(-100, 50), w: pick(200, 900), h: pick(120, 700) }
        : undefined;

      if (!route(box(), box(), obstacles, { bounds })) missing += 1;
    }

    expect(missing).toBe(0);
  });

  it("prefers to stay inside the frame when it can", () => {
    const bounds: Box = { x: -240, y: -240, w: 1200, h: 720 };
    const roomy = route(a, b, [wall], { bounds })!;

    for (const point of drawn(roomy, a, b)) {
      expect(point.x).toBeGreaterThanOrEqual(bounds.x);
      expect(point.x).toBeLessThanOrEqual(bounds.x + bounds.w);
      expect(point.y).toBeGreaterThanOrEqual(bounds.y);
      expect(point.y).toBeLessThanOrEqual(bounds.y + bounds.h);
    }
  });

  it("gives each end a seat on the card it leaves", () => {
    const held = route(a, b, [])!;

    expect(held.from.side).toBeDefined();
    expect(held.to.side).toBeDefined();
    expect(held.from.at).toBeGreaterThanOrEqual(0);
    expect(held.from.at).toBeLessThanOrEqual(1);
  });
});

describe("attach", () => {
  it("lands on the wall it was given, whichever it is", () => {
    expect(attach(a, "left", 0.5).x).toBeCloseTo(a.x);
    expect(attach(a, "right", 0.5).x).toBeCloseTo(a.x + a.w);
    expect(attach(a, "top", 0.5).y).toBeCloseTo(a.y);
    expect(attach(a, "bottom", 0.5).y).toBeCloseTo(a.y + a.h);
  });
});

describe("across", () => {
  it("names the axis two points are level on, and nothing where they are one point", () => {
    expect(across({ x: 0, y: 0 }, { x: 100, y: 0 })).toBe("y");
    expect(across({ x: 0, y: 0 }, { x: 0, y: 100 })).toBe("x");
    expect(across({ x: 0, y: 0 }, { x: 0, y: 0 })).toBeNull();
  });
});

describe("lanes", () => {
  it("moves runs apart without moving either end", () => {
    const runs = {
      one: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }],
      two: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 200 }],
    };
    const held = lanes(runs);

    for (const id of Object.keys(runs)) {
      expect(held[id][0]).toEqual(runs[id as keyof typeof runs][0]);
      expect(held[id][held[id].length - 1])
        .toEqual(runs[id as keyof typeof runs].slice(-1)[0]);
    }
  });

  it("leaves a lone run exactly where it was — nothing to share with", () => {
    const only = { one: [{ x: 0, y: 0 }, { x: 100, y: 0 }] };

    expect(lanes(only)).toEqual(only);
  });
});
