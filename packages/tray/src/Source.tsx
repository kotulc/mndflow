/** The card tab's left column: every key the card or line says, one line each — its own word
 *  where it says one, what it carries faint. **One key is lit**, and the choices column answers
 *  it; ↑ and ↓ move the light, Enter types into a lit line that takes text. */

import { useRef, type KeyboardEvent } from "react";
import { type Id } from "@mnd/core";
import { Entry } from "./Entry";
import type { Pair } from "./pairs";

export type SourceProps = { id: Id; pairs: Pair[]; lit: string; onLit: (key: string) => void };

export function Source({ id, pairs, lit, onLit }: SourceProps) {
  const held = useRef<HTMLDivElement>(null);

  /** The lit line, or what types into it. */
  const reach = (key: string) =>
    held.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`);

  /** Up and down step through the keys; Enter types into a lit line. */
  const keys = (e: KeyboardEvent) => {
    const at = pairs.findIndex((p) => p.key === lit);
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const step = e.key === "ArrowUp" ? -1 : 1;
      const to = pairs[Math.max(0, Math.min(pairs.length - 1, at + step))];
      if (!to) return;
      onLit(to.key);
      reach(to.key)?.focus();
    }
    if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "INPUT") {
      reach(lit)?.querySelector("input")?.focus();
    }
  };

  return (
    <div className="yaml" ref={held} onKeyDown={keys}>
      {pairs.map((p, i) => (
        <div key={p.key} className="entry">
          {/* A section's head, where its first key begins it. */}
          {p.under && p.under !== pairs[i - 1]?.under ? (
            <span className="section">{p.under}</span>
          ) : null}
          <div data-key={p.key} tabIndex={-1}
               className={["pair", p.under ? "under" : "", p.look ? "part" : "",
                           p.key === lit ? "lit" : "",
                           p.said ? "said" : ""].filter(Boolean).join(" ")}
               onClick={() => onLit(p.key)} onFocus={() => onLit(p.key)}>
            <span className="key">{p.word}</span>
            {p.text ? (
              <Entry key={`${id}-${p.key}`} value={p.text.value} label={p.word} blank
                     placeholder={p.text.placeholder}
                     {...(p.text.clash ? { clash: p.text.clash } : {})}
                     onCommit={p.text.commit} />
            ) : p.shown || !p.look ? <span className="value">{p.shown || "—"}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
