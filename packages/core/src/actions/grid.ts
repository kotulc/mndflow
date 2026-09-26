/** Cells, headers, labels, rows and columns of a grid. */

import { may_take } from "../capabilities";
import { derived_base } from "../defs";
import { at_cell, can_hold, covers, heading, inside, is_grid, lattice_of, members_of, one_side,
         overlaps } from "../holders";
import { shown_name } from "../names";
import { edges_in, next_order } from "../tree";
import { new_id } from "../ids";
import type { Block, Cell, Dir, Graph, Grid, Id, Mutation, Span } from "../types";
import { register, type Args, type Context } from "./registry";
import { cell_of_arg, handles, id_of, num, region, run_type, text } from "./helpers";

/** Whether a cell is a header's or the body's; a block moved within a grid stays on its side. */
const heads_at = (g: Grid, at: Cell): boolean => heading(g, at.r, at.c) !== null;

/** A grid's lattice written back whole. */
const set = (id: Id, grid: Grid): Mutation => ({ op: "set_grid", id, grid });

/** A block put at an address in its grid — or, where there is none for it, out of the grid
 *  altogether: **a member of a grid always sits in a cell**. */
export const put = (id: Id, cell: Cell | null): Mutation =>
  cell ? { op: "seat_cell", id, cell } : { op: "set_group", id, group: null };

/** A row or column added or removed; blocks, values and merges after it shift. */
function shifted(graph: Graph, group: Id, way: "row" | "col", at: number,
                 by: 1 | -1): Mutation[] {
  const g = lattice_of(graph, group);
  if (!g) return [];
  const axis = way === "row" ? "r" : "c";
  const size = way === "row" ? "rows" : "cols";
  const edge = way === "row" ? "top" : "left";
  /** Taking the header line away takes its heading with it, and what it held goes to the body. */
  const unheaded = by < 0 && at === 0 && !!g.head?.[edge];
  const out: Mutation[] = [];

  const held = new Set<string>();
  const homeless: { id: Id; was: Cell }[] = [];
  for (const b of members_of(graph, group)) {
    if (!b.cell) continue;
    const n = b.cell[axis];
    if (by < 0 && n === at) { homeless.push({ id: b.id, was: { ...b.cell } }); continue; }
    const cell = (by > 0 ? n >= at : n > at) ? { ...b.cell, [axis]: n + by } : { ...b.cell };
    held.add(`${cell.r},${cell.c}`);
    if (cell.r !== b.cell.r || cell.c !== b.cell.c) out.push({ op: "seat_cell", id: b.id, cell });
  }

  /** Merges move with the line they sit on, and one that closes up is dropped. */
  const merges: Span[] = [];
  for (const span of g.merges ?? []) {
    const start = span[axis];
    const len = span[size];
    const through = start <= at && at < start + len;
    const after = by > 0 ? start >= at : start > at;
    if (!through && !after) { merges.push(span); continue; }
    const moved: Span = { ...span, [axis]: after ? start + by : start,
                                   [size]: through && !after ? len + by : len };
    if (moved[size] > 0) merges.push(moved);
  }

  const head = unheaded ? { ...g.head, [edge]: false } : g.head;
  const next = with_merges({ ...g, [size]: Math.max(1, g[size] + by), head,
                             ...(g.values ? { values: moved_values(g.values, way, at, by) } : {}) },
                           merges);

  /** A removed line's blocks move to the nearest free cell on their own side. */
  for (const { id, was } of homeless) {
    const want = { r: Math.min(was.r, next.rows - 1), c: Math.min(was.c, next.cols - 1) };
    const spare = free_cell(next, held, null, want, !unheaded && heads_at(g, was));
    if (spare) held.add(`${spare.r},${spare.c}`);
    out.push(put(id, spare));
  }
  return [set(group, tidy(next)), ...out];
}

/** Values moved with the line they sit on: a new line is empty, and a removed one's go. */
function moved_values(values: string[][], way: "row" | "col", at: number,
                      by: 1 | -1): string[][] {
  const moved = <T,>(line: T[], blank: T): T[] => {
    const out = [...line];
    if (by < 0) out.splice(at, 1);
    else if (at <= out.length) out.splice(at, 0, blank);
    return out;
  };
  return way === "row" ? moved(values, []) : values.map((row) => moved(row, ""));
}

