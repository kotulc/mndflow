/** Relationships and the interfaces they meet. */

import { may_seat } from "../capabilities";
import { def_at, dir_of, domain_of, setting_of, stored_type } from "../defs";
import { shown_name } from "../names";
import { is_interface, next_order, part_end } from "../tree";
import { new_id } from "../ids";
import type { Dir, Flow, Graph, Id, Mutation, Relation, Side } from "../types";
import { register, type Args, type Context } from "./registry";
import { handles, id_of, may_wear, run_type, side_of, SIDES, text } from "./helpers";

register(
  {
    name: "relate",
    about: "draws a relationship from one block to another — or to a part a usage reads through, "
      + "named `usage/part`",
    on: ["layer"],
    args: [{ name: "from", form: "block", required: true },
           { name: "to", form: "block", required: true },
           { name: "type", form: "text" },
           { name: "dir", form: "choice", choices: ["none", "forward", "back", "both"] },
           /** The drawing tool's base, where no type is said. */
           { name: "module", form: "choice", choices: ["line", "tie"] }],
    check: (ctx, args) => {
      const from = part_end(ctx.graph, id_of(args, "from"));
      const to = part_end(ctx.graph, id_of(args, "to"));
      if (!ctx.graph.blocks[from.block] || !ctx.graph.blocks[to.block]) {
        return "both ends have to be there";
      }
      if ([from.part, to.part].some((part) => part && !ctx.graph.blocks[part])) {
        return "that part is not there";
      }
      if (from.block === to.block && from.part === to.part) return "a block cannot relate to itself";
      if (abstract(ctx.graph, from.block, to.block)) return "a definition is never linked, only tied";
      /** A type names a relation definition already there; nothing mints one. */
      const type = text(args, "type");
      if (type && (!def_at(ctx.graph, type) || domain_of(ctx.graph, type) !== "relation")) {
        return `there is no relation definition called "${type}"`;
      }
      return null;
    },
    run: (ctx, args) => {
      const from = part_end(ctx.graph, id_of(args, "from"));
      const to = part_end(ctx.graph, id_of(args, "to"));
      const dir = String(args["dir"] ?? "none") as Dir;
      const { type } = run_type(ctx, args);
      /** A line of this type already joining these ends takes this one's way instead. */
      const twin = twin_of(ctx.graph, from, to, type);
      if (twin) {
        const way = joined(ctx.graph, twin.edge, twin.turned ? turned(dir) : dir);
        return way ? { mutations: [way], effect: { focus: twin.edge.id } }
          : { mutations: [], effect: { say: "these two are related this way already" } };
      }
      const line = handles(ctx, "relation");
      const alias = line.take();
      const said = dir === inherited(ctx.graph, type) ? {} : { settings: { line: { dir } } };
      const out: Mutation[] = [...line.bump(), { op: "link_blocks", edge: {
        id: new_id("edge"), from: from.block, to: to.block,
        ...(from.part ? { fromPart: from.part } : {}), ...(to.part ? { toPart: to.part } : {}),
        ...(type ? { type } : {}), alias, ...said,
      } }];
      return { mutations: out };
    },
  },
  {
    name: "relink",
    about: "takes one end of a relationship to another block",
    on: ["edge"],
    args: [{ name: "id", form: "block", required: true },
           { name: "end", form: "choice", required: true, choices: ["from", "to"] },
           { name: "to", form: "block", required: true }],
    check: (ctx, args) => {
      const edge = ctx.graph.edges[id_of(args, "id")];
      if (!edge) return "needs a relationship";
      const to = part_end(ctx.graph, id_of(args, "to"));
      const other = args["end"] === "from" ? edge.to : edge.from;
      if (to.block === other && !to.part) return "a relationship cannot meet itself";
      if (to.part && !ctx.graph.blocks[to.part]) return "that part is not there";
      if (!ctx.graph.blocks[to.block]) return "needs a block to land on";
      return abstract(ctx.graph, other, to.block) ? "a definition is never linked, only tied" : null;
    },
    run: (ctx, args) => {
      const id = id_of(args, "id");
      const end = args["end"] as "from" | "to";
      const to = part_end(ctx.graph, id_of(args, "to"));
      return { mutations: [{ op: "set_end", id, end, port: to.block, part: to.part ?? null }] };
    },
  },
  {
    /** Removes a relationship, leaving the interfaces it met. */
    name: "unlink",
    about: "removes a relationship, leaving the interfaces it met",
    on: ["edge"],
    args: [{ name: "id", form: "block", required: true }],
    run: (_ctx, args) => ({ mutations: [{ op: "delete_edge", id: id_of(args, "id") }],
                            effect: { focus: null } }),
  },
  {
    name: "flip",
    about: "turns a relationship around",
    on: ["edge"],
    args: [{ name: "id", form: "block", required: true }],
    run: (_ctx, args) => ({ mutations: [{ op: "flip_edge", id: id_of(args, "id") }] }),
  },
  {
    name: "direct",
    about: "sets which way a relationship's arrows point, or takes them off",
    on: ["edge"],
    args: [{ name: "id", form: "block", required: true },
           { name: "dir", form: "choice", required: true,
             choices: ["none", "forward", "back", "both"] }],
    check: (ctx, args) => (ctx.graph.edges[id_of(args, "id")] ? null : "needs a relationship"),
    run: (ctx, args) => ({ mutations: [
      directed(ctx.graph, id_of(args, "id"), String(args["dir"]) as Dir),
    ] }),
  },
);

