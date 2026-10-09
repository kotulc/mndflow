/** A card's face: the one drawing of a card, wherever one is drawn — the canvas, the tray, a host.
 *
 *  **Small**, it is the handle over the name, the icon and the marks. **Large**, it is the name
 *  and then its markdown, rendered. What it says and how it is painted are worked out before it
 *  is drawn; a face only draws them, naming no graph. */

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
  /** False where a large face is its markdown alone. */
  head?: boolean;
  /** The name as drawn, where a host draws it itself — the canvas's, which renames in place. */
  name?: ReactNode;
  title?: string;
  /** Whatever the host lays over the face: grips, seats, a border's targets. */
  children?: ReactNode;
};

export function CardFace({ label, alias, kind, kinded, role, icon, holds, stamps, classes = [],
                           dress = {}, text, head = true, name, title, children }: FaceProps) {
  const large = text !== undefined;
  const named = !large || head;
  const word = (where: string) => <span className={`${where} mnd-kind card-label`}>{kind}</span>;
  return (
    <div className={["mnd-card", "card-face", large ? "large" : "small", named ? "" : "headless",
                     ...classes].filter(Boolean).join(" ")}
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
      {large && text ? <Markdown className="mnd-face-body" text={text} /> : null}
      {kinded === "below" ? word("mnd-under") : null}
    </div>
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
