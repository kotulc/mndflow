/** The card tab — a card's or a line's, named for what is drawn — and a definition's settings
 *  tab, laid out alike: **the drawing over every key on the left, the lit key's choices on the
 *  right.** The card tab's keys are what it is, where it sits and what it carries; the settings
 *  tab's, how a definition draws. The lit key is kept by name, so moving to the next element asks
 *  the same question. Given no `onAct`, nothing takes input. */

import { useState } from "react";
import { type Act, type Graph, type Id } from "@mnd/core";
import { NOOP } from "./Body";
import { Choices } from "./Choices";
import { Drawing } from "./Drawing";
import { pairs_of, settings_of } from "./pairs";
import { Source } from "./Source";

export type ElementProps = {
  graph: Graph; id: Id; onAct?: Act;
  /** Which keys: what it is, or how a definition draws. */
  keys?: "card" | "settings";
  /** Make a definition the context, which is where it is edited. */
  onOpen?: (id: Id) => void;
};

export function Element({ graph, id, onAct = NOOP, onOpen, keys = "card" }: ElementProps) {
  const [lit, set_lit] = useState(keys === "card" ? "type" : "");
  const pairs = keys === "card" ? pairs_of(graph, id, onAct, onOpen)
                                : settings_of(graph, id, onAct);
  /** A key this element does not say falls to its first. */
  const pair = pairs.find((p) => p.key === lit) ?? pairs[0];
  return (
    <fieldset className="panel element" disabled={onAct === NOOP}>
      <div className="col source">
        <Drawing graph={graph} id={id} one />
        <Source id={id} pairs={pairs} lit={pair?.key ?? ""} onLit={set_lit} />
      </div>
      <Choices graph={graph} id={id} pair={pair} onAct={onAct} />
    </fieldset>
  );
}
