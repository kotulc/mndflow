/** A name being typed, refused while it clashes with a sibling.
 *
 *  Shared by the explorer and the canvas prompt so that the rule is explained
 *  the same way wherever a name is asked for. The check is the same one the
 *  action enforces; this only says so before the action has to.
 *
 *  The field holds rather than closing. A name that was refused is still the
 *  name somebody meant, so the fix is one keystroke away and the caret is
 *  already in it — closing would throw the typing away and explain nothing. */

import { useState } from "react";

type Props = {
  initial: string;
  className?: string;
  placeholder?: string;
  /** Whether this name is already taken by a sibling. */
  taken: (name: string) => boolean;
  onCommit: (name: string) => void;
  onCancel: () => void;
  /** Say it in full somewhere with room for it. The field itself only has room
   *  to mark the name, which in a pane as narrow as the explorer is a word. */
  onSay?: (message: string) => void;
};

export function NameField({ initial, className, placeholder, taken, onCommit,
                           onCancel, onSay }: Props) {
  const [clash, setClash] = useState(false);

  /** Commit unless the name is spoken for, in which case say so and hold. */
  function attempt(value: string): void {
    if (taken(value)) {
      setClash(true);
      // Said in full on the attempt, not on every keystroke: a message that
      // appears as you type is noise, one that appears when you press Enter
      // is an answer.
      onSay?.(`"${value.trim()}" is already here. Names are unique within a layer.`);

      return;
    }

    onCommit(value);
  }

  return (
    <>
      <input
        className={`${className ?? ""}${clash ? " clash" : ""}`}
        autoFocus
        defaultValue={initial}
        placeholder={placeholder}
        // Warned while typing, so the refusal is never a surprise at the end.
        onChange={(event) => setClash(taken(event.target.value))}
        onBlur={(event) => (taken(event.target.value) ? onCancel() : onCommit(event.target.value))}
        onKeyDown={(event) => {
          if (event.key === "Enter") attempt(event.currentTarget.value);
          if (event.key === "Escape") onCancel();
        }}
      />
      {clash && <span className="clash-why">taken</span>}
    </>
  );
}
