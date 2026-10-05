/** The workspace tab: what the root is called, how the drawing defaults, and what its file
 *  carries. Given no `onAct` the workspace itself is read only; its display still answers
 *  `onDisplay`, since how a drawing looks is the session's and changes nothing. */

import { all_defs, def_at, file_name, packages, SCHEMA, shown_name,
         type Act, type Graph } from "@mnd/core";
import { Band, Body, Check, Line, NOOP, Pick } from "./Body";
import { Content } from "./Content";
import { Entry } from "./Entry";
import { Tags } from "./Tags";

/** What the workspace draws with rather than holds: the default card in units and the range it
 *  is held inside, and whether every layer draws its key. Display, so the log never sees it and
 *  no file carries it. */
export type Display = {
  card: { w: number; h: number };
  range: { min: { w: number; h: number }; max: { w: number; h: number } };
  /** Whether a layer shows the key to what it draws unless that layer says otherwise, and which
   *  corner it keeps it in. */
  legend: boolean;
  corner: "top" | "bottom";
  /** Whether the lattice draws behind the cards, where the host offers it here. */
  lattice?: boolean;
  /** Whether a card that fits its content shows all of it, where the host offers it here. */
  full?: boolean;
};

/** The two corners a legend may sit in. Right either way — the left is the crumbs' and the zoom
 *  controls'. */
const CORNERS = [{ value: "top", word: "top" }, { value: "bottom", word: "bottom" }] as const;

export type WorkspaceProps = { graph: Graph; display?: Display; onAct?: Act; onDisplay?: Act };

export function Workspace({ graph, display, onAct = NOOP, onDisplay = onAct }: WorkspaceProps) {
  const root = graph.blocks[graph.root];
  if (!root) return <p className="empty">that is not here any more</p>;

  const readonly = onAct === NOOP;
  return (
    <div className="panel workspace">
      <div className="col identity">
        <Band label="identity" />
        <fieldset className="rows-set" disabled={readonly}>
        <Body>
          <Line label="name" tip="What this workspace is called, as the explorer and a file write it.">
            <Entry key={graph.root} value={root.name ?? ""} label="name" blank
                   placeholder={shown_name(graph, graph.root)}
                   onCommit={(to) => onAct("rename", { id: graph.root, name: to })} />
          </Line>
          <Line label="tags" tip="Tags that say what this is like. A new word makes a tag.">
            <Tags tags={root.tags ?? []} name={(t) => def_at(graph, t)?.name ?? t}
                  onCommit={(to) => onAct("tag", { ids: [graph.root], tags: to })} />
          </Line>
        </Body>
        </fieldset>
        {display ? <Drawing display={display} onAct={onDisplay} /> : null}
      </div>

      <div className="col file">
        <Band label="file" />
        <Body>
          <Line label="name" tip="What an export of this workspace is called. It follows the name above, so renaming the workspace renames the file it writes.">
            <span className="read">{`${file_name(graph)}.json`}</span>
          </Line>
          <Line label="schema" tip="The contract a file of this workspace is written to.">
            <span className="read">{SCHEMA}</span>
          </Line>
          <Line label="packages" tip="How many vocabularies this workspace draws on. The floor counts: every workspace stands on it. Which ones they are is the packages tab's answer.">
            <span className="read">{packages(graph).length}</span>
          </Line>
          <Line label="definitions" tip="Every definition the workspace can name, a package's and the floor's among its own.">
            <span className="read">{all_defs(graph).length}</span>
          </Line>
          {/* Leaving the workspace is the host's: it reaches a port, never the graph. */}
          {readonly ? null : (
            <Line label="export" tip="Write this workspace to a file — whole, with every package it draws on — or as a package of its own, its root and ids prefixed with the name it is given.">
              <button className="opt" onClick={() => onAct("@export")}>workspace</button>
              <button className="opt" onClick={() => onAct("@export_package")}>as package</button>
            </Line>
          )}
        </Body>
      </div>

      <Content key={graph.root} graph={graph} id={graph.root}
               {...(readonly ? {} : { onAct })} />
    </div>
  );
}

/** What the whole drawing does, as against what any one element says. */
function Drawing({ display, onAct }: { display: Display; onAct: Act }) {
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
        <Line label="legend" className="key"
              tip="Whether a layer shows what it draws and what it means, and which right-hand corner it sits in. This is the default: any layer can say otherwise from the display rail, and keeps its own answer.">
          <Check on={display.legend} word="show" tip="What a layer does unless it says otherwise"
                 onPick={(yes) => onAct("legends", { show: yes })} />
          <Pick name="legend-corner" on={display.corner} of={CORNERS}
                onPick={(at) => onAct("legend_corner", { at })} />
        </Line>
        {display.lattice === undefined && display.full === undefined ? null : (
          <Line label="layer" tip="How every layer draws: the lattice behind its cards, and whether a card shows all it says or a preview of it.">
            {display.lattice === undefined ? null : (
              <Check on={display.lattice} word="lattice" tip="Draw the lattice behind every layer"
                     onPick={(yes) => onAct("lattice", { show: yes })} />
            )}
            {display.full === undefined ? null : (
              <Check on={display.full} word="full content"
                     tip="Grow a card to show all it says, rather than cut it off at the card height"
                     onPick={(yes) => onAct("full", { show: yes })} />
            )}
          </Line>
        )}
      </Body>
    </>
  );
}
