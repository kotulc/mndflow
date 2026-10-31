/** **A facts strip**, the one order on every form: what it counts, then its tags as solid dots
 *  in their colours, named beside the dot where the form has room (views `facts_of`). */

import type { CSSProperties } from "react";

/** What a strip says: counts and tags, each tag with the colour attributes it wears. */
export type FactsData = {
  counts: readonly { n: number; word: string }[];
  tags: readonly { id: string; label: string;
                   tint: { "data-family"?: string; style?: Record<string, string> } }[];
};

export function Facts({ facts, named = false }: { facts: FactsData; named?: boolean }) {
  return (
    <span className="mnd-facts">
      {facts.counts.map((f) => (
        <span key={f.word} className="mnd-fact"><b>{f.n}</b> {f.word}</span>
      ))}
      {facts.tags.map((t) => (
        <span key={t.id} className={named ? "mnd-fact-tag named" : "mnd-fact-tag"}
              data-family={t.tint["data-family"]} style={(t.tint.style ?? {}) as CSSProperties}
              aria-label={t.label}>{named ? t.label : null}</span>
      ))}
    </span>
  );
}
