/** The list-of-types rule (docs/plan.md): candidates for what a selection
 *  could become, ranked by learned preference and capped to a readable
 *  number, cold start falling back to vocabulary order.
 *
 *  **One list, and every surface that offers types reads it** (`X.2`) — the
 *  strip, and whatever else comes to ask. It lives beside `offer()` for the
 *  reason the action ranking does (`X.1`): a list ranked by preference cannot
 *  depend on the rail, and a component is not a home for something three
 *  surfaces share.
 *
 *  **It never gathers a vocabulary of its own.** `actions/` reads `graph` and
 *  `geometry` and nothing else, so the package chain is handed in by whoever
 *  has it — the page — and the project's own definitions are the fallback.
 *  Weighting is `feedback.weights`, the one place the overrule store is
 *  counted, shared with the action ranking rather than copied. */

import { defsOf } from "../graph/fold";
import { note as noteOverrule, weights as shapeWeights } from "./feedback";
import type { Picked } from "./index";
import type { Graph } from "../graph/types";

export type TypeCandidate = { path: string; name: string };

/** Top three, shown before a "More…" entry expands the same list in full. */
export const TYPE_CAP = 3;

/** The situation a preference is weighted per — a relationship, or the kind
 *  of element. `retype:`-prefixed so it never shares a bucket with an
 *  action-ranking shape (`feedback.shape_of`) even though both read the same
 *  store: an overrule here is a type choice, not an action choice. */
export function shapeOf(picked: Exclude<Picked, null>, graph: Graph): string {
  if (picked.kind === "edge") return "retype:edge";
  const node = graph.elements[picked.id];
  return `retype:${node?.side != null ? "interface" : node?.form ?? "element"}`;
}

/** What a surface can hand down as the vocabulary in scope — packages this
 *  project imports and then its own, which only the page can gather. Either
 *  half absent falls back to the project's own definitions. */
export type Vocabulary = {
  relations?: TypeCandidate[];
  elements?: TypeCandidate[];
};

/** Candidate types for the selection. An edge takes relation kinds and
 *  anything else — block, group, note, port alike — takes the element-form
 *  ones; nothing here special-cases one form over another, which is what
 *  makes the strip universal rather than a relationship-only surface.
 *
 *  Both halves come from the handed-down vocabulary when there is one, so a
 *  package's stereotypes are offered rather than only the project's own —
 *  the gap `R.9` landed short on. */
export function candidatesFor(
  picked: Exclude<Picked, null>, graph: Graph, scope?: Vocabulary,
): TypeCandidate[] {
  const own = (edges: boolean) =>
    defsOf(graph, edges).map((d) => ({ path: d.id, name: d.name }));
  const held = picked.kind === "edge" ? scope?.relations : scope?.elements;

  return held?.length ? held : own(picked.kind === "edge");
}

/** Learned preference first, then the order candidates arrived in —
 *  vocabulary import order at cold start, since nothing has been picked yet
 *  to prefer over it. Stable sort keeps that order between ties. */
export function rankedTypes(candidates: TypeCandidate[], shape: string): TypeCandidate[] {
  const weights = shapeWeights(shape);

  return [...candidates].sort((a, b) => (weights.get(b.path) ?? 0) - (weights.get(a.path) ?? 0));
}

/** Record picking something other than what ranking put first — the same
 *  overrule shape `rank.ts` writes on the rail. Silently does nothing when
 *  the top pick was taken, since there is nothing to learn from that. */
export function noteTypePick(shape: string, chose: string, ranked: TypeCandidate[]): void {
  const top = ranked[0]?.path;
  if (top && top !== chose) noteOverrule({ chose, ranked: top, entry: "", shape });
}
