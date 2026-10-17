/** Relationships and the interfaces they meet. */

import { may_seat } from "../capabilities";
import { def_at, dir_of, domain_of, setting_of, stored_type } from "../defs";
import { end_refusal, LINE_SAYS } from "../ends";
import { shown_name } from "../names";
import { stored_of, is_interface, next_order, part_end } from "../tree";
import { new_id } from "../ids";
import { OWNERSHIPS, type Dir, type End, type Flow, type Graph, type Id, type Mutation,
         type Relation, type Side } from "../types";
import { register, type Args, type Context } from "./registry";
import { borrowed, handles, id_of, may_wear, run_type, side_of, SIDES, text } from "./helpers";


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
      if (mixed(ctx.graph, from.block, to.block)) return MIXED;
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
      return mixed(ctx.graph, other, to.block) ? MIXED : null;
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
    name: "end",
    about: "says what one end of a relationship means: how many meet it, in what role, who owns "
      + "whom, whether it can be reached. A line says multiplicity and role only; a relation "
      + "definition says all four. An empty word takes one back",
    on: ["edge", "block"],
    args: [{ name: "id", form: "block", required: true },
           { name: "end", form: "choice", required: true, choices: ["from", "to"] },
           { name: "multiplicity", form: "text" },
           { name: "role", form: "text" },
           { name: "ownership", form: "choice", choices: [...OWNERSHIPS] },
           { name: "navigable", form: "choice", choices: ["yes", "no", "unsaid"] }],
    check: (ctx, args) => {
      const id = id_of(args, "id");
      const line = ctx.graph.edges[id];
      const def = def_at(ctx.graph, id);
      if (!line && !(def && domain_of(ctx.graph, id) === "relation")) {
        return "needs a relationship or a relation definition";
      }
      const why = borrowed(ctx.graph, id);
      if (why) return why;
      const said = Object.keys(said_end(args));
      const only = said.find((k) => !(LINE_SAYS as readonly string[]).includes(k));
      if (line && only) return `a line says multiplicity and role; its ${only} is its definition's`;
      return end_refusal(said_end(args) as End);
    },
    run: (ctx, args) => {
      const id = id_of(args, "id");
      const way = args["end"] as "from" | "to";
      const line = ctx.graph.edges[id];
      const had = (line ? line.ends : def_at(ctx.graph, id)?.def.ends) ?? {};
      const end: Record<string, unknown> = { ...had[way] };
      for (const [key, value] of Object.entries(said_end(args))) {
        if (value === undefined) delete end[key];
        else end[key] = value;
      }
      const ends = { ...had, [way]: end };
      if (!Object.keys(end).length) delete ends[way];
      return { mutations: [{ op: "set_ends", id, ends }] };
    },
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
function twin_of(graph: Graph, from: Run, to: Run,
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

/** The blocks this act puts interfaces on: one named, or a run's ends. */
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


/** What an `end` act says, key by key; undefined takes that key back. */
function said_end(args: Args): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ["multiplicity", "role", "ownership"]) {
    if (args[key] !== undefined) out[key] = text(args, key) || undefined;
  }
  const nav = args["navigable"];
  if (nav !== undefined) out["navigable"] = nav === "yes" ? true : nav === "no" ? false : undefined;
  return out;
}

/** One end of a run: a block, and the part of its definition it reads through. */
type Run = { block: Id; part?: Id };

/** What a run between a definition and a usage is told. */
const MIXED = "a definition and a usage never relate: tie a note instead";

/** Whether a relationship between these would join a template to an instance: a definition at one
 *  end and a usage at the other. Two definitions relate — an association — and two usages do. A
 *  tie joins anything, as a note tied to a definition does. */
function mixed(graph: Graph, a: Id, b: Id): boolean {
  const def = (id: Id) => !!graph.blocks[id]?.def;
  const ties = (id: Id) => typeof setting_of(graph, id, "tie")["type"] === "string";
  return def(a) !== def(b) && !ties(a) && !ties(b);
}

/** Why nothing may be seated here. The capability decides; these are its words. */
function no_wall(graph: Graph, id: Id): string {
  return `"${shown_name(graph, id)}" takes no interfaces`;
}

register(
  {
    name: "interface",
    about: "puts an interface on the border of any block that has ports, and takes a relationship "
      + "to it; one given no seat places itself. Its type is an interface definition",
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
           { name: "name", form: "text" },
           /** The interface definition it is. */
           { name: "type", form: "text" },
           { name: "flow", form: "choice", choices: ["in", "out", "both"] },
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
        if (!may_seat(ctx.graph, owner)) return no_wall(ctx.graph, owner);
        const why = borrowed(ctx.graph, owner);
        if (why) return why;
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
      const name = text(args, "name");
      const flow = String(args["flow"] ?? "");
      for (const { owner, end } of promoted(ctx, args)) {
        const id = new_id("block");
        last = id;
        const seat = end === undefined ? seat_of(args) : null;
        out.push({ op: "add_block", block: {
          id, parent: owner, ...(seat ?? {}), ...(type ? { type } : {}), ...(name ? { name } : {}),
          ...(["in", "out", "both"].includes(flow) ? { flow: flow as Flow } : {}),
          order: next_order(ctx.graph, owner), alias: port.take(),
        } });
        if (edge && end) out.push({ op: "set_end", id: edge, end, port: id, part: null });
      }
      out.push(...port.bump());
      return { mutations: out, effect: { focus: last } };
    },
  },
  {
    name: "port",
    about: "changes an interface where it is held — its definition's, for one a usage reads "
      + "through: which way it carries, or where it sits; `free` lets it place itself again",
    on: ["interface"],
    args: [{ name: "id", form: "block", required: true },
           { name: "flow", form: "choice", choices: ["in", "out", "both", "none"] },
           { name: "side", form: "choice", choices: SIDES },
           { name: "at", form: "number" },
           { name: "free", form: "choice", choices: ["true"] }],
    check: (ctx, args) => {
      const id = stored_of(ctx.graph, id_of(args, "id"));
      if (!is_interface(ctx.graph, id)) return "that interface is not here any more";
      const why = borrowed(ctx.graph, id);
      if (why) return why;
      return (args["side"] !== undefined) !== (args["at"] !== undefined)
        ? "a seat needs both a side and a place along it" : null;
    },
    run: (ctx, args) => {
      const id = stored_of(ctx.graph, id_of(args, "id"));
      const out: Mutation[] = [];
      if (args["flow"] !== undefined) {
        const flow = String(args["flow"]);
        out.push({ op: "mark_port", id, flow: flow === "none" ? null : flow as Flow });
      }
      const seat = seat_of(args);
      if (seat) out.push({ op: "set_port", id, seat });
      if (args["free"] !== undefined) out.push({ op: "set_port", id, seat: null });
      return { mutations: out };
    },
  },
);
