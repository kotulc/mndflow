/** The element tab: the drawing, what it is beside it, and a block's body below. */

import { type Act, type Graph, type Id } from "@mnd/core";
import { Content } from "./Content";
import { Drawing } from "./Drawing";
import { Identity } from "./Identity";

export type ElementProps = { graph: Graph; id: Id; onAct: Act };

export function Element({ graph, id, onAct }: ElementProps) {
  return (
    <div className="panel element">
      <Drawing graph={graph} id={id} onAct={onAct} />
      <Identity graph={graph} id={id} onAct={onAct} />
      {/* Only a block has a body. */}
      {graph.blocks[id] ? <Content key={id} graph={graph} id={id} onAct={onAct} /> : null}
    </div>
  );
}
