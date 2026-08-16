/** Filling an action's arguments from what a surface already knows.
 *
 *  One home for what the canvas menu, the explorer menu and the rail each kept
 *  a copy of. The copies drifted, which is how one mistake became three bugs:
 *  every element argument took the *same* focused id, so `tie` was offered with
 *  its note and its holder set to one card and the door accepted the self-loop.
 *
 *  Two rules hold it together. An element argument takes a candidate of its
 *  own — never one an earlier argument already claimed — and one carrying a
 *  `form` takes a candidate of that form. Text is the surface's business: one
 *  that can ask says so, and only an argument that declares a `prompt` is
 *  something it can sensibly ask for.
 *
 *  Membership is `offer(ctx)` and order is the caller's; this module only says
 *  whether an offered action can be run from what is in front of it. */

import { type Action, type Arg, type Args, type Context } from "./index";

/** Fixed menu order — the actions.md enumeration. The rail learns its own
 *  (Z.3), so this is the menu's order and the rail's fallback, never a rule. */
export const ORDER = [
  "create", "delete", "rename", "retype", "describe", "move", "refer",
  "open", "up", "reveal",
  "interface", "mark",
  "relate", "unlink", "flip", "direct", "reform",
  "group", "leave", "dissolve", "note", "tie",
  "field", "unfield", "define", "undefine",
  "infer",
  "axis", "arrange", "relax", "vocabulary",
];

export function rank(name: string): number {
  const i = ORDER.indexOf(name);
  return i < 0 ? ORDER.length : i;
}

/** What a surface can hand to an action's arguments. */
export type Supply = {
  /** Candidates, most relevant first. Each element argument takes its own. */
  ids: string[];
  /** The layer in view — what `parent` and `owner` mean when nothing names one. */
  view: string | null;
  /** Words the surface already has, for a text argument. */
  text?: string;
  /** True when the surface can ask for words it does not have. A canvas or an
   *  explorer prompts; the rail has only what was typed. */
  prompts?: boolean;
};

/** The group an element already sits in — what a `group` argument wants, rather
 *  than another member of the same selection. */
function group_of(ctx: Context, id: string | undefined): string | null {
  if (!id) return null;
  return ctx.graph.elements[id]?.groups[0] ?? null;
}

/** A candidate for one element argument: unclaimed, and of the form it asks for. */
function candidate(
  ctx: Context,
  supply: Supply,
  arg: Extract<Arg, { kind: "element" }>,
  taken: Set<string>,
): string | null {
  for (const id of supply.ids) {
    if (taken.has(id)) continue;
    if (arg.form && ctx.graph.elements[id]?.form !== arg.form) continue;
    return id;
  }

  // Nothing selected is the group, so read the one the selection is inside —
  // which is what `leave` means. Only for a required argument: an optional
  // `into` left empty means *make a new group*, and filling it from the
  // enclosing one would quietly turn every Group into a Join.
  if (arg.form === "group" && !arg.optional) return group_of(ctx, supply.ids[0]);

  return null;
}

/** Fill what the surface can supply. Arguments only it can know — a place on a
 *  border, the two ends of a relationship — arrive already filled as `seed`. */
export function fill(
  action: Action,
  ctx: Context,
  supply: Supply,
  seed: Args = {},
): Args {
  const args: Args = { ...seed };
  const taken = new Set(
    Object.values(seed).filter((v): v is string => typeof v === "string"),
  );
  const text = supply.text?.trim() ?? "";

  for (const arg of action.args) {
    // `in`, not a null test: a null parent is the root layer, which is filled.
    if (arg.name in args) continue;

    if (arg.kind === "element") {
      if (arg.name === "parent" || arg.name === "owner") {
        args[arg.name] = supply.view;
        continue;
      }
      const pick = candidate(ctx, supply, arg, taken);
      if (pick == null) continue;
      args[arg.name] = pick;
      taken.add(pick);
      continue;
    }

    if (arg.kind === "text" && text) args[arg.name] = text;
  }

  return args;
}

/** Whether this action can run from what the surface has. Offering one that
 *  cannot is worse than leaving it out: it reads as available and refuses. */
export function fillable(
  action: Action,
  ctx: Context,
  supply: Supply,
  seed: Args = {},
): boolean {
  const args = fill(action, ctx, supply, seed);

  return action.args.every((arg) => {
    if (arg.optional || arg.name in args) return true;
    // A prompt is what makes a missing word askable; one without has no
    // question to put, so the action stays off the list rather than refusing.
    return arg.kind === "text" && Boolean(arg.prompt) && Boolean(supply.prompts);
  });
}
