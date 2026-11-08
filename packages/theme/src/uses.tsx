/** **Where a definition is used, and what a block holds**, as the hover card and the tray's
 *  overview both draw them (views `hover_of`): each place under its colour edge with the names of
 *  its uses, and the names a block holds. */

import type { CSSProperties } from "react";

/** One place a definition is used: its label, its colour and the names of its uses there. */
export type UsedPlace = { id: string; label: string; names: readonly string[];
                          tint: { "data-family"?: string; style?: Record<string, string> } };

/** Every place a definition is used, under a head counting them. */
export function UsedIn({ used }: { used: readonly UsedPlace[] }) {
  return (
    <section className="mnd-uses">
      <h4>used in · {used.length} {used.length === 1 ? "place" : "places"}</h4>
      {used.map((p) => (
        <div key={p.id} className="mnd-used-place" data-family={p.tint["data-family"]}
             style={(p.tint.style ?? {}) as CSSProperties}>
          <span>{p.label}</span>
          <Names names={p.names} />
        </div>
      ))}
    </section>
  );
}

/** What a block holds, by name. */
export function Holds({ holds }: { holds: readonly string[] }) {
  return (
    <section className="mnd-uses">
      <h4>holds</h4>
      <Names names={holds} />
    </section>
  );
}

/** Names as quiet boxes, wrapping. */
function Names({ names }: { names: readonly string[] }) {
  return (
    <span className="mnd-names">
      {names.map((n, i) => <span key={`${n}${i}`}>{n}</span>)}
    </span>
  );
}
