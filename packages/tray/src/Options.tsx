/** What is true of the definition in force, as against what it is.
 *
 *  **Two independent options, not one choice**: `pinned` offers it, `default` makes it what a
 *  plain element draws. Both sit under the drawing, on every element tab — a definition's and an
 *  instance's alike, since both are asking about the same definition. */

import { outside, pinned_defs, shipped, stands_in_for,
         type Act, type Graph, type Id } from "@mnd/core";
import { Band } from "./Body";
import { DRAFT } from "./draft";
import { defined, held, kind_of } from "./holder";

export type OptionsProps = { graph: Graph; id: Id; onAct: Act };

export function Options({ graph, id, onAct }: OptionsProps) {
  const it = held(graph, id);
  if (!it) return null;
  const { runs } = kind_of(graph, id, it);
  const { own } = defined(graph, id, it, runs);
  /** A draft is not in the graph yet, so neither option can be written about it. */
  const draft = own?.id === DRAFT;
  const stood = own && !draft ? stands_in_for(graph, own.id) : undefined;
  const word = stood ? graph.defs[stood]?.name ?? stood : runs ? "line" : "block";

  /** Exactly what each action refuses on, asked here so a box is dead rather than refused. */
  const may_pin = !!own && !draft && !shipped(own);
  const may_stand = !!own && !draft && !outside(own) && !!stood;

  return (
    <>
      <Band label="options" />
      <div className="toggles">
        <Check on={!!own && pinned_defs(graph, runs ? "relation" : "block")
                    .some((x) => x.id === own.id)}
               off={!may_pin} word="pinned"
               tip={!own ? `This follows no definition of its own, so there is nothing to offer.`
                 : draft ? "Name it first — a draft is not filed yet."
                 : shipped(own) ? `${own.name} is a base, and is never pinned.`
                 : runs ? `Offer ${own.name} on the rail, so a right drag can draw one.`
                 : `List ${own.name} in the explorer's pinned folder.`}
               onPick={(yes) => onAct("pin", { id: own!.id, on: yes ? "yes" : "no" })} />
        <Check on={own?.default !== undefined} off={!may_stand} word="default"
               tip={!own ? `This follows no definition of its own, so there is nothing to stand in.`
                 : draft ? "Name it first — a draft is not filed yet."
                 : outside(own) ? `${own.name} comes from ${own.from ?? "the floor"}, and stands in for nothing.`
                 : !stood ? `${own.name} extends nothing from outside, so it stands in for nothing.`
                 : `Draw every plain ${word} as ${own.name}. Only one may, so taking it moves it.`}
               onPick={(yes) => onAct("default", { id: own!.id, on: yes ? "yes" : "no" })} />
      </div>
    </>
  );
}

type CheckProps = {
  on: boolean;
  /** Drawn as unreachable, not merely unset. */
  off: boolean;
  word: string;
  tip: string;
  onPick: (on: boolean) => void;
};

/** A box, because it is a yes and a no. */
function Check({ on, off, word, tip, onPick }: CheckProps) {
  return (
    <label className="check" title={tip} aria-disabled={off || undefined}>
      <input type="checkbox" checked={on} disabled={off}
             onChange={(e) => onPick(e.target.checked)} />
      {word}
    </label>
  );
}
