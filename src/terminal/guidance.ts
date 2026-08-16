/** Expanded-rail guidance: soft tips beside the next question.
 *
 *  The question itself is chosen by `router` / `loop`. Collapsed asks nothing
 *  and ranks instead; this module only speaks when the rail is open. One tip
 *  at a time — a list of reminders is a second prompt. */

import { blocksOf } from "../graph/fold";
import { ROOT, type Graph } from "../graph/types";
import type { Question } from "./router";
import { ENTRY } from "./router";

/** Tips for the open rail. Empty when the question's own hint is enough. */
export function nudges(
  graph: Graph,
  scope: string | null,
  question: Question | null,
): string[] {
  if (!question) {
    return ["Select something in the explorer — questions follow what you pick."];
  }

  // Entry and disambiguation already carry their own hint / choices.
  if (question.id === ENTRY || question.id === "disambiguate") return [];

  // Root layer is `parent: null` (fold's heldParent), not the ROOT id string.
  const at_root = scope == null || scope === ROOT;
  if (at_root && blocksOf(graph, null).length > 0) {
    return ["Select a block in the explorer to ask about that one."];
  }

  return [];
}
