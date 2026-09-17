/** An element's tags, one chip each, with a box to add more. */

import { useState } from "react";
import { Icon } from "@mnd/theme";

export type TagsProps = {
  tags: readonly string[];
  onCommit: (tags: string[]) => void;
};

export function Tags({ tags, onCommit }: TagsProps) {
  const [adding, set_adding] = useState("");

  /** What was typed, added after what is already there. */
  const add = () => {
    const said = adding.split(",").map((t) => t.trim()).filter((t) => t && !tags.includes(t));
    if (said.length) onCommit([...tags, ...said]);
    set_adding("");
  };

  return (
    <span className="tags">
      {tags.map((t) => (
        <button key={t} className="opt tag" title={`take ${t} off`}
                onClick={() => onCommit(tags.filter((x) => x !== t))}>
          {t}<Icon name="remove" size={9} />
        </button>
      ))}
      <input value={adding} aria-label="add a tag" placeholder={tags.length ? "" : "add a tag"}
             onChange={(e) => set_adding(e.target.value)} onBlur={add}
             onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
    </span>
  );
}
