/** The run, and only the run. */

import { type CSSProperties } from "react";
import { head_url, Heads } from "@mnd/theme";

/** How long the run is drawn, and how much air is left round it. */
const RUN = { w: 188, h: 34, y: 22 };

/** The seat each end is drawn as: a filled square for an anchor on a border. */
const SEAT = 7;

export type WireProps = {
  /** What the relationship is called, as the run writes it. */
  label: string;
  alias?: string;
  /** What it says for itself, and what it draws as. */
  said: (key: string, name: string) => unknown;
  now: (key: string, name: string, fallback: string) => string;
};

/** The dash a stroke style is drawn with. */
const DASH: Record<string, string | undefined> = {
  dashed: "5 4", dotted: "0 3.5", solid: undefined, double: undefined, none: undefined,
};

export function Wire({ label, alias, said, now }: WireProps) {
  const tinted = said("style", "hue") !== undefined;
  const style = now("style", "border_style", "solid");
  const width = now("style", "border_width", "thin");
  const middle = [label, alias].filter(Boolean).join(" ");
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
          {/* The ends drawn as seats on a border. */}
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
      </div>
    </div>
  );
}
