/** The card tab: the card drawn — large, then small — and what it says, rendered. Its markdown
 *  source is edited whole and committed as ordinary changes; a usage may have a file attached.
 *  A definition's record reads beside it as JSON, never typed into. */

import { useEffect, useState } from "react";
import { card_text, def_at, def_of, isa, attributes_of, read_card, said_as,
         type Act, type Graph, type Id } from "@mnd/core";
import { Markdown } from "@mnd/theme";
import { Band } from "./Body";
import { Faces } from "./Faces";

export type CardTabProps = {
  graph: Graph; id: Id;
  /** Given none, the card only reads. */
  onAct?: Act;
  /** Make a definition the context, which is where it is edited. */
  onOpen?: (id: Id) => void;
};

export function CardTab({ graph, id, onAct, onOpen }: CardTabProps) {
  const [draft, set_draft] = useState<string | null>(null);
  const text = card_text(graph, id);
  const d = def_at(graph, id);
  const follows = d ? undefined : def_at(graph, def_of(graph, id));

  /** An edit is kept until the card reads differently — until it landed. A refused one stays in
   *  the box, beside what the strip said, to be put right. */
  useEffect(() => set_draft(null), [text]);

  /** The source is committed when it is left, as every box is. */
  const commit = () => {
    if (draft === null || draft === text) { set_draft(null); return; }
    onAct?.("markdown", { id, text: draft });
  };

  return (
    <div className="panel card">
      <div className="drawing">
        <Band label="card" />
        <Faces graph={graph} id={id} />
      </div>

      <div className="col said">
        <Band label={draft !== null ? "source" : "says"}>
          {onAct && draft === null ? (
            <button className="chip" title="write this card as markdown: frontmatter, then its body"
                    onClick={() => set_draft(text)}>edit source</button>
          ) : null}
          {onAct && !d ? (
            <button className="chip" title="copy a markdown file onto this card; again, to refresh"
                    onClick={() => onAct("@attach", { id })}>attach</button>
          ) : null}
          {follows && onOpen ? (
            <button className="chip" title={`open ${follows.name} to edit what it is`}
                    onClick={() => onOpen(follows.id)}>view definition</button>
          ) : null}
        </Band>
        {draft !== null ? (
          <div className="content">
            <textarea value={draft} aria-label="card source" spellCheck autoFocus
                      onChange={(e) => set_draft(e.target.value)} onBlur={commit}
                      onKeyDown={(e) => { if (e.key === "Escape") set_draft(null); }} />
          </div>
        ) : <Said text={text} />}
      </div>

      {d ? <Record graph={graph} id={id} /> : null}
    </div>
  );
}

/** A card's frontmatter as a list of what it says, then its body. */
function Said({ text }: { text: string }) {
  const { front, body } = readable(text);
  const said = Object.entries(front)
    .map(([k, v]) => `- **${k}** ${said_as(v).replace(/\n/g, " ")}`).join("\n");
  return (
    <div className="content said">
      {said ? <Markdown className="card-front" text={said} /> : null}
      {body.trim() ? <Markdown className="card-body" text={body} />
        : <p className="empty">it says nothing yet</p>}
    </div>
  );
}

/** A card source split, or the whole of it a body where its frontmatter does not read. */
function readable(text: string): ReturnType<typeof read_card> {
  try { return read_card(text); }
  catch { return { front: {}, body: text }; }
}

/** A definition's record as JSON: its own word as it is filed, or resolved down its chain. */
function Record({ graph, id }: { graph: Graph; id: Id }) {
  const [resolved, set_resolved] = useState(false);
  const d = def_at(graph, id)!;
  const json = JSON.stringify(resolved ? resolve(graph, id) : d, null, 2);
  return (
    <div className="content data">
      <Band label="definition">
        <button className="chip" aria-pressed={resolved} onClick={() => set_resolved((r) => !r)}
                title="its own word, or what it reads with everything it inherits">
          {resolved ? "resolved" : "own"}
        </button>
      </Band>
      <Markdown className="card-record" text={`\`\`\`json\n${json}\n\`\`\``} />
    </div>
  );
}

/** A definition as it reads: every setting its chain gives it, nearest winning, and all its
 *  attributes. */
function resolve(graph: Graph, id: Id) {
  const chain = isa(graph, id);
  const settings: Record<string, Record<string, unknown>> = {};
  for (const d of [...chain].reverse()) {
    for (const [key, config] of Object.entries(d.settings ?? {})) {
      settings[key] = { ...settings[key], ...config };
    }
  }
  const attributes = attributes_of(graph, id).map(({ from: _from, ...a }) => a);
  return { ...chain[0], extends: chain.slice(1).map((d) => d.id),
           ...(Object.keys(settings).length ? { settings } : {}),
           ...(attributes.length ? { def: { attributes } } : {}) };
}
