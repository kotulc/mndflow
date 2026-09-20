/** The style tab: the drawing, and how it is painted beside it. */

import { type Act, type Graph, type Id } from "@mnd/core";
import { Drawing } from "./Drawing";
import { Looks } from "./Looks";

export type StyleProps = {
  graph: Graph; id: Id; onAct: Act;
  /** What the style rows write: the id, or the definition it follows. */
  styled?: Id;
};

export function Style({ graph, id, styled = id, onAct }: StyleProps) {
  return (
    <div className="panel style">
      <Drawing graph={graph} id={id} onAct={onAct} />
      <Looks graph={graph} id={styled} about={id} onAct={onAct} />
    </div>
  );
}
