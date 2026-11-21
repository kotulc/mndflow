/** **A presentation in the tray** (docs/presentations.md *The tray*): leading the overview while a
 *  model is open. Before one plays, the model's presentations to start; playing, at the top of
 *  the overview and kept there (2026-11-21): its name and the stop's place in it, then the stop
 *  list, the stop playing opened on its summary and its steps as they appear. The controls are
 *  the canvas's player (stage `Player.tsx`); the host keeps the state, the tray only draws it. */

import { List, Section, type Item } from "./Lists";

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
  /** The stop playing opens in place: its summary, then its steps as they appear. */
  const steps: Item[] = p.steps.slice(0, shown).map((text, i) => ({
    id: `step-${i}`, mark: "·", name: text, quiet: i !== shown - 1, on: i === shown - 1 }));
  const stops: Item[] = p.stops.flatMap((title, at): Item[] => [
    { id: String(at), mark: at + 1, name: title, on: at === p.stop, onPick: () => p.onGo(at) },
    ...(at === p.stop ? [{ id: "summary", mark: "", name: p.summary, quiet: true }, ...steps]
      : [])]);
  return (
    <Section name="presenting" parts
             about="A presentation playing: its controls are the player on the canvas; a stop here goes to it">
      <div className="presenting">
        <p className="why"><b>{p.name}</b> · stop {p.stop + 1} of {p.stops.length}</p>
        <List label="stops" items={stops} />
      </div>
    </Section>
  );
}
