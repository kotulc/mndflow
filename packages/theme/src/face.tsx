/** A card's face: the one drawing of a card, wherever one is drawn — the canvas, the tray, a host.
 *
 *  **Small**, it is the handle over the name, the icon and the marks. **Large**, it is the name,
 *  then its attributes as a ruled table — the name its title row, the card's border the table's —
 *  then its markdown, rendered. What it says, how wide each column is and how it is painted are
 *  worked out before it is drawn; a face only draws them, naming no graph. */

import { type ReactNode } from "react";
import { Icon, known, mark_icon, role_icon } from "./icons";
import { Markdown } from "./markdown";

/** Where the kind word sits. */
export type Kinded = "above" | "inside" | "below" | "none";

export type FaceProps = {
  /** What it is called, and the handle it wears over it where one is shown. */
  label: string;
  alias?: string;
  /** What sort of thing it is, as a word, and where that word sits. */
  kind: string;
  kinded: Kinded;
  /** The icon in its top corner: its own, else its role's. */
  role?: string;
  icon?: string;
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
  table?: { cells: readonly (readonly string[])[]; widths: readonly number[] };
  /** False where a large face is its markdown alone. */
  head?: boolean;
  /** The name as drawn, where a host draws it itself — the canvas's, which renames in place. */
  name?: ReactNode;
  title?: string;
  /** Whatever the host lays over the face: grips, seats, a border's targets. */
  children?: ReactNode;
};

export function CardFace({ label, alias, kind, kinded, role, icon, holds, stamps, classes = [],
                           dress = {}, text, table, head = true, name, title,
                           children }: FaceProps) {
  const large = text !== undefined;
  const named = !large || head;
  const ruled = large && !!table?.cells.length;
  const word = (where: string) => <span className={`${where} mnd-kind card-label`}>{kind}</span>;
  return (
    <div className={["mnd-card", "card-face", large ? "large" : "small", named ? "" : "headless",
                     ruled ? "tabled" : "", ...classes].filter(Boolean).join(" ")}
         {...dress} title={title ?? label}>
      {children}
      <Wears role={role} icon={icon} holds={holds} />
      <Stamps stamps={stamps} />
      {kinded === "above" ? word("mnd-over") : null}
      {alias && named ? <span className="mnd-alias">{alias}</span> : null}
      {named ? (
        <div className="mnd-head">
          <span className="mnd-named">
            {name ?? <span className="mnd-label card-name">{label}</span>}
          </span>
          {kinded === "inside" ? word("") : null}
        </div>
      ) : null}
      {ruled ? <Ruled cells={table!.cells} widths={table!.widths} /> : null}
      {large && text ? <Markdown className="mnd-face-body" text={text} /> : null}
      {kinded === "below" ? word("mnd-under") : null}
    </div>
  );
}

/** A large face's attributes, ruled: every column the width it was measured at, the last taking
 *  whatever room the card has over. A cell cut short says itself whole when pointed at. */
function Ruled({ cells, widths }: NonNullable<FaceProps["table"]>) {
  return (
    <table className="mnd-face-table">
      <colgroup>
        {widths.map((w, i) => <col key={i} style={i < widths.length - 1 ? { width: w } : {}} />)}
      </colgroup>
      <tbody>
        {cells.map((row, r) => (
          <tr key={r}>{row.map((cell, c) => <td key={c} title={cell}>{cell}</td>)}</tr>
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
