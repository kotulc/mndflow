/** The settings tab: identity on the left, looks on the right, body below. */

import { type Act, type Graph, type Id } from "@mnd/core";
import { Content } from "./Content";
import { Identity } from "./Identity";
import { Looks } from "./Looks";

export type StylesProps = {
  graph: Graph; id: Id; onAct: Act;
  /** What the style column writes: the id, or the definition it follows. */
  styled?: Id;
  /** The name a line's working template will be saved as. */
  working?: string;
};

export function Styles({ graph, id, styled = id, onAct, working = "" }: StylesProps) {
  /** Only a block has a body. */
  const bodied = !!graph.blocks[id];
  return (
    <div className="settings">
      <div className={["styles", graph.defs[id] ? "definition" : ""].filter(Boolean).join(" ")}>
        <Identity graph={graph} id={id} onAct={onAct} working={working} />
        <Looks graph={graph} id={styled} about={id} onAct={onAct} />
      </div>
      {bodied ? <Content key={id} graph={graph} id={id} onAct={onAct} /> : null}
    </div>
  );
}
