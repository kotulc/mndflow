/** A name, and the same name being typed.
 *
 *  **A name is edited where it is read.** The element that draws it takes the
 *  typing, so what you are changing keeps the size, the font and the place of
 *  the thing you double clicked — a dialog over the page hides the one thing
 *  you are looking at while you rename it.
 *
 *  **Here because the canvas and the tree name the same things.** A row and a
 *  card are two drawings of one block, and two clicks mean the same on both.
 *
 *  Which name is open arrives through a context rather than a prop, because on
 *  the canvas every surface that draws one is a memoised node several levels
 *  down and threading it would re-render the drawing on every keystroke. It
 *  writes nothing: what was typed leaves as a name, like every other gesture. */

import { createContext, useContext, useRef } from "react";

/** The name being typed, and where what was typed lands. `null` means nothing
 *  is being typed; a `null` label means it was left as it was. */
export type Naming = { id: string | null; done: (label: string | null) => void };

export const NamingContext = createContext<Naming>({ id: null, done: () => {} });

export function useNaming() {
  return useContext(NamingContext);
}

/** Open with everything selected, so typing replaces the name and an arrow key
 *  keeps it. Module scope, so a render does not re-run it. */
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
  /** Whether leaving keeps what was typed. Escape says it does not. */
  const keep = useRef(true);

  const key = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    /** **The shell's keys are not for a field being typed in.** Delete, Enter
     *  and ctrl-A all mean something to the canvas, and none of them means it
     *  here. */
    e.stopPropagation();
    /** **Enter is done.** Shift and Enter is the line break, for the one name
     *  that is a paragraph — a note is its text. */
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); }
    else if (e.key === "Escape") { keep.current = false; e.currentTarget.blur(); }
  };

  const left = (e: React.FocusEvent<HTMLSpanElement>) => {
    /** What it reads as, not what it holds: a line break typed into a note is
     *  an element, and only the rendered text has it as a break. */
    const typed = (e.currentTarget.innerText ?? e.currentTarget.textContent ?? "").trim();
    const kept = keep.current;
    keep.current = true;
    /** **Nothing typed and nothing changed are both nothing done.** A rename
     *  either way is a log entry and an undo step for a name that already
     *  read that way. */
    naming.done(kept && typed && typed !== text ? typed : null);
  };

  return (
    /** Keyed on whether it is being typed in, so leaving remounts it: React
     *  compares the text it drew last against the text it is drawing now, and
     *  what somebody typed into the DOM is in neither. */
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
