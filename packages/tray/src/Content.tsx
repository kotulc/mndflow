/** A block's body: **the text that makes it more than a box with a name.**
 *
 *  Full width under the two settings columns. **One step per editing session,
 *  never one per keystroke** — `set_body` carries the whole string and the log
 *  replays every step, so the text is committed when the box is left. */

import { useState } from "react";
import type { Act, Graph, Id } from "@mnd/core";
import { Band } from "./Body";

export type ContentProps = { graph: Graph; id: Id; onAct: Act };

export function Content({ graph, id, onAct }: ContentProps) {
  const stored = graph.blocks[id]?.body ?? "";
  const [draft, set_draft] = useState<string | null>(null);

  const commit = () => {
    if (draft !== null && draft !== stored) onAct("describe", { id, body: draft });
    set_draft(null);
  };

  return (
    <div className="content">
      <Band label="body" />
      <textarea value={draft ?? stored} aria-label="body" spellCheck
                placeholder="what this says — a description, a requirement, a script"
                onChange={(e) => set_draft(e.target.value)}
                onBlur={commit} />
    </div>
  );
}
