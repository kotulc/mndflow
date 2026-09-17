/** Cells, headers, rows and columns of a grid. */

import { derived_module } from "../defs";
import { at_cell, can_hold, covers, head_of, is_grid, is_header, members_of } from "../holders";
import { edges_in, next_order } from "../tree";
import { new_id } from "../ids";
import type { Block, Cell, Dir, Graph, Id, Mutation, Span } from "../types";
import { register, type Args, type Context } from "./registry";
import { cell_of_arg, handles, id_of, num, region, run_type, text } from "./helpers";

/** A row or column added or removed; blocks and merges after it shift. */
function shifted(graph: Graph, group: Id, way: "row" | "col", at: number,
                 by: 1 | -1): Mutation[] {
  const g = graph.blocks[group];
  if (!g || !is_grid(graph, group)) return [];
  const axis = way === "row" ? "r" : "c";
  const size = way === "row" ? "rows" : "cols";
  const out: Mutation[] = [];
  const put: Mutation[] = [];

  out.push({ op: "set_grid", id: group, [size]: Math.max(1, g[size]! + by) } as Mutation);

  const held = new Set<string>();
  const homeless: { id: Id; was: Cell }[] = [];
  const kept: Mutation[] = [];
  for (const b of members_of(graph, group)) {
    if (!b.cell) continue;
    const n = b.cell[axis];
    if (by < 0 && n === at) { homeless.push({ id: b.id, was: { ...b.cell } }); continue; }
    const cell = by > 0 ? (n >= at ? { ...b.cell, [axis]: n + by } : { ...b.cell })
                        : (n > at ? { ...b.cell, [axis]: n + by } : { ...b.cell });
    held.add(`${cell.r},${cell.c}`);
    if (cell.r !== b.cell.r || cell.c !== b.cell.c) {
      kept.push({ op: "seat_cell", id: b.id, cell });
    }
  }
  out.push(...kept);

  /** A removed line's blocks move to the nearest free cell. */
  const shrunk = { ...g, [size]: Math.max(1, g[size]! + by) };
  for (const { id, was } of homeless) {
    const spare = free_cell(shrunk, held, { r: -1, c: -1, rows: 0, cols: 0 },
                            { r: Math.min(was.r, (shrunk.rows ?? 1) - 1),
                              c: Math.min(was.c, (shrunk.cols ?? 1) - 1) });
    if (spare) held.add(`${spare.r},${spare.c}`);
    out.push({ op: "seat_cell", id, cell: spare });
  }

  for (const span of g.merges ?? []) {
    const start = span[axis];
    const len = span[size];
    const through = start <= at && at < start + len;
    const after = by > 0 ? start >= at : start > at;
    if (!through && !after) continue;
    out.push({ op: "split_cells", id: group, r: span.r, c: span.c });
    const moved: Span = { ...span, [axis]: after ? start + by : start,
                                   [size]: through && !after ? len + by : len };
    if (moved[size] > 0) put.push({ op: "merge_cells", id: group, span: moved });
  }
  return [...out, ...put];
}

/** Filled cells in reading order, as one run. */
function reading(graph: Graph, group: Id): Id[] {
  const g = graph.blocks[group];
  if (!g || !is_grid(graph, group)) return [];
  const run: Id[] = [];
  for (let r = 0; r < (g.rows ?? 0); r++) {
    for (let c = 0; c < (g.cols ?? 0); c++) {
      const held = at_cell(graph, group, r, c);
      /** Headers are skipped. */
      if (held && !is_header(held) && run[run.length - 1] !== held.id) run.push(held.id);
    }
  }
  return run;
}

/** Unclaimed addresses; a merge counts once. */
function empty_cells(graph: Graph, group: Id): Cell[] {
  const g = graph.blocks[group];
  if (!g || !is_grid(graph, group)) return [];
  const out: Cell[] = [];
  for (let r = 0; r < (g.rows ?? 0); r++) {
    for (let c = 0; c < (g.cols ?? 0); c++) {
      const span = g.merges?.find((s) => covers(s, r, c));
      if (span && (span.r !== r || span.c !== c)) continue;
      if (!at_cell(graph, group, r, c)) out.push({ r, c });
    }
  }
  return out;
}

