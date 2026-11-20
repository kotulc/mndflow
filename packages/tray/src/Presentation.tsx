/** **A presentation in the tray** (docs/presentations.md *The tray*): leading the overview while a
 *  model is open. Before one plays, the model's presentations to start; playing, its name and the
 *  stop's place in it, the stop's title and summary, its steps numbered as they appear, the
 *  controls (previous, next, replay, into, out, the pace, stop), a dive's resume, and the stop
 *  list. The host keeps the state and plays it; the tray only draws it. */

import { List, Section, type Item } from "./Lists";

/** The paces offered, in seconds; `0` waits for each click. */
const PACES = [0, 1, 1.7, 3];

/** What the tray draws: a presentation playing, or those a model offers. */
export type PresentationProps =
  | { name: string; stop: number; stops: readonly string[]; title: string; summary: string;
      steps: readonly string[]; shown: number; pace: number; into: boolean; out: boolean;
      dive: string | null; onNext: () => void; onPrev: () => void; onGo: (at: number) => void;
      onReplay: () => void; onInto: () => void; onOut: () => void; onResume: () => void;
      onStop: () => void; onPace: (s: number) => void }
  | { name: null; offered: readonly string[]; onStart: (at: number) => void };

export function Presentation(props: PresentationProps) {
  if (props.name === null) {
    if (!props.offered.length) return null;
    const items: Item[] = props.offered.map((name, at) => ({
      id: String(at), mark: "▶", name, onPick: () => props.onStart(at) }));
    return (
      <Section name="presentations" parts
               about="The model's presentations: ordered, narrated stops, played like a slide deck">
        <List label="play one" items={items} />
      </Section>
    );
  }
  const p = props;
  const shown = Math.min(p.shown, p.steps.length);
  const steps: Item[] = p.steps.slice(0, shown).map((text, i) => ({
    id: String(i), mark: i + 1, name: text, on: i === shown - 1 }));
  const stops: Item[] = p.stops.map((title, at) => ({
    id: String(at), mark: at + 1, name: title, on: at === p.stop, onPick: () => p.onGo(at) }));
  const last = shown >= p.steps.length && p.stop === p.stops.length - 1 && !p.out;
  return (
    <Section name="presenting" parts
             about="A presentation playing: the stop's steps build one at a time; next shows the next at once">
      <p className="why"><b>{p.name}</b> · stop {p.stop + 1} of {p.stops.length}</p>
      <p className="why"><b>{p.title}</b></p>
      <p className="why">{p.summary}</p>
      <div className="chips">
        <button className="chip" disabled={p.stop === 0} onClick={p.onPrev}>‹ previous</button>
        <button className="chip" disabled={last} onClick={p.onNext}>next ›</button>
        <button className="chip" onClick={p.onReplay}>replay</button>
        <button className="chip" disabled={!p.into} onClick={p.onInto}>into</button>
        <button className="chip" disabled={!p.out} onClick={p.onOut}>out</button>
        <button className="chip" onClick={p.onStop}>stop</button>
      </div>
      <div className="chips">
        <span className="faint">pace</span>
        {PACES.map((s) => (
          <button key={s} className={s === p.pace ? "chip on" : "chip"}
                  onClick={() => p.onPace(s)}>{s ? `${s} s` : "on click"}</button>
        ))}
      </div>
      {p.dive ? (
        <p className="why">In {p.dive}. <button className="chip" onClick={p.onResume}>
          resume</button> or press Escape to go back to the stop.</p>
      ) : null}
      {steps.length ? <List label="steps" items={steps} /> : null}
      <List label="stops" items={stops} />
    </Section>
  );
}
