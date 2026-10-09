/** Argument readers and makers shared by the actions. */

import { block_base, def_at, def_named, frozen, package_of, relation_base, setting_of,
         stored_type, type Domain } from "../defs";
import { is_grid } from "../holders";
import { next_alias } from "../names";
import { next_order } from "../tree";
import { new_id } from "../ids";
import type { Cell, Graph, Id, Mutation, Side, Span } from "../types";
import type { Args, Context } from "./registry";

/** The layer an action lands in: the open one, else the workspace's domain. */
export const here = (ctx: Context): Id => ctx.layer ?? ctx.graph.root;

export const text = (args: Args, key: string): string => String(args[key] ?? "").trim();
export const id_of = (args: Args, key: string): Id => String(args[key] ?? "");
/** The four walls, as a choice an input method can be offered. */
export const SIDES: readonly Side[] = ["top", "right", "bottom", "left"];

export const side_of = (args: Args, key: string): Side | undefined =>
  SIDES.includes(args[key] as Side) ? (args[key] as Side) : undefined;

/** The ids an action names, or else the selection. */
export const ids_of = (ctx: Context, args: Args): Id[] => {
  const said = args["ids"] ?? args["id"];
  const many = Array.isArray(said) ? said.map(String) : said ? [String(said)] : [];
  return (many.length ? many : ctx.picked).filter(Boolean);
};

export const spot = (args: Args): { x: number; y: number } | null => {
  const s = args["spot"] as { x?: number; y?: number } | undefined;
  return s && typeof s.x === "number" && typeof s.y === "number" ? { x: s.x, y: s.y } : null;
};

/** A number somebody said, or null. */
export const num = (args: Args, key: string): number | null => {
  const said = args[key];
  if (typeof said === "number") return Number.isFinite(said) ? Math.round(said) : null;
  const read = Number(said);
  return said !== undefined && said !== "" && Number.isFinite(read) ? Math.round(read) : null;
};

/** An address somebody said, however they said it: `{r, c}` or `"r,c"`. */
export const cell_of_arg = (args: Args, key: string): Cell | null => {
  const said = args[key];
  if (said && typeof said === "object") {
    const { r, c } = said as Cell;
    return typeof r === "number" && typeof c === "number" ? { r, c } : null;
  }
  const [r, c] = String(said ?? "").split(/[\s,]+/).map(Number);
  return Number.isFinite(r!) && Number.isFinite(c!) ? { r: r!, c: c! } : null;
};

/** Where each member of a captured sweep lands; malformed entries are ignored. */
export const seats = (args: Args): { id: Id; r: number; c: number }[] => {
  const said = args["seats"];
  if (!Array.isArray(said)) return [];
  return said
    .filter((s): s is { id: Id; r: number; c: number } =>
      !!s && typeof s === "object" && typeof (s as { id?: unknown }).id === "string"
      && typeof (s as { r?: unknown }).r === "number"
      && typeof (s as { c?: unknown }).c === "number")
    .map((s) => ({ id: s.id, r: s.r, c: s.c }));
};

/** The region an action was pointed at, as one rectangle. */
export function region(ctx: Context, args: Args): { group: Id; span: Span } | null {
  const picked = ctx.cells ?? [];
  const group = args["group"] ? id_of(args, "group") : picked[0]?.group;
  if (!group || !is_grid(ctx.graph, group)) return null;
  const from = cell_of_arg(args, "at") ?? cell_of_arg(args, "into");
  const spots = args["at"] || args["into"]
    ? [from, cell_of_arg(args, "into")].filter((c): c is Cell => !!c)
    : picked.filter((p) => p.group === group).map((p) => ({ r: p.r, c: p.c }));
  if (!spots.length) return null;
  const r = Math.min(...spots.map((s) => s.r));
  const c = Math.min(...spots.map((s) => s.c));
  return { group, span: { r, c,
    rows: Math.max(...spots.map((s) => s.r)) - r + 1,
    cols: Math.max(...spots.map((s) => s.c)) - c + 1 } };
}

