/** A body: a block's text, or a definition's data — the stored definition, read only. */

import { useState } from "react";
import type { Act, Graph, Id } from "@mnd/core";
import { Band } from "./Body";

export type ContentProps = { graph: Graph; id: Id; onAct: Act };

export function Content({ graph, id, onAct }: ContentProps) {
  const def = graph.defs[id];
  const stored = graph.blocks[id]?.body ?? "";
  const [draft, set_draft] = useState<string | null>(null);

  const commit = () => {
    if (draft !== null && draft !== stored) onAct("describe", { id, body: draft });
    set_draft(null);
  };

  /** A definition's body is what defines it, exactly as stored. */
  if (def) {
    return (
      <div className="content">
        <Band label="content" />
        <textarea className="data" value={JSON.stringify(def, null, 2)} aria-label="definition data"
                  readOnly spellCheck={false} />
      </div>
    );
  }

  return (
    <div className="content">
      <Band label="content" />
      <textarea value={draft ?? stored} aria-label="body" spellCheck
                placeholder="what this says — a description, a requirement, a script"
                onChange={(e) => set_draft(e.target.value)}
                onBlur={commit} />
    </div>
  );
}
