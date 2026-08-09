/** What the chips beside the terminal offer.
 *
 *  Idle, they are the workflow's own suggested answers. As soon as the user
 *  types they become graph operations on that text — make an object, make a
 *  group, relate to something that already exists — ranked by how close the
 *  text is to what is already there.
 *
 *  Every suggestion carries what it does, so the chip list is an action
 *  palette rather than a list of strings the caller has to interpret. */

import { blocksOf } from "../graph/fold";
import { FLOOR, scoreAny } from "../embed/match";
import type { Question } from "./router";
import type { Graph } from "../graph/types";
import type { Terms } from "./workflows";

export type Suggestion = {
  key: string;
  label: string;
  /** What clicking it does. `value` is a label for answers, an id for links. */
  kind: "answer" | "add" | "link" | "open";
  value: string;
  /** How well this matches what is typed, for marking the likeliest. */
  score: number;
  /** Shown faded — an operation waiting for something to be typed. */
  hint?: boolean;
};

const LIMIT = 6;

/** Existing objects in the open layer whose names resemble what is typed. */
function matches(graph: Graph, view: string | null, draft: string) {
  const here = blocksOf(graph, view);
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
      // Nothing typed to score against, so the workflow's own order stands.
      return question.choices.map((choice, index) => ({
        key: choice,
        label: choice,
        kind: "answer" as const,
        value: choice,
        score: index === 0 ? 1 : 0,
      }));
    }

    return [
      { key: "h-node", label: `${terms.node}…`, kind: "add", value: "", score: 0, hint: true },
    ];
  }

  const near = matches(graph, view, text);
  const exact = near.find((hit) => graph.elements[hit.id].label.toLowerCase() === text.toLowerCase());
  const answers: Suggestion[] = (question?.choices ?? [])
    .filter((choice) => choice.toLowerCase().includes(text.toLowerCase()))
    .map((choice) => ({ key: choice, label: choice, kind: "answer" as const,
                        value: choice, score: 0.9 }));

  // Making something is what typing usually means, so it outranks a loose
  // resemblance to an existing name but not an outright answer.
  const making: Suggestion[] = exact
    ? []
    : [{ key: "add", label: `${terms.node}: ${text}`, kind: "add", value: text, score: 0.6 }];

  // Relating needs a near end, which is whatever is selected. Anything the
  // question already offers as an answer is left out — the same name twice in
  // the list is noise, whatever the two chips would each do.
  const offered = new Set(answers.map((a) => a.label.toLowerCase()));
  const relating: Suggestion[] = near
    .filter((hit) => hit.id !== scope && !offered.has(graph.elements[hit.id].label.toLowerCase()))
    .slice(0, 3)
    .map((hit) => ({
      key: `x-${hit.id}`,
      label: scope
        ? `${terms.relation}: ${graph.elements[hit.id].label}`
        : graph.elements[hit.id].label,
      kind: scope ? ("link" as const) : ("open" as const),
      value: hit.id,
      score: hit.score,
    }));

  return [...answers, ...making, ...relating].slice(0, LIMIT);
}

/** Which suggestion to put forward as the likely one. */
export function likeliest(chips: Suggestion[]): string {
  const real = chips.filter((chip) => !chip.hint);
  if (!real.length) return "";

  return real.reduce((best, chip) => (chip.score > best.score ? chip : best)).key;
}