/** The free cell nearest the one asked for, outside a span and outside what is already spoken for. */
function free_cell(g: Graph["blocks"][string], taken: ReadonlySet<string>,
                   span: Span, want: Cell): Cell | null {
  let best: Cell | null = null;
  let gap = Infinity;
  for (let r = 0; r < (g.rows ?? 0); r++) {
    for (let c = 0; c < (g.cols ?? 0); c++) {
      if (covers(span, r, c) || taken.has(`${r},${c}`)) continue;
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
  const held = ctx.picked[0] ? ctx.graph.blocks[ctx.picked[0]]?.group : undefined;
  for (const said of [args["group"] ? id_of(args, "group") : undefined,
                      ctx.cells?.[0]?.group, ctx.picked[0], held]) {
    if (said && is_grid(ctx.graph, said)) return said;
  }
  return null;
}

/** The seated block a header question is about, or null where the thing pointed at is not one. */
function headed(ctx: Context, args: Args): Block | null {
  const id = id_of(args, "id") || ctx.picked[0];
  const b = id ? ctx.graph.blocks[id] : undefined;
  if (!b?.cell || !b.group || !is_grid(ctx.graph, b.group)) return null;
  return b;
}

register(
  {
    name: "seat",
    about: "puts a block in a cell of a grid, or takes it out of one",
    on: ["block"],
    args: [{ name: "id", form: "block", required: true },
           { name: "group", form: "block" },
           { name: "at", form: "text" }],
    check: (ctx, args) => {
      const id = id_of(args, "id");
      const group = args["group"] ? id_of(args, "group") : ctx.graph.blocks[id]?.group;
      const cell = cell_of_arg(args, "at");
      if (!cell) return null;
      const g = group ? ctx.graph.blocks[group] : undefined;
      if (!g || !is_grid(ctx.graph, g.id)) return "that is not a grid";
      /** A cell holds a block, never another holder. */
      if (!can_hold(ctx.graph, g.id, id)) return "a cell cannot hold that";
      if (cell.r < 0 || cell.c < 0 || cell.r >= g.rows! || cell.c >= g.cols!) {
        return "that cell is outside the grid";
      }
      /** A cell holds one block. */
      const held = at_cell(ctx.graph, g.id, cell.r, cell.c);
      return held && held.id !== id ? "that cell is taken" : null;
    },
    run: (ctx, args) => {
      const id = id_of(args, "id");
      const group = args["group"] ? id_of(args, "group") : ctx.graph.blocks[id]?.group;
      const out: Mutation[] = [];
      if (group && ctx.graph.blocks[id]?.group !== group) {
        out.push({ op: "set_group", id, group });
      }
      out.push({ op: "seat_cell", id, cell: cell_of_arg(args, "at") });
      return { mutations: out };
    },
  },
  {
    name: "header",
    about: "promotes a seated block to head the line it sits in",
    on: ["block"],
    /** Position says which line a header heads, so it is one flag. */
    args: [{ name: "id", form: "block" },
           { name: "clear", form: "choice", choices: ["yes"] }],
    check: (ctx, args) => {
      const b = headed(ctx, args);
      if (!b) return "only a block in a grid can head a line";
      if (args["clear"] === "yes") return is_header(b) ? null : "it heads nothing already";
      return is_header(b) ? `it heads its ${head_of(ctx.graph, b.id)} already` : null;
    },
    run: (ctx, args) => {
      const b = headed(ctx, args);
      return b ? { mutations: [{ op: "set_header", id: b.id,
                                 header: args["clear"] !== "yes" }] }
               : { mutations: [] };
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
      const g = ctx.graph.blocks[group]!;
      const last = way === "row" ? g.rows! : g.cols!;
      const at = Math.min(last, Math.max(0, num(args, "at") ?? pointed(ctx, way) ?? last));
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
      const g = ctx.graph.blocks[group]!;
      return (args["way"] === "col" ? g.cols! : g.rows!) > 1 ? null : "a grid keeps one line";
    },
    run: (ctx, args) => {
      const group = grid_named(ctx, args)!;
      const way = args["way"] === "col" ? "col" : "row";
      const g = ctx.graph.blocks[group]!;
      const last = (way === "row" ? g.rows! : g.cols!) - 1;
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
      const g = ctx.graph.blocks[said.group];
      if (!g || !is_grid(ctx.graph, said.group)) return "that is not a grid";
      const { r, c, rows, cols } = said.span;
      return r >= 0 && c >= 0 && r + rows <= g.rows! && c + cols <= g.cols!
        ? null : "that reaches past the grid";
    },
    /** Merges the picked span, or splits a single cell; covered blocks move to free cells. */
    run: (ctx, args) => {
      const { group, span } = region(ctx, args)!;
      if (span.rows === 1 && span.cols === 1) {
        return { mutations: [{ op: "split_cells", id: group, r: span.r, c: span.c }] };
      }
      const g = ctx.graph.blocks[group]!;
      const taken = new Set<string>();
      const moved = new Set<Id>();
      for (const b of members_of(ctx.graph, group)) {
        if (b.cell && !covers(span, b.cell.r, b.cell.c)) taken.add(`${b.cell.r},${b.cell.c}`);
      }
      const out: Mutation[] = [];
      for (const b of members_of(ctx.graph, group)) {
        if (!b.cell || !covers(span, b.cell.r, b.cell.c)) continue;
        if (moved.size === 0) {
          moved.add(b.id);
          if (b.cell.r !== span.r || b.cell.c !== span.c) {
            out.push({ op: "seat_cell", id: b.id, cell: { r: span.r, c: span.c } });
          }
          continue;
        }
        const spare = free_cell(g, taken, span, b.cell);
        if (spare) taken.add(`${spare.r},${spare.c}`);
        out.push({ op: "seat_cell", id: b.id, cell: spare });
      }
      return { mutations: [...out, { op: "merge_cells", id: group, span }] };
    },
  },
  {
    name: "transpose",
    about: "turns a grid on its side — rows become columns",
    on: ["block", "cell"],
    args: [{ name: "group", form: "block" }],
    check: (ctx, args) => (grid_named(ctx, args) ? null : "point at a grid, or a cell of one"),
    /** Rows become columns; relations are unchanged. */
    run: (ctx, args) => {
      const group = grid_named(ctx, args)!;
      const g = ctx.graph.blocks[group]!;
      const out: Mutation[] = [{ op: "set_grid", id: group, rows: g.cols!, cols: g.rows! }];
      for (const b of members_of(ctx.graph, group)) {
        if (b.cell) out.push({ op: "seat_cell", id: b.id, cell: { r: b.cell.c, c: b.cell.r } });
      }
      for (const s of g.merges ?? []) out.push({ op: "split_cells", id: group, r: s.r, c: s.c });
      for (const s of g.merges ?? []) {
        out.push({ op: "merge_cells", id: group,
                   span: { r: s.c, c: s.r, rows: s.cols, cols: s.rows } });
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
        const module = derived_module(ctx.graph, from, to);
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
    about: "puts a new block in every empty cell of a grid",
    on: ["block", "cell"],
    args: [{ name: "group", form: "block" }],
    check: (ctx, args) => {
      const group = grid_named(ctx, args);
      if (!group) return "point at a grid, or a cell of one";
      return empty_cells(ctx.graph, group).length ? null : "every cell is taken";
    },
    run: (ctx, args) => {
      const group = grid_named(ctx, args)!;
      const parent = ctx.graph.blocks[group]?.parent ?? null;
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
