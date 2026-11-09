/** **A facts strip**, the one order on every form: what it counts — or what it answers — then
 *  its tags as solid dots in their colours, named beside the dot where the form has room (views
 *  `facts_of`). */

import type { CSSProperties } from "react";

/** What a strip says: counts and tags, each tag with the colour attributes it wears. */
export type FactsData = {
  counts: readonly { n: number; word: string }[];
  /** What it answers, a chip of parts' in place of its counts: each attribute and its value. */
  answers?: readonly { name: string; value: string }[];
  tags: readonly { id: string; label: string;
                   tint: { "data-family"?: string; style?: Record<string, string> } }[];
};

/** How much more each later tag shrinks than the one before it. */
const SHRINK = 1e6;

/** A strip; `named` names every tag, else each is named only where the line has room. */
export function Facts({ facts, named = false }: { facts: FactsData; named?: boolean }) {
  return (
    <span className="mnd-facts">
      {facts.counts.map((f) => (
        <span key={f.word} className="mnd-fact"><b>{f.n}</b> {f.word}</span>
      ))}
      {facts.answers?.map((a) => (
        <span key={a.name} className="mnd-fact">{a.name} <b>{a.value}</b></span>
      ))}
      {facts.tags.length ? (
        <span className={named ? "mnd-fact-tags named" : "mnd-fact-tags"}
              style={{ "--n": facts.tags.length } as CSSProperties}>
          {facts.tags.map((t, i) => (
            /** The last tags give up their names first, so the first keep theirs: shrink is
             *  shared by weight, so each later tag outweighs the one before it a millionfold,
             *  leaving the earlier one's share under a layout unit. */
            <span key={t.id} className="mnd-fact-tag" data-family={t.tint["data-family"]}
                  style={{ ...(t.tint.style ?? {}),
                           flexShrink: SHRINK ** Math.min(i, 5) } as CSSProperties}
                  aria-label={t.label}><span>{t.label}</span></span>
          ))}
        </span>
      ) : null}
    </span>
  );
}
