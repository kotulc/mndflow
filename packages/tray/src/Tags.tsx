/** An element's tags, one chip each, with a box to add more: its own, which it takes off, then
 *  what it carries from its definition, which it cannot. */

import { useState } from "react";
import { Icon } from "@mnd/theme";

export type TagsProps = {
  /** Its own tags, by id. */
  tags: readonly string[];
  /** What it carries from its definition and its traits, by id; read only. */
  carried?: readonly string[];
  /** What a tag id reads as: its name, where it names a tag. */
  name?: (id: string) => string;
  onCommit: (tags: string[]) => void;
};

export function Tags({ tags, carried = [], name = (id) => id, onCommit }: TagsProps) {
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
        <button key={t} className="opt tag" title={`take ${name(t)} off`}
                onClick={() => onCommit(tags.filter((x) => x !== t))}>
          {name(t)}<Icon name="remove" size={9} />
        </button>
      ))}
      {carried.filter((t) => !tags.includes(t)).map((t) => (
        <span key={t} className="opt tag carried" title={`${name(t)}: carried from its definition`}>
          {name(t)}
        </span>
      ))}
      <input value={adding} aria-label="add a tag" placeholder={tags.length ? "" : "add a tag"}
             onChange={(e) => set_adding(e.target.value)} onBlur={add}
             onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
    </span>
  );
}
