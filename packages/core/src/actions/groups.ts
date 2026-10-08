/** Groups and grids as made, and notes. */

import { may_hold } from "../capabilities";
import { block_base, def_at, domain_of, self_use } from "../defs";
import { can_hold, GRID, inside, is_grid, lattice_of, layer_of, members_of,
         shape_of } from "../holders";
import { shown_name } from "../names";
import { next_order, reorder } from "../tree";
import { new_id } from "../ids";
import type { Graph, Grid, Id, Mutation, Shape } from "../types";
import { put, seat_in, taken_in, with_merges } from "./grid";
import { register, type Args, type Context } from "./registry";
import { handles, here, id_of, make_block, num, seats, spot, text, tied } from "./helpers";

/** Whether an action says an extent, which only a grid has. */
const asks_extent = (args: Args): boolean => num(args, "rows") !== null || num(args, "cols") !== null;

/** What a new holder is made as: the definition named, else the base an extent asks for — and
 *  the shape its base gives it. */
function made_as(graph: Graph, args: Args): { type: Id; shape: Shape | null } {
  const type = text(args, "type") || (asks_extent(args) ? "grid" : "group");
  const base = block_base(graph, type);
  return { type, shape: base === "group" || base === "grid" ? base : null };
}

/** The members an action names, or the selection, that are blocks. */
function picked_members(ctx: Context, args: Args, into: Id | null): Id[] {
  const said = (args["members"] as Id[] | undefined) ?? (into ? [] : ctx.picked);
  return said.filter((id) => ctx.graph.blocks[id] && id !== into);
}

/** Why a holder could not take this block, or null. */
function refused(graph: Graph, holder: Id | null, id: Id): string | null {
  const b = graph.blocks[id]!;
  if (!holder) return null;
  if (!can_hold(graph, holder, id)) return "that cannot go in there";
  return may_hold(graph, holder, b.type)
    ? null : `"${shown_name(graph, holder)}" takes nothing of that sort`;
}

/** Where a new holder is made: under the parent its members share, else the open layer. */
function home_of(ctx: Context, members: readonly Id[]): Id {
  const parents = new Set(members.map((id) => ctx.graph.blocks[id]!.parent));
  const [one] = [...parents];
  return parents.size === 1 && one && !is_grid(ctx.graph, one) ? one : here(ctx);
}

/** A lattice resized: what falls outside it is freed, and so are merges that no longer fit. */
function resized(graph: Graph, group: Id, rows: number | null, cols: number | null): Mutation[] {
  const was = lattice_of(graph, group);
  const g: Grid = { ...(was ?? { rows: 1, cols: 1 }) };
  if (rows !== null) g.rows = rows;
  if (cols !== null) g.cols = cols;
  const out: Mutation[] = [];
  for (const b of members_of(graph, group)) {
    if (b.cell && !inside(g, b.cell)) out.push(put(graph, b.id, null));
  }
  const values = g.values?.slice(0, g.rows).map((row) => row.slice(0, g.cols));
  const fit = with_merges({ ...g, ...(values ? { values } : {}) }, (g.merges ?? [])
    .filter((s) => s.r + s.rows <= g.rows && s.c + s.cols <= g.cols));
  return [{ op: "set_grid", id: group, grid: fit }, ...out];
}

