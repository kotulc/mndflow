/** The key to the open layer, in a corner of the canvas. */

import { legend_of, type Row, type Scene } from "@mnd/views";
import { Icon, known, mark_icon, role_icon } from "@mnd/theme";
import { dressed } from "./nodes";

/** Which right-hand corner it sits in. */
export type Corner = "top" | "bottom";

export type LegendProps = { scene: Scene; at?: Corner };

/** What the layer draws and what it means: its kinds above, the marks they wear below. Each half
 *  is dropped where the layer has none, so a plain drawing shows nothing at all. */
export function Legend({ scene, at = "top" }: LegendProps) {
  const { kinds, marks } = legend_of(scene);
  if (!kinds.length && !marks.length) return null;

  return (
    <aside className={`legend ${at}`} aria-label="legend">
      {kinds.length ? <ul>{kinds.map((r) => <Kind key={r.key} row={r} />)}</ul> : null}
      {kinds.length && marks.length ? <hr /> : null}
      {marks.length ? <ul>{marks.map((r) => <Stamp key={r.key} row={r} />)}</ul> : null}
    </aside>
  );
}

/** One kind: its icon in its own colour, and the word for it. **The icon carries the paint** —
 *  it is dressed as the card is, so a swatch beside it would only say the same thing twice. */
function Kind({ row }: { row: Row }) {
  const icon = row.look?.icon;
  const worn = icon && known(icon) ? icon : role_icon(row.role);
  return (
    <li title={`${row.count} on this layer`}>
      <span className="mark" {...(row.look ? dressed(row.look) : {})}>
        <Icon name={worn} size={12} />
      </span>
      <span className="word">{row.word}</span>
    </li>
  );
}

/** One system mark: the word a card stamps, with what it means as the tip rather than the row. */
function Stamp({ row }: { row: Row }) {
  const drawn = mark_icon(row.word);
  return (
    <li title={row.about ?? `${row.count} on this layer`}>
      <span className="mark stamp">{drawn ? <Icon name={drawn} size={12} /> : null}</span>
      <span className="word">{row.word}</span>
    </li>
  );
}
