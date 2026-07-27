/** Document pane: the text of the selected node, editable in place.
 *
 *  A node and its document are the same thing, so this is the tree's "edit" —
 *  what the conversation dictates can always be corrected by hand. */

import { useEffect, useState } from "react";

import type { Graph } from "./api";

type Props = {
  graph: Graph;
  scope: string | null;
  busy: boolean;
  onSave: (id: string, body: string) => void;
};

export function Doc({ graph, scope, busy, onSave }: Props) {
  const node = scope ? graph.nodes[scope] : null;
  const body = scope ? (graph.specs[scope] ?? "") : "";
  const [draft, setDraft] = useState(body);

  // Follow the selection, and whatever a turn just wrote into it.
  useEffect(() => setDraft(body), [scope, body]);

  if (!node || !scope) return null;

  /** One edit is one step. Saving per keystroke would bury the action log and
   *  make undo walk back through a document character by character. */
  function save() {
    if (draft !== body && !busy) onSave(scope!, draft);
  }

  return (
    <section className="doc">
      <div className="doc-bar">
        <span># {node.label}</span>
        <span className="state">{draft === body ? "saved" : "editing…"}</span>
      </div>

      <textarea
        value={draft}
        placeholder="Nothing written here yet…"
        disabled={busy}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
      />
    </section>
  );
}
