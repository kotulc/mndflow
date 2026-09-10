/** The drawing, and only the drawing.
 *
 *  **The one thing on the panel that is a picture rather than an answer**, so it
 *  is never a table. Five units by two, the same box and the same corner mark
 *  the canvas draws — a smaller sketch in a different shape would be a second
 *  drawing to learn rather than an answer to *what will this look like*.
 *
 *  **It paints itself from the theme's own card table**, the one the stage
 *  paints from: `card-face` and the two writings, and every `data-` attribute
 *  named the way `look_of` names it. A preview that painted itself differently
 *  from the card it previews would be worse than no preview. */

import { type CSSProperties } from "react";
import { Icon, known, type IconName } from "@mnd/theme";
import type { Field, FieldDef, Role } from "@mnd/core";

export type CardProps = {
  /** What it is called, and the number it wears where nobody has named it. */
  label: string;
  alias?: string;
  /** What sort of thing it is: the subtype where one is named, the base kind
   *  otherwise. Written or not according to `card.label`. */
  kind: string;
  /** What sort of thing it is, top right. */
  icon: IconName;
  role: Role | string;
  /** The other corner: what its vocabulary flags about it, drawn quietly. */
  mark?: string;
  /** The values the card is told to show, where it is told to show any. */
  fields: readonly (Field | FieldDef)[];
  shows: boolean;
  /** What it says for itself, and what it draws as. */
  said: (key: string, name: string) => unknown;
  now: (key: string, name: string, fallback: string) => string;
};

export function Card({ label, alias, kind, icon, role, mark, fields, shows,
                       said, now }: CardProps) {
  const tinted = said("style", "hue") !== undefined;
  const opacity = Number(now("style", "opacity", "1"));
  const sheer = opacity < 1;
  const at = now("card", "label", "none");
  const word = <span className="preview-kind card-label">{kind}</span>;

  return (
    <div className="preview">
      <div className="preview-card card-face"
           data-family={tinted ? "tint" : now("style", "family", "neutral")}
           style={{
             ...(tinted ? {
               "--card-h": now("style", "hue", "200"),
               "--card-c": `calc(var(--tint-ceiling) * ${now("style", "intensity", "0.65")})`,
             } : {}),
             ...(sheer ? { "--card-opacity": String(opacity) } : {}),
           } as CSSProperties}
           data-fill={now("style", "fill", "solid")}
           data-sheer={sheer ? "" : undefined}
           data-border-width={now("style", "border_width", "thin")}
           data-border-style={now("style", "border_style", "solid")}
           data-border-contrast={now("style", "border_contrast", "") || undefined}
           data-name-font={now("style", "name_font", "none")}
           data-name-weight={now("style", "name_weight", "normal")}
           data-name-contrast={now("style", "name_contrast", "") || undefined}
           data-label-font={now("style", "label_font", "none")}
           data-label-weight={now("style", "label_weight", "normal")}
           data-label-contrast={now("style", "label_contrast", "") || undefined}
           data-label={at}
           data-align={now("card", "align", "left")}>
        {at === "above" ? <span className="preview-over">{word}</span> : null}
        <span className="preview-role" data-role={role}>
          <Icon name={icon} size={11} />
        </span>
        {mark && known(mark)
          ? <span className="preview-mark"><Icon name={mark} size={11} /></span>
          : null}
        <div className="preview-head">
          <span className="preview-named">
            <span className="preview-label card-name">{label}</span>
            {alias ? <span className="preview-alias">{alias}</span> : null}
          </span>
          {at === "inside" ? word : null}
        </div>
        {shows && fields.length ? (
          <dl className="preview-fields">
            {fields.slice(0, 2).map((f) => (
              <div key={f.name}><dt>{f.name}</dt>
                <dd>{(f as Field).value ?? ""}</dd></div>
            ))}
          </dl>
        ) : null}
        {at === "below" ? <span className="preview-under">{word}</span> : null}
      </div>
    </div>
  );
}
