/** The settings tab: a definition's drawing, how it is painted beside it, and what its usages may
 *  do under both. A definition's alone — a usage follows these rather than carrying its own. */

import { type Act, type Graph, type Id } from "@mnd/core";
import { Drawing } from "./Drawing";
import { Looks } from "./Looks";
import { Traits } from "./Traits";

export type SettingsProps = { graph: Graph; id: Id; onAct: Act };

export function Settings({ graph, id, onAct }: SettingsProps) {
  return (
    <div className="panel style">
      <Drawing graph={graph} id={id} />
      <Looks graph={graph} id={id} onAct={onAct} />
      <Traits graph={graph} id={id} onAct={onAct} />
    </div>
  );
}
