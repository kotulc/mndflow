/** The workspace tab, laid out as every overview is: the world fitted on the left; why, how and
 *  where on the right; then the display — how every room and view draws, workspace-wide. Given no
 *  `onAct` the workspace itself is read only; its display still answers `onDisplay`, since how a
 *  drawing looks is the session's and changes nothing. */

import type { ReactNode } from "react";
import { all_defs, def_at, file_name, packages, SCHEMA, shown_name,
         type Act, type Graph, type Id } from "@mnd/core";
import { Band, Body, Check, Line, NOOP, Pick } from "./Body";
import { Entry } from "./Entry";
import { Tags } from "./Tags";

/** What the workspace draws with rather than holds: the default card in units and the range it
 *  is held inside, and how every room draws. Display, so the log never sees it and no file
 *  carries it. **One answer for every room and view**: nothing here is per layer. */
export type Display = {
  card: { w: number; h: number };
  range: { min: { w: number; h: number }; max: { w: number; h: number } };
  /** Whether the key to what a room draws shows, and which corner it keeps. */
  legend: boolean;
  corner: "top" | "bottom";
  /** Whether the lattice draws behind the cards, where the host offers it here. */
  lattice?: boolean;
  /** Whether the focus's walls and name draw. */
  frame?: boolean;
  /** Whether interfaces draw. */
  ports?: boolean;
  /** How what lies outside the focus draws: dimmed, or only its rooms' outlines. */
  context?: "dim" | "rings";
};

/** The two corners a legend may sit in. Right either way — the left is the crumbs' and the zoom
 *  controls'. */
const CORNERS = [{ value: "top", word: "top" }, { value: "bottom", word: "bottom" }] as const;

/** How what lies outside the focus draws. */
const CONTEXTS = [{ value: "dim", word: "dim" }, { value: "rings", word: "rings" }] as const;

export type WorkspaceProps = {
  graph: Graph; display?: Display; onAct?: Act; onDisplay?: Act;
  /** The world at a glance, drawn by the host. */
  thumb?: (id: Id) => ReactNode;
};

export function Workspace({ graph, display, onAct = NOOP, onDisplay = onAct, thumb }: WorkspaceProps) {
  const root = graph.blocks[graph.root];
  if (!root) return <p className="empty">that is not here any more</p>;

  const readonly = onAct === NOOP;
  const blocks = Object.values(graph.blocks).filter((b) => !b.def && b.parent).length;
  const drawing = thumb ? thumb(graph.root) : null;
  return (
    <div className="workspace-tab">
      <div className="overview">
        <div className="glance">
          <span className="cap"><b>workspace</b><span> · the world at a glance</span></span>
          {drawing ? <div className="thumb">{drawing}</div> : <p className="faint">nothing drawn yet</p>}
        </div>
        <div className="answers">
          <section>
            <h5>why it matters</h5>
            <fieldset className="rows-set" disabled={readonly}>
              <Body>
                <Line label="name" tip="What this workspace is called, as the explorer and a file write it.">
                  <Entry key={graph.root} value={root.name ?? ""} label="name" blank
                         placeholder={shown_name(graph, graph.root)}
                         onCommit={(to) => onAct("rename", { id: graph.root, name: to })} />
                </Line>
                <Line label="about" tip="What this workspace is for, in a line.">
                  <Entry key={`${graph.root}:about`} value={root.description ?? ""} label="about"
                         blank placeholder="what it is for"
                         onCommit={(to) => onAct("describe", { id: graph.root, description: to })} />
                </Line>
                <Line label="tags" tip="Tags that say what this is like. A new word makes a tag.">
                  <Tags tags={root.tags ?? []} name={(t) => def_at(graph, t)?.name ?? t}
                        onCommit={(to) => onAct("tag", { ids: [graph.root], tags: to })} />
                </Line>
              </Body>
            </fieldset>
          </section>
          <section>
            <h5>how it is made</h5>
            <div className="stat">
              <span><b>{blocks}</b> blocks</span>
              <span><b>{packages(graph).length}</b> packages</span>
              <span><b>{all_defs(graph).length}</b> definitions</span>
            </div>
          </section>
          <section>
            <h5>where it lives</h5>
            <Body>
              <Line label="file" tip="What an export of this workspace is called. It follows the name above, so renaming the workspace renames the file it writes.">
                <span className="read">{`${file_name(graph)}.json`}</span>
              </Line>
              <Line label="schema" tip="The contract a file of this workspace is written to.">
                <span className="read">{SCHEMA}</span>
              </Line>
              {/* Leaving the workspace is the host's: it reaches a port, never the graph. */}
              {readonly ? null : (
                <Line label="export" tip="Write this workspace to a file — whole, with every package it draws on — or as a package of its own, its root and ids prefixed with the name it is given.">
                  <button className="opt" onClick={() => onAct("@export")}>workspace</button>
                  <button className="opt" onClick={() => onAct("@export_package")}>as package</button>
                </Line>
              )}
            </Body>
          </section>
        </div>
      </div>
      {display ? <Drawing display={display} onAct={onDisplay} /> : null}
    </div>
  );
}

/** How every room draws, as against what any one element says. */
function Drawing({ display, onAct }: { display: Display; onAct: Act }) {
  const { card, range } = display;

  /** One side of it, held inside the range the drawing allows. */
  const side = (axis: "w" | "h") => (
    <input type="number" aria-label={axis === "w" ? "card width" : "card height"}
           value={card[axis]} min={range.min[axis]} max={range.max[axis]} step={1}
           onChange={(e) => onAct("card", { ...card, [axis]: Number(e.target.value) })} />
  );

  return (
    <div className="display">
      <Band label="display" />
      <Body>
        <Line label="card" className="card"
              tip="The room a card takes where its definition asked for none, in units of the lattice.">
          {side("w")}<span className="into">×</span>{side("h")}<span className="alias">units</span>
        </Line>
        <Line label="draws" tip="What every room draws, whichever is in focus.">
          <Check on={display.frame ?? true} word="frame" tip="The focus's walls and name"
                 onPick={(yes) => onAct("frame", { show: yes })} />
          {display.lattice === undefined ? null : (
            <Check on={display.lattice} word="guides" tip="The lattice behind the cards"
                   onPick={(yes) => onAct("lattice", { show: yes })} />
          )}
          <Check on={display.ports ?? true} word="ports" tip="Interfaces on cards and walls"
                 onPick={(yes) => onAct("ports", { show: yes })} />
        </Line>
        <Line label="key" className="key"
              tip="Whether the key to what a room draws and what it means shows, and which right-hand corner it sits in.">
          <Check on={display.legend} word="show" tip="Show the key"
                 onPick={(yes) => onAct("legends", { show: yes })} />
          <Pick name="legend-corner" on={display.corner} of={CORNERS}
                onPick={(at) => onAct("legend_corner", { at })} />
        </Line>
        <Line label="context" tip="How what lies outside the focus draws: dimmed in place, or only the outlines of the rooms holding it.">
          <Pick name="context" on={display.context ?? "dim"} of={CONTEXTS}
                onPick={(at) => onAct("context", { at })} />
        </Line>
      </Body>
    </div>
  );
}
