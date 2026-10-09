/** The card column: what it is, then the drawing itself — a card's faces, or a run. */

import { alias_of, label_of, SCHEMA, role_of, shown_name,
         type Graph, type Id } from "@mnd/core";
import { Icon, role_icon, type IconName } from "@mnd/theme";
import { Band } from "./Body";
import { Faces } from "./Faces";
import { Wire } from "./Wire";
import { defined, held, kind_of, reading } from "./holder";

export type DrawingProps = { graph: Graph; id: Id };

export function Drawing({ graph, id }: DrawingProps) {
  const it = held(graph, id);
  if (!it) return null;
  const { def: d, block: b, edge } = it;
  const { said, now } = reading(graph, id, it);
  const { kind, runs } = kind_of(graph, id, it);
  const { own } = defined(graph, id, it, runs);

  const role = b ? role_of(graph, id) : null;
  /** What the canvas would draw: an element's own name else its type's, and a definition's own
   *  name else its kind's word — the same fallback a nameless card reads. */
  const label = runs && edge ? label_of(graph, id)
    : d ? d.name || titled(kind) : runs ? own?.name ?? "" : shown_name(graph, id);

  const mark: IconName = runs ? (kind === "tie" ? "relation_tie" : "relation_plain")
    : role_icon(role ?? kind) ?? "role_leaf";

  return (
    <div className="drawing">
      {/* What it is, headed the way identity heads its own rows. **One word for both**: a card
         and a run are both elements, and the row below asks the same question of either. */}
      <Band label="type">
        <span className="base">{kind}<Icon name={mark} size={12} /></span>
        {!d && id === graph.root ? <span className="from">{`schema ${SCHEMA}`}</span> : null}
      </Band>
      {runs ? (
        <Wire label={label} alias={edge ? alias_of(graph, id, true) : undefined}
              said={said} now={now} />
      ) : <Faces graph={graph} id={id} />}
    </div>
  );
}

/** A base's word, as `kind_word` capitalises one. */
function titled(kind: string): string {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}
