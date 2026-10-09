/** Cells, headers, rows and columns of a grid: allocation, and nothing a cell says but the
 *  block in it. */

import { def_at, domain_of } from "../defs";
import { at_cell, covers, heading, inside, is_grid, lattice_of, members_of, one_side,
         overlaps } from "../holders";
import { children, edges_in, is_interface, next_order } from "../tree";
import { new_id } from "../ids";
import type { Cell, Dir, Graph, Grid, Id, Mutation, Span } from "../types";
import { register, type Args, type Context } from "./registry";
import { cell_of_arg, handles, id_of, make_block, num, region, run_type, text } from "./helpers";

/** Whether a cell is a header's or the body's; a block moved within a grid stays on its side. */
const heads_at = (at: Cell): boolean => heading(at.r, at.c) !== null;

/** A grid's lattice written back whole. */
const set = (id: Id, grid: Grid): Mutation => ({ op: "set_grid", id, grid });

/** A block put at an address in its grid — or, where there is none for it, out of the grid onto
 *  what holds the grid: **a member of a grid always sits in a cell**. */
export const put = (graph: Graph, id: Id, cell: Cell | null): Mutation => {
  if (cell) return { op: "seat_cell", id, cell };
  const grid = graph.blocks[id]?.parent;
  return { op: "move_block", id, parent: (grid && graph.blocks[grid]?.parent) ?? grid ?? null };
};

/** What a block holds, seated as it becomes a grid of this lattice: those already in a body cell
 *  of their own stay there, and the rest take the nearest free cells in reading order. */
export function seat_all(graph: Graph, id: Id, g: Grid): Mutation[] {
  const held = children(graph, id).filter((b) => !is_interface(b));
  const taken = new Set<string>();
  const kept = new Set<Id>();
  for (const b of held) {
    const at = b.cell;
    if (!at || !inside(g, at) || heads_at(at) || taken.has(`${at.r},${at.c}`)) continue;
    taken.add(`${at.r},${at.c}`);
    kept.add(b.id);
  }
  return seat_in(id, g, taken, held.filter((b) => !kept.has(b.id)).map((b) => b.id), null);
}

/** The addresses of a grid a block already sits in. */
export function taken_in(graph: Graph, group: Id, leaving: readonly Id[] = []): Set<string> {
  const out = new Set<string>();
  for (const b of members_of(graph, group)) {
    if (b.cell && !leaving.includes(b.id)) out.add(`${b.cell.r},${b.cell.c}`);
  }
  return out;
}

/** Blocks seated in a grid: the first where it was pointed, else each in the nearest free body
 *  cell, **growing a row whenever none is free**. */
export function seat_in(group: Id, g: Grid, taken: Set<string>, ids: readonly Id[],
                        want: Cell | null): Mutation[] {
  const out: Mutation[] = [];
  let grid = g;
  for (const [n, id] of ids.entries()) {
    const said = n === 0 && want && inside(grid, want) ? want : null;
    let cell = said && !taken.has(`${said.r},${said.c}`) ? said : null;
    while (!cell) {
      cell = free_cell(grid, taken, null, want ?? { r: 0, c: 0 }, false);
      if (cell) break;
      /** A grid that is all header column has no body a row could add. */
      grid = grid.cols === 1 ? { ...grid, cols: 2 } : { ...grid, rows: grid.rows + 1 };
    }
    taken.add(`${cell.r},${cell.c}`);
    out.push({ op: "seat_cell", id, cell });
  }
  return grid === g ? out : [set(group, grid), ...out];
}

/** A row or column added or removed; blocks and merges after it shift. */
function shifted(graph: Graph, group: Id, way: "row" | "col", at: number,
                 by: 1 | -1): Mutation[] {
  const g = lattice_of(graph, group);
  if (!g) return [];
  const axis = way === "row" ? "r" : "c";
  const size = way === "row" ? "rows" : "cols";
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

  const next = with_merges({ ...g, [size]: Math.max(1, g[size] + by) }, merges);

  /** A removed line's blocks move to the nearest free cell on their own side. */
  for (const { id, was } of homeless) {
    const want = { r: Math.min(was.r, next.rows - 1), c: Math.min(was.c, next.cols - 1) };
    const spare = free_cell(next, held, null, want, heads_at(was));
    if (spare) held.add(`${spare.r},${spare.c}`);
    out.push(put(graph, id, spare));
  }
  return [set(group, next), ...out];
}

/** This lattice carrying exactly these merges; none leaves the key off. */
export function with_merges(g: Grid, merges: Span[]): Grid {
  if (merges.length) return { ...g, merges };
  const { merges: _gone, ...rest } = g;
  return rest;
}

/** Filled body cells in reading order, as one run. */
function reading(graph: Graph, group: Id): Id[] {
  const g = lattice_of(graph, group);
  if (!g) return [];
  const run: Id[] = [];
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const held = at_cell(graph, group, r, c);
      if (held && !heads_at({ r, c }) && run[run.length - 1] !== held.id) run.push(held.id);
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
      if (heads_at({ r, c }) || at_cell(graph, group, r, c)) continue;
      out.push({ r, c });
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
      if (heads_at({ r, c }) !== header) continue;
      if (g.merges?.some((m) => covers(m, r, c) && (m.r !== r || m.c !== c))) continue;
      const off = Math.hypot(r - want.r, c - want.c);
      if (off < gap) { gap = off; best = { r, c }; }
    }
  }
  return best;
}