/** Which way a line points, as its two heads: at the end it goes to, at the end it leaves. */
const HEADS: Record<Dir, readonly [boolean, boolean]> = {
  none: [false, false], forward: [true, false], back: [false, true], both: [true, true],
};

/** The way two heads say. */
function way_of(to: boolean, from: boolean): Dir {
  return to && from ? "both" : to ? "forward" : from ? "back" : "none";
}

/** A way seen from the other end. */
function turned(dir: Dir): Dir {
  const [to, from] = HEADS[dir];
  return way_of(from, to);
}

/** The way a relation type's lines point where they say nothing: plain lines' where none. */
function inherited(graph: Graph, type: Id | undefined): Dir {
  return dir_of(graph, type ?? "line");
}

/** The line already joining two ends with this type, either way round, and whether it runs from
 *  the second to the first. */
function twin_of(graph: Graph, from: { block: Id; part?: Id }, to: { block: Id; part?: Id },
                 type: Id | undefined): { edge: Relation; turned: boolean } | null {
  const meets = (e: Relation, a: typeof from, b: typeof to) => e.from === a.block
    && e.to === b.block && e.fromPart === a.part && e.toPart === b.part;
  for (const e of Object.values(graph.edges)) {
    if (e.type !== type) continue;
    if (meets(e, from, to)) return { edge: e, turned: false };
    if (meets(e, to, from)) return { edge: e, turned: true };
  }
  return null;
}

/** A line taking another's way too: its heads and the new ones together. Null where that adds
 *  nothing. */
function joined(graph: Graph, edge: Relation, dir: Dir): Mutation | null {
  const was = dir_of(graph, edge.id);
  const [to, from] = HEADS[was];
  const [more_to, more_from] = HEADS[dir];
  const now = way_of(to || more_to, from || more_from);
  return now === was ? null : directed(graph, edge.id, now);
}

/** A line set to point a way: said on the line, or given back where its type says it already. */
function directed(graph: Graph, id: Id, dir: Dir): Mutation {
  const own = dir === inherited(graph, graph.edges[id]?.type) ? null : dir;
  return { op: "set_setting", id, key: "line", name: "dir", value: own };
}

/** The owners this act seats interfaces on: one named, or a run's ends. */
function promoted(ctx: Context, args: Args): { owner: Id; end?: "from" | "to" }[] {
  const edge = ctx.graph.edges[text(args, "edge")];
  const said = String(args["end"] ?? "");
  const ends: ("from" | "to")[] = said === "both" ? ["from", "to"]
    : said === "from" || said === "to" ? [said] : [];
  if (!edge || !ends.length) {
    const owner = id_of(args, "owner");
    return owner ? [{ owner }] : [];
  }
  return ends.map((end) => ({ owner: edge[end], end }));
}

