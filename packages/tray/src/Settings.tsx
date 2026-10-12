/** The settings tab: the element's drawing, how its definition paints it beside it, and what its
 *  usages may do under both. A definition's alone — a usage follows these rather than carrying its
 *  own, so it is drawn as the card tab draws it, wearing them. */

import { type Act, type Graph, type Id } from "@mnd/core";
import { Drawing } from "./Drawing";
import { Looks } from "./Looks";
import { Traits } from "./Traits";

export type SettingsProps = { graph: Graph; id: Id; onAct: Act;
                              /** What is drawn: the element in hand, else the definition. */
                              shown?: Id };

export function Settings({ graph, id, onAct, shown = id }: SettingsProps) {
  return (
    <div className="panel style">
      <Drawing graph={graph} id={shown} />
      <Looks graph={graph} id={id} onAct={onAct} />
      <Traits graph={graph} id={id} onAct={onAct} />
    </div>
  );
}
