/** Breadcrumb trail over the stage / viewer. */

import { Icon } from "@mnd/theme";
import type { Act } from "@mnd/core";
import type { Scene } from "@mnd/views";

export type CrumbsProps = {
  trail: Scene["trail"];
  /** The view the canvas draws in, named after the trail. */
  view?: string;
  /** `open` with an id goes to that layer; `open` alone goes up one. */
  onAct: Act;
};

/** Every step of the trail, joined to the one it came from: none is ever folded away. Where the
 *  trail runs long, the outer steps' labels shorten first and the layer's own keeps its room. */
export function Crumbs({ trail, view, onAct }: CrumbsProps) {
  return (
    <nav className="crumbs">
      {trail.map((t, i) => (
        <span key={t.id + i}>
          {i > 0 ? <b> / </b> : null}
          <button title={t.label} onClick={() => onAct("open", { id: t.id })}>{t.label}</button>
        </span>
      ))}
      {view ? <i className="as">{view}</i> : null}
      {trail.length ? <button className="up" title="up one layer"
                                  onClick={() => onAct("open")}><Icon name="up" /></button> : null}
    </nav>
  );
}
