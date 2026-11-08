/** The key to the open layer, in a corner of the canvas. */

import type { CSSProperties } from "react";
import { legend_of, type Row, type Scene } from "@mnd/views";
import { Icon, known, mark_icon, role_icon } from "@mnd/theme";
import { face_attrs } from "@mnd/views";

/** Which right-hand corner it sits in. */
export type Corner = "top" | "bottom";

export type LegendProps = { scene: Scene; at?: Corner };

/** What the layer draws and what it means: its kinds, then its tags' colours in a section of
 *  their own, then the marks the cards wear. Each is dropped where the layer has none, so a plain
 *  drawing shows nothing at all. */
export function Legend({ scene, at = "top" }: LegendProps) {
  const { kinds, tags, marks } = legend_of(scene);
  const parts = [
    kinds.length ? <ul key="kinds">{kinds.map((r) => <Kind key={r.key} row={r} />)}</ul> : null,
    tags.length ? <ul key="tags">{tags.map((r) => <Tag key={r.key} row={r} />)}</ul> : null,
    marks.length ? <ul key="marks">{marks.map((r) => <Stamp key={r.key} row={r} />)}</ul> : null,
  ].filter(Boolean);
  if (!parts.length) return null;

  return (
    <aside className={`legend ${at}`} aria-label="legend">
      {parts.flatMap((p, i) => (i ? [<hr key={`hr${i}`} />, p] : [p]))}
    </aside>
  );
}

/** One tag: its solid dot in its colour, and its name. */
function Tag({ row }: { row: Row }) {
  return (
    <li title={`${row.count} on this layer`}>
      <span className="mark"><span className="mnd-fact-tag" data-family={row.tint?.["data-family"]}
                                   style={(row.tint?.style ?? {}) as CSSProperties} /></span>
      <span className="word">{row.word}</span>
    </li>
  );
}

/** One kind: its icon in its own colour, and the word for it. **The icon carries the paint** —
 *  it is dressed as the card is, so a swatch beside it would only say the same thing twice. */
function Kind({ row }: { row: Row }) {
  const icon = row.look?.icon;
  const worn = icon && known(icon) ? icon : role_icon(row.role);
  return (
    <li title={`${row.count} on this layer`}>
      <span className="mark" {...(row.look ? face_attrs(row.look) : {})}>
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
