/** The sequence view: a grid read down the page as time.
 *
 *  The header row names the participants, each a lifeline under its head. Body rows run top to
 *  bottom. A step is an activation: a narrow bar on its lifeline at its row, its name said on
 *  hover. A relation between steps is a message straight across at the target's row, to the
 *  edge of the bar it reaches. The header column names the phases, as words down the left.
 *  Nothing is written back. */

import { at_cell, dir_of, edges_in, heading, lattice_of, members_of, role_of, shown_name,
         stamps_of, is_container, type Block, type Graph, type Id, type Relation,
         type Side } from "@mnd/core";
import { carried, trail_of } from "./derive";
import { PLAIN, wire_of } from "./look";
import { cell, type BoxNode, type LineEdge, type Scene } from "./scene";
import { GAP, PAD, roomed, size_of, UNIT } from "./size";

/** A seat every sequence edge leaves by, so the canvas has a handle to hang the run on. The run
 *  itself is the points, not the seat. */
const SEAT = { id: "m", side: "bottom" as Side, at: 0.5 };
const FROM = "s-m";
const TO = "t-m";
const LOOP = UNIT * 2;
const APART = 12;
/** A step's bar: half a unit across, one row tall. */
const BAR = UNIT / 2;
/** A row's height: one message, with air for its name. */
const ROW = UNIT * 2;


/** The sequence of a grid, or null where it has no step. A scene, because time is the geometry. */
export function sequence_scene(graph: Graph, grid: Id): Scene | null {
  const lattice = lattice_of(graph, grid);
  if (!lattice || lattice.cols < 2) return null;
  const steps = members_of(graph, grid).filter((b) => b.cell && !heading(b.cell.r, b.cell.c));
  if (!steps.length) return null;

  const { rows, cols } = lattice;
  const header_h = tallest(graph, grid, 0, 1, cols, UNIT * 2);
  const row_h = ROW;
  const pitch = ROW + GAP;
  const top = header_h + GAP;
  const row_y = (r: number) => top + (r - 1) * pitch;

  let phase_w = UNIT * 4;
  for (let r = 1; r < rows; r++) {
    const phase = at_cell(graph, grid, r, 0);
    if (phase) phase_w = Math.max(phase_w, size_of(graph, phase.id).w);
  }
  const col_w = column_width(graph, grid, cols);
  const line_x = (c: number) => phase_w + GAP + col_w / 2 + (c - 1) * col_w;

  const nodes: BoxNode[] = [];
  const edges: LineEdge[] = [];
  const stem_bot = row_y(rows - 1) + row_h + GAP;

  for (let c = 1; c < cols; c++) {
    const head = at_cell(graph, grid, 0, c);
    const x = line_x(c);
    if (head) {
      const size = size_of(graph, head.id);
      nodes.push(card(graph, head, x - size.w / 2, 0, size.w, size.h));
    }
    const y0 = head ? size_of(graph, head.id).h : 0;
    const top_id = `@stem:${c}:top`;
    const bot_id = `@stem:${c}:bot`;
    nodes.push(dot(top_id, x, y0), dot(bot_id, x, stem_bot));
    edges.push({
      id: `@stem:${c}`, source: top_id, target: bot_id, sourceHandle: FROM, targetHandle: TO,
      selectable: false, focusable: false,
      data: { module: "line", dir: "none",
        wire: { name: false, alias: false, border_style: "dashed" },
        points: [{ x, y: y0 }, { x, y: stem_bot }] },
    });
  }

  for (const step of steps) {
    const c = step.cell?.c ?? 1;
    const r = step.cell?.r ?? 1;
    nodes.push(bar(graph, step, line_x(c) - BAR / 2, row_y(r)));
  }

  for (let r = 1; r < rows; r++) {
    const phase = at_cell(graph, grid, r, 0);
    if (!phase) continue;
    nodes.push(words(graph, phase, 0, row_y(r), phase_w, row_h));
  }

  const step_ids = new Set(steps.map((s) => s.id));
  const messages = edges_in(graph, grid).filter((e) => step_ids.has(e.from) && step_ids.has(e.to));
  const by_row = new Map<number, Relation[]>();
  for (const e of messages) {
    const row = graph.blocks[e.to]?.cell?.r ?? 1;
    const list = by_row.get(row) ?? [];
    list.push(e);
    by_row.set(row, list);
  }
  for (const [row, list] of by_row) {
    list.forEach((e, i) => {
      const from = graph.blocks[e.from];
      const to = graph.blocks[e.to];
      if (!from?.cell || !to?.cell) return;
      const y = row_y(row) + row_h / 2 + (i - (list.length - 1) / 2) * APART;
      const x0 = line_x(from.cell.c);
      const x1 = line_x(to.cell.c);
      const half = BAR / 2;
      const points = x0 === x1 ? looped(x0 + half, y, col_w - half * 2)
        : heading_to(x0, x1, y, half, from.cell.r === row ? half : 0);
      const wire = wire_of(graph, e.id);
      edges.push({
        id: e.id, source: e.from, target: e.to, sourceHandle: FROM, targetHandle: TO,
        /** A step draws as its bar, so an unnamed message reads as the step it reaches. */
        label: e.name?.trim() || shown_name(graph, e.to),
        data: { module: "line", dir: dir_of(graph, e.id), wire, points },
      });
    });
  }

  const frame = framed(graph, grid, nodes);
  return { layer: grid, ...(frame ? { frame } : {}), nodes, edges, perches: [],
           slots: ["display"], trail: trail_of(graph, grid) };
}

