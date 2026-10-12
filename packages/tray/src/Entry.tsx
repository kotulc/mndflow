/** A name box, committed when it is left — never per keystroke. */

import { useState } from "react";

export type EntryProps = {
  value: string;
  label: string;
  placeholder?: string;
  /** Why this name may not be kept, or null. */
  clash?: (to: string) => string | null;
  /** Whether an empty box is an answer, as a value is and a name is not. */
  blank?: boolean;
  /** Nothing to answer yet, because something this depends on is unset. */
  disabled?: boolean;
  /** The suggestions it offers, by the id of a list on the page. */
  list?: string;
  onCommit: (to: string) => void;
};

export function Entry({ value, label, placeholder, clash, blank, disabled, list,
                        onCommit }: EntryProps) {
  /** Null while nothing is being typed, so a value changed elsewhere shows. */
  const [draft, set_draft] = useState<string | null>(null);
  const said = (draft ?? value).trim();
  const warn = draft !== null && said !== value ? clash?.(said) ?? null : null;

  return (
    <>
      <input value={draft ?? value} aria-label={label} placeholder={placeholder}
             disabled={disabled} list={list}
             onClick={(e) => e.stopPropagation()}
             onChange={(e) => set_draft(e.target.value)}
             onBlur={() => {
               if ((said || blank) && said !== value && !warn) onCommit(said);
               set_draft(null);
             }}
             onKeyDown={(e) => {
               if (e.key === "Enter") (e.target as HTMLInputElement).blur();
               if (e.key === "Escape") set_draft(null);
             }} />
      {warn ? <span className="from warn">{warn}</span> : null}
    </>
  );
}
