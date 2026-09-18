/** Argument readers and makers shared by the actions. */

import { def_named, block_base, relation_base, shipped, stored_type } from "../defs";
import { next_alias } from "../names";
import { layer_id, next_order } from "../tree";
import { new_id } from "../ids";
import type { Cell, Definition, Graph, Id, Mutation, Side,
              Span } from "../types";
import type { Args, Context } from "./registry";

/** The layer an action lands in; null is the root. */
export const here = (ctx: Context): Id => layer_id(ctx.graph, ctx.layer);

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
  if (!group || !ctx.graph.holders[group]) return null;
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
  const d = ctx.graph.defs[type];
  if (!d) return `there is no definition called "${type}"`;
  return block_base(ctx.graph, type) === kind
    ? null : `"${d.name}" is not a ${kind} definition`;
}

/** The type an action stores; a base or a default stores as plain. */
export const typed = (ctx: Context, args: Args): { type?: Id } => {
  const type = stored_type(ctx.graph, text(args, "type"));
  return type ? { type } : {};
};

/** The relation type a run stores, only when it is of the run's module. */
export const run_type = (ctx: Context, args: Args, base: Id): { type?: Id } => {
  const type = text(args, "type");
  return type && relation_base(ctx.graph, type) === base ? typed(ctx, args) : {};
};

/** Bases a layer cannot make on its own, and why. */
export const NEEDS: Record<string, string> = {
  interface: "interfaces may only be added to existing blocks",
  reference: "a reference is made by dragging the block, not its definition",
  note: "a note is written about something",
  grid: "a grid is made with rows and columns",
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

/** The workspace's own definition an element names, if it names one: not a base, a default or a
 *  package's. */
export function own_def(graph: Graph, id: Id): Definition | undefined {
  const type = (graph.blocks[id] ?? graph.edges[id])?.type;
  const d = type ? graph.defs[type] : undefined;
  return d && !shipped(d) && !d.default && !d.from ? d : undefined;
}

/** The definition `extends` names: an id, or a name within the group. */
export function rooted(ctx: Context, said: string, group?: "block" | "relation"): Id | undefined {
  if (!said) return undefined;
  if (ctx.graph.defs[said]) return said;
  return def_named(ctx.graph, said, group)?.id;
}

/** A fresh definition id. Names are labels; ids never derive from them. */
export function mint_def(group: "block" | "relation"): Id {
  return new_id(group === "relation" ? "rel" : "def");
}

/** Why a holder cannot take a value: only an edge cannot. */
export function holds_values(ctx: Context, args: Args): string | null {
  const id = id_of(args, "holder");
  return ctx.graph.edges[id]
    ? "a relationship holds no values — promote an end and put it on the port"
    : null;
}

export function borrowed(graph: Graph, id: Id): string | null {
  const d = graph.defs[id];
  if (!d?.from) return null;
  return `"${d.name}" comes from ${d.from} — extend it with a subtype instead`;
}

/** Names from one answer, split on commas. */
export function list(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).map((v) => v.trim()).filter(Boolean);
  return String(raw ?? "").split(",").map((v) => v.trim()).filter(Boolean);
}
