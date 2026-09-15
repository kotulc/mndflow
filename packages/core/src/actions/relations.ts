/** Relationships and the interfaces they meet. */

import { derived_module, edge_module, module_of, relation_named } from "../defs";
import { is_holder } from "../holders";
import { children, is_interface, next_order } from "../tree";
import { new_id } from "../ids";
import type { Dir, Flow, Graph, Id, Mutation, Side } from "../types";
import { register, type Args, type Context } from "./registry";
import { handles, id_of, may_wear, run_type, side_of, SIDES, text, typed } from "./helpers";

register(
  {
    name: "relate",
    about: "draws a relationship from one block to another",
    on: ["layer"],
    args: [{ name: "from", form: "block", required: true },
           { name: "to", form: "block", required: true },
           { name: "type", form: "text" },
           { name: "dir", form: "choice", choices: ["none", "forward", "back", "both"] },
           { name: "fromSide", form: "choice", choices: SIDES },
           { name: "toSide", form: "choice", choices: SIDES }],
    check: (ctx, args) => {
      const from = id_of(args, "from");
      const to = id_of(args, "to");
      if (!ctx.graph.blocks[from] || !ctx.graph.blocks[to]) return "both ends have to be there";
      if (from === to) return "a block cannot relate to itself";
      /** A type names a relation definition already there; nothing mints one. */
      const type = text(args, "type");
      if (type && ctx.graph.defs[type]?.group !== "relation") {
        return `there is no relation definition called "${type}"`;
      }
      return null;
    },
    run: (ctx, args) => {
      const from = id_of(args, "from");
      const to = id_of(args, "to");
      const module = derived_module(ctx.graph, from, to);
      const dir = String(args["dir"] ?? "none") as Dir;
      /** A wall the gesture named. */
      const line = handles(ctx, "relation");
      const alias = line.take();
      const out: Mutation[] = [...line.bump(), { op: "link_blocks", edge: {
        id: new_id("edge"), from, to, ...run_type(ctx, args, module),
        alias, ...(dir !== "none" ? { dir } : {}),
        ...(side_of(args, "fromSide") ? { fromSide: side_of(args, "fromSide") } : {}),
        ...(side_of(args, "toSide") ? { toSide: side_of(args, "toSide") } : {}),
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
      const to = id_of(args, "to");
      const other = args["end"] === "from" ? edge.to : edge.from;
      if (to === other) return "a relationship cannot meet itself";
      return ctx.graph.blocks[to] ? null : "needs a block to land on";
    },
    /** Moving an end clears its pinned wall; a type of the old module does not follow it. */
    run: (ctx, args) => {
      const id = id_of(args, "id");
      const end = args["end"] as "from" | "to";
      const to = id_of(args, "to");
      const edge = ctx.graph.edges[id];
      const ends = end === "from" ? [to, edge?.to ?? ""] : [edge?.from ?? "", to];
      const module = derived_module(ctx.graph, ends[0]!, ends[1]!);
      const stale = !!edge?.type && relation_named(ctx.graph, edge.type) !== module;
      return { mutations: [
        { op: "set_end", id, end, port: to },
        { op: "set_side", id, end, side: null },
        ...(stale ? [{ op: "update_edge" as const, id, type: null }] : []),
      ] };
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
    /** A tie takes no direction. */
    check: (ctx, args) => {
      const id = id_of(args, "id");
      if (!ctx.graph.edges[id]) return "needs a relationship";
      return edge_module(ctx.graph, id) === "tie" ? "a relationship to a note is a tie" : null;
    },
    run: (_ctx, args) => ({ mutations: [
      { op: "set_dir", id: id_of(args, "id"), dir: String(args["dir"]) as Dir },
    ] }),
  },
);

/** The walls this act sets interfaces into: an owner's, or a run's ends. */
function promoted(ctx: Context, args: Args)
    : { owner: Id; side: Side; end?: "from" | "to" }[] {
  const edge = ctx.graph.edges[text(args, "edge")];
  const said = String(args["end"] ?? "");
  const ends: ("from" | "to")[] = said === "both" ? ["from", "to"]
    : said === "from" || said === "to" ? [said] : [];
  if (!edge || !ends.length) {
    const owner = id_of(args, "owner");
    return owner ? [{ owner, side: side_of(args, "side") ?? "right" }] : [];
  }
  const asked = side_of(args, "side");
  return ends.map((end) => ({
      owner: edge[end],
      /** The released wall for one end, else the wall each end already leaves by. */
      side: (ends.length === 1 ? asked : undefined)
        ?? (end === "from" ? edge.fromSide : edge.toSide) ?? "right",
      end,
    }));
}

/** The free fraction nearest a wall's middle. */
function mid_of(graph: Graph, owner: Id, side: Side): number {
  const taken = new Set(children(graph, owner)
    .filter((b) => is_interface(b) && b.side === side).map((b) => b.at ?? 0.5));
  for (const at of SHARED) if (!taken.has(at)) return at;
  return 0.5;
}

/** Fractions along a wall, middle first and then outward in pairs. */
const SHARED: readonly number[] =
  [2, 3, 4, 5, 6].flatMap((d) => Array.from({ length: d - 1 }, (_, n) => (n + 1) / d));

register(
  {
    name: "interface",
    about: "puts an interface on the border of a block, and takes a relationship to it",
    on: ["block", "edge"],
    when: (ctx) => {
      const one = ctx.picked.length === 1 ? ctx.picked[0] : undefined;
      if (!one || ctx.graph.edges[one]) return true;
      return !is_holder(ctx.graph, one) && module_of(ctx.graph, one) !== "note";
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
      for (const { owner } of on) {
        const met = ctx.graph.blocks[owner];
        if (!met) return "needs a border to sit on";
        /** An end that is already an interface has nothing to promote. */
        if (edge && is_interface(met)) return "that end is already an interface";
        if (is_holder(ctx.graph, owner)) return "a boundary cannot have an interface";
        if (module_of(ctx.graph, owner) === "note") return "a note has no wall to set one into";
      }
      return null;
    },
    /** Promoting an end clears its pinned wall. */
    run: (ctx, args) => {
      const edge = text(args, "edge");
      const out: Mutation[] = [];
      let last = "";
      const port = handles(ctx, "interface");
      for (const { owner, side, end } of promoted(ctx, args)) {
        const id = new_id("block");
        last = id;
        out.push({ op: "add_block", block: {
          id, parent: owner, side,
          at: end === undefined && typeof args["at"] === "number"
            ? (args["at"] as number) : mid_of(ctx.graph, owner, side),
          order: next_order(ctx.graph, owner), alias: port.take(), ...typed(ctx, args),
        } });
        if (edge && end) {
          out.push({ op: "set_end", id: edge, end, port: id },
                   { op: "set_side", id: edge, end, side: null });
        }
      }
      out.push(...port.bump());
      return { mutations: out, effect: { focus: last } };
    },
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
