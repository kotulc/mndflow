/** **A presentation's player** (docs/presentations.md *The player*, 2026-11-21): over the foot of
 *  the canvas, as a video's controls are. A caption — the stop's title, then the step just shown,
 *  else the stop's summary — over one row of controls: the stop before, play or pause, the stop
 *  after, stop; the stop's place; the pace. The host keeps the state and plays it. */

import { Icon } from "@mnd/theme";

/** The paces offered, in seconds; `0` waits for each click. */
const PACES = [0, 1, 1.7, 3];

/** What the player draws, and how each control is answered. */
export type Playing = {
  name: string; title: string; caption: string; stop: number; stops: number; paused: boolean;
  pace: number; first: boolean; last: boolean;
  /** Where the stop leads into a sub presentation, and where one was entered. */
  into: boolean; out: boolean;
  /** The part a click dived into, which resume leaves. */
  dive: string | null;
  onToggle: () => void; onPrev: () => void; onNext: () => void; onStop: () => void;
  onInto: () => void; onOut: () => void; onResume: () => void; onPace: (s: number) => void;
};

export function Player({ p }: { p: Playing }) {
  return (
    <div className="mnd-player">
      <div className="mnd-player-caption">
        <b>{p.title}</b>
        <span>{p.dive ? `In ${p.dive}: Escape or resume goes back to the stop.` : p.caption}</span>
      </div>
      <div className="mnd-player-row">
        <button type="button" title="the stop before (←)" disabled={p.first} onClick={p.onPrev}>
          <Icon name="skip_back" size={14} solid />
        </button>
        <button type="button" className="main" title={p.paused ? "play (space)" : "pause (space)"}
                onClick={p.onToggle}>
          <Icon name={p.paused ? "play" : "pause"} size={16} solid />
        </button>
        <button type="button" title="the next step, then the next stop (→)" disabled={p.last}
                onClick={p.onNext}>
          <Icon name="skip_next" size={14} solid />
        </button>
        <button type="button" title="stop playing (Escape)" onClick={p.onStop}>
          <Icon name="halt" size={12} solid />
        </button>
        <span className="mnd-player-where" title={p.name}>
          {p.name} · {p.stop + 1} / {p.stops}
        </span>
        {p.dive ? <button type="button" onClick={p.onResume}>resume</button> : null}
        {p.into ? <button type="button" title="play the part's own presentation"
                          onClick={p.onInto}>into ›</button> : null}
        {p.out ? <button type="button" title="back to the presentation it came from"
                         onClick={p.onOut}>‹ out</button> : null}
        <select title="pace: seconds between steps" value={p.pace}
                onChange={(e) => p.onPace(Number(e.target.value))}>
          {[...new Set([...PACES, p.pace])].sort((a, z) => a - z).map((s) => (
            <option key={s} value={s}>{s ? `${s} s` : "on click"}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
