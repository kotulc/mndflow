/** Presentation of the offered-action list for the rail.
 *
 *  Membership is `offer(ctx)` — this module only filters, orders and fills.
 *  Idle order is learned preference for the situation's shape, falling back to
 *  a fixed enumeration. Against typed text, embedding similarity leads, then
 *  the same preference; an exact prior entry is remembered and pinned first.
 *  Feedback is local (`feedback.read`), never the log. A documentation keyword
 *  hit may be appended after this list (docs.ts / Chat) — always last, never
 *  mixed into action rank. Navigation stays off: the rail reads context and
 *  never changes it. */

import { offer } from "../actions/offer";
import { ORDER, fill, fillable, type Supply } from "../actions/fill";
import { sayable, type Action, type Args, type Context } from "../actions";
import { FLOOR, scoreAny } from "../embed/match";
import { ROOT, refAt } from "../graph/types";
import { read, shape_of } from "./feedback";

/** Navigation — a text surface never offers these (spec.md). */
const NAV = new Set(["open", "up", "reveal"]);

function order_of(name: string): number {
  const i = ORDER.indexOf(name);
  return i < 0 ? ORDER.length : i;
}

/** How often each action was chosen when overruling, for one situation shape. */
function shape_weights(shape: string): Map<string, number> {
  const weights = new Map<string, number>();
  for (const hit of read()) {
    if (hit.shape !== shape) continue;
    weights.set(hit.chose, (weights.get(hit.chose) ?? 0) + 1);
  }
  return weights;
}

/** Last action chosen for this exact typed entry — the literal tier. */
function entry_recall(entry: string): string | null {
  if (!entry) return null;
  let found: string | null = null;
  for (const hit of read()) {
    if (hit.entry === entry) found = hit.chose;
  }
  return found;
}

/** Prefer higher shape weight, then the fixed enumeration. */
function by_pref(
  a: Action,
  b: Action,
  weights: Map<string, number>,
): number {
  return (weights.get(b.name) ?? 0) - (weights.get(a.name) ?? 0)
    || order_of(a.name) - order_of(b.name);
}

/** Pin a remembered literal choice first when it is still on offer. */
function pin_recall(items: Action[], recall: string | null): Action[] {
  if (!recall) return items;
  const at = items.findIndex((action) => action.name === recall);
  if (at <= 0) return items;
  const next = items.slice();
  const [hit] = next.splice(at, 1);
  next.unshift(hit);
  return next;
}

/** Phrases an action is recognised by — what `scoreAny` embeds against. */
export function phrases(action: Action): string[] {
  return [action.label, action.about, action.name];
}

/** Same-project element ids from a cross-project selection (roots excluded). */
function locals(refs: string[], project: string | undefined): string[] {
  if (!project) return [];
  const out: string[] = [];
  for (const ref of refs) {
    const { project: from, id } = refAt(ref);
    if (id === ROOT) continue;
    if ((from ?? project) !== project) continue;
    out.push(id);
  }
  return out;
}

/** Candidates the rail can name: what is picked, then the rest of the
 *  selection in this project. **The rail does not prompt** — it has only what
 *  was typed, so an action missing a word stays off the list until it is. */
function supply_of(ctx: Context, refs: string[], draft = ""): Supply {
  const ids = [ctx.picked?.id, ...locals(refs, ctx.project)]
    .filter((id): id is string => Boolean(id));
  return { ids: [...new Set(ids)], view: ctx.view, text: draft };
}

/** What only the rail knows — the selection it was opened over. */
function seed_of(action: Action, ctx: Context, refs: string[]): Args {
  const ids = locals(refs, ctx.project);
  if (action.name === "infer") {
    return ctx.open ? { of: refs, open: ctx.open } : { of: refs };
  }
  if (action.name === "group") {
    const focus = ctx.picked?.id;
    return { members: ids.length ? ids : (focus ? [focus] : []) };
  }
  if (action.name === "relate" && ids.length >= 2) {
    return { from: ids[0], to: ids[1] };
  }
  return {};
}

/** Whether the rail can supply every required argument. */
export function can_fill(action: Action, ctx: Context, refs: string[]): boolean {
  if (NAV.has(action.name)) return false;
  if (!sayable(action)) return false;

  if (action.name === "infer") return refs.length > 0;
  if (action.name === "group") {
    return locals(refs, ctx.project).length > 0
      || Boolean(ctx.picked?.kind === "node" && ctx.picked.id);
  }
  if (action.name === "relate") return locals(refs, ctx.project).length >= 2;

  // Membership only: a word the draft has not supplied yet is `ready`'s
  // business, not a reason to withhold the action from the list.
  return fillable(action, ctx, { ...supply_of(ctx, refs), prompts: true },
                  seed_of(action, ctx, refs));
}

/** Fill from selection and draft; required text left empty means not yet ready. */
export function fill_args(
  action: Action,
  ctx: Context,
  refs: string[],
  draft: string,
): Args {
  if (action.name === "infer") return seed_of(action, ctx, refs);

  const args = fill(
    action, ctx, supply_of(ctx, refs, draft), seed_of(action, ctx, refs),
  );

  if (action.name === "unlink" || action.name === "flip"
      || action.name === "direct" || action.name === "reform") {
    if (ctx.picked?.kind === "edge") args.id = ctx.picked.id;
  }

  return args;
}

/** Whether every required text argument is filled. */
export function ready(action: Action, args: Args): boolean {
  return !action.args.some(
    (arg) => !arg.optional && arg.kind === "text" && args[arg.name] == null,
  );
}

/** Offer membership, filtered to what the rail can say.
 *  Idle: shape-weighted preference, then fixed ORDER.
 *  Typed: embedding rank (best first), preference as tie-break; an exact prior
 *  entry is pinned first. Substring only while nothing clears the floor — the
 *  model is still cold, or the draft matches no action. */
export function ranked(ctx: Context, draft: string, refs: string[]): Action[] {
  const text = draft.trim();
  const weights = shape_weights(shape_of(ctx));
  const recall = entry_recall(text);
  const items = offer(ctx)
    .filter((action) => can_fill(action, ctx, refs))
    .sort((a, b) => by_pref(a, b, weights));

  if (!text) return items;

  const options = Object.fromEntries(items.map((a) => [a.name, phrases(a)]));
  const scored = scoreAny(text, options);
  const by_score = new Map(scored.map((hit) => [hit.id, hit.score]));
  const top = scored[0]?.score ?? 0;

  if (top >= FLOOR) {
    return pin_recall(
      items
        .filter((action) => (by_score.get(action.name) ?? 0) >= FLOOR)
        .sort((a, b) =>
          (by_score.get(b.name) ?? 0) - (by_score.get(a.name) ?? 0)
          || by_pref(a, b, weights)),
      recall,
    );
  }

  const needle = text.toLowerCase();
  return pin_recall(
    items.filter((action) => {
      const hay = `${action.label} ${action.about} ${action.name}`.toLowerCase();
      return hay.includes(needle);
    }),
    recall,
  );
}
