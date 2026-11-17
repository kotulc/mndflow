/** **The header cards, chips and boxes share** (docs/design/card.md, chip.md): always two lines —
 *  the name, then a meta line (kind · ▶ presentations · counts · seats · tags) whose items drop
 *  whole, last first, where the width runs out — and the kind's square icon at the right, as tall
 *  as both lines. Worked out before it is drawn (views `facts.ts`); a header only draws it. */

import type { CSSProperties, ReactNode } from "react";
import type { FactsData } from "./facts";
import { Icon, known, role_icon } from "./icons";

export type HeaderProps = {
  /** The name as drawn: plain text, or the canvas's, which renames in place. */
  name: ReactNode;
  /** Its kind's word, first on the meta line; `hued` in its colour (a diagram's). */
  kind?: string;
  hued?: boolean;
  /** A definition, or a stand-in for one: badged on the meta line. */
  defines?: boolean;
  facts?: FactsData;
  /** The icon: its own, else its role's; lit where it holds parts. */
  role?: string;
  icon?: string;
  holds?: boolean;
};

export function Header({ name, kind, hued, defines, facts, role, icon, holds }: HeaderProps) {
  const worn = icon && known(icon) ? icon : role_icon(role);
  const seats = facts?.seats;
  return (
    <div className="mnd-header">
      <div className="mnd-header-text">
        {name}
        <div className="mnd-meta">
          {kind ? <span className={hued ? "mnd-meta-kind hued" : "mnd-meta-kind"}>{kind}</span>
            : null}
          {defines ? <span className="mnd-badge">definition</span> : null}
          {facts?.plays ? <span className="mnd-meta-plays">▶ {facts.plays}</span> : null}
          {facts?.counts.map((f) => <span key={f.word}>{f.n} {f.word}</span>)}
          {seats?.in ? <span className="mnd-meta-seat in">{seats.in} in</span> : null}
          {seats?.out ? <span className="mnd-meta-seat out">{seats.out} out</span> : null}
          {facts?.tags.map((t) => (
            <span key={t.id} className="mnd-meta-tag" data-family={t.tint["data-family"]}
                  style={(t.tint.style ?? {}) as CSSProperties}>{t.label}</span>
          ))}
        </div>
      </div>
      {role ? (
        <span className="mnd-header-icon" data-role={role} {...(holds ? { "data-holds": "" } : {})}>
          <Icon name={worn} size={24} />
        </span>
      ) : null}
    </div>
  );
}
