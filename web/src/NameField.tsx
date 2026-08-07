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
};

export function NameField({ initial, className, placeholder, taken, onCommit,
                           onCancel }: Props) {
  const [clash, setClash] = useState(false);

  /** Commit unless the name is spoken for, in which case say so and hold. */
  function attempt(value: string): void {
    if (taken(value)) return setClash(true);

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
      {clash && <span className="clash-why">name already here</span>}
    </>
  );
}
