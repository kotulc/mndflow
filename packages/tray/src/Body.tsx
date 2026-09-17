/** The tray's one body pattern. */

import type { ReactNode } from "react";

export type BodyProps = {
  /** What the whole block is about, where it needs saying. */
  head?: ReactNode;
  /** Said to the right of the head, quietly — a count, or where it came from. */
  note?: ReactNode;
  children: ReactNode;
};

/** A banded run of lines, optionally under a head. */
export function Body({ head, note, children }: BodyProps) {
  return (
    <div className="rows">
      {head ? <Band label={head}>{note ? <span className="from">{note}</span> : null}</Band> : null}
      {children}
    </div>
  );
}

export type BandProps = { label?: ReactNode; children?: ReactNode };

/** A section head, drawn the way a table draws its column heads. */
export function Band({ label, children }: BandProps) {
  return (
    <div className="rail">
      {label ? <h5>{label}</h5> : null}
      {children}
    </div>
  );
}

export type RailProps = {
  /** What the rail is a rail of. Absent draws no word. */
  label?: ReactNode;
  /** The chips, in the order they read. */
  of: readonly { key: string; word: string; said?: boolean }[];
  on: string;
  onPick: (key: string) => void;
};

/** A rail narrows what is listed; it does not navigate. */
export function Rail({ label, of, on, onPick }: RailProps) {
  return (
    <Band label={label}>
      <div className="filters">
        {of.map((c) => (
          <button key={c.key} className={[on === c.key ? "on" : "", c.said ? "said" : ""]
                    .filter(Boolean).join(" ")}
                  onClick={() => onPick(c.key)}>{c.word}</button>
        ))}
      </div>
    </Band>
  );
}

export type LineProps = {
  /** The word in the left gutter. One question per row, so it is a word and not a sentence. */
  label: ReactNode;
  /** What the row is asking, in full, on hover. */
  tip?: string;
  /** Drawn as unreachable, not merely unset. */
  off?: boolean;
  className?: string;
  children: ReactNode;
};

/** One line: the label, then whatever answers it. */
export function Line({ label, tip, off, className, children }: LineProps) {
  return (
    <div className={["row", className].filter(Boolean).join(" ")}
         title={tip} aria-disabled={off || undefined}>
      <label>{label}</label>
      <span className="line">{children}</span>
    </div>
  );
}
