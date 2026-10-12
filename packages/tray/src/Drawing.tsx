/** How it appears: the drawing itself — a card's faces, or a run. */

import { alias_of, label_of, shown_name, type Graph, type Id } from "@mnd/core";
import { Faces } from "./Faces";
import { Wire } from "./Wire";
import { defined, held, kind_of, reading } from "./holder";

export type DrawingProps = { graph: Graph; id: Id };

export function Drawing({ graph, id }: DrawingProps) {
  const it = held(graph, id);
  if (!it) return null;
  const { def: d, edge } = it;
  const { said, now } = reading(graph, id, it);
  const { kind, runs } = kind_of(graph, id, it);
  const { own } = defined(graph, id, it, runs);

  /** What the canvas would draw: an element's own name else its type's, and a definition's own
   *  name else its kind's word — the same fallback a nameless card reads. */
  const label = runs && edge ? label_of(graph, id)
    : d ? d.name || titled(kind) : runs ? own?.name ?? "" : shown_name(graph, id);

  return (
    <div className="drawing">
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