register(
  {
    name: "group",
    about: "makes a group round what is selected, or a grid over a region, and moves it in",
    on: ["layer", "selection"],
    /** A new holder round members, or members, an extent or a corner for one already there. */
    args: [{ name: "members", form: "block" }, { name: "into", form: "block" },
           { name: "rows", form: "number" }, { name: "cols", form: "number" },
           /** Where each swept member lands, in the same step. */
           { name: "seats", form: "text" },
           { name: "type", form: "text" },
           { name: "spot", form: "spot" }],
    check: (ctx, args) => {
      const into = args["into"] ? id_of(args, "into") : null;
      const members = picked_members(ctx, args, into);
      const extent = asks_extent(args);
      const held = into ? shape_of(ctx.graph, into) : null;
      if (into && !held) return `"${shown_name(ctx.graph, into)}" holds nothing`;
      if (!into && !members.length && !extent) return "nothing is selected";
      const { type, shape } = made_as(ctx.graph, args);
      if (!into) {
        const d = def_at(ctx.graph, type);
        if (!d || domain_of(ctx.graph, type) !== "block") return `there is no definition called "${type}"`;
        if (!shape) return `"${d.name}" is neither a group nor a grid`;
        const home = home_of(ctx, members);
        if (!may_hold(ctx.graph, home, type)) {
          return `"${shown_name(ctx.graph, home)}" holds nothing of that sort`;
        }
        if (self_use(ctx.graph, home, type)) return "a definition cannot use itself";
        if (members.some((id) => layer_of(ctx.graph, id) !== here(ctx))) {
          return "a holder gathers blocks drawn on this layer";
        }
      }
      if (extent && (held ?? shape) !== "grid") return "rows and columns are a grid's";
      for (const id of members) {
        const why = refused(ctx.graph, into, id);
        if (why) return why;
      }
      return null;
    },
    run: (ctx, args) => {
      const into = args["into"] ? id_of(args, "into") : null;
      const members = picked_members(ctx, args, into);
      const rows = num(args, "rows") === null ? null : Math.max(1, num(args, "rows")!);
      const cols = num(args, "cols") === null ? null : Math.max(1, num(args, "cols")!);
      const out: Mutation[] = [];
      let group = into;
      /** The lattice members are seated in, as it will stand; null for a boundary. */
      let lattice: Grid | null = into ? lattice_of(ctx.graph, into) : null;
      if (!group) {
        const { type, shape } = made_as(ctx.graph, args);
        const made = make_block(ctx, "", home_of(ctx, members), type);
        group = (made[0] as { block: { id: Id } }).block.id;
        out.push(...made);
        /** A block made here does not answer the graph yet, so its lattice is written whole: the
         *  extent asked for is its body, under a header row and column. */
        if (shape === "grid") {
          lattice = { ...GRID, ...(rows === null ? {} : { rows: rows + 1 }),
                      ...(cols === null ? {} : { cols: cols + 1 }) };
          out.push({ op: "set_grid", id: group, grid: lattice });
        }
      } else if (rows !== null || cols !== null) {
        const [written, ...freed] = resized(ctx.graph, group, rows, cols);
        lattice = (written as { grid: Grid }).grid;
        out.push(written!, ...freed);
      }

      /** A grid owns its corner. */
      const at = spot(args);
      if (at) out.push({ op: "place_block", id: group, x: at.x, y: at.y });

      /** A grid seats each member where it was swept, else in the nearest free body cell, growing
       *  when none is free. */
      /** Swept into a new grid, each seat is a body cell, past the header lines. */
      const past = into ? 0 : 1;
      const given = new Map(seats(args).map((s) => [s.id, { r: s.r + past, c: s.c + past }]));
      const taken = into && lattice ? taken_in(ctx.graph, into, lattice) : new Set<string>();
      for (const c of given.values()) taken.add(`${c.r},${c.c}`);
      const moved: Id[] = [];
      const loose: Id[] = [];
      for (const id of members) {
        const was = ctx.graph.blocks[id]!.parent === group;
        if (!was) { out.push({ op: "move_block", id, parent: group }); moved.push(id); }
        const cell = lattice ? given.get(id) : undefined;
        if (cell) out.push({ op: "seat_cell", id, cell });
        else if (lattice && !was) loose.push(id);
      }
      if (lattice && loose.length) out.push(...seat_in(group, lattice, taken, loose, null));
      /** Arriving members keep the order they had among themselves. */
      const orders = into ? reorder(ctx.graph, group, moved)
        : moved.map((id, n) => ({ id, order: n + 1 }));
      for (const at of orders) out.push({ op: "order_block", id: at.id, order: at.order });
      return { mutations: out, ...(into ? {} : { effect: { focus: group } }) };
    },
  },
  {
    name: "note",
    about: "writes a note about a block, tied to it",
    on: ["block"],
    /** A note is always about something, and is made with its tie. */
    args: [{ name: "about", form: "block", required: true },
           { name: "text", form: "text", required: true, asks: true },
           { name: "spot", form: "spot" },
           { name: "w", form: "number" }, { name: "h", form: "number" }],
    check: (ctx, args) => {
      if (!text(args, "text")) return "a note is its text";
      const about = id_of(args, "about") || ctx.picked[0] || "";
      return ctx.graph.blocks[about] ? null : "a note is always about a block";
    },
    /** The drawing gesture may size a note. */
    run: (ctx, args) => {
      const id = new_id("block");
      const about = id_of(args, "about") || ctx.picked[0]!;
      const jot = handles(ctx, "note");
      const out: Mutation[] = [
        { op: "add_block", block: {
          id, parent: here(ctx), type: "note", order: next_order(ctx.graph, here(ctx)),
          alias: jot.take() } },
        ...jot.bump(),
        { op: "set_body", id, body: text(args, "text") },
      ];
      const at = spot(args);
      if (at) out.push({ op: "place_block", id, x: at.x, y: at.y });
      const w = args["w"], h = args["h"];
      if (typeof w === "number" && typeof h === "number" && w > 0 && h > 0) {
        out.push({ op: "size_block", id, w, h });
      }
      out.push(...tied(ctx, id, "note", about));
      return { mutations: out, effect: { focus: id } };
    },
  },
);
