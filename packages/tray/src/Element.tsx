/** The element tab, a line's: the run drawn, and what it is beside it. A block's is its card tab.
 *  Given no `onAct`, it is read only: nothing takes input. */

import { type Act, type Graph, type Id } from "@mnd/core";
import { NOOP } from "./Body";
import { Drawing } from "./Drawing";
import { Identity } from "./Identity";

export type ElementProps = {
  graph: Graph; id: Id; onAct?: Act;
  /** Make a definition the context, which is where it is edited. */
  onOpen?: (id: Id) => void;
};

export function Element({ graph, id, onAct = NOOP, onOpen }: ElementProps) {
  return (
    <fieldset className="panel element" disabled={onAct === NOOP}>
      <Drawing graph={graph} id={id} />
      <Identity graph={graph} id={id} onAct={onAct} {...(onOpen ? { onOpen } : {})} />
    </fieldset>
  );
}
