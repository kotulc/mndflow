/** A grid read as time, on the grid element: what sits in a cell is a step, a card on its
 *  column's lifeline, and a relation between steps is a message straight across at the row it
 *  reaches — from the card it leaves, or that card's lifeline where it sits in another row, to the
 *  edge of the card it reaches. Its name reads level. **A lifeline is a line like any other**:
 *  dashed, straight down each column from its head to the grid's foot, behind the cards, hung
 *  from two points that draw nothing. Worked out every draw. */

import { has_lifelines, is_header, lattice_of, type Graph, type Id, type Side } from "@mnd/core";
import { box_of, cell, type BoxNode, type LineEdge, type Scene } from "./scene";
import { cell_box, UNIT, type Box } from "./size";

/** The seat a lifeline hangs from, so the canvas has a handle; its run is its points. */
const SEAT = { id: "m", side: "bottom" as Side, at: 0.5 };

/** How far apart two messages into one row run, and how tall a message to itself loops. */
const APART = 10;
const LOOP = UNIT;


/** The grid view of `grid` with its messages straight across, where the grid has lifelines; else
 *  as it was. */
export function lifelined(graph: Graph, grid: Id, scene: Scene): Scene {
  const g = lattice_of(graph, grid);
  const room = scene.nodes.find((n) => n.id === grid);
  if (!g || !room || !has_lifelines(graph, grid)) return scene;
  const cards = new Map(scene.nodes.map((n) => [n.id, n]));
  /** A step's card on the canvas, its row and its lifeline's x. */
  const step = (id: Id) => {
    const b = graph.blocks[id];
    const n = cards.get(id);
    if (!b?.cell || !n || b.parent !== grid || is_header(graph, id)) return null;
    const box = box_of(n);
    return { r: b.cell.r, ...box, line: box.x + box.w / 2 };
  };

  /** The messages into each row, so two into one are drawn apart. */
  const into = new Map<number, LineEdge[]>();
  for (const e of scene.edges) {
    const [a, z] = [step(e.source), step(e.target)];
    if (a && z && e.source !== e.target) into.set(z.r, [...(into.get(z.r) ?? []), e]);
  }
  const edges = scene.edges.map((e): LineEdge => {
    const [a, z] = [step(e.source), step(e.target)];
    if (!a || !z) return e;
    if (e.source === e.target) {
      /** A message to itself loops out of its card's right side and back, in the card's upper
       *  half, clear of the messages reaching its middle. */
      const [right, top] = [a.x + a.w, a.y + 4];
      return { ...e, data: { ...e.data!, level: true, points: [
        { x: right, y: top }, { x: right + LOOP * 2.5, y: top },
        { x: right + LOOP * 2.5, y: top + LOOP / 2 }, { x: right, y: top + LOOP / 2 }] } };
    }
    const row = into.get(z.r)!;
    const y = z.y + z.h / 2 + (row.indexOf(e) - (row.length - 1) / 2) * APART;
    const ahead = a.line < z.line;
    /** Out of its card's side where both share the row; else off its lifeline. */
    const from = a.r === z.r ? (ahead ? a.x + a.w : a.x) : a.line;
    const to = ahead ? z.x : z.x + z.w;
    return { ...e, data: { ...e.data!, level: true, points: [{ x: from, y }, { x: to, y }] } };
  });
  const lives = lifelines(g.cols, (c) => cell_box(g, 0, c), box_of(room));
  return { ...scene, nodes: [...scene.nodes, ...lives.nodes], edges: [...lives.edges, ...edges],
           lifelines: grid };
}

/** A dashed line down the middle of each column, from under its head to the grid's foot. */
function lifelines(cols: number, head: (c: number) => Box, room: Box) {
  const nodes: BoxNode[] = [];
  const edges: LineEdge[] = [];
  for (let c = 1; c < cols; c++) {
    const at = head(c);
    const x = room.x + at.x + at.w / 2;
    const [top, foot] = [room.y + at.y + at.h, room.y + room.h];
    const id = `@life:${c}`;
    nodes.push(dot(`${id}:top`, x, top), dot(`${id}:foot`, x, foot));
    edges.push({
      id, source: `${id}:top`, target: `${id}:foot`, sourceHandle: "s-m", targetHandle: "t-m",
      selectable: false, focusable: false,
      data: { module: "line", dir: "none",
              wire: { name: false, alias: false, border_style: "dashed" },
              points: [{ x, y: top }, { x, y: foot }] },
    });
  }
  return { nodes, edges };
}

/** A point a lifeline hangs from. It draws nothing. */
function dot(id: Id, x: number, y: number): BoxNode {
  return { ...cell(id, { x, y, w: 1, h: 1 }, { label: "", marks: [], seats: [SEAT] }),
           style: { opacity: 0, pointerEvents: "none" },
           selectable: false, draggable: false, focusable: false };
}
