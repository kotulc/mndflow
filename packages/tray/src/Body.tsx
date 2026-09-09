/** The tray's one body pattern.
 *
 *  **A label on the left, its content on the right, banded down the page.** The
 *  contents tab had it and nothing else did, so every other surface invented a
 *  layout — and the definition panel ended up with a tab strip inside a tab,
 *  which is two levels of navigation to reach one property.
 *
 *  **Column labels are optional and most bodies have none.** A describe row is
 *  a question and its answer, so the left gutter already names the column;
 *  contents keeps real headers because it has real columns.
 *
 *  Pure and stateless: it holds nothing and says nothing, which is what lets
 *  the same two elements draw a picker, a slider, a chip rail and a value. */

import type { ReactNode } from "react";

export type BodyProps = {
  /** What the whole block is about, where it needs saying. Absent draws no head. */
  head?: ReactNode;
  /** Said to the right of the head, quietly — a count, or where it came from. */
  note?: ReactNode;
  children: ReactNode;
};

/** A banded run of lines, optionally under a head. */
export function Body({ head, note, children }: BodyProps) {
  return (
    <div className="rows">
      {head ? <h4>{head}{note ? <span className="from">{note}</span> : null}</h4> : null}
      {children}
    </div>
  );
}

export type LineProps = {
  /** The word in the left gutter. **One question per row**, so it is a word and
   *  not a sentence. */
  label: ReactNode;
  /** What the row is asking, in full, on hover. */
  tip?: string;
  /** Drawn as unreachable rather than merely losing: a control that highlights
   *  and changes nothing is worse than one that is plainly out. */
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