/** This lattice carrying exactly these merges; none leaves the key off. */
export function with_merges(g: Grid, merges: Span[]): Grid {
  if (merges.length) return { ...g, merges };
  const { merges: _gone, ...rest } = g;
  return rest;
}

/** A lattice without the keys it says nothing with: no headers, and no values at all. */
function tidy(g: Grid): Grid {
  const { head, values, ...rest } = g;
  const heads = { ...(head?.top ? { top: true } : {}), ...(head?.left ? { left: true } : {}) };
  const said = values?.some((row) => row.some(Boolean));
  return { ...rest, ...(Object.keys(heads).length ? { head: heads } : {}),
           ...(said ? { values } : {}) };
}

/** Filled body cells in reading order, as one run. */
function reading(graph: Graph, group: Id): Id[] {
  const g = lattice_of(graph, group);
  if (!g) return [];
  const run: Id[] = [];
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const held = at_cell(graph, group, r, c);
      if (held && !heads_at(g, { r, c }) && run[run.length - 1] !== held.id) run.push(held.id);
    }
  }
  return run;
}

/** Unclaimed body addresses; a merge counts once. */
function empty_cells(graph: Graph, group: Id): Cell[] {
  const g = lattice_of(graph, group);
  if (!g) return [];
  const out: Cell[] = [];
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const span = g.merges?.find((s) => covers(s, r, c));
      if (span && (span.r !== r || span.c !== c)) continue;
      if (!heads_at(g, { r, c }) && !at_cell(graph, group, r, c)) out.push({ r, c });
    }
  }
  return out;
}

/** The free cell nearest the one asked for, on the side asked for, outside a span and outside what
 *  is already spoken for. */
export function free_cell(g: Grid, taken: ReadonlySet<string>, span: Span | null, want: Cell,
                   header: boolean): Cell | null {
  let best: Cell | null = null;
  let gap = Infinity;
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      if ((span && covers(span, r, c)) || taken.has(`${r},${c}`)) continue;
      if (heads_at(g, { r, c }) !== header) continue;
      if (g.merges?.some((m) => covers(m, r, c) && (m.r !== r || m.c !== c))) continue;
      const off = Math.hypot(r - want.r, c - want.c);
      if (off < gap) { gap = off; best = { r, c }; }
    }
  }
  return best;
}

/** Which line the picked cell is in. */
function pointed(ctx: Context, way: "row" | "col"): number | null {
  const at = ctx.cells?.[0];
  return at ? (way === "row" ? at.r : at.c) : null;
}

/** Which grid an action is about: the one named, the one the picked cells are in, the picked block
 *  where it is one, or the grid that block sits in. */
function grid_named(ctx: Context, args: Args): Id | null {
  const at = ctx.picked[0];
  const held = at ? ctx.graph.blocks[at]?.group : undefined;
  for (const said of [args["group"] ? id_of(args, "group") : undefined,
                      ctx.cells?.[0]?.group, ctx.picked[0], held]) {
    if (said && is_grid(ctx.graph, said)) return said;
  }
  return null;
}

/** The address an action points at: the one said, else the first picked cell of that grid. */
function address(ctx: Context, args: Args, group: Id): Cell | null {
  const said = cell_of_arg(args, "at");
  if (said) return said;
  const picked = ctx.cells?.find((c) => c.group === group);
  return picked ? { r: picked.r, c: picked.c } : null;
}

/** Why a cell of this grid could not take a new block, or null: it has to be a grid on this layer,
 *  and the cell inside it and empty. */
export function cell_free(ctx: Context, group: Id, cell: Cell | null): string | null {
  const g = lattice_of(ctx.graph, group);
  if (!g) return "that is not a grid";
  if (ctx.graph.blocks[group]!.parent !== (ctx.layer ?? ctx.graph.root)) {
    return "that grid is not in this layer";
  }
  if (!cell) return "no cell is pointed at";
  if (!inside(g, cell)) return "that cell is outside the grid";
  return at_cell(ctx.graph, group, cell.r, cell.c) ? "that cell is taken" : null;
}

/** A header line added or taken away. **Adding one inserts a new first line** to head the rest,
 *  so nothing seated is displaced; taking it away removes that line, and what it held goes to the
 *  body. A grid of one line only drops the heading. */
