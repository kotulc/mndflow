/** What the chips beside the terminal offer.
 *
 *  Idle, they are the workflow's own suggested answers. As soon as the user
 *  types they become graph operations on that text — make an object, make a
 *  group, relate to something that already exists — ranked by how close the
 *  text is to what is already there.
 *
 *  Every suggestion carries what it does, so the chip list is an action
 *  palette rather than a list of strings the caller has to interpret. */

import { childrenOf } from "./fold";
import { scoreAny } from "./match";
import type { Question } from "./router";
import type { Graph } from "./types";
import type { Terms } from "./workflows";

export type Suggestion = {
  key: string;
  label: string;
  /** What clicking it does. `value` is a label for answers, an id for links. */
  kind: "answer" | "add" | "group" | "link" | "open";
  value: string;
  /** Shown faded — an operation waiting for something to be typed. */
  hint?: boolean;
};

const LIMIT = 6;
/** How close typed text must be to an existing name to be worth offering. */
const FLOOR = 0.2;

/** Existing objects in the open layer whose names resemble what is typed. */
function matches(graph: Graph, view: string | null, draft: string) {
  const here = childrenOf(graph, view);
  const options = Object.fromEntries(here.map((n) => [n.id, [n.label]]));

  return scoreAny(draft, options).filter((hit) => hit.score >= FLOOR);
}

export function suggest(graph: Graph, question: Question | null, draft: string,
                        view: string | null, scope: string | null,
                        terms: Terms): Suggestion[] {
  const text = draft.trim();

  // Nothing typed: offer the question's own answers, or say what typing does.
  if (!text) {
    if (question?.choices.length) {
      return question.choices.map((choice) => ({
        key: choice,
        label: choice,
        kind: "answer" as const,
        value: choice,
      }));
    }

    return [
      { key: "h-node", label: `${terms.node}…`, kind: "add", value: "", hint: true },
      { key: "h-group", label: `${terms.group}…`, kind: "group", value: "", hint: true },
    ];
  }

  const near = matches(graph, view, text);
  const exact = near.find((hit) => graph.nodes[hit.id].label.toLowerCase() === text.toLowerCase());
  const answers = (question?.choices ?? [])
    .filter((choice) => choice.toLowerCase().includes(text.toLowerCase()))
    .map((choice) => ({ key: choice, label: choice, kind: "answer" as const, value: choice }));

  const making: Suggestion[] = exact
    ? []
    : [
        { key: "add", label: `${terms.node}: ${text}`, kind: "add", value: text },
        { key: "group", label: `${terms.group}: ${text}`, kind: "group", value: text },
      ];

  // Relating needs a near end, which is whatever is selected.
  const relating: Suggestion[] = near
    .filter((hit) => hit.id !== scope)
    .slice(0, 3)
    .map((hit) => ({
      key: `x-${hit.id}`,
      label: scope
        ? `${terms.relation}: ${graph.nodes[hit.id].label}`
        : graph.nodes[hit.id].label,
      kind: scope ? ("link" as const) : ("open" as const),
      value: hit.id,
    }));

  return [...answers, ...making, ...relating].slice(0, LIMIT);
}
