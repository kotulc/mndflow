/** Boundaries, grids as made, and notes. */

import { allows_of, may_hold, may_take } from "../capabilities";
import { can_hold, GRID, inside, lattice_of, members_of, shape_of } from "../holders";
import { shown_name } from "../names";
import { next_order } from "../tree";
import { new_id } from "../ids";
import type { Graph, Grid, Id, Mutation, Shape } from "../types";
import { free_cell, put, with_merges } from "./grid";
import { register, type Args, type Context } from "./registry";
import { handles, here, id_of, ids_of, make_block, num, seats, spot, text } from "./helpers";

/** Whether an action says an extent, which only a grid has. */
const asks_extent = (args: Args): boolean => num(args, "rows") !== null || num(args, "cols") !== null;

/** What a new holder is made as: the definition named, else the base an extent asks for — and
 *  the shape that definition's capability gives it, where it gives one. */
function made_as(graph: Graph, args: Args): { type: Id; shape: Shape | null } {
  const type = text(args, "type") || (asks_extent(args) ? "grid" : "group");
  const said = allows_of(graph, type).holder;
  return { type, shape: said === "group" || said === "grid" ? said : null };
}

/** The members an action names, or the selection, that are blocks on this layer. */
function picked_members(ctx: Context, args: Args, into: Id | null): Id[] {
  const said = (args["members"] as Id[] | undefined) ?? (into ? [] : ctx.picked);
  return said.filter((id) => ctx.graph.blocks[id] && id !== into);
}

/** Why a holder of this shape could not take this block, or null. Only a group nests. */
function refused(graph: Graph, holder: Id | null, shape: Shape, id: Id): string | null {
  const b = graph.blocks[id]!;
  const held = shape_of(graph, id);
  if (held === "grid") return "a grid sits in nothing";
  if (held && shape === "grid") return "a grid holds no group";
  if (!holder) return null;
  if (!can_hold(graph, holder, id)) return "that cannot go in there";
  return may_take(graph, holder, b.type)
    ? null : `"${shown_name(graph, holder)}" takes nothing of that sort`;
}

/** A lattice resized: what falls outside it is freed, and so are merges that no longer fit. */
function resized(graph: Graph, group: Id, rows: number | null, cols: number | null): Mutation[] {
  const was = lattice_of(graph, group);
  const g: Grid = { ...(was ?? { rows: 1, cols: 1 }) };
  if (rows !== null) g.rows = rows;
  if (cols !== null) g.cols = cols;
  const out: Mutation[] = [];
  for (const b of members_of(graph, group)) {
    if (b.cell && !inside(g, b.cell)) out.push(put(b.id, null));
  }
  const values = g.values?.slice(0, g.rows).map((row) => row.slice(0, g.cols));
  const fit = with_merges({ ...g, ...(values ? { values } : {}) }, (g.merges ?? [])
    .filter((s) => s.r + s.rows <= g.rows && s.c + s.cols <= g.cols));
  return [{ op: "set_grid", id: group, grid: fit }, ...out];
}

register(
  {
    name: "group",
    about: "draws a boundary round what is selected, or a grid over a region",
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
        const d = ctx.graph.defs[type];
        if (!d || d.group !== "block") return `there is no definition called "${type}"`;
        if (!shape) return `"${d.name}" is neither a group nor a grid`;
        if (!may_hold(ctx.graph, here(ctx), type)) {
          return `"${shown_name(ctx.graph, here(ctx))}" holds nothing of that sort`;
        }
        if (members.some((id) => ctx.graph.blocks[id]!.parent !== here(ctx))) {
          return "a holder takes blocks on its own layer";
        }
      }
      if (extent && (held ?? shape) !== "grid") return "rows and columns are a grid's";
      for (const id of members) {
        const why = refused(ctx.graph, into, held ?? shape!, id);
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
        const made = make_block(ctx, "", here(ctx), type);
        group = (made[0] as { block: { id: Id } }).block.id;
        out.push(...made);
        /** A block made here does not answer the graph yet, so its lattice is written whole. */
        if (shape === "grid") {
          lattice = { ...GRID, ...(rows === null ? {} : { rows }), ...(cols === null ? {} : { cols }) };
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

      /** A grid seats each member where it was swept, else in the nearest free body cell; one
       *  with nowhere to sit stays out. */
      const given = new Map(seats(args).map((s) => [s.id, { r: s.r, c: s.c }]));
      const held = into ? members_of(ctx.graph, into) : [];
      const taken = new Set([...held.filter((b) => b.cell && lattice && inside(lattice, b.cell))
                               .map((b) => b.cell!), ...given.values()]
        .map((c) => `${c.r},${c.c}`));
      for (const id of members) {
        if (!lattice) { out.push({ op: "set_group", id, group }); continue; }
        const cell = given.get(id) ?? (ctx.graph.blocks[id]!.group === group ? null
          : free_cell(lattice, taken, null, { r: 0, c: 0 }, false));
        if (!cell) continue;
        taken.add(`${cell.r},${cell.c}`);
        out.push({ op: "set_group", id, group }, { op: "seat_cell", id, cell });
      }
      return { mutations: out, ...(into ? {} : { effect: { focus: group } }) };
    },
  },
  {
    name: "leave",
    about: "takes a block out of the group it is in",
    on: ["block", "selection"],
    args: [{ name: "ids", form: "block", required: true }],
    run: (ctx, args) => ({ mutations: ids_of(ctx, args)
      .map((id): Mutation => ({ op: "set_group", id, group: null })) }),
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
      /** The tie to the block it is about. */
      const tie = handles(ctx, "relation");
      out.push({ op: "link_blocks", edge: { id: new_id("edge"), from: id, to: about,
                                            alias: tie.take() } });
      out.push(...tie.bump());
      return { mutations: out, effect: { focus: id } };
    },
  },
);