function headed(graph: Graph, group: Id, edge: "top" | "left", on: boolean): Mutation[] {
  const g = lattice_of(graph, group)!;
  const way = edge === "top" ? "row" : "col";
  if (!!g.head?.[edge] === on) return [];
  if (!on && (way === "row" ? g.rows : g.cols) > 1) return shifted(graph, group, way, 0, -1);
  if (!on) return [set(group, tidy({ ...g, head: { ...g.head, [edge]: false } }))];
  const [lattice, ...moved] = shifted(graph, group, way, 0, 1);
  const next = (lattice as { grid: Grid }).grid;
  return [set(group, tidy({ ...next, head: { ...next.head, [edge]: true } })), ...moved];
}

/** The block a seat is about, and the grid and address it is going to. */
function seating(ctx: Context, args: Args): { b: Block | undefined; group: Id | undefined;
                                               cell: Cell | null } {
  const id = id_of(args, "id");
  return { b: ctx.graph.blocks[id],
           group: args["group"] ? id_of(args, "group") : ctx.graph.blocks[id]?.group,
           cell: cell_of_arg(args, "at") };
}

register(
  {
    name: "seat",
    about: "puts a block in a cell of a grid, or takes it out of the grid",
    on: ["block"],
    args: [{ name: "id", form: "block", required: true },
           { name: "group", form: "block" },
           { name: "at", form: "text" }],
    check: (ctx, args) => {
      const { b, group, cell } = seating(ctx, args);
      if (!b) return "that block is not there";
      if (!cell) return null;
      const g = lattice_of(ctx.graph, group);
      if (!g) return "that is not a grid";
      /** A cell holds a block, never another holder. */
      if (!can_hold(ctx.graph, group!, b.id)) return "a cell cannot hold that";
      if (!may_take(ctx.graph, group!, b.type)) {
        return `"${shown_name(ctx.graph, group!)}" takes nothing of that sort`;
      }
      if (!inside(g, cell)) return "that cell is outside the grid";
      if (heads_at(g, cell) && !b.of) return "a header holds a label, or a reference to a block";
      /** A cell holds one block. */
      const held = at_cell(ctx.graph, group!, cell.r, cell.c);
      return held && held.id !== b.id ? "that cell is taken" : null;
    },
    run: (ctx, args) => {
      const { b, group, cell } = seating(ctx, args);
      const out: Mutation[] = [];
      if (group && b!.group !== group) out.push({ op: "set_group", id: b!.id, group });
      /** No address takes it out of the grid. */
      out.push(put(b!.id, cell));
      return { mutations: out };
    },
  },
  {
    name: "heads",
    about: "adds a header row or column to a grid, or takes it away",
    on: ["block", "cell"],
    /** Absent `on` turns it over. */
    args: [{ name: "group", form: "block" },
           { name: "way", form: "choice", required: true, choices: ["top", "left"] },
           { name: "on", form: "choice", choices: ["yes", "no"] }],
    check: (ctx, args) => {
      if (!grid_named(ctx, args)) return "point at a grid, or a cell of one";
      return ["top", "left"].includes(String(args["way"])) ? null : "say top or left";
    },
    run: (ctx, args) => {
      const group = grid_named(ctx, args)!;
      const edge = args["way"] === "left" ? "left" : "top";
      const was = !!lattice_of(ctx.graph, group)!.head?.[edge];
      const on = args["on"] === undefined ? !was : args["on"] === "yes";
      return { mutations: headed(ctx.graph, group, edge, on) };
    },
  },
  {
    name: "label",
    about: "writes a plain value in a cell of a grid, or clears it",
    on: ["cell"],
    args: [{ name: "group", form: "block" }, { name: "at", form: "text" },
           { name: "text", form: "text", asks: true }],
    check: (ctx, args) => {
      const group = grid_named(ctx, args);
      if (!group) return "point at a grid, or a cell of one";
      const g = lattice_of(ctx.graph, group)!;
      const at = address(ctx, args, group);
      if (!at) return "no cell is pointed at";
      return inside(g, at) ? null : "that cell is outside the grid";
    },
    run: (ctx, args) => {
      const group = grid_named(ctx, args)!;
      const g = lattice_of(ctx.graph, group)!;
      const { r, c } = address(ctx, args, group)!;
      const values = (g.values ?? []).map((row) => [...row]);
      while (values.length <= r) values.push([]);
      const row = values[r]!;
      while (row.length <= c) row.push("");
      row[c] = String(args["text"] ?? "").trim();
      return { mutations: [set(group, tidy({ ...g, values }))] };
    },
  },
  {
    name: "insert",
    about: "adds a row or a column to a grid at an index",
    on: ["block", "cell"],
    args: [{ name: "group", form: "block" },
           { name: "way", form: "choice", required: true, choices: ["row", "col"] },
           { name: "at", form: "number" }],
    check: (ctx, args) => (grid_named(ctx, args) ? null : "point at a grid, or a cell of one"),
    run: (ctx, args) => {
      const group = grid_named(ctx, args)!;
      const way = args["way"] === "col" ? "col" : "row";
      const g = lattice_of(ctx.graph, group)!;
      const last = way === "row" ? g.rows : g.cols;
      /** A header line stays first. */
      const first = (way === "row" ? g.head?.top : g.head?.left) ? 1 : 0;
      const at = Math.min(last, Math.max(first, num(args, "at") ?? pointed(ctx, way) ?? last));
      return { mutations: shifted(ctx.graph, group, way, at, 1) };
    },
  },
  {
    name: "remove",
    about: "takes a row or a column out of a grid, freeing whatever sat in it",
    on: ["block", "cell"],
    args: [{ name: "group", form: "block" },
           { name: "way", form: "choice", required: true, choices: ["row", "col"] },
           { name: "at", form: "number" }],
    check: (ctx, args) => {
      const group = grid_named(ctx, args);
      if (!group) return "point at a grid, or a cell of one";
      const g = lattice_of(ctx.graph, group)!;
      return (args["way"] === "col" ? g.cols : g.rows) > 1 ? null : "a grid keeps one line";
    },
    run: (ctx, args) => {
      const group = grid_named(ctx, args)!;
      const way = args["way"] === "col" ? "col" : "row";
      const g = lattice_of(ctx.graph, group)!;
      const last = (way === "row" ? g.rows : g.cols) - 1;
      const at = Math.min(last, Math.max(0, num(args, "at") ?? pointed(ctx, way) ?? last));
      return { mutations: shifted(ctx.graph, group, way, at, -1) };
    },
  },
  {
    name: "merge",
    about: "spans the cells you picked, or splits the merged one you point at",
    on: ["cell"],
    args: [{ name: "group", form: "block" }, { name: "at", form: "text" },
           { name: "into", form: "text" }],
    check: (ctx, args) => {
      const said = region(ctx, args);
      if (!said) return "no cell is pointed at";
      const g = lattice_of(ctx.graph, said.group)!;
      const { r, c, rows, cols } = said.span;
      if (r < 0 || c < 0 || r + rows > g.rows || c + cols > g.cols) return "that reaches past the grid";
      return one_side(g, said.span) ? null : "a merge stays on one side of a header line";
    },
    /** Merges the picked span, or splits a single cell; covered blocks move to free cells. */
    run: (ctx, args) => {
      const { group, span } = region(ctx, args)!;
      const g = lattice_of(ctx.graph, group)!;
      if (span.rows === 1 && span.cols === 1) {
        return { mutations: [set(group, with_merges(g, (g.merges ?? [])
          .filter((s) => !covers(s, span.r, span.c))))] };
      }
      const taken = new Set<string>();
      for (const b of members_of(ctx.graph, group)) {
        if (b.cell && !covers(span, b.cell.r, b.cell.c)) taken.add(`${b.cell.r},${b.cell.c}`);
      }
      const out: Mutation[] = [];
      let first = true;
      for (const b of members_of(ctx.graph, group)) {
        if (!b.cell || !covers(span, b.cell.r, b.cell.c)) continue;
        if (first) {
          first = false;
          if (b.cell.r !== span.r || b.cell.c !== span.c) {
            out.push({ op: "seat_cell", id: b.id, cell: { r: span.r, c: span.c } });
          }
          continue;
        }
        const spare = free_cell(g, taken, span, b.cell, heads_at(g, b.cell));
        if (spare) taken.add(`${spare.r},${spare.c}`);
        out.push(put(b.id, spare));
      }
      return { mutations: [...out, set(group, with_merges(g,
        [...(g.merges ?? []).filter((m) => !overlaps(m, span)), { ...span }]))] };
    },
  },
  {
    name: "transpose",
    about: "turns a grid on its side — rows become columns",
    on: ["block", "cell"],
    args: [{ name: "group", form: "block" }],
    check: (ctx, args) => (grid_named(ctx, args) ? null : "point at a grid, or a cell of one"),
    /** Rows become columns, and its headers and values turn with it; relations are unchanged. */
    run: (ctx, args) => {
      const group = grid_named(ctx, args)!;
      const g = lattice_of(ctx.graph, group)!;
      const turned = (g.merges ?? [])
        .map((s): Span => ({ r: s.c, c: s.r, rows: s.cols, cols: s.rows }));
      const values = g.values ? Array.from({ length: g.cols }, (_, c) =>
        Array.from({ length: g.rows }, (_, r) => g.values![r]?.[c] ?? "")) : undefined;
      const head = { top: !!g.head?.left, left: !!g.head?.top };
      const out: Mutation[] = [set(group, tidy(with_merges(
        { ...g, rows: g.cols, cols: g.rows, head, ...(values ? { values } : {}) }, turned)))];
      for (const b of members_of(ctx.graph, group)) {
        if (b.cell) out.push({ op: "seat_cell", id: b.id, cell: { r: b.cell.c, c: b.cell.r } });
      }
      return { mutations: out };
    },
  },
  {
    name: "chain",
    about: "links every filled cell of a grid, in the order it reads",
    on: ["block", "cell"],
    args: [{ name: "group", form: "block" },
           { name: "dir", form: "choice", choices: ["none", "forward", "back", "both"] },
           { name: "type", form: "text" }],
    check: (ctx, args) => {
      const group = grid_named(ctx, args);
      if (!group) return "point at a grid, or a cell of one";
      const type = text(args, "type");
      if (type && ctx.graph.defs[type]?.group !== "relation") {
        return `"${type}" is not a relation definition`;
      }
      return reading(ctx.graph, group).length > 1
        ? null : "a chain needs two filled cells";
    },
    run: (ctx, args) => {
      const group = grid_named(ctx, args)!;
      /** A chain runs forward unless told. */
      const dir = String(args["dir"] ?? "forward") as Dir;
      const drawn = new Set(edges_in(ctx.graph, ctx.layer).map((e) => `${e.from}|${e.to}`));
      const run = reading(ctx.graph, group);
      const out: Mutation[] = [];
      const line = handles(ctx, "relation");
      for (let n = 1; n < run.length; n++) {
        const from = run[n - 1]!;
        const to = run[n]!;
        if (drawn.has(`${from}|${to}`)) continue;
        drawn.add(`${from}|${to}`);
        const module = derived_base(ctx.graph, from, to);
        out.push({ op: "link_blocks", edge: {
          id: new_id("edge"), from, to, alias: line.take(), ...run_type(ctx, args, module),
          ...(dir !== "none" ? { dir } : {}) } });
      }
      out.push(...line.bump());
      return { mutations: out,
               ...(out.length ? {} : { effect: { say: "every neighbour is linked already" } }) };
    },
  },
  {
    name: "fill",
    about: "puts a new block in every empty body cell of a grid",
    on: ["block", "cell"],
    args: [{ name: "group", form: "block" }],
    check: (ctx, args) => {
      const group = grid_named(ctx, args);
      if (!group) return "point at a grid, or a cell of one";
      return empty_cells(ctx.graph, group).length ? null : "every cell is taken";
    },
    run: (ctx, args) => {
      const group = grid_named(ctx, args)!;
      const parent = ctx.graph.blocks[group]!.parent;
      /** Orders are counted forward within the act. */
      let order = next_order(ctx.graph, parent);
      const made = handles(ctx, "block");
      const out: Mutation[] = [];
      for (const cell of empty_cells(ctx.graph, group)) {
        const id = new_id("block");
        out.push({ op: "add_block", block: { id, parent, order: order++,
                                             alias: made.take() } });
        out.push({ op: "set_group", id, group });
        out.push({ op: "seat_cell", id, cell });
      }
      out.push(...made.bump());
      return { mutations: out };
    },
  },
);
