/** An element's tags, one chip each, with a box to add more: its own, which it takes off; what it
 *  carries from its definition, which it drops; and what it dropped, struck, which it takes back. */

import { useState } from "react";
import { Icon } from "@mnd/theme";

export type TagsProps = {
  /** Its own entries, by id: a tag added, or `-id` for one dropped. */
  tags: readonly string[];
  /** What it carries from its definition's chain, by id. */
  carried?: readonly string[];
  /** What a tag id reads as: its name, where it names a tag. */
  name?: (id: string) => string;
  onCommit: (tags: string[]) => void;
};

export function Tags({ tags, carried = [], name = (id) => id, onCommit }: TagsProps) {
  const [adding, set_adding] = useState("");
  const added = tags.filter((t) => !t.startsWith("-"));
  const dropped = tags.filter((t) => t.startsWith("-")).map((t) => t.slice(1));
  const names = added.map(name);

  /** What was typed, added after what is already there, by name: a new word makes a tag. */
  const add = () => {
    const said = adding.split(",").map((t) => t.trim()).filter((t) => t && !names.includes(t));
    if (said.length) onCommit([...tags, ...said]);
    set_adding("");
  };

  return (
    <span className="tags">
      {added.map((t) => (
        <button key={t} className="opt tag" title={`take ${name(t)} off`}
                onClick={() => onCommit(tags.filter((x) => x !== t))}>
          {name(t)}<Icon name="remove" size={9} />
        </button>
      ))}
      {carried.filter((t) => !added.includes(t)).map((t) => (
        <button key={t} className="opt tag carried" title={`${name(t)}: carried from its definition; drop it here`}
                onClick={() => onCommit([...tags, `-${t}`])}>
          {name(t)}
        </button>
      ))}
      {dropped.map((t) => (
        <button key={`-${t}`} className="opt tag dropped" title={`${name(t)}: dropped here; take it back`}
                onClick={() => onCommit(tags.filter((x) => x !== `-${t}`))}>
          {name(t)}
        </button>
      ))}
      <input value={adding} aria-label="add a tag" placeholder={tags.length ? "" : "add a tag"}
             onChange={(e) => set_adding(e.target.value)} onBlur={add}
             onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
    </span>
  );
}
