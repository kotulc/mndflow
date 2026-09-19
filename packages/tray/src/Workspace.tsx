/** The workspace tab: what the root is called, how the drawing defaults, and what it holds. */

import { SCHEMA, shown_name, type Act, type Graph } from "@mnd/core";
import { Band, Body, Line } from "./Body";
import { Content } from "./Content";
import { Entry } from "./Entry";
import { Tags } from "./Tags";

/** The default card, in units, and the range it is held inside. Display, so the log never sees
 *  it and no file carries it. */
export type Display = {
  card: { w: number; h: number };
  range: { min: { w: number; h: number }; max: { w: number; h: number } };
};

export type WorkspaceProps = { graph: Graph; display?: Display; onAct: Act };

export function Workspace({ graph, display, onAct }: WorkspaceProps) {
  const root = graph.blocks[graph.root];
  if (!root) return <p className="empty">that is not here any more</p>;

  /** The root draws nowhere, so what it holds is a count and never a listing. */
  const held: [string, number][] = [
    ["blocks", Object.keys(graph.blocks).length - 1],
    ["relations", Object.keys(graph.edges).length],
    ["definitions", Object.keys(graph.defs).length],
    ["packages", Object.keys(graph.packages).length],
  ];

  return (
    <div className="panel workspace">
      <div className="col identity">
        <Band label="identity" />
        <Body>
          <Line label="name" tip="What this workspace is called, as the explorer and a file write it.">
            <Entry key={graph.root} value={root.name ?? ""} label="name" blank
                   placeholder={shown_name(graph, graph.root)}
                   onCommit={(to) => onAct("rename", { id: graph.root, name: to })} />
          </Line>
          <Line label="tags" tip="Words that say what this is like. Tags carry nothing and are never inherited.">
            <Tags tags={root.tags ?? []}
                  onCommit={(to) => onAct("tag", { ids: [graph.root], tags: to })} />
          </Line>
        </Body>
        {display ? <Sizing display={display} onAct={onAct} /> : null}
      </div>

      <div className="col holds">
        <Band label="file" />
        <Body>
          <Line label="id" tip="This workspace, for life. Minted once and never rewritten.">
            <span className="read">{graph.root}</span>
          </Line>
          <Line label="schema" tip="The contract a file of this workspace is written to.">
            <span className="read">{SCHEMA}</span>
          </Line>
        </Body>

        <Band label="holds" />
        <Body>
          {held.map(([word, n]) => (
            <Line key={word} label={word}><span className="read">{n}</span></Line>
          ))}
        </Body>
      </div>

      <Content key={graph.root} graph={graph} id={graph.root} onAct={onAct} />
    </div>
  );
}

/** The room a card takes where its definition asked for none. */
function Sizing({ display, onAct }: { display: Display; onAct: Act }) {
  const { card, range } = display;

  /** One side of it, held inside the range the drawing allows. */
  const side = (axis: "w" | "h") => (
    <input type="number" aria-label={axis === "w" ? "card width" : "card height"}
           value={card[axis]} min={range.min[axis]} max={range.max[axis]} step={1}
           onChange={(e) => onAct("card", { ...card, [axis]: Number(e.target.value) })} />
  );

  return (
    <>
      <Band label="display" />
      <Body>
        <Line label="card" className="card"
              tip="The room a card takes where its definition asked for none, in units of the lattice.">
          {side("w")}<span className="into">×</span>{side("h")}<span className="alias">units</span>
        </Line>
      </Body>
    </>
  );
}
