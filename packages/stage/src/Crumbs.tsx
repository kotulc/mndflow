/** Breadcrumb trail over the stage / viewer. */

import { Icon } from "@mnd/theme";
import type { Act } from "@mnd/core";
import type { Scene } from "@mnd/views";

export type CrumbsProps = {
  trail: Scene["trail"];
  /** `open` with an id goes to that layer; `open` alone goes up one. */
  onAct: Act;
};

/** How many crumbs a trail shows before its middle folds to an ellipsis, so the steps nearest the
 *  layer stay joined to the one they came from. */
const MOST = 6;

export function Crumbs({ trail, onAct }: CrumbsProps) {
  const shown = trail.length > MOST
    ? [trail[0]!, { id: "…", label: "…" }, ...trail.slice(2 - MOST)] : trail;
  return (
    <nav className="crumbs">
      {shown.map((t, i) => (
        <span key={t.id + i}>
          {i > 0 ? <b> / </b> : null}
          {t.id === "…"
            ? <span className="elided" title={trail.map((x) => x.label).join(" / ")}>…</span>
            : <button onClick={() => onAct("open", { id: t.id })}>{t.label}</button>}
        </span>
      ))}
      {trail.length > 1 ? <button className="up" title="up one layer"
                                  onClick={() => onAct("open")}><Icon name="up" /></button> : null}
    </nav>
  );
}
