/** An element's tags, one chip each, with a box to add more. **Its own list, or its definition's**:
 *  an inherited list reads faint, and any edit makes it the element's own; a list of its own can
 *  be given back. */

import { useState } from "react";
import { Icon } from "@mnd/theme";

export type TagsProps = {
  /** The tags in force, by id. */
  tags: readonly string[];
  /** Whether they are its definition's rather than its own. */
  inherited?: boolean;
  /** What a tag id reads as: its name, where it names a tag. */
  name?: (id: string) => string;
  /** The whole list, by id or name: a new word makes a tag. */
  onCommit: (tags: string[]) => void;
  /** Give its own list back, to carry its definition's again. */
  onReset?: () => void;
};

export function Tags({ tags, inherited = false, name = (id) => id, onCommit, onReset }: TagsProps) {
  const [adding, set_adding] = useState("");
  const names = tags.map(name);

  /** What was typed, added after what is already there, by name: a new word makes a tag. */
  const add = () => {
    const said = adding.split(",").map((t) => t.trim()).filter((t) => t && !names.includes(t));
    if (said.length) onCommit([...tags, ...said]);
    set_adding("");
  };

  return (
    <span className="tags">
      {tags.map((t) => (
        <button key={t} className={inherited ? "opt tag carried" : "opt tag"}
                title={inherited ? `${name(t)}: its definition's; take it off to say its own`
                                 : `take ${name(t)} off`}
                onClick={() => onCommit(tags.filter((x) => x !== t))}>
          {name(t)}<Icon name="remove" size={9} />
        </button>
      ))}
      <input value={adding} aria-label="add a tag" placeholder={tags.length ? "" : "add a tag"}
             onChange={(e) => set_adding(e.target.value)} onBlur={add}
             onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
      {!inherited && onReset ? (
        <button className="opt" title="carry its definition's tags again" onClick={onReset}>
          inherit
        </button>
      ) : null}
    </span>
  );
}