/** Which line the picked cell of this grid is in. */
function pointed(ctx: Context, group: Id, way: "row" | "col"): number | null {
  const at = ctx.cells?.find((c) => c.group === group);
  return at ? (way === "row" ? at.r : at.c) : null;
}

/** Which grid an action is about: the one named, the one the picked cells are in, the picked block
 *  where it is one, or the grid that block sits in. */
function grid_named(ctx: Context, args: Args): Id | null {
  const at = ctx.picked[0];
  const held = at ? ctx.graph.blocks[at]?.parent ?? undefined : undefined;
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

/** The line a removal points at: the one said, else the picked cell's, else the last. */
function removing(ctx: Context, args: Args, group: Id, way: "row" | "col"): number {
  const g = lattice_of(ctx.graph, group)!;
  const last = (way === "row" ? g.rows : g.cols) - 1;
  return Math.min(last, Math.max(0, num(args, "at") ?? pointed(ctx, group, way) ?? last));
}

register(
  {
    name: "label",
    about: "names the block in a cell of a grid, or makes one of that name where the cell is empty",
    on: ["cell"],
    args: [{ name: "group", form: "block" }, { name: "at", form: "text" },
           { name: "text", form: "text", asks: true }],
    check: (ctx, args) => {
      const group = grid_named(ctx, args);
      if (!group) return "point at a grid, or a cell of one";
      const g = lattice_of(ctx.graph, group)!;
      const at = address(ctx, args, group);
      if (!at) return "no cell is pointed at";
      if (!inside(g, at)) return "that cell is outside the grid";
      return at_cell(ctx.graph, group, at.r, at.c) || text(args, "text")
        ? null : "an empty cell is named by typing a name into it";
    },
    /** A cell holds a block, so typing into one names it — or makes a plain block of that name. */
    run: (ctx, args) => {
      const group = grid_named(ctx, args)!;
      const { r, c } = address(ctx, args, group)!;
      const name = text(args, "text");
      const held = at_cell(ctx.graph, group, r, c);
      if (held) return { mutations: [{ op: "update_block", id: held.id, name }] };
      const made = make_block(ctx, name, group);
      const id = (made[0] as { block: { id: Id } }).block.id;
      return { mutations: [...made, { op: "seat_cell", id, cell: { r, c } }] };
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
      /** The header line stays first. */
      const at = Math.min(last, Math.max(1, num(args, "at") ?? pointed(ctx, group, way) ?? last));
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
      const way = args["way"] === "col" ? "col" : "row";
      if (removing(ctx, args, group, way) === 0) return "the header line stays";
      return (way === "col" ? g.cols : g.rows) > 2 ? null : "a grid keeps one line past its header";
    },
    run: (ctx, args) => {
      const group = grid_named(ctx, args)!;
      const way = args["way"] === "col" ? "col" : "row";
      return { mutations: shifted(ctx.graph, group, way, removing(ctx, args, group, way), -1) };
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
      return one_side(said.span) ? null : "a merge stays on one side of a header line";
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
        const spare = free_cell(g, taken, span, b.cell, heads_at(b.cell));
        if (spare) taken.add(`${spare.r},${spare.c}`);
        out.push(put(ctx.graph, b.id, spare));
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
    /** Rows become columns, and its headers turn with it; relations are unchanged. */
    run: (ctx, args) => {
      const group = grid_named(ctx, args)!;
      const g = lattice_of(ctx.graph, group)!;
      const turned = (g.merges ?? [])
        .map((s): Span => ({ r: s.c, c: s.r, rows: s.cols, cols: s.rows }));
      const out: Mutation[] = [set(group, with_merges({ ...g, rows: g.cols, cols: g.rows },
                                                      turned))];
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
      if (type && (!def_at(ctx.graph, type) || domain_of(ctx.graph, type) !== "relation")) {
        return `"${type}" is not a relation definition`;
      }
      return reading(ctx.graph, group).length > 1
        ? null : "a chain needs two filled cells";
    },
    run: (ctx, args) => {
      const group = grid_named(ctx, args)!;
      /** A chain runs forward unless told. */
      const dir = String(args["dir"] ?? "forward") as Dir;
      /** A grid is its members' layer, so what links them is drawn there. */
      const drawn = new Set(edges_in(ctx.graph, group).map((e) => `${e.from}|${e.to}`));
      const run = reading(ctx.graph, group);
      const out: Mutation[] = [];
      const line = handles(ctx, "relation");
      for (let n = 1; n < run.length; n++) {
        const from = run[n - 1]!;
        const to = run[n]!;
        if (drawn.has(`${from}|${to}`)) continue;
        drawn.add(`${from}|${to}`);
        out.push({ op: "link_blocks", edge: {
          id: new_id("edge"), from, to, alias: line.take(), ...run_type(ctx, args),
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
      /** Orders are counted forward within the act. */
      let order = next_order(ctx.graph, group);
      const made = handles(ctx, "block");
      const out: Mutation[] = [];
      for (const cell of empty_cells(ctx.graph, group)) {
        const id = new_id("block");
        out.push({ op: "add_block", block: { id, parent: group, order: order++,
                                             alias: made.take(), cell } });
      }
      out.push(...made.bump());
      return { mutations: out };
    },
  },
);
