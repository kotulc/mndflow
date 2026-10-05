/** The element tab: the drawing, what it is beside it, and its body below. Given no `onAct`,
 *  it is read only: nothing takes input. */

import { type Act, type Graph, type Id } from "@mnd/core";
import { NOOP } from "./Body";
import { Content } from "./Content";
import { Data } from "./Data";
import { Drawing } from "./Drawing";
import { Identity } from "./Identity";
import { Source } from "./Source";

export type ElementProps = {
  graph: Graph; id: Id; onAct?: Act;
  /** Make a definition the context, which is where it is edited. */
  onOpen?: (id: Id) => void;
};

export function Element({ graph, id, onAct = NOOP, onOpen }: ElementProps) {
  const readonly = onAct === NOOP;
  return (
    <fieldset className="panel element" disabled={readonly}>
      <Drawing graph={graph} id={id} />
      <Identity graph={graph} id={id} onAct={onAct} {...(onOpen ? { onOpen } : {})} />
      {/* A block's body is its content; a definition's describes it. A line has neither. */}
      {graph.blocks[id] ? <Content key={id} graph={graph} id={id} onAct={onAct} /> : null}
      {/* Where that content came from, under it. Blocks only: nothing else stands in for an
         artifact outside the workspace. */}
      {graph.blocks[id] ? <Source key={`src-${id}`} graph={graph} id={id} onAct={onAct} /> : null}
      {/* And last, what a definition actually is. */}
      {graph.blocks[id]?.def ? <Data key={`data-${id}`} graph={graph} id={id} /> : null}
    </fieldset>
  );
}
