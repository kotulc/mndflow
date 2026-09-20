/** The prose of whatever the panel has hold of: a block's body, which is the content itself, or
 *  a definition's `about`, which describes the vocabulary. The definition's record is `Data`. */

import { useState } from "react";
import type { Act, Graph, Id } from "@mnd/core";
import { Band } from "./Body";

export type ContentProps = { graph: Graph; id: Id; onAct: Act };

export function Content({ graph, id, onAct }: ContentProps) {
  const def = graph.defs[id];
  const stored = (def ? def.about : graph.blocks[id]?.body) ?? "";
  const [draft, set_draft] = useState<string | null>(null);

  const commit = () => {
    if (draft !== null && draft !== stored) onAct("describe", { id, body: draft });
    set_draft(null);
  };

  return (
    <div className="content">
      <Band label={def ? "about" : "content"} />
      <textarea value={draft ?? stored} aria-label={def ? "about" : "body"} spellCheck
                placeholder={def
                  ? "what this definition is for — a sentence anybody reading the vocabulary would want"
                  : "what this says — a description, a requirement, a script"}
                onChange={(e) => set_draft(e.target.value)}
                onBlur={commit} />
    </div>
  );
}
