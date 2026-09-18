/** Boundaries, grids as made, and notes. */

import { may_take } from "../capabilities";
import { block_members, can_hold, holder_of, is_group, members_of } from "../holders";
import { shown_name } from "../names";
import { next_order } from "../tree";
import { new_id } from "../ids";
import type { Graph, Holder, Id, Mutation, Span } from "../types";
import { with_merges } from "./grid";
import { register } from "./registry";
import { handles, here, id_of, ids_of, num, seats, spot, text } from "./helpers";

/** Anything a boundary may take in: a block, or another holder. */
function member_here(graph: Graph, id: Id): boolean {
  return !!(graph.blocks[id] ?? graph.holders[id]);
}

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
           /** No `type`: a holder carries no definition, only the look its shape ships. */
           { name: "spot", form: "spot" }],
    check: (ctx, args) => {
      const said = args["into"] ? id_of(args, "into") : null;
      const picked = ((args["members"] as Id[]) ?? (said ? [] : ctx.picked))
        .filter((id) => member_here(ctx.graph, id) && id !== said);
      const { members } = merged_members(ctx.graph, picked, said);
      const extent = num(args, "rows") !== null || num(args, "cols") !== null;
      if (!members.length && !extent && !said) return "nothing is selected";
      if (said) {
        for (const id of picked) {
          if (!can_hold(ctx.graph, said, id)) return "that cannot go in there";
          if (!may_take(ctx.graph, said, ctx.graph.blocks[id]?.type)) {
            return `"${shown_name(ctx.graph, said)}" takes nothing of that sort`;
          }
        }
      }
      return null;
    },
    run: (ctx, args) => {
      const said = args["into"] ? id_of(args, "into") : null;
      /** With `into` and no members, this sets the group itself. */
      const picked = ((args["members"] as Id[]) ?? (said ? [] : ctx.picked))
        .filter((id) => member_here(ctx.graph, id) && id !== said);
      const { members, dissolve } = merged_members(ctx.graph, picked, said);
      const into = said;
      const rows = num(args, "rows") === null ? null : Math.max(1, num(args, "rows")!);
      const cols = num(args, "cols") === null ? null : Math.max(1, num(args, "cols")!);
      const out: Mutation[] = [];
      const extent = rows !== null || cols !== null;
      const was = into ? holder_of(ctx.graph, into) : null;
      const group = into ?? new_id("holder");
      const rim = was ? null : handles(ctx, extent ? "grid" : "group");
      let made: Holder = rim
        ? { id: group, parent: here(ctx), alias: rim.take(),
            arrangement: extent ? "grid" : "free",
            order: next_order(ctx.graph, here(ctx)) }
        : { ...was! };
      /** The counter bump is counted after the serial is taken, never before. */
      if (rim) out.push(...rim.bump());
      if (extent) {
        made = { ...made, arrangement: "grid",
                 ...(rows === null ? {} : { rows }), ...(cols === null ? {} : { cols }) };
      }

      /** A grid shrinking frees what falls outside it, rather than leaving addresses nobody can
       *  point at. */
      if (was && extent) {
        const height = made.rows ?? 1;
        const width = made.cols ?? 1;
        for (const b of block_members(ctx.graph, group)) {
          if (b.cell && (b.cell.r >= height || b.cell.c >= width)) {
            out.push({ op: "seat_cell", id: b.id, cell: null });
          }
        }
        made = with_merges(made, (was.merges ?? [])
          .filter((s: Span) => s.r + s.rows <= height && s.c + s.cols <= width));
      }

      /** A grid owns its corner. */
      const at = spot(args);
      if (at) made = { ...made, x: at.x, y: at.y };
      out.push({ op: "set_holder", holder: made });
      for (const id of members) out.push({ op: "set_group", id, group });
      for (const seat of seats(args)) {
        if (members.includes(seat.id)) {
          out.push({ op: "seat_cell", id: seat.id, cell: { r: seat.r, c: seat.c } });
        }
      }
      for (const id of dissolve) out.push({ op: "drop_holder", id });
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
