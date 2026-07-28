/** Scoring text against a fixed set of options.
 *
 *  This is the seam the whole suggestion system sits on: templates, chips, and
 *  near-miss names all come down to "which of these known options is this text
 *  closest to". Choosing among known options is a similarity problem, not a
 *  generation one, which is why nothing here calls a language model.
 *
 *  Similarity is the cosine between sentence embeddings, so `Invoices` and
 *  `Billing` are close despite sharing no letters. Anything not embedded yet
 *  scores 0 and improves on a later render — see `embed`. */

import { cosine, vector } from "./embed";

/** Below this two things are unrelated rather than faintly related. Measured
 *  against MiniLM: unrelated short phrases land at 0.10–0.20, and a real match
 *  at 0.27 upwards. */
export const FLOOR = 0.24;

export function similarity(left: string, right: string): number {
  const a = vector(left);
  const b = vector(right);
  if (!a || !b) return 0;

  return Math.max(0, cosine(a, b));
}

export type Scored = { id: string; score: number };

/** Every option scored against the text, best first. Options map an id to the
 *  words describing it. Zero scores are kept so a debug view can show what
 *  lost as well as what won. */
export function score(text: string, options: Record<string, string>): Scored[] {
  return Object.entries(options)
    .map(([id, about]) => ({ id, score: similarity(text, about) }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

/** Scored against the closest single phrase of each option, rather than all of
 *  them joined. A long tag list otherwise dilutes every match: the more words
 *  an option is described by, the vaguer its single vector becomes. */
export function scoreAny(text: string, options: Record<string, string[]>): Scored[] {
  return Object.entries(options)
    .map(([id, phrases]) => ({
      id,
      score: Math.max(0, ...phrases.map((phrase) => similarity(text, phrase))),
    }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

/** Best match above a floor, or "" when nothing is close enough. Not guessing
 *  is always an option — the caller has a fallback and the user has eyes. */
export function best(text: string, options: Record<string, string[]>, floor = FLOOR): string {
  const [top] = scoreAny(text, options);

  return top && top.score >= floor ? top.id : "";
}

/** Every phrase these options are recognised by, for warming the cache. */
export function phrasesOf(options: Record<string, string[]>): string[] {
  return Object.values(options).flat();
}
