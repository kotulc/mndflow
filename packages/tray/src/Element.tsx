/** The first tab, a card's or a line's — named for what is drawn. **One layout for both**, the
 *  settings tab's: how it appears beside its source — the frontmatter as editable rows, then a
 *  card's body (a line has none) — and the definition it follows under all, read only. Given no
 *  `onAct`, nothing takes input. */

import { useEffect, useState } from "react";
import { card_text, def_at, def_of, read_card, said_as, type Act, type Graph,
         type Id } from "@mnd/core";
import { Markdown } from "@mnd/theme";
import { Band, Line, NOOP } from "./Body";
import { Drawing } from "./Drawing";
import { Identity } from "./Identity";

/** The frontmatter keys the identity rows answer; any other is drawn as it is filed. */
const IDENTITY = ["name", "type", "def", "tags"];

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
      <div className="col source">
        <Band label="source" />
        <div className="frontmatter">
          <span className="fence">---</span>
          <Identity graph={graph} id={id} onAct={onAct} {...(onOpen ? { onOpen } : {})} />
          {card ? <Rest graph={graph} id={id} /> : null}
          <span className="fence">---</span>
        </div>
        {card ? <Text key={id} graph={graph} id={id} onAct={onAct} /> : null}
      </div>
      {follows ? <Record graph={graph} id={follows} /> : null}
    </fieldset>
  );
}

/** The frontmatter the identity rows do not answer — values, traits, defaults — as filed. */
function Rest({ graph, id }: { graph: Graph; id: Id }) {
  const rest = Object.entries(read_card(card_text(graph, id)).front)
    .filter(([key]) => !IDENTITY.includes(key));
  if (!rest.length) return null;
  return (
    <div className="rows">
      {rest.map(([key, value]) => (
        <Line key={key} label={key}><span className="read">{said_as(value)}</span></Line>
      ))}
    </div>
  );
}

/** A card's body, edited in place and committed with its frontmatter unchanged when it is left.
 *  A refused edit stays in the box to be put right. */
function Text({ graph, id, onAct }: { graph: Graph; id: Id; onAct: Act }) {
  const body = graph.blocks[id]?.body ?? "";
  const text = card_text(graph, id);
  /** The frontmatter as filed, which the body is committed under. */
  const front = text.slice(0, text.length - body.length);
  const [draft, set_draft] = useState(body);
  /** What landed replaces what was typed. */
  useEffect(() => set_draft(body), [body]);
  return (
    <div className="content">
      <textarea value={draft} aria-label="card body" spellCheck
                onChange={(e) => set_draft(e.target.value)}
                onBlur={() => { if (draft !== body) onAct("markdown", { id, text: front + draft }); }}
                onKeyDown={(e) => { if (e.key === "Escape") set_draft(body); }} />
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
