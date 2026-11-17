/** A card's face: the one drawing of a card, wherever one is drawn — the canvas, the tray, a host.
 *
 *  **The header** leads every face (`header.tsx`, shared with chips and boxes): the name over its
 *  meta line, the kind's icon at the right. **Large**, the face goes on to its attributes as a
 *  ruled table — the card's border the table's — then its markdown, rendered. What it says, how
 *  wide each column is and how it is painted are worked out before it is drawn; a face only draws
 *  them, naming no graph. */

import { type CSSProperties, type ReactNode } from "react";
import type { FactsData } from "./facts";
import { Header } from "./header";
import type { SwatchAttrs } from "./swatch";
import { Icon, known, mark_icon, role_icon } from "./icons";
import { Markdown } from "./markdown";

export type FaceProps = {
  /** What it is called, then what sort of thing it is (with its handle while unnamed). */
  label: string;
  kind?: string;
  /** A definition, or a stand-in for one: outlined, and badged in its colour by its name. */
  defines?: boolean;
  /** The meta line's counts, seats and tags, where a host hands them. */
  facts?: FactsData;
  /** The icon in its top corner: its own, else its role's. */
  role?: string;
  icon?: string;
  /** A relation definition's swatch, worn in place of its icon. */
  swatch?: SwatchAttrs;
  /** Whether it holds blocks, which lights its icon. */
  holds?: boolean;
  /** The system marks in its bottom corner. */
  stamps?: readonly string[];
  /** Everything true of it, as classes. */
  classes?: readonly string[];
  /** How it is painted, as the attributes the card table reads. */
  dress?: Record<string, unknown>;
  /** The large face's markdown. Absent, the face is small. */
  text?: string;
  /** The large face's attributes: each row's cells, and each column's width in pixels. */
  table?: { cells: readonly (readonly string[])[]; widths: readonly number[]; split?: number };
  /** False where a large face is its markdown alone. */
  head?: boolean;
  /** The whole lines the large face's body holds, where it is cut short. */
  clamp?: number;
  /** The name as drawn, where a host draws it itself — the canvas's, which renames in place. */
  name?: ReactNode;
  title?: string;
  /** Whatever the host lays over the face: grips, seats, a border's targets. */
  children?: ReactNode;
  /** Members lit from a list beside the card: each table row naming one lights. */
  lit?: readonly string[];
};

export function CardFace({ label, kind, defines, facts, role, icon, swatch, holds, stamps,
                           classes = [],
                           dress = {}, text, table, head = true, clamp, name, title,
                           children, lit }: FaceProps) {
  const large = text !== undefined;
  const named = !large || head;
  const ruled = large && !!table?.cells.length;
  return (
    <div className={["mnd-card", "card-face", large ? "large" : "small", named ? "" : "headless",
                     ruled ? "tabled" : "", defines ? "definition" : "", ...classes]
                      .filter(Boolean).join(" ")}
         {...dress} title={title ?? label}>
      {children}
      <Stamps stamps={stamps} />
      {named ? (
        <Header name={name ?? <span className="mnd-label card-name">{label}</span>}
                {...(kind ? { kind } : {})} {...(defines ? { defines } : {})}
                {...(facts ? { facts } : {})} {...(role ? { role } : {})}
                {...(icon ? { icon } : {})} {...(holds ? { holds } : {})}
                {...(swatch ? { swatch } : {})} />
      ) : null}
      {ruled ? <Ruled {...table!} {...(lit?.length ? { lit } : {})} /> : null}
      {large && text ? <Markdown className={`mnd-face-body${clamp ? " clamped" : ""}`} text={text}
                                 {...(clamp ? { style: { "--body-lines": clamp } as CSSProperties }
                                   : {})} /> : null}
    </div>
  );
}

/** A large face's attributes, ruled: every column the width it was measured at, the last taking
 *  whatever room the card has over. A cell cut short says itself whole when pointed at. */
function Ruled({ cells, widths, split, lit = [] }: NonNullable<FaceProps["table"]>
                                                 & { lit?: readonly string[] }) {
  return (
    <table className="mnd-face-table">
      <colgroup>
        {widths.map((w, i) => <col key={i} style={i < widths.length - 1 ? { width: w } : {}} />)}
      </colgroup>
      <tbody>
        {cells.map((row, r) => (
          <tr key={r} className={[r === split ? "mnd-split" : "",
                                  row.some((c) => lit.some((l) => c === l || c.startsWith(`${l}:`)))
                                    ? "lit" : ""].filter(Boolean).join(" ") || undefined}>
            {row.map((cell, c) => <td key={c} title={cell}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The icon in a card's top corner: what sort of thing it is, or the one somebody set instead.
 *  **A card that holds parts lights it** — the colour, and not a second mark, says so. */
export function Wears({ role, icon, holds }: { role?: string; icon?: string; holds?: boolean }) {
  if (!role) return null;
  const worn = icon && known(icon) ? icon : role_icon(role);
  return (
    <span className="mnd-role" data-role={role} {...(holds ? { "data-holds": "" } : {})}>
      <Icon name={worn} size={11} />
    </span>
  );
}

/** The system marks in a card's bottom corner, each drawn as its icon. */
export function Stamps({ stamps }: { stamps?: readonly string[] }) {
  const drawn = (stamps ?? []).filter((mark) => mark_icon(mark));
  if (!drawn.length) return null;
  return (
    <span className="mnd-marks">
      {drawn.map((mark) => (
        <span key={mark} className="mnd-mark" data-mark={mark}>
          <Icon name={mark_icon(mark)!} size={13} />
        </span>
      ))}
    </span>
  );
}
