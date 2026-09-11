/** The run, and only the run.
 *
 *  **`Card`'s sibling, built the same way.** A short run between two ends, each
 *  drawn as the anchor or the port it is, the heads the `line` component names,
 *  the relationship's own name in the middle and whatever it says at each end.
 *
 *  **It paints itself from the theme's own card table**, the one the stage
 *  paints from: `style` is shared across a block, an interface and a line, so
 *  every `data-` attribute below is named the way `look_of` names it. A preview
 *  that painted itself differently from the run it previews would be worse than
 *  no preview. */

import { type CSSProperties } from "react";
import { head_url, Heads } from "@mnd/theme";

/** How long the run is drawn, and how much air is left round it. Two ends and a
 *  name in the middle need the width; the height is what one line of writing
 *  above the run takes. */
const RUN = { w: 188, h: 34, y: 22 };

/** The seat each end is drawn as: a filled square for an anchor on a border. */
const SEAT = 7;

export type WireProps = {
  /** What the relationship is called, as the run writes it. */
  label: string;
  alias?: string;
  /** What it says at each end and in the middle, as the values would read. */
  from?: string;
  to?: string;
  shows?: string;
  /** What it says for itself, and what it draws as. */
  said: (key: string, name: string) => unknown;
  now: (key: string, name: string, fallback: string) => string;
};

/** The dash a stroke style is drawn with. **Four, and `double` is two strokes**
 *  rather than a dash — drawn as a wide run with the ground back through it,
 *  exactly as the canvas draws one. */
const DASH: Record<string, string | undefined> = {
  dashed: "5 4", dotted: "0 3.5", solid: undefined, double: undefined, none: undefined,
};

export function Wire({ label, alias, from, to, shows, said, now }: WireProps) {
  const tinted = said("style", "hue") !== undefined;
  const style = now("style", "border_style", "solid");
  const width = now("style", "border_width", "thin");
  const middle = [label, alias, shows].filter(Boolean).join(" ");
  const y = RUN.y;

  return (
    <div className="preview">
      <div className="preview-wire"
           data-family={tinted ? "tint" : now("style", "family", "neutral")}
           style={{
             ...(tinted ? {
               "--card-h": now("style", "hue", "200"),
               "--card-c": `calc(var(--tint-ceiling) * ${now("style", "intensity", "0.65")})`,
             } : {}),
             opacity: Number(now("style", "opacity", "1")),
           } as CSSProperties}
           data-border-width={width}
           data-border-style={style}
           data-border-contrast={now("style", "border_contrast", "") || undefined}
           data-name-font={now("style", "name_font", "none")}
           data-name-weight={now("style", "name_weight", "normal")}
           data-name-contrast={now("style", "name_contrast", "") || undefined}>
        <span className="preview-wire-name card-name">{middle}</span>
        <svg className="preview-run" width={RUN.w} height={RUN.h}
             viewBox={`0 0 ${RUN.w} ${RUN.h}`} aria-hidden="true">
          <Heads id="tray" />
          {/* **The two ends are seats on a border**, which is what a run meets
              wherever it ends — so the preview draws the join rather than the
              cards, which are not what these controls are about. */}
          <rect className="preview-seat" x={0} y={y - SEAT / 2} width={SEAT / 2} height={SEAT} />
          <rect className="preview-seat" x={RUN.w - SEAT / 2} y={y - SEAT / 2}
                width={SEAT / 2} height={SEAT} />
          <line className="preview-line" x1={SEAT} y1={y} x2={RUN.w - SEAT} y2={y}
                strokeDasharray={DASH[style]}
                markerStart={head_url(now("line", "from_arrow", "none"), "tray")}
                markerEnd={head_url(now("line", "to_arrow", "none"), "tray")} />
          {style === "double"
            ? <line className="preview-line core" x1={SEAT} y1={y} x2={RUN.w - SEAT} y2={y} />
            : null}
        </svg>
        {from ? <span className="preview-wire-end from card-name">{from}</span> : null}
        {to ? <span className="preview-wire-end to card-name">{to}</span> : null}
      </div>
    </div>
  );
}
