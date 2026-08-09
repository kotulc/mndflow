/** Choosing what to ask next.
 *
 *  The conversation is a loop, not a script. Which question is asked depends on
 *  the domain driving the project and on what the selected object is still
 *  missing: one with no text is asked for some, one with parts to connect is
 *  asked how they connect, and anything else is asked what it contains.
 *
 *  Selecting in the explorer is how the user steers — it names the object every
 *  question is about. Nothing here decides what to change; only what to ask. */

import { blocksOf } from "../graph/fold";
import { best, FLOOR, phrasesOf, scoreAny, type Scored } from "../embed/match";
import type { Graph } from "../graph/types";
import * as workflows from "./workflows";

export const ENTRY = "entry";
export const FREEFORM = "freeform";
export const CREATE_IT = "+ create it";
const CHIP_LIMIT = 4;
/** Consecutive turns on one operation before the loop moves on. */
const RHYTHM = 2;

export type Question = {
  id: string;
  prompt: string;
  hint: string;
  choices: string[];
  placeholder: string;
};

/** Chosen once so the opening line does not change under the user. */
const GREETING = Math.floor(Math.random() * Math.max(workflows.entry.welcome.length, 1));

function pickOne(options: string[], seed: number): string {
  return options.length ? options[seed % options.length] : "";
}

export function entryQuestion(): Question {
  return {
    id: ENTRY,
    prompt: workflows.entry.welcome[GREETING] ?? "What are you building?",
    hint: workflows.entry.hint,
    choices: workflows.entry.templates.map((t) => t.chip),
    placeholder: workflows.entry.placeholder,
  };
}

/** Each domain as the separate phrases it can be recognised by: its chip, its
 *  description, and each tag. Scored one at a time with the best winning —
 *  joining them into one text averages the vector into vagueness. */
function templateOptions(): Record<string, string[]> {
  return Object.fromEntries(
    workflows.entry.templates.map((t) => [t.id, [t.chip, t.about, ...t.tags]]),
  );
}

/** Everything the catalogue can be recognised by, for warming the cache. */
export function templatePhrases(): string[] {
  return phrasesOf(templateOptions());
}

/** Every domain scored against what the user said, best first. Returned whole
 *  so the debug column can show what lost as well as what won. */
export function scoreTemplates(said: string): Scored[] {
  return scoreAny(said, templateOptions());
}

/** The domain an opening answer belongs to. A chip is taken at its word;
 *  anything else is scored, and a weak match falls to the catch-all rather
 *  than being guessed at. */
export function classify(said: string): string {
  const wanted = said.trim().toLowerCase();
  const exact = workflows.entry.templates.find((t) => t.chip.toLowerCase() === wanted);
  if (exact) return exact.id;

  return best(said, templateOptions(), FLOOR) || FREEFORM;
}

/** Whether an operation has anything to ask about at this selection. */
function eligible(operation: workflows.Operation, graph: Graph, scope: string | null): boolean {
  switch (operation.when) {
    case "no_summary":
      return scope !== null && !graph.elements[scope]?.body.trim();
    case "has_parts":
      return blocksOf(graph, scope).length > 1;
    default:
      return true;
  }
}

/** The operation to ask about next.
 *
 *  One that has filled the last few turns steps aside while anything else is
 *  eligible. Someone listing the parts of a system should be left to finish the
 *  list, then asked how the parts fit together — not made to alternate, and not
 *  asked the same thing forever. */
function pick(domain: workflows.Domain, graph: Graph, scope: string | null, recent: string[]) {
  const ordered = [
    ...workflows.operations.filter((o) => o.id === domain.lead),
    ...workflows.operations.filter((o) => o.id !== domain.lead),
  ];
  const ready = ordered.filter((o) => eligible(o, graph, scope));
  const worn = recent.length === RHYTHM && new Set(recent).size === 1 ? recent[0] : "";

  return ready.find((o) => o.id !== worn) ?? ready[0] ?? null;
}

/** Suggested answers: whatever the domain declares, and the objects already in
 *  view when the question is about connecting them. */
function chips(graph: Graph, scope: string | null, operation: string,
               wording: workflows.Wording): string[] {
  if (wording.choices.length || operation !== "relate") return wording.choices;

  const nearby = blocksOf(graph, scope);
  const pool = nearby.length ? nearby : Object.values(graph.elements);

  return pool.filter((n) => n.id !== scope).map((n) => n.label).slice(0, CHIP_LIMIT);
}

/** The next question: the opening one until a domain is chosen, then the loop
 *  over whichever object is selected. */
export function question(graph: Graph, scope: string | null, recent: string[]): Question | null {
  if (!graph.vocabulary) return entryQuestion();

  const domain = workflows.getDomain(graph.vocabulary);
  const operation = pick(domain, graph, scope, recent);
  const wording = operation && workflows.getWording(domain, operation.id, scope === null);
  if (!operation || !wording) return null;

  const label = (scope && graph.elements[scope]?.label) || "";
  const fill = (text: string) => text.replaceAll("{label}", label);

  return {
    id: operation.id,
    prompt: fill(pickOne(wording.prompt, recent.length + Object.keys(graph.elements).length)),
    hint: fill(wording.hint),
    choices: chips(graph, scope, operation.id, wording),
    placeholder: "",
  };
}
