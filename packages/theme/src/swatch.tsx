/** **A relation's swatch**: a short stroke in its colour and dash, worn where an icon would be —
 *  by a relation definition's explorer row, header and well cell alike (views `about.ts`
 *  `swatch_of`). */

import type { CSSProperties } from "react";

/** The attributes a swatch is painted by: its colour family, its dash, its colour variables. */
export type SwatchAttrs = { "data-family"?: string; "data-border-style"?: string;
                            style?: Record<string, string> };

/** A swatch, with its own class beside the shared one. */
export function Swatch({ className, style, ...attrs }: SwatchAttrs & { className?: string }) {
  return <i className={className ? `swatch ${className}` : "swatch"} {...attrs}
            style={style as CSSProperties} />;
}
