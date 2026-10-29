/** **A block's facts strip**, on its chip and on its hover card alike: what it counts, the seats it
 *  wears — in and out — and its tags as dots in their colours (views `facts_of`). */

import type { CSSProperties } from "react";
import type { Facts as Read } from "@mnd/views";

export function Facts({ facts }: { facts: Read }) {
  return (
    <span className="mnd-facts">
      {facts.counts.map((f) => (
        <span key={f.word} className="mnd-fact"><b>{f.n}</b> {f.word}</span>
      ))}
      {facts.ports.map((p, i) => (
        <span key={`${p.name}${i}`} className={`mnd-fact-port ${p.flow}`}>{p.name}</span>
      ))}
      {facts.tags.map((t) => (
        <span key={t.id} className="mnd-fact-tag" data-family={t.tint["data-family"]}
              style={(t.tint.style ?? {}) as CSSProperties} aria-label={t.label} />
      ))}
    </span>
  );
}
