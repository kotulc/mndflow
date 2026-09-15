/** The action registry: the closed surface every input method works against. */

import { is_interface } from "../fold";
import type { Graph, Id, Mutation } from "../types";

/** What an input method can fill. */
export type ArgForm = "text" | "block" | "choice" | "number" | "spot";

export type Arg = {
  name: string;
  form: ArgForm;
  required?: boolean;
  /** Worth asking for, even though the action works without it. */
  asks?: boolean;
  choices?: readonly string[];
};

/** What is under the pointer, or what is selected. */
export type Scope = "layer" | "block" | "edge" | "interface" | "selection" | "cell";

export type Args = Record<string, unknown>;

/** How a surface reaches an action. */
export type Act = (name: string, args?: Args) => void;

/** Where the app should be looking afterwards. */
export type Effect = { open?: Id | null; focus?: Id | null; say?: string };

export type Result = { mutations: Mutation[]; effect?: Effect };

/** A cell: its group and address. */
export type Spot = { group: Id; r: number; c: number };

export type Context = {
  graph: Graph;
  /** The open layer. */
  layer: Id | null;
  /** What is picked within it. */
  picked: Id[];
  /** Which cells are picked, where any are. */
  cells?: readonly Spot[];
  /** The layer this one was opened from; `open` uses it to leave an interface. */
  from?: Id | null;
};

export type Action = {
  name: string;
  /** The sentence a typed word is scored against. */
  about: string;
  on: readonly Scope[];
  args: readonly Arg[];
  /** Whether the action applies here at all; absent is always. */
  when?: (ctx: Context) => boolean;
  /** Why these particular arguments would not work, in words, or null. */
  check?: (ctx: Context, args: Args) => string | null;
  run: (ctx: Context, args: Args) => Result;
};

const registry = new Map<string, Action>();

export function register(...actions: Action[]): void {
  for (const a of actions) registry.set(a.name, a);
}

export function all(): Action[] {
  return [...registry.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function action(name: string): Action | null {
  return registry.get(name) ?? null;
}

/** The actions that apply in this context, unordered. */
export function offer(ctx: Context): Action[] {
  return all().filter((a) => in_scope(a, ctx) && (a.when?.(ctx) ?? true));
}

function in_scope(a: Action, ctx: Context): boolean {
  const one = ctx.picked.length === 1 ? ctx.graph.blocks[ctx.picked[0]!] : undefined;
  const edge = ctx.picked.length === 1 ? ctx.graph.edges[ctx.picked[0]!] : undefined;
  return a.on.some((s) =>
    s === "layer" ? true
    : s === "block" ? !!one
    : s === "edge" ? !!edge
    : s === "interface" ? !!one && is_interface(one)
    : s === "cell" ? !!ctx.cells?.length
    : ctx.picked.length > 0);
}

/** Run an action by name. A refusal comes back as words, never as a throw. */
export function run(name: string, ctx: Context, args: Args = {}): Result | { refused: string } {
  const a = registry.get(name);
  if (!a) return { refused: `there is no action called "${name}"` };
  const why = a.check?.(ctx, args);
  if (why) return { refused: why };
  return a.run(ctx, args);
}

/** Whether an action writes anything. */
export function writes(name: string): boolean {
  return !["open", "reveal"].includes(name);
}
