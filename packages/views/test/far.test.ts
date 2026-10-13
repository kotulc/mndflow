/** Temporary: how far an aside sits from what it is tied to. */

import { readFileSync } from "node:fs";
import { describe, it } from "vitest";
import { FLOOR } from "@mnd/fixtures";
import { open, is_tie, type Id } from "@mnd/core";
import { project } from "../src/block";
import { at_seat, type Rect } from "../src/seat";
import { box_of } from "../src/scene";

const text = readFileSync("samples/showcase/workspace.json", "utf8");
const { graph } = open(text, FLOOR);

function corners(b: Rect): { x: number; y: number }[] {
  return [
    { x: b.x, y: b.y }, { x: b.x + b.w, y: b.y },
    { x: b.x, y: b.y + b.h }, { x: b.x + b.w, y: b.y + b.h },
  ];
}

function nearest(a: Rect, b: Rect): number {
  let d = Infinity;
  for (const p of corners(a)) for (const q of corners(b)) {
    d = Math.min(d, Math.hypot(q.x - p.x, q.y - p.y));
  }
  return Math.round(d);
}

describe("how far", () => {
  it.each(["l_groups", "l_ports"])("%s", (layer) => {
    const scene = project(graph, layer);
    if (layer === "l_ports") console.log("frame", scene.frame && {
      x: scene.frame.x, y: scene.frame.y, w: scene.frame.w, h: scene.frame.h,
      ports: scene.frame.ports,
    });
    const box = new Map(scene.nodes.map((n) => [n.id, box_of(n)]));
    if (scene.frame) box.set("__frame", scene.frame);
    const port_box = (id: Id): Rect | undefined => {
      const on = graph.blocks[id]?.parent;
      if (!on || !scene.frame) return undefined;
      const seat = on === layer
        ? scene.frame.ports.find((p) => p.id === id)
        : scene.nodes.find((n) => n.id === id);
      const host = on === layer ? scene.frame : box.get(on);
      if (!seat || !host || !("side" in seat) || !seat.side) return box.get(id);
      return at_seat(host, { side: seat.side, at: seat.at ?? 0.5 });
    };
    const rows = [];
    for (const e of Object.values(graph.edges)) {
      if (!is_tie(graph, e.id)) continue;
      const ends = [e.from, e.to];
      if (!ends.some((id) => box.has(id) || graph.blocks[id]?.parent === layer)) continue;
      const a = box.get(e.from) ?? port_box(e.from);
      const b = box.get(e.to) ?? port_box(e.to);
      if (!a || !b) continue;
      rows.push({
        tie: e.id, from: e.from, to: e.to, d: nearest(a, b),
        a: { ...a, name: graph.blocks[e.from]?.name?.slice(0, 40) },
        b: { ...b, name: graph.blocks[e.to]?.name?.slice(0, 40) },
      });
    }
    console.log(layer, JSON.stringify(rows, null, 2));
  });
});
