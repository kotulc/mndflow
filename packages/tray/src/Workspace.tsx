/** **The workspace and a package, elements like any other**: their overview's answers, and the
 *  workspace's settings, the display: how every room and view draws, workspace-wide. Given no
 *  `onAct` the workspace itself is read only; its display still answers `onDisplay`, since how a
 *  drawing looks is the session's and changes nothing. */

import { all_defs, def_at, file_name, package_of, packages, SCHEMA, shown_name,
         type Act, type Graph, type Id } from "@mnd/core";
import { Band, Body, Check, Line, NOOP, Pick } from "./Body";
import { Content } from "./Content";
import { Entry } from "./Entry";
import { Tags } from "./Tags";
import { Empty, Section } from "./Lists";

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
};

/** The two corners a legend may sit in. Right either way — the left is the crumbs' and the zoom
 *  controls'. */
const CORNERS = [{ value: "top", word: "top" }, { value: "bottom", word: "bottom" }] as const;

/** **A scope's answers** — the workspace's or a package's — in the overview's sections: why it
 *  matters, its name and what it is for, editable on the workspace; how it is made, in counts;
 *  the workspace's file. Given no `onAct`, read only. */
export function ScopeAnswers({ graph, id, onAct = NOOP }: { graph: Graph; id: Id; onAct?: Act }) {
  const b = graph.blocks[id];
  if (!b) return null;
  const whole = id === graph.root;
  const readonly = onAct === NOOP || !whole;
  const within = (x: Id) => whole || package_of(graph, x) === id;
  const blocks = Object.values(graph.blocks).filter((x) => !x.def && x.parent && within(x.id)).length;
  const defs = all_defs(graph).filter((d) => within(d.id)).length;
  return (
    <>
      <Section name="why it matters" about="What it is for, in its own words">
        {readonly ? (
          <>
            {b.description ? <p className="why">{b.description}</p> : <Empty>no description yet</Empty>}
            {b.tags?.length ? (
              <div className="chips">
                {b.tags.map((t) => <span key={t} className="chip-like">{def_at(graph, t)?.name ?? t}</span>)}
              </div>
            ) : null}
          </>
        ) : (
          <fieldset className="rows-set">
            <Body>
              <Line label="name" tip="What this workspace is called, as the explorer and a file write it.">
                <Entry key={id} value={b.name ?? ""} label="name" blank
                       placeholder={shown_name(graph, id)}
                       onCommit={(to) => onAct("rename", { id, name: to })} />
              </Line>
              <Line label="about" tip="What this workspace is for, in a line.">
                <Entry key={`${id}:about`} value={b.description ?? ""} label="about"
                       blank placeholder="what it is for"
                       onCommit={(to) => onAct("describe", { id, description: to })} />
              </Line>
              <Line label="tags" tip="Tags that say what this is like. A new word makes a tag.">
                <Tags tags={b.tags ?? []} name={(t) => def_at(graph, t)?.name ?? t}
                      onCommit={(to) => onAct("tag", { ids: [id], tags: to })} />
              </Line>
            </Body>
          </fieldset>
        )}
      </Section>
      <Section name="how it is made" about="What it holds, counted">
        <div className="stat">
          {blocks ? <span><b>{blocks}</b> blocks</span> : null}
          {whole ? <span><b>{packages(graph).length}</b> packages</span> : null}
          <span><b>{defs}</b> definitions</span>
        </div>
      </Section>
      {/* A package's own text, last, as any element's. */}
      {!whole && b.body?.trim() ? (
        <Section name="text" about="What it says, as markdown">
          <Content graph={graph} id={id} band={false} />
        </Section>
      ) : null}
      {whole ? (
        <Section name="its file" about="What an export of it is called, and the contract it is written to">
          <Body>
            <Line label="file" tip="What an export of this workspace is called. It follows the name above, so renaming the workspace renames the file it writes.">
              <span className="read">{`${file_name(graph)}.json`}</span>
            </Line>
            <Line label="schema" tip="The contract a file of this workspace is written to.">
              <span className="read">{SCHEMA}</span>
            </Line>
            {/* Leaving the workspace is the host's: it reaches a port, never the graph. */}
            {onAct === NOOP ? null : (
              <Line label="export" tip="Write this workspace to a file — whole, with every package it draws on — or as a package of its own, its root and ids prefixed with the name it is given.">
                <button className="opt" onClick={() => onAct("@export")}>workspace</button>
                <button className="opt" onClick={() => onAct("@export_package")}>as package</button>
              </Line>
            )}
          </Body>
        </Section>
      ) : null}
    </>
  );
}

/** **The workspace's settings**: how every room draws, as against what any one element says. */
export function DisplaySettings({ display, onAct }: { display: Display; onAct: Act }) {
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
      </Body>
    </div>
  );
}
