/** The list-of-types rule (docs/plan.md): candidates for what a selection
 *  could become, ranked by learned preference and capped to a readable
 *  number, cold start falling back to vocabulary order.
 *
 *  Reads the same overrule store `src/actions/rank.ts` reads for the rail's
 *  own ranking (`X.1`) — this is its second consumer, over retype's type
 *  vocabulary rather than the action list. Kept free of the component so
 *  `X.2` can lift it into `src/actions/` to serve the edge menu and the
 *  relation-types group without a rewrite: nothing here reaches into the
 *  strip, and nothing in the strip reaches past this module's exports. */

import { defsOf } from "../../../graph/fold";
import { note as noteOverrule, read as readOverrules } from "../../../actions/feedback";
import type { Picked } from "../../../actions";
import type { Graph } from "../../../graph/types";

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

/** Candidate types for the selection. An edge takes relation kinds — the
 *  page's package-and-project vocabulary where it hands one down as `kinds`
 *  (the canvas's existing, until-now-unused prop), the project's own
 *  otherwise. Anything else — block, group, note, port alike — takes the
 *  same element-form vocabulary; nothing here special-cases one form over
 *  another, which is what makes the strip universal rather than a
 *  relationship-only surface. */
export function candidatesFor(
  picked: Exclude<Picked, null>, graph: Graph,
  kinds?: { name: string; path: string }[],
): TypeCandidate[] {
  if (picked.kind === "edge") {
    return kinds?.length
      ? kinds.map((k) => ({ path: k.path, name: k.name }))
      : defsOf(graph, true).map((d) => ({ path: d.id, name: d.name }));
  }

  return defsOf(graph, false).map((d) => ({ path: d.id, name: d.name }));
}

/** Learned preference first, then the order candidates arrived in —
 *  vocabulary import order at cold start, since nothing has been picked yet
 *  to prefer over it. Stable sort keeps that order between ties. */
export function rankedTypes(candidates: TypeCandidate[], shape: string): TypeCandidate[] {
  const weights = new Map<string, number>();
  for (const hit of readOverrules()) {
    if (hit.shape === shape) weights.set(hit.chose, (weights.get(hit.chose) ?? 0) + 1);
  }

  return [...candidates].sort((a, b) => (weights.get(b.path) ?? 0) - (weights.get(a.path) ?? 0));
}

/** Record picking something other than what ranking put first — the same
 *  overrule shape `rank.ts` writes on the rail. Silently does nothing when
 *  the top pick was taken, since there is nothing to learn from that. */
export function noteTypePick(shape: string, chose: string, ranked: TypeCandidate[]): void {
  const top = ranked[0]?.path;
  if (top && top !== chose) noteOverrule({ chose, ranked: top, entry: "", shape });
}
