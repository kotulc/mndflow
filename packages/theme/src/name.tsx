/** A name, and the same name being typed. */

import { createContext, useContext, useRef } from "react";

/** The name being typed, and where what was typed lands. */
export type Naming = { id: string | null; done: (label: string | null) => void };

export const NamingContext = createContext<Naming>({ id: null, done: () => {} });

export function useNaming() {
  return useContext(NamingContext);
}

/** Open with everything selected, so typing replaces the name and an arrow key keeps it. */
function opened(el: HTMLSpanElement | null) {
  if (!el) return;
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

export type NameProps = {
  /** What this name names — a block, a boundary, a relationship, a layer. */
  id: string;
  className: string;
  text: string;
  style?: React.CSSProperties;
};

export function Name({ id, className, text, style }: NameProps) {
  const naming = useNaming();
  const editing = naming.id === id;
  /** Whether leaving keeps what was typed. */
  const keep = useRef(true);

  const key = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    /** The shell's keys are not for a field being typed in. */
    e.stopPropagation();
    /** Enter is done; Shift+Enter breaks the line. */
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); }
    else if (e.key === "Escape") { keep.current = false; e.currentTarget.blur(); }
  };

  const left = (e: React.FocusEvent<HTMLSpanElement>) => {
    /** The rendered text, so a typed line break reads as a break. */
    const typed = (e.currentTarget.innerText ?? e.currentTarget.textContent ?? "").trim();
    const kept = keep.current;
    keep.current = true;
    /** Nothing typed and nothing changed are both nothing done. */
    naming.done(kept && typed && typed !== text ? typed : null);
  };

  return (
    /** Keyed on editing, so leaving remounts and React redraws the text. */
    <span key={editing ? "typed" : "read"} style={style}
          className={editing ? `${className} mnd-naming nodrag nopan` : className}
          contentEditable={editing} suppressContentEditableWarning spellCheck={false}
          ref={editing ? opened : undefined}
          onPointerDown={editing ? (e) => e.stopPropagation() : undefined}
          onDoubleClick={editing ? (e) => e.stopPropagation() : undefined}
          onKeyDown={editing ? key : undefined}
          onBlur={editing ? left : undefined}>
      {text}
    </span>
  );
}
