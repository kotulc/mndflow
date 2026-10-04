/** What is true of the definition in force, as against what it is: whether it is pinned, and the
 *  traits its settings give it. Under the drawing, on every element tab — a definition's and an
 *  instance's alike, since both are asking about the same definition. */

import { is_base, pinned_defs, traits_of, type Act, type Graph, type Id } from "@mnd/core";
import { Band, Check } from "./Body";
import { DRAFT } from "./draft";
import { defined, held, kind_of } from "./holder";

export type OptionsProps = { graph: Graph; id: Id; onAct: Act };

export function Options({ graph, id, onAct }: OptionsProps) {
  const it = held(graph, id);
  if (!it) return null;
  const { runs } = kind_of(graph, id, it);
  const { own } = defined(graph, id, it, runs);
  /** A draft is not in the graph yet, so it cannot be pinned. */
  const draft = own?.id === DRAFT;
  /** Exactly what the action refuses on, asked here so a box is dead rather than refused. */
  const may_pin = !!own && !draft && !is_base(own.id);
  const traits = own && !draft ? traits_of(graph, own.id) : [];

  return (
    <>
      <Band label="options" />
      <div className="toggles">
        <Check on={!!own && pinned_defs(graph).some((x) => x.id === own.id)}
               off={!may_pin} word="pinned"
               tip={!own ? `This follows no definition of its own, so there is nothing to offer.`
                 : draft ? "Name it first — a draft is not filed yet."
                 : is_base(own.id) ? `${own.name} is a base, and is never pinned.`
                 : `Offer ${own.name} first.`}
               onPick={(yes) => onAct("pin", { id: own!.id, on: yes ? "yes" : "no" })} />
        {/* What its settings let it do, read off them: never set here. */}
        {traits.map((t) => <span key={t} className="opt tag" title="read off its settings">{t}</span>)}
      </div>
    </>
  );
}
