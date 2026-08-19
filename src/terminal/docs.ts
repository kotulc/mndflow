/** Documentation for the rail, keyed by definitions.md terms.
 *
 *  The copy lives in `samples/docs.json` — hand-authored, small on purpose,
 *  and never generated from the markdown. Expanded mode surfaces the one entry
 *  that matches the current situation; collapsed ranks actions and may append
 *  a single keyword hit, always last, never displacing something actionable. */

import type { Context } from "../actions";
import { shape_of } from "../actions/feedback";

/** Bundled at build time the same way workflows YAML is — no runtime fetch. */
const pack = import.meta.glob("../../samples/docs.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

function as_docs(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, text] of Object.entries(value as Record<string, unknown>)) {
    if (typeof text === "string" && text.trim()) out[key] = text.trim();
  }
  return out;
}

const DOCS = as_docs(Object.values(pack)[0]);

/** Situation shape → the definitions.md term that names it. */
const TERM: Record<string, string> = {
  project: "project",
  layer: "layer",
  element: "element",
  block: "block",
  note: "note",
  group: "group",
  proxy: "proxy",
  interface: "interface",
  edge: "relationship",
  attr: "field",
};

export type DocHit = {
  term: string;
  text: string;
};

/** One gloss for what is in front of you, or null when nothing is authored. */
export function doc_for(ctx: Context): string | null {
  const term = TERM[shape_of(ctx)];
  if (!term) return null;
  const text = DOCS[term];
  if (!text) return null;
  return `${term} — ${text}`;
}

/** Best keyword match for typed text against `docs.json` keys.
 *  Exact beats containing the key; a short prefix only completes a key.
 *  Idle and no match both return null — at most one hit, never guessed. */
export function doc_hit(draft: string): DocHit | null {
  const needle = draft.trim().toLowerCase();
  if (!needle) return null;

  let best: { term: string; text: string; score: number } | null = null;
  for (const [term, text] of Object.entries(DOCS)) {
    const key = term.toLowerCase();
    let score = 0;
    if (needle === key) score = 3;
    else if (needle.includes(key)) score = 2;
    else if (needle.length >= 2 && key.startsWith(needle)) score = 1;
    else continue;

    if (
      !best
      || score > best.score
      || (score === best.score && key.length > best.term.length)
      || (score === best.score && key.length === best.term.length
        && key < best.term)
    ) {
      best = { term, text, score };
    }
  }
  return best ? { term: best.term, text: best.text } : null;
}
