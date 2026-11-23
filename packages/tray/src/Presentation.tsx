/** **A presentation in the tray** (docs/presentations.md *The player*, 2026-11-22): the overview's
 *  *presentations* section, in the same place for every element, folding as every section does.
 *  Not playing: each presentation that names the element, its stops that do, each played from
 *  there. Playing: its controls held at the column's top, the stop's name among them; the
 *  presentation's band and its stops as numbered pills; the stop's summary; and every step of
 *  the stop, the one shown lit and the column scrolled to it. The host keeps the state; the tray only draws it. */

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { Featured, Id } from "@mnd/core";
import { Icon } from "@mnd/theme";
import { List, Section, type Item } from "./Lists";

/** The paces offered, in seconds; `0` waits for each click. */
const PACES = [0, 1, 1.7, 3];

/** What the tray draws: a presentation playing, or how one is started. */
export type PresentationProps =
  | { name: string; stop: number; stops: readonly string[]; title: string; summary: string;
      steps: readonly string[]; shown: number; paused: boolean; pace: number; first: boolean;
      last: boolean; into: boolean; out: boolean; dive: string | null; onToggle: () => void;
      onNext: () => void; onPrev: () => void; onGo: (at: number) => void; onInto: () => void;
      onOut: () => void; onResume: () => void; onStop: () => void; onPace: (s: number) => void }
  | { name: null; onStart: (model: Id, at: number, stop: number) => void };

const ABOUT = "The presentations that show it: ordered, narrated stops, played like a slide deck";

export function Presentation({ p, featured }: { p: PresentationProps;
                                                featured: readonly Featured[] }) {
  if (p.name !== null) return <Playing {...p} />;
  if (!featured.length) return null;
  return (
    <Section name="presentations" about={ABOUT} parts>
      {featured.map((f) => (
        <List key={`${f.model}:${f.at}`} label={f.name} items={f.stops.map((s): Item => ({
          id: String(s.at), mark: <Icon name="play" size={9} solid />, name: s.title,
          kind: s.says, says: `${s.at + 1}`, onPick: () => p.onStart(f.model, f.at, s.at) }))} />
      ))}
    </Section>
  );
}

/** Playing: under the section's own head, the presentation's band; its controls, held at the
 *  column's top, the stop's place and name among them; the stops; the stop's summary, cut to a
 *  few lines until opened; and every step of the stop, the shown one lit. */
function Playing(p: Extract<PresentationProps, { name: string }>) {
  const shown = Math.min(p.shown, p.steps.length);
  const [whole, set_whole] = useState(false);
  useEffect(() => set_whole(false), [p.stop]);
  /** Whether the summary runs past its cut, so it offers *more*: measured as drawn, at
   *  whatever width the column has now. */
  const words = useRef<HTMLParagraphElement>(null);
  const [long, set_long] = useState(false);
  useLayoutEffect(() => {
    const el = words.current;
    if (el && !whole) set_long(el.scrollHeight > el.clientHeight + 1);
  });
  /** The column follows the step lit, else the stop's summary before its first step. */
  const lit = useRef<HTMLElement>(null);
  useEffect(() => { lit.current?.scrollIntoView({ block: "nearest" }); }, [p.stop, shown]);
  const summary_lit = !shown || !!p.dive;
  return (
    <div className="deck">
      <Section name="presentations" about={ABOUT}>
        <div className="list">
          <div className="band"><span>{p.name}</span><span className="n">{p.stops.length} stops</span></div>
        </div>
        <div className="deck-row">
          <button type="button" title="the stop before (←)" disabled={p.first} onClick={p.onPrev}>
            <Icon name="skip_back" size={13} solid />
          </button>
          <button type="button" className="main" title={p.paused ? "play (space)" : "pause (space)"}
                  onClick={p.onToggle}>
            <Icon name={p.paused ? "play" : "pause"} size={15} solid />
          </button>
          <button type="button" title="the next step, then the next stop (→)" disabled={p.last}
                  onClick={p.onNext}>
            <Icon name="skip_next" size={13} solid />
          </button>
          <button type="button" title="stop playing (Escape)" onClick={p.onStop}>
            <Icon name="halt" size={11} solid />
          </button>
          <span className="deck-name" title={p.title}>
            <span className="deck-at">{p.stop + 1}/{p.stops.length}</span><b>{p.title}</b>
          </span>
          {p.dive ? <button type="button" onClick={p.onResume}>resume</button> : null}
          {p.into ? <button type="button" title="play the part's own presentation"
                            onClick={p.onInto}>into ›</button> : null}
          {p.out ? <button type="button" title="back to the presentation it came from"
                           onClick={p.onOut}>‹ out</button> : null}
          <select title="pace: seconds between steps" aria-label="pace" value={p.pace}
                  onChange={(e) => p.onPace(Number(e.target.value))}>
            {[...new Set([...PACES, p.pace])].sort((a, z) => a - z).map((s) => (
              <option key={s} value={s}>{s ? `${s} s` : "click"}</option>
            ))}
          </select>
        </div>
        <div className="deck-stops">
          {p.stops.map((title, at) => (
            <button key={at} type="button" title={title} className={at === p.stop ? "on" : ""}
                    onClick={() => p.onGo(at)}>{at + 1}</button>
          ))}
        </div>
        <div className={summary_lit ? "deck-summary on" : "deck-summary"}
             ref={summary_lit ? (lit as RefObject<HTMLDivElement>) : null}>
          <p className={whole ? "" : "cut"} ref={words}>
            {p.dive ? `In ${p.dive}: Escape or resume goes back to the stop.` : p.summary}
          </p>
          {long || whole ? (
            <button type="button" className="deck-more" onClick={() => set_whole(!whole)}>
              {whole ? "less" : "more"}
            </button>
          ) : null}
        </div>
        {p.steps.length ? (
          <ol className="deck-steps">
            {p.steps.map((text, i) => {
              const now = !p.dive && i === shown - 1;
              return (
                <li key={i} className={now ? "on" : i >= shown ? "later" : ""}
                    ref={now ? (lit as RefObject<HTMLLIElement>) : null}>{text}</li>
              );
            })}
          </ol>
        ) : null}
      </Section>
    </div>
  );
}