/** The seat an act names: a side and a place along it, both or neither. */
function seat_of(args: Args): { side: Side; at: number } | null {
  const side = side_of(args, "side");
  const at = args["at"];
  return side && typeof at === "number" ? { side, at } : null;
}

/** Whether a relationship between these would link a definition: allowed only where the other end
 *  carries a tie, as a note tied to a definition does. */
function abstract(graph: Graph, a: Id, b: Id): boolean {
  const def = (id: Id) => !!graph.blocks[id]?.def;
  const ties = (id: Id) => typeof setting_of(graph, id, "tie")["type"] === "string";
  return (def(a) && !ties(b)) || (def(b) && !ties(a));
}

/** Why nothing may be seated here. The capability decides; these are its words. */
function no_wall(graph: Graph, id: Id): string {
  return `"${shown_name(graph, id)}" takes no interfaces`;
}

register(
  {
    name: "interface",
    about: "puts an interface on the border of a block, and takes a relationship to it; one "
      + "given no seat places itself",
    on: ["block", "edge"],
    when: (ctx) => {
      const one = ctx.picked.length === 1 ? ctx.picked[0] : undefined;
      if (!one || ctx.graph.edges[one]) return true;
      return may_seat(ctx.graph, one);
    },
    /** An owner makes a port; an edge and an end promote that end. */
    args: [{ name: "owner", form: "block" },
           { name: "side", form: "choice", choices: SIDES },
           { name: "at", form: "number" },
           { name: "type", form: "text" },
           { name: "edge", form: "block" },
           /** `both` promotes both ends in one step. */
           { name: "end", form: "choice", choices: ["from", "to", "both"] }],
    check: (ctx, args) => {
      const edge = text(args, "edge");
      if (edge && !ctx.graph.edges[edge]) return "needs a relationship";
      const wrong = may_wear(ctx, args, "interface");
      if (wrong) return wrong;
      const on = promoted(ctx, args);
      if (!on.length) return "needs a border to sit on";
      if ((args["side"] !== undefined) !== (args["at"] !== undefined)) {
        return "a seat needs both a side and a place along it, or neither";
      }
      for (const { owner } of on) {
        const met = ctx.graph.blocks[owner];
        if (!met) return "needs a border to sit on";
        /** An end that is already an interface has nothing to promote. */
        if (edge && is_interface(ctx.graph, met.id)) return "that end is already an interface";
        if (!may_seat(ctx.graph, owner, text(args, "type") || "interface")) {
          return no_wall(ctx.graph, owner);
        }
      }
      return null;
    },
    /** A promoted end places itself; only an owner named with a seat is placed. */
    run: (ctx, args) => {
      const edge = text(args, "edge");
      const out: Mutation[] = [];
      let last = "";
      const port = handles(ctx, "interface");
      const type = stored_type(ctx.graph, text(args, "type") || "interface");
      for (const { owner, end } of promoted(ctx, args)) {
        const id = new_id("block");
        last = id;
        const seat = end === undefined ? seat_of(args) : null;
        out.push({ op: "add_block", block: {
          id, parent: owner, ...(seat ?? {}), ...(type ? { type } : {}),
          order: next_order(ctx.graph, owner), alias: port.take(),
        } });
        if (edge && end) out.push({ op: "set_end", id: edge, end, port: id });
      }
      out.push(...port.bump());
      return { mutations: out, effect: { focus: last } };
    },
  },
  {
    name: "free",
    about: "lets an interface place itself again",
    on: ["interface"],
    args: [{ name: "id", form: "block", required: true }],
    check: (ctx, args) => (ctx.graph.blocks[id_of(args, "id")]?.side ? null : "it places itself"),
    run: (_ctx, args) => ({ mutations: [{ op: "set_port", id: id_of(args, "id"), seat: null }] }),
  },
  {
    name: "mark",
    about: "marks an interface in, out, both, or clears the mark",
    on: ["interface"],
    args: [{ name: "id", form: "block", required: true },
           { name: "flow", form: "choice", choices: ["in", "out", "both", "none"] }],
    run: (_ctx, args) => {
      const flow = String(args["flow"] ?? "none");
      return { mutations: [{ op: "mark_port", id: id_of(args, "id"),
                             flow: flow === "none" ? null : (flow as Flow) }] };
    },
  },
);
