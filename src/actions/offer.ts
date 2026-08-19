/** The offered-action list.
 *
 *  One set of what the selection can do in the current context — the same
 *  list for the menu and the rail; only the presentation differs. Order is
 *  never this module's: the menu fixes it, the rail learns preference for
 *  that context (Z.3).
 *
 *  Ranks over the action registry and lives beside it, so the rail can be
 *  removed without taking the menu (S6.3). Adjustments stay off the set
 *  through `when`; `check` is not consulted here, because it needs arguments
 *  nobody has filled yet. */

import { all, inScope, type Action, type Context } from "./index";

/** Everything worth showing against this context. Membership only — a caller
 *  that needs a stable order sorts after it takes the list. */
export function offer(ctx: Context): Action[] {
  return all().filter((action) => inScope(action.scope, ctx) && (action.when?.(ctx) ?? true));
}
