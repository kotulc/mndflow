/** A tie crosses straight where a note sits square beside its card, and leaves a corner when the
 *  note sits off one. */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { FLOOR } from "@mnd/fixtures";
import { fold, open, is_aside, path_to, ROOT, type Graph, type Id, type Log } from "@mnd/core";
import { laid } from "../src/arrange";
import { project } from "../src/block";
import { at_seat, seat_all, type Rect } from "../src/seat";
import { box_of } from "../src/scene";

/** A showcase block by its path of names, and the note tied to it. */
const named = (graph: Graph, path: string): Id => path_to(graph, path, graph.root)!;
const tie_on = (graph: Graph, id: Id) => Object.values(graph.edges).find((e) => e.type === "tie"
  && (e.from === id || e.to === id))!;
const note_on = (graph: Graph, id: Id): Id => {
  const tie = tie_on(graph, id);
  return tie.from === id ? tie.to : tie.from;
};

describe("a tie", () => {
  const log: Log = [{
    id: "s1", action: "build", at: 1, status: "applied", mutations: [
      { op: "add_block", block: { id: "layer", parent: ROOT, name: "L", type: "block",
                                  order: 1 } },
      { op: "add_block", block: { id: "a", parent: "layer", name: "A", type: "block",
                                  order: 1 } },
      { op: "add_block", block: { id: "na", parent: "layer", name: "na", type: "note",
                                  order: 2 } },
      { op: "add_block", block: { id: "nb", parent: "layer", name: "nb", type: "note",
                                  order: 3 } },
      { op: "link_blocks", edge: { id: "ta", from: "na", to: "a", type: "tie" } },
      { op: "link_blocks", edge: { id: "tb", from: "nb", to: "a", type: "tie" } },
    ],
  }];

  it("meets a slot where the note sits square, and a corner when it sits off one", () => {
    const graph = fold(log, FLOOR);
    expect(is_aside(graph, "na")).toBe(true);
    expect(is_aside(graph, "a")).toBe(false);
    const spots = laid(graph, "layer");
    const boxes = new Map(spots.map((p) => [p.id, p]));
    const links = ["ta", "tb"].map((id) => graph.edges[id]!);
    const seating = seat_all(graph, links, boxes);
    const note = seating.perches.find((p) => p.edge === "ta" && p.on === "na")!;
    const card = seating.perches.find((p) => p.edge === "ta" && p.on === "a")!;
    const other = seating.perches.find((p) => p.edge === "tb" && p.on === "a")!;
    const square = faces_square(boxes.get("na")!, boxes.get("a")!);
    expect(note.at === 0 || note.at === 1).toBe(!square);
    expect(card.at).toBeGreaterThan(0);
    expect(card.at).toBeLessThan(1);
    expect(other.at).toBeGreaterThan(0);
    expect(other.at).toBeLessThan(1);
    expect(other.side === card.side && other.at === card.at).toBe(false);
  });

  it("places a tied note in the nearest free space beside the card", () => {
    const graph = fold(log, FLOOR);
    const spots = laid(graph, "layer");
    const at = new Map(spots.map((p) => [p.id, p]));
    const card = at.get("a")!;
    const note = at.get("na")!;
    const gap = (a: Rect, b: Rect) => Math.max(
      Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)),
      Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
    expect(gap(note, card)).toBeGreaterThanOrEqual(24);
    expect(gap(at.get("nb")!, card)).toBeGreaterThanOrEqual(24);
    expect(gap(note, at.get("nb")!)).toBeGreaterThanOrEqual(24);
    expect(nearest_pair(note, card).d).toBeLessThanOrEqual(24 * 2);
    expect(nearest_pair(at.get("nb")!, card).d).toBeLessThanOrEqual(24 * 2);
  });

  it("crosses straight where a group note sits square beside the group", () => {
    const text = readFileSync("samples/showcase/workspace.json", "utf8");
    const { graph } = open(text, FLOOR);
    const scene = project(graph, named(graph, "Holders::Groups"));
    const opposite: Record<string, string> = {
      top: "bottom", bottom: "top", left: "right", right: "left",
    };
    for (const path of ["Plant", "Plant::Skid"]) {
      const id = named(graph, `Holders::Groups::${path}`);
      const tie = tie_on(graph, id).id;
      const on_group = scene.perches.find((p) => p.edge === tie && p.on === id)!;
      const on_note = scene.perches.find((p) => p.edge === tie && p.on === note_on(graph, id))!;
      const note = scene.nodes.find((n) => n.id === note_on(graph, id))!;
      const group = scene.nodes.find((n) => n.id === id)!;
      expect(nearest_pair(box_of(note), box_of(group)).d).toBeLessThanOrEqual(24 * 2);
      expect(faces_square(box_of(note), box_of(group))).toBe(true);
      expect(on_note.at).toBeGreaterThan(0);
      expect(on_note.at).toBeLessThan(1);
      expect(on_group.at).toBeGreaterThan(0);
      expect(on_group.at).toBeLessThan(1);
      expect(opposite[on_note.side]).toBe(on_group.side);
    }
  });
});

