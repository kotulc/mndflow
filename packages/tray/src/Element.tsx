/** The element tab: the drawing, what it is beside it, and its body below. */

import { type Act, type Graph, type Id } from "@mnd/core";
import { Content } from "./Content";
import { Drawing } from "./Drawing";
import { Identity } from "./Identity";
import { Source } from "./Source";

export type ElementProps = { graph: Graph; id: Id; onAct: Act };

export function Element({ graph, id, onAct }: ElementProps) {
  return (
    <div className="panel element">
      <Drawing graph={graph} id={id} onAct={onAct} />
      <Identity graph={graph} id={id} onAct={onAct} />
      {/* A block's body is its text, a definition's its data; a line has none. */}
      {graph.blocks[id] || graph.defs[id] ? <Content key={id} graph={graph} id={id} onAct={onAct} /> : null}
      {/* Where that content came from, under it. Blocks only: nothing else stands in for an
         artifact outside the workspace. */}
      {graph.blocks[id] ? <Source key={`src-${id}`} graph={graph} id={id} onAct={onAct} /> : null}
    </div>
  );
}
