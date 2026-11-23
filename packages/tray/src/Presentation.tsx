/** **A presentation in the tray** (docs/presentations.md *The player*, the user 2026-11-22): the
 *  player is a bar held at the tray's foot (`Bar`), shown only where the pick has a presentation
 *  or one plays; while one plays, the overview's answers column is the stop (`Steps`): its
 *  stops, its summary and every step, the one shown lit and kept in view. The host keeps the
 *  state; the tray only draws it. */

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { Featured, Id } from "@mnd/core";
import { Icon } from "@mnd/theme";

/** The paces offered, in seconds; `0` waits for each click. */
const PACES = [0, 1, 1.7, 3];

/** A presentation playing: its place, what the stop says, and the moves on it. */
export type Playing = {
  name: string; stop: number; stops: readonly string[]; title: string; summary: string;
  steps: readonly string[]; shown: number; paused: boolean; pace: number; first: boolean;
  last: boolean; into: boolean; out: boolean; dive: string | null; onToggle: () => void;
  onNext: () => void; onPrev: () => void; onGo: (at: number) => void; onInto: () => void;
  onOut: () => void; onResume: () => void; onStop: () => void; onPace: (s: number) => void };

/** What the tray draws: a presentation playing, or how one is started. */
export type PresentationProps =
  | Playing
  | { name: null; onStart: (model: Id, at: number, stop: number) => void };

/** **The player bar**: playing, its controls, the stop's place and name, the way in and out and
 *  the pace; idle, the same controls and the presentation the pick is in (a choice where it is
 *  in several), ▶ playing it from the first stop showing the pick. Nothing where it is in none. */
export function Bar({ p, featured }: { p: PresentationProps; featured: readonly Featured[] }) {
  const [at, set_at] = useState(0);
  if (p.name !== null) return <Controls {...p} />;
  const f = featured[Math.min(at, featured.length - 1)];
  if (!f) return null;
  const from = f.stops[0]?.at ?? 0;
  return (
    <div className="deck-row">
      <button type="button" title="the stop before" disabled><Icon name="skip_back" size={13} solid /></button>
      <button type="button" className="main" title={`play from stop ${from + 1}`}
              onClick={() => p.onStart(f.model, f.at, from)}>
        <Icon name="play" size={15} solid />
      </button>
      <button type="button" title="the next step" disabled><Icon name="skip_next" size={13} solid /></button>
      <button type="button" title="stop playing" disabled><Icon name="halt" size={11} solid /></button>
      <span className="deck-name">
        {featured.length > 1 ? (
          <select aria-label="presentation" value={at} onChange={(e) => set_at(Number(e.target.value))}>
            {featured.map((x, i) => <option key={`${x.model}:${x.at}`} value={i}>{x.name}</option>)}
          </select>
        ) : <b>{f.name}</b>}
        <span className="deck-from" title={f.stops[0]?.title}>
          from {from + 1}{f.stops[0]?.title !== f.name ? ` · ${f.stops[0]?.title}` : ""}
        </span>
      </span>
    </div>
  );
}

/** Playing: back, play or pause, on, stop; the stop's place and name; resume, into, out; pace. */
function Controls(p: Playing) {
  return (
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
      <span className="deck-name" title={`${p.name} › ${p.title}`}>
        <span className="deck-at">{p.stop + 1}/{p.stops.length}</span><b>{p.title}</b>
        {p.name !== p.title ? <span className="deck-from">{p.name}</span> : null}
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
  );
}

/** **The stop, in the answers column** while playing: the presentation's stops as numbered
 *  pills, the stop's summary, and every step — those shown read, the one shown lit, those to
 *  come faint — the lit one kept in view a third of the way down. */
export function Steps(p: Playing) {
  const shown = Math.min(p.shown, p.steps.length);
  const summary_lit = !shown || !!p.dive;
  const lit = useRef<HTMLElement>(null);
  /** Instant as it mounts (the overview is drawn again as the tray follows the step), smooth
   *  after. */
  const moved = useRef(false);
  useLayoutEffect(() => {
    if (lit.current) bring(lit.current, moved.current);
    moved.current = true;
  }, [p.stop, shown, p.dive]);
  return (
    <div className="deck">
      <div className="band"><span>{p.name}</span><span className="n">{p.stops.length} stops</span></div>
      <div className="deck-stops">
        {p.stops.map((title, at) => (
          <button key={at} type="button" title={title} className={at === p.stop ? "on" : ""}
                  onClick={() => p.onGo(at)}>{at + 1}</button>
        ))}
      </div>
      <h4 className="deck-title">{p.title}</h4>
      <div className={summary_lit ? "deck-summary on" : "deck-summary"}
           ref={summary_lit ? (lit as RefObject<HTMLDivElement>) : null}>
        <p>{p.dive ? `In ${p.dive}: Escape or resume goes back to the stop.` : p.summary}</p>
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
    </div>
  );
}

/** **Bring the lit step into view** (the user, 2026-11-22: steps went off screen): its nearest
 *  scrolling holder scrolled to set it a third of the way down, so what led to it shows too. */
function bring(el: HTMLElement, smooth: boolean) {
  let box = el.parentElement;
  while (box && !(/(auto|scroll)/.test(getComputedStyle(box).overflowY)
                  && box.scrollHeight > box.clientHeight)) box = box.parentElement;
  if (!box) return;
  const [b, e] = [box.getBoundingClientRect(), el.getBoundingClientRect()];
  const top = box.scrollTop + e.top - b.top - Math.max(0, b.height - e.height) / 3;
  box.scrollTo({ top: Math.max(0, top), behavior: smooth ? "smooth" : "auto" });
}