/** Handle serials of one kind, counted within an act, and the one counter bump. */
export function handles(ctx: Context, kind: string) {
  const first = next_alias(ctx.graph, kind);
  let next = first;
  return {
    /** The next serial of this kind, counted within the act. */
    take: () => next++,
    /** The counter bump, or nothing when none were taken. */
    bump: (): Mutation[] =>
      next > first ? [{ op: "set_counter", kind, n: next - 1 }] : [],
  };
}

/** A refusal where the named definition is not of this kind. */
export function may_wear(ctx: Context, args: Args, kind: Id): string | null {
  const type = text(args, "type");
  if (!type) return null;
  const d = def_at(ctx.graph, type);
  if (!d) return `there is no definition called "${type}"`;
  return block_base(ctx.graph, type) === kind
    ? null : `"${d.name}" is not a ${kind} definition`;
}

/** The type an action stores; a structural base stores as plain. */
export const typed = (ctx: Context, args: Args): { type?: Id } => {
  const type = stored_type(ctx.graph, text(args, "type"));
  return type ? { type } : {};
};

/** The relation type a run stores, where it names a relation definition. */
export const run_type = (ctx: Context, args: Args): { type?: Id } => {
  const type = rooted(ctx, text(args, "type"), "relation");
  return type && def_at(ctx.graph, type) && relation_base(ctx.graph, type)
    ? (stored_type(ctx.graph, type) ? { type: stored_type(ctx.graph, type)! } : {}) : {};
};

/** Bases a layer cannot make on its own, and why. */
export const NEEDS: Record<string, string> = {
  interface: "an interface sits on a block — add one to a block, then drop this onto it",
  reference: "a reference stands for a block — drag that block from the tree instead",
  tag: "a tag is carried, not placed — type it into a block's tags in the tray",
  value: "a value type is what an attribute holds — give an attribute this type instead",
};

/** Makes a block, numbered and ordered like every other. */
export function make_block(ctx: Context, name: string, parent: Id | null, type?: Id): Mutation[] {
  const id = new_id("block");
  const serial = handles(ctx, block_base(ctx.graph, type));
  return [{ op: "add_block", block: {
    id, parent, name: name || undefined, type: stored_type(ctx.graph, type),
    order: next_order(ctx.graph, parent), alias: serial.take(),
  } }, ...serial.bump()];
}

/** The definition a word names: an id, or a name within the domain. */
export function rooted(ctx: Context, said: string, domain?: Domain): Id | undefined {
  if (!said) return undefined;
  if (def_at(ctx.graph, said)) return said;
  return def_named(ctx.graph, said, domain)?.id;
}

/** A fresh definition id. Names are labels; ids never derive from them. */
export function mint_def(domain: Domain): Id {
  return new_id(domain === "relation" ? "rel" : "def");
}

/** Why a holder cannot take a value: only an edge cannot. */
export function holds_values(ctx: Context, args: Args): string | null {
  const id = id_of(args, "holder");
  return ctx.graph.edges[id]
    ? "a relationship holds no values — promote an end and put it on the port"
    : null;
}

/** Why a block is not the workspace's to change: it sits in a package that came frozen. */
export function borrowed(graph: Graph, id: Id): string | null {
  if (!frozen(graph, id)) return null;
  const pkg = graph.blocks[package_of(graph, id)];
  const name = graph.blocks[id]?.name ?? id;
  return `"${name}" comes from ${pkg?.name ?? pkg?.id ?? "a package"} — extend it with a subtype instead`;
}

/** Names from one answer, split on commas. */
export function list(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).map((v) => v.trim()).filter(Boolean);
  return String(raw ?? "").split(",").map((v) => v.trim()).filter(Boolean);
}

/** The link a tie trait makes from a new block to the one it was made from: a relationship of the
 *  type its `tie` setting names. Nothing where its definition carries no tie. */
export function tied(ctx: Context, id: Id, type: Id | undefined, from: Id | undefined): Mutation[] {
  const said = setting_of(ctx.graph, type, "tie")["type"];
  if (!from || !ctx.graph.blocks[from] || typeof said !== "string") return [];
  const kind = def_at(ctx.graph, said) ? stored_type(ctx.graph, said) : undefined;
  const line = handles(ctx, "relation");
  return [{ op: "link_blocks", edge: { id: new_id("edge"), from: id, to: from,
                                       alias: line.take(), ...(kind ? { type: kind } : {}) } },
          ...line.bump()];
}