/** Whether two boxes share an edge's span, so a tie between them crosses straight. */
function faces_square(a: Rect, b: Rect): boolean {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return (ox > 12 && oy <= 0) || (oy > 12 && ox <= 0);
}

function corners_of(b: Rect): { x: number; y: number }[] {
  return [
    { x: b.x, y: b.y }, { x: b.x + b.w, y: b.y },
    { x: b.x, y: b.y + b.h }, { x: b.x + b.w, y: b.y + b.h },
  ];
}

/** How close the nearest corners are, and the run between them. */
function nearest_pair(a: Rect, b: Rect): { d: number; dx: number; dy: number } {
  let best = { d: Infinity, dx: 0, dy: 0 };
  for (const p of corners_of(a)) {
    for (const q of corners_of(b)) {
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < best.d) best = { d, dx, dy };
    }
  }
  return best;
}

describe("a note tied to an interface", () => {
  const log: Log = [{
    id: "s1", action: "build", at: 1, status: "applied", mutations: [
      { op: "add_block", block: { id: "layer", parent: ROOT, name: "L", type: "block",
                                  order: 1 } },
      { op: "add_block", block: { id: "a", parent: "layer", name: "A", type: "block",
                                  order: 1 } },
      { op: "add_block", block: { id: "p", parent: "layer", name: "", type: "interface",
                                  order: 2, flow: "out" } },
      { op: "add_block", block: { id: "na", parent: "layer", name: "by the port", type: "note",
                                  order: 3 } },
      { op: "link_blocks", edge: { id: "spill", from: "a", to: "p", type: "line" } },
      { op: "link_blocks", edge: { id: "ta", from: "na", to: "p", type: "tie" } },
      { op: "add_block", block: { id: "q", parent: "a", name: "", type: "interface",
                                  order: 1, flow: "in" } },
      { op: "add_block", block: { id: "nb", parent: "layer", name: "by the card port",
                                  type: "note", order: 4 } },
      { op: "link_blocks", edge: { id: "tb", from: "nb", to: "q", type: "tie" } },
    ],
  }];

  it("floats beside a port on the room's wall", () => {
    const scene = project(fold(log, FLOOR), "layer");
    const note = scene.nodes.find((n) => n.id === "na")!;
    const port = scene.frame!.ports.find((p) => p.id === "p")!;
    const gap = nearest_pair(box_of(note), at_seat(scene.frame!, port));
    expect(gap.d).toBeGreaterThan(8);
    expect(gap.d).toBeLessThan(24 * 4);
    const perch = scene.perches.find((p) => p.edge === "ta" && p.on === "p");
    expect(perch && (perch.at === 0 || perch.at === 1)).toBe(true);
  });

  it("floats beside a port on a card", () => {
    const scene = project(fold(log, FLOOR), "layer");
    const note = scene.nodes.find((n) => n.id === "nb")!;
    const port = scene.nodes.find((n) => n.id === "q")!;
    const gap = nearest_pair(box_of(note), box_of(port));
    expect(gap.d).toBeLessThan(24 * 4);
  });

  it("floats the showcase note beside the room port on Ports", () => {
    const text = readFileSync("samples/showcase/workspace.json", "utf8");
    const { graph } = open(text, FLOOR);
    const scene = project(graph, named(graph, "Interfaces::Ports"));
    const drain = named(graph, "Interfaces::Ports::drain");
    const note = scene.nodes.find((n) => n.id === note_on(graph, drain))!;
    const port = scene.frame!.ports.find((p) => p.id === drain)!;
    const gap = nearest_pair(box_of(note), at_seat(scene.frame!, port));
    expect(gap.d).toBeLessThan(24 * 4);
    const box = box_of(note);
    const room = scene.frame!;
    expect(box.x).toBeGreaterThan(room.x);
    expect(box.y).toBeGreaterThan(room.y);
    expect(box.x + box.w).toBeLessThan(room.x + room.w);
    expect(box.y + box.h).toBeLessThan(room.y + room.h);
    const air = (a: Rect, b: Rect) => Math.max(
      Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)),
      Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
    const asides = scene.nodes.filter((n) => is_aside(graph, n.id));
    const around = scene.nodes.filter((n) => n.type !== "seat");
    for (const n of asides) {
      for (const o of around) {
        if (o.id === n.id) continue;
        expect(air(box_of(n), box_of(o)), `${n.id} against ${o.id}`).toBeGreaterThanOrEqual(24);
      }
    }
  });
});