/** A message between two lifelines: from the source's lifeline, or its card's edge where the
 *  source sits on the same row, to the edge of the target's card facing it, so its head shows. */
function heading_to(x0: number, x1: number, y: number, to_half: number, from_half: number)
    : { x: number; y: number }[] {
  const way = x1 > x0 ? 1 : -1;
  return [{ x: x0 + way * from_half, y }, { x: x1 - way * to_half, y }];
}

/** A message to its own lifeline: out of the card's right edge and back, inside the air its
 *  column keeps beside the card. */
function looped(edge: number, y: number, air: number): { x: number; y: number }[] {
  const out = edge + Math.max(UNIT / 2, air / 2 - UNIT / 2);
  const drop = LOOP / 4;
  return [{ x: edge, y: y - drop }, { x: out, y: y - drop }, { x: out, y: y + drop },
          { x: edge, y: y + drop }];
}

/** A real block, as the small card the grid would have given it: a participant's head. */
function card(graph: Graph, b: Block, x: number, y: number, w: number, h: number): BoxNode {
  const data = { ...carried(graph, b.id), face: "small" as const, seats: [SEAT] };
  return { ...cell(b.id, { x, y, w, h }, data), draggable: false };
}

/** A step, as its activation: a bar on its lifeline, still the block it is when picked. */
function bar(graph: Graph, b: Block, x: number, y: number): BoxNode {
  const got = carried(graph, b.id);
  const data = { ...got, marks: [...got.marks, "activation" as const], face: "small" as const,
                 seats: [SEAT] };
  return { ...cell(b.id, { x, y, w: BAR, h: ROW }, data), draggable: false };
}

/** A phase, as words down the left: its name alone, read across. */
function words(graph: Graph, b: Block, x: number, y: number, w: number, h: number): BoxNode {
  const got = carried(graph, b.id);
  const marks = got.marks.filter((m) => m !== "upright" && m !== "header");
  const data = { ...got, marks, face: "small" as const,
                 look: { ...(got.look ?? PLAIN), face: "text" as const } };
  return { ...cell(b.id, { x, y, w, h }, data), draggable: false };
}

/** A point a lifeline's stem is hung from. It draws nothing. */
function dot(id: Id, x: number, y: number): BoxNode {
  return { ...cell(id, { x, y, w: 1, h: 1 }, { label: "", marks: [], seats: [SEAT] }),
           style: { opacity: 0, pointerEvents: "none" },
           selectable: false, draggable: false, focusable: false };
}

/** The tallest card on one header row, across the columns a lifeline owns. */
function tallest(graph: Graph, grid: Id, r: number, from: number, to: number, least: number)
    : number {
  let h = least;
  for (let c = from; c < to; c++) {
    const b = at_cell(graph, grid, r, c);
    if (b) h = Math.max(h, size_of(graph, b.id).h);
  }
  return h;
}

/** How far apart lifelines sit: the widest head, plus two gaps of air, so a message's name reads
 *  across the room between neighbouring lifelines. */
function column_width(graph: Graph, grid: Id, cols: number): number {
  let w = UNIT * 6;
  for (let c = 1; c < cols; c++) {
    const b = at_cell(graph, grid, 0, c);
    if (b) w = Math.max(w, size_of(graph, b.id).w + GAP * 2);
  }
  return w;
}

/** A room round every node, stems included, so the scene's own check holds. */
function framed(graph: Graph, grid: Id, nodes: readonly BoxNode[])
    : Scene["frame"] | undefined {
  if (!nodes.length || !graph.blocks[grid]) return undefined;
  const boxes = nodes.map((n) => ({
    x: n.position.x, y: n.position.y, w: n.width ?? 0, h: n.height ?? 0 }));
  const x = Math.min(...boxes.map((b) => b.x)) - PAD;
  const y = Math.min(...boxes.map((b) => b.y)) - PAD;
  const w = Math.max(...boxes.map((b) => b.x + b.w)) - x + PAD;
  const h = Math.max(...boxes.map((b) => b.y + b.h)) - y + PAD;
  const stamps = stamps_of(graph, grid);
  const side = graph.blocks[grid]?.side;
  return { ...roomed({ x, y, w, h }), label: shown_name(graph, grid),
           role: role_of(graph, grid), holds_parts: is_container(graph, grid), ports: [],
           ...(stamps.length ? { stamps } : {}), ...(side ? { side } : {}) };
}
