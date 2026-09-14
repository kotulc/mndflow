/** The settings tab: **what a thing is on the left, how it is painted on the
 *  right, and what it says below both.**
 *
 *  The left branches on which holder it was given and the right does not, so
 *  each lives in its own module and this only lays them out. **The workspace is
 *  a block like any other**, painted for wherever an export of it is used. */

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
  /** **A body is a block's** — the workspace's included, as its description —
   *  and never a relationship's or a definition's. */
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
