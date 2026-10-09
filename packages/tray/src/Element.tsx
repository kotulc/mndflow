/** The first tab, a card's or a line's — named for what is drawn. **One layout for both**, the
 *  settings tab's: how it appears beside what it is, its source under them (a card's alone: a line
 *  has none), and the definition it follows under all, read only. Given no `onAct`, nothing takes
 *  input. */

import { useEffect, useState } from "react";
import { card_text, def_at, def_of, type Act, type Graph, type Id } from "@mnd/core";
import { Markdown } from "@mnd/theme";
import { Band, NOOP } from "./Body";
import { Drawing } from "./Drawing";
import { Identity } from "./Identity";

export type ElementProps = {
  graph: Graph; id: Id; onAct?: Act;
  /** Make a definition the context, which is where it is edited. */
  onOpen?: (id: Id) => void;
};

export function Element({ graph, id, onAct = NOOP, onOpen }: ElementProps) {
  const card = !!graph.blocks[id];
  const follows = def_of(graph, id);
  return (
    <fieldset className={card ? "panel element" : "panel element lined"}
              disabled={onAct === NOOP}>
      <Drawing graph={graph} id={id} />
      <Identity graph={graph} id={id} onAct={onAct} {...(onOpen ? { onOpen } : {})} />
      {card ? <Source key={id} graph={graph} id={id} onAct={onAct} /> : null}
      {follows ? <Record graph={graph} id={follows} /> : null}
    </fieldset>
  );
}

/** A card as markdown — frontmatter, then its body — edited in place and committed as ordinary
 *  changes when it is left. A refused edit stays in the box to be put right. */
function Source({ graph, id, onAct }: { graph: Graph; id: Id; onAct: Act }) {
  const text = card_text(graph, id);
  const [draft, set_draft] = useState(text);
  /** What landed replaces what was typed. */
  useEffect(() => set_draft(text), [text]);
  return (
    <div className="col source">
      <Band label="source" />
      <div className="content">
        <textarea value={draft} aria-label="card source" spellCheck
                  onChange={(e) => set_draft(e.target.value)}
                  onBlur={() => { if (draft !== text) onAct("markdown", { id, text: draft }); }}
                  onKeyDown={(e) => { if (e.key === "Escape") set_draft(text); }} />
      </div>
    </div>
  );
}

/** The definition it follows, or itself, as JSON and read only: its own word as it is filed. */
function Record({ graph, id }: { graph: Graph; id: Id }) {
  const json = JSON.stringify(def_at(graph, id)!, null, 2);
  return (
    <div className="content data">
      <Band label="definition" />
      <Markdown className="card-record" text={`\`\`\`json\n${json}\n\`\`\``} />
    </div>
  );
}
