/** A grid read as time, on the grid element: what sits in a cell is a step, a card on its
 *  column's lifeline, and a relation between steps is a message straight across at the row it
 *  reaches — from the card it leaves, or that card's lifeline where it sits in another row, to the
 *  edge of the card it reaches. Its name reads level. **A lifeline is a line like any other**:
 *  dashed, straight down each column from its participant's card — else its header strip — to the
 *  grid's foot, behind the cards, hung from two points that draw nothing. Worked out every draw. */

import { has_lifelines, is_header, is_participant, lattice_of, layer_of, shown_name,
         type Graph, type Id, type Side } from "@mnd/core";
import { box_of, cell, type BoxNode, type LineEdge, type Scene } from "./scene";
import { cell_box, head_height, UNIT, type Box } from "./size";

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
  /** A participant's lifeline x, where a message joins two participants directly. */
  const whole_box = box_of(room);
  const head = (id: Id) => {
    const n = cards.get(id);
    if (!n || graph.blocks[id]?.parent !== grid || !is_participant(graph, id)) return null;
    const box = box_of(n);
    return box.x + box.w / 2;
  };
  /** **Its row its list place** (sequence.md, agreed 3): the grid's messages in list order. */
  const listed = scene.edges.filter((e) => cards.has(e.source) && cards.has(e.target)
    && graph.blocks[e.source]?.parent === grid && graph.blocks[e.target]?.parent === grid)
    .map((e) => e.id).sort((x, y) => (graph.edges[x]?.order ?? 0) - (graph.edges[y]?.order ?? 0));
  const edges = scene.edges.map((e): LineEdge => {
    const [a, z] = [step(e.source), step(e.target)];
    const [ha, hz] = [head(e.source), head(e.target)];
    if (ha !== null && hz !== null) {
      const row = listed.indexOf(e.id) + 1;
      const at = cell_box(g, Math.min(row, g.rows - 1), 1, head_height(graph, grid));
      const y = whole_box.y + at.y + at.h / 2;
      /** A message to itself loops out of its lifeline and back, within its row. */
      const points = e.source === e.target
        ? [{ x: ha, y: y - LOOP / 4 }, { x: ha + LOOP * 2, y: y - LOOP / 4 },
           { x: ha + LOOP * 2, y: y + LOOP / 4 }, { x: ha, y: y + LOOP / 4 }]
        : [{ x: ha, y }, { x: hz, y }];
      return { ...e, data: { ...e.data!, level: true, origin: true, points } };
    }
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
    return { ...e, data: { ...e.data!, level: true, origin: true,
                           points: [{ x: from, y }, { x: to, y }] } };
  });
  /** Each column's head: its participant's card where it has one, else its header strip. */
  const heads = new Map<number, Box>();
  for (const n of scene.nodes) {
    const b = graph.blocks[n.id];
    if (b?.cell && b.parent === grid && is_participant(graph, n.id)) heads.set(b.cell.c, box_of(n));
  }
  const whole = box_of(room);
  const strip = (c: number) => {
    const at = cell_box(g, 0, c, head_height(graph, grid));
    return { ...at, x: whole.x + at.x, y: whole.y + at.y };
  };
  const lives = lifelines(g.cols, (c) => heads.get(c) ?? strip(c), whole);
  const owner = owner_frame(graph, grid, scene.nodes);
  const frags = fragments(graph, grid, whole);
  return { ...scene, nodes: [...(owner ? [owner] : []), ...frags, ...scene.nodes, ...lives.nodes],
           edges: [...lives.edges, ...edges], lifelines: grid };
}

/** **A sequence's fragments** (docs/diagrams/sequence.md, agreed 4 and 7): a frame across the
 *  body's columns over each run of rows, named by its condition (`↻ each .md change`) or, for
 *  alternatives, each run by its guard, the first led by `alt`; behind the cards. */
function fragments(graph: Graph, grid: Id, room: Box): BoxNode[] {
  const g = lattice_of(graph, grid);
  const said = graph.blocks[grid]?.fragments ?? [];
  if (!g || !said.length) return [];
  const head = head_height(graph, grid);
  const pad = UNIT / 4;
  const span = (id: string, [a, z]: [number, number], label: string): BoxNode => {
    const [top, foot] = [cell_box(g, a, 1, head), cell_box(g, z, g.cols - 1, head)];
    const at = { x: room.x + top.x + pad, y: room.y + top.y + pad,
                 w: foot.x + foot.w - top.x - pad * 2, h: foot.y + foot.h - top.y - pad * 2 };
    return { ...cell(id, at, { label, marks: ["group", "flat"] }, "group"),
             selectable: false, draggable: false, focusable: false };
  };
  return said.flatMap((f, i) => ("repeat" in f
    ? [span(`@frag:${i}`, f.rows, `↻ ${f.repeat}`)]
    : f.rows.map((r, j) => span(`@frag:${i}:${j}`, r,
                                 `${j ? "" : "alt "}${f.alt[j] ?? ""}`.trim()))));
}

/** **The owner's frame over the head** (docs/diagrams/sequence.md *Layout*): round the
 *  participants standing for the owner's own parts, named for it, so what is inside the system
 *  and what is outside it read apart. Null where none is. */
function owner_frame(graph: Graph, grid: Id, nodes: readonly BoxNode[]): BoxNode | null {
  const owner = layer_of(graph, grid);
  if (!owner) return null;
  const inside = (id: Id | undefined) => {
    for (let at = id ? graph.blocks[id]?.parent : null; at; at = graph.blocks[at]?.parent) {
      if (at === owner) return true;
    }
    return false;
  };
  const mine = nodes.filter((n) => graph.blocks[n.id]?.parent === grid
    && is_participant(graph, n.id) && inside(graph.blocks[n.id]!.of)).map(box_of);
  if (!mine.length) return null;
  const pad = UNIT / 2;
  const x = Math.min(...mine.map((b) => b.x)) - pad;
  const y = Math.min(...mine.map((b) => b.y)) - pad * 2;
  const w = Math.max(...mine.map((b) => b.x + b.w)) + pad - x;
  const h = Math.max(...mine.map((b) => b.y + b.h)) + pad - y;
  return { ...cell(`@owner:${owner}`, { x, y, w, h },
                   { label: shown_name(graph, owner), marks: ["group", "flat"] }, "group"),
           selectable: false, draggable: false, focusable: false };
}

/** A dashed line down the middle of each column, from under its head to the grid's foot. */
function lifelines(cols: number, head: (c: number) => Box, room: Box) {
  const nodes: BoxNode[] = [];
  const edges: LineEdge[] = [];
  for (let c = 1; c < cols; c++) {
    const at = head(c);
    const x = at.x + at.w / 2;
    const [top, foot] = [at.y + at.h, room.y + room.h];
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
