/** The swimlane view: a grid read as lanes.
 *
 *  The header row names the participants, one lane each, its header card at the lane's top: the
 *  lane itself carries no second name. The header column names the phases. A step sits in the
 *  lane and the phase its cell names. A relation between steps is drawn as it is stored.
 *  Positions are computed every draw and never written. */

import { at_cell, children, heading, lattice_of, members_of,
         type Block, type Graph, type Id } from "@mnd/core";
import { GAP, PAD, size_of, UNIT } from "./size";

/** The swimlane of a grid, or null where it has fewer than two participants or no step. Drawn as
 *  a free internal view of the graph returned. */
export function swimlane_graph(graph: Graph, grid: Id): Graph | null {
  const lattice = lattice_of(graph, grid);
  if (!lattice || lattice.cols < 3) return null;
  const steps = members_of(graph, grid).filter((b) => b.cell && !heading(b.cell.r, b.cell.c));
  if (!steps.length) return null;

  const blocks: Record<Id, Block> = {};
  for (const [id, b] of Object.entries(graph.blocks)) blocks[id] = { ...b };
  const host = blocks[grid];
  if (!host) return null;
  /** The layer stops being a grid, or the projection would draw the lattice again. */
  blocks[grid] = { id: host.id, parent: host.parent, name: host.name, order: host.order,
    type: "block", settings: { layout: { kind: "free", cards: "small" } } };

  const { rows, cols } = lattice;
  const row_h = row_heights(graph, grid, rows, cols);
  const row_y = offsets(row_h);
  let header_h = UNIT * 2;
  for (let c = 1; c < cols; c++) {
    const head = at_cell(graph, grid, 0, c);
    if (head) header_h = Math.max(header_h, size_of(graph, head.id).h);
  }
  const body = header_h + GAP;
  let phase_w = UNIT * 4;
  for (let r = 0; r < rows; r++) {
    const phase = at_cell(graph, grid, r, 0);
    if (phase) phase_w = Math.max(phase_w, size_of(graph, phase.id).w);
  }

  const placed = new Set<Id>();
  let x = phase_w + GAP;
  for (let c = 1; c < cols; c++) {
    const members: Block[] = [];
    for (let r = 0; r < rows; r++) {
      const b = at_cell(graph, grid, r, c);
      if (b && !members.some((m) => m.id === b.id)) members.push(b);
    }
    const wide = Math.max(UNIT * 4, ...members.map((b) => size_of(graph, b.id).w));
    const last = rows - 1;
    const content_h = body + (row_y[last] ?? 0) + (row_h[last] ?? 0);
    const lane = `@lane:${c}`;
    blocks[lane] = {
      id: lane, parent: grid, name: "", order: c,
      x, y: 0, w: wide, h: content_h,
      settings: { layout: { kind: "free" }, holder: { inline: true, flat: true },
                  card: { name: "hide" } },
    };
    for (const b of members) {
      const size = size_of(graph, b.id);
      const start = b.cell?.r ?? 0;
      const y = start === 0 ? 0 : body + (row_y[start] ?? 0);
      seat(blocks, b.id, lane, (wide - size.w) / 2, y);
      placed.add(b.id);
    }
    /** The next lane starts clear of this one's air. `band_size` adds the air when it draws. */
    x += wide + PAD * 2 + GAP;
  }

  for (let r = 0; r < rows; r++) {
    const phase = at_cell(graph, grid, r, 0);
    if (!phase || placed.has(phase.id)) continue;
    const start = phase.cell?.r ?? r;
    const y = start === 0 ? PAD : PAD + body + (row_y[start] ?? 0);
    seat(blocks, phase.id, grid, 0, y);
    placed.add(phase.id);
  }

  /** What the lanes do not draw — the corner, a block off the lattice — is left out. */
  for (const b of children(graph, grid)) if (!placed.has(b.id)) delete blocks[b.id];
  return { ...graph, blocks };
}

/** How tall each body row is: the tallest card in it, and a card at least. */
function row_heights(graph: Graph, grid: Id, rows: number, cols: number): number[] {
  const out = Array.from({ length: rows }, () => UNIT * 2);
  for (let r = 1; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const b = at_cell(graph, grid, r, c);
      if (b) out[r] = Math.max(out[r] ?? 0, size_of(graph, b.id).h);
    }
  }
  return out;
}

/** Where each body row starts, under the one above it. */
function offsets(heights: readonly number[]): number[] {
  const out = heights.map(() => 0);
  for (let r = 2; r < heights.length; r++) {
    out[r] = (out[r - 1] ?? 0) + (heights[r - 1] ?? 0) + GAP;
  }
  return out;
}

/** A block taken out of its cell and put where the lane drawing measured it. */
function seat(blocks: Record<Id, Block>, id: Id, parent: Id, x: number, y: number): void {
  const b = blocks[id];
  if (!b) return;
  const { cell: _cell, grid: _grid, ...rest } = b;
  blocks[id] = { ...rest, parent, x, y };
}
