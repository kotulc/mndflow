/** Properties pane: everything about the selected object — its text, its type,
 *  and whether it holds other objects.
 *
 *  An object and its document are the same thing, so this is the explorer's
 *  "edit": whatever the conversation dictates can be corrected by hand. */

import { useEffect, useState } from "react";

import { isGroup } from "./core/fold";
import type { Graph, Region } from "./core/types";
import type { Terms } from "./core/workflows";

type Props = {
  graph: Graph;
  scope: string | null;
  region: Region | null;
  terms: Terms;
  onSave: (id: string, body: string) => void;
  onRetype: (id: string, type: string) => void;
  onRecolorRegion: (id: string, color: string) => void;
};

export function Doc({ graph, scope, region, terms, onSave, onRetype, onRecolorRegion }: Props) {
  const node = scope ? graph.nodes[scope] : null;
  const body = node?.body ?? "";
  const [draft, setDraft] = useState(body);

  // Follow the selection, and whatever a turn just wrote into it.
  useEffect(() => setDraft(body), [scope, body]);

  if (region) {
    return (
      <section className="doc">
        <div className="doc-bar">
          <span className="name"># {region.label || "group"}</span>
          <span className="meta">
            <input
              type="color"
              value={region.color}
              title="Frame color"
              onChange={(event) => onRecolorRegion(region.id, event.target.value)}
            />
            <span className="holds">{region.members.length} nodes</span>
          </span>
        </div>
        <p className="nothing">Named on the canvas — double-click its label there to change it.</p>
      </section>
    );
  }

  if (!node || !scope) {
    return (
      <section className="doc">
        <div className="doc-bar">
          <span className="name">context</span>
        </div>
        <p className="nothing">Nothing selected. Pick something to see and edit it.</p>
      </section>
    );
  }

  /** One edit is one step. Saving per keystroke would bury the action log and
   *  make undo walk back through a document character by character. */
  function save() {
    if (draft !== body) onSave(scope!, draft);
  }

  return (
    <section className="doc">
      <div className="doc-bar">
        <span className="name"># {node.label}</span>

        <span className="meta">
          <input
            className="type"
            value={node.type}
            placeholder={terms.node}
            onChange={(event) => onRetype(scope!, event.target.value)}
          />
          <span className="holds">
            {isGroup(graph, scope!) ? terms.group.toLowerCase() : terms.node.toLowerCase()}
          </span>
          <span className="state">{draft === body ? "saved" : "editing…"}</span>
        </span>
      </div>

      <textarea
        value={draft}
        placeholder="Nothing written here yet…"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
      />
    </section>
  );
}
