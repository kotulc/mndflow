/** Boundaries, grids as made, and notes. */

import { can_hold, is_group, members_of, next_order } from "../fold";
import { new_id } from "../ids";
import type { Graph, Id, Mutation } from "../types";
import { register } from "./registry";
import { handles, here, id_of, ids_of, may_wear, num, seats, spot, text, typed } from "./helpers";

/** Merging boundaries is not nesting: a selected group yields its members. */
function merged_members(graph: Graph, members: Id[], into: Id | null)
    : { members: Id[]; dissolve: Id[] } {
  if (into) return { members, dissolve: [] };
  const out: Id[] = [];
  const dissolve: Id[] = [];
  for (const id of members) {
    if (is_group(graph, id)) {
      for (const m of members_of(graph, id)) out.push(m.id);
      dissolve.push(id);
    } else {
      out.push(id);
    }
  }
  return { members: out, dissolve };
}

register(
  {
    name: "group",
    about: "draws a boundary round what is selected, or a grid over a region",
    on: ["layer", "selection"],
    /** A boundary round members, or a grid with an extent. */
    args: [{ name: "members", form: "block" }, { name: "into", form: "block" },
           { name: "rows", form: "number" }, { name: "cols", form: "number" },
           /** Where each swept member lands, in the same step. */
           { name: "seats", form: "text" },
           { name: "type", form: "text" },
           { name: "spot", form: "spot" }],
    check: (ctx, args) => {
      const said = args["into"] ? id_of(args, "into") : null;
      const picked = ((args["members"] as Id[]) ?? (said ? [] : ctx.picked))
        .filter((id) => ctx.graph.blocks[id] && id !== said);
      const { members } = merged_members(ctx.graph, picked, said);
      const extent = num(args, "rows") !== null || num(args, "cols") !== null;
      if (!members.length && !extent && !said) return "nothing is selected";
      /** An extent makes a grid, so the kind is checked before it is made. */
      const wrong = may_wear(ctx, args, extent ? "grid" : "group");
      if (wrong) return wrong;
      if (said) {
        for (const id of picked) {
          if (!can_hold(ctx.graph, said, id)) return "that cannot go in there";
        }
      }
      return null;
    },
    run: (ctx, args) => {
      const said = args["into"] ? id_of(args, "into") : null;
      /** With `into` and no members, this sets the group itself. */
      const picked = ((args["members"] as Id[]) ?? (said ? [] : ctx.picked))
        .filter((id) => ctx.graph.blocks[id] && id !== said);
      const { members, dissolve } = merged_members(ctx.graph, picked, said);
      const into = said;
      const rows = num(args, "rows") === null ? null : Math.max(1, num(args, "rows")!);
      const cols = num(args, "cols") === null ? null : Math.max(1, num(args, "cols")!);
      const out: Mutation[] = [];
      let group = into;
      if (!group) {
        const extent = rows !== null || cols !== null;
        group = new_id("block");
        const rim = handles(ctx, extent ? "grid" : "group");
        const alias = rim.take();
        out.push(...rim.bump());
        out.push({ op: "add_block", block: {
          id: group, parent: here(ctx), type: extent ? "grid" : "group", alias,
          order: next_order(ctx.graph, here(ctx)), ...typed(ctx, args),
        } });
      }
      if (rows !== null || cols !== null) {
        out.push({ op: "set_grid", id: group,
                   ...(rows === null ? {} : { rows }),
                   ...(cols === null ? {} : { cols }) });
      }
      /** A grid shrinking frees what falls outside it, rather than leaving addresses nobody can
       *  point at. */
      const was = ctx.graph.blocks[group];
      if (was && (rows !== null || cols !== null)) {
        const height = rows ?? was.rows ?? 1;
        const width = cols ?? was.cols ?? 1;
        for (const b of members_of(ctx.graph, group)) {
          if (b.cell && (b.cell.r >= height || b.cell.c >= width)) {
            out.push({ op: "seat_cell", id: b.id, cell: null });
          }
        }
        for (const span of was.merges ?? []) {
          if (span.r + span.rows > height || span.c + span.cols > width) {
            out.push({ op: "split_cells", id: group, r: span.r, c: span.c });
          }
        }
      }
      /** A grid owns its corner. */
      const at = spot(args);
      if (at) out.push({ op: "place_block", id: group, x: at.x, y: at.y });
      for (const id of members) out.push({ op: "set_group", id, group });
      for (const seat of seats(args)) {
        if (members.includes(seat.id)) {
          out.push({ op: "seat_cell", id: seat.id, cell: { r: seat.r, c: seat.c } });
        }
      }
      for (const id of dissolve) out.push({ op: "delete_block", id });
      return { mutations: out };
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
    about: "writes a note about a block or a relationship, tied to it",
    on: ["block", "edge"],
    /** A note is always about something, and is made with its tie. */
    args: [{ name: "about", form: "block", required: true },
           { name: "text", form: "text", required: true, asks: true },
           { name: "spot", form: "spot" },
           { name: "w", form: "number" }, { name: "h", form: "number" }],
    check: (ctx, args) => {
      if (!text(args, "text")) return "a note is its text";
      const about = id_of(args, "about") || ctx.picked[0] || "";
      const on = ctx.graph.edges[about];
      if (on && (ctx.graph.edges[on.from] || ctx.graph.edges[on.to])) {
        return "a tie has no line of its own to note";
      }
      return ctx.graph.blocks[about] || on ? null : "a note is always about something";
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
      /** The tie, to a block or a line. */
      const tie = handles(ctx, "relation");
      out.push({ op: "link_blocks", edge: { id: new_id("edge"), from: id, to: about,
                                            alias: tie.take(), module: "tie" } });
      out.push(...tie.bump());
      return { mutations: out, effect: { focus: id } };
    },
  },
);
