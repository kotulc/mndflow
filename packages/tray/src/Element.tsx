/** The element tab: the drawing, what it is beside it, and its body below. Given no `onAct`,
 *  it is read only: nothing takes input, and the options rows are left out. */

import { type Act, type Graph, type Id } from "@mnd/core";
import { NOOP } from "./Body";
import { Content } from "./Content";
import { Data } from "./Data";
import { Drawing } from "./Drawing";
import { Identity } from "./Identity";
import { Source } from "./Source";

export type ElementProps = { graph: Graph; id: Id; onAct?: Act };

export function Element({ graph, id, onAct = NOOP }: ElementProps) {
  const readonly = onAct === NOOP;
  return (
    <fieldset className="panel element" disabled={readonly}>
      <Drawing graph={graph} id={id} onAct={onAct} options={!readonly} />
      <Identity graph={graph} id={id} onAct={onAct} />
      {/* A block's body is its content; a definition's `about` describes it. A line has neither. */}
      {graph.blocks[id] || graph.defs[id] ? <Content key={id} graph={graph} id={id} onAct={onAct} /> : null}
      {/* And under it, what the definition actually is. */}
      {graph.defs[id] ? <Data key={`data-${id}`} graph={graph} id={id} /> : null}
      {/* Where that content came from, under it. Blocks only: nothing else stands in for an
         artifact outside the workspace. */}
      {graph.blocks[id] ? <Source key={`src-${id}`} graph={graph} id={id} onAct={onAct} /> : null}
    </fieldset>
  );
}
