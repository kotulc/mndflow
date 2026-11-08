/** What a block holds as text: one note of markdown, over what it holds as blocks. Read as the
 *  card draws it; a click opens it as markdown, leaving commits it and Escape gives it back. A
 *  refused edit stays to be put right. */

import { useEffect, useState } from "react";
import type { Act, Graph, Id } from "@mnd/core";
import { Markdown } from "@mnd/theme";
import { Band } from "./Body";

/** Given no `onAct`, the text is read only. Under a section of its own, it carries no band. */
export type ContentProps = { graph: Graph; id: Id; onAct?: Act; band?: boolean };

export function Content({ graph, id, onAct, band = true }: ContentProps) {
  const body = graph.blocks[id]?.body ?? "";
  const [draft, set_draft] = useState<string | null>(null);
  /** What landed replaces what was typed. */
  useEffect(() => set_draft(null), [body]);

  const open = () => { if (onAct) set_draft(body); };
  const commit = () => {
    if (draft !== null && draft !== body) onAct?.("write", { id, body: draft });
    set_draft(null);
  };

  return (
    <div className="content text">
      {band ? <Band label="text" /> : null}
      {draft !== null ? (
        <textarea value={draft} aria-label="text" spellCheck autoFocus
                  onChange={(e) => set_draft(e.target.value)} onBlur={commit}
                  onKeyDown={(e) => { if (e.key === "Escape") set_draft(null); }} />
      ) : (
        <div className="read" tabIndex={onAct ? 0 : -1} onClick={open}
             onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); open(); } }}>
          {body ? <Markdown text={body} />
            : <p className="empty">{onAct ? "no text yet — click to write it in markdown"
                                           : "no text"}</p>}
        </div>
      )}
    </div>
  );
}
