/** **The walk** (2026-11-08): while a model with a path is open, the overview's answers lead
 *  with it, in the tab's own parts — a titled section: the step controls as chips (previous,
 *  next, into a sub model, out of it), the step in words, what crosses it and what comes next as a
 *  list, then the stack as lists, like a stack trace: the top model's steps, the step picked in
 *  the accent's wash, and under it each model it was entered from, held at its step. Picking a
 *  step goes to it, picking a held step goes back to it. The host keeps the stack and words the
 *  step; the tray only draws them. */

import { Icon } from "@mnd/theme";
import type { CSSProperties } from "react";
import { List, Section, type Item } from "./Lists";

/** A colour, as the explorer's rows read it. */
type Tint = { "data-family"?: string; style?: Record<string, string> };

/** One step: the block it reaches and the one it leaves, its colour, and whether the block it
 *  reaches is a sub model, entered by *into*. */
export type WalkStep = { to: string; from: string; tint?: Tint; into?: boolean };

/** One model on the stack: its name, its steps, and the one walked (null before the first). */
export type Frame = { model: string; steps: readonly WalkStep[]; at: number | null };

/** A step as the tray reads it: where it is in the path, its ends, what crosses it, the sub
 *  model its far end is, and the next hop in words. */
export type StepRead = { at: number; of: number; from: string; to: string;
                         carries: readonly string[]; into: string | null; next: string | null };

export type WalkProps = {
  frames: readonly Frame[];
  step: StepRead | null;
  onStep: (at: number | null) => void;
  onInto: () => void;
  onOut: () => void;
  /** Back to the frame at this depth, popping those above it. */
  onFrame: (depth: number) => void;
};

export function Walk({ frames, step, onStep, onInto, onOut, onFrame }: WalkProps) {
  const top = frames[frames.length - 1];
  if (!top) return null;
  const { steps, at } = top;
  const into = at !== null && !!steps[at]?.into;
  /** A step as a row: its block's colour, the block it reaches, the one it leaves. */
  const row = (s: WalkStep, n: number, on: boolean, pick: () => void): Item => ({
    id: String(n),
    mark: <i className="dot" {...(s.tint?.["data-family"]
      ? { "data-family": s.tint["data-family"] } : {})}
             style={(s.tint?.style ?? {}) as CSSProperties} />,
    name: s.to, kind: `from ${s.from}`,
    says: s.into ? <><Icon name="role_root" size={11} /> {n + 1}</> : n + 1,
    on, onPick: pick,
  });
  const told: Item[] = step ? [
    ...(step.carries.length ? [{ id: "carries", name: "carries",
                                 says: step.carries.join(", ") }] : []),
    ...(step.into ? [{ id: "into", name: "sub model", says: `${step.into}: into follows it` }]
      : []),
    { id: "next", name: "next", says: step.next ?? "the path ends here", quiet: !step.next },
  ] : [];
  return (
    <Section name="walk" parts
             about="The model's path, one hop a step: walk it, step into a sub model, and back out">
      <div className="chips">
        <button className="chip" disabled={at === null} onClick={() => onStep(at ? at - 1 : null)}>
          ‹ previous</button>
        <button className="chip" disabled={at === steps.length - 1}
                onClick={() => onStep(at === null ? 0 : at + 1)}>next ›</button>
        <button className="chip" disabled={!into} onClick={onInto}>into</button>
        <button className="chip" disabled={frames.length < 2} onClick={onOut}>out</button>
      </div>
      <p className="why">
        {step ? <>step {step.at + 1} of {step.of} · <b>{step.from} → {step.to}</b></>
          : `${steps.length} steps; next starts at ${steps[0]?.from ?? "its first block"}.`}
      </p>
      {step ? <List label="this step" items={told} /> : null}
      <List label={top.model}
            items={steps.map((s, n) => row(s, n, n === at, () => onStep(n)))} />
      {frames.slice(0, -1).map((f, depth) => f.at === null ? null : (
        <List key={depth} label={`${f.model} · held`}
              items={[row(f.steps[f.at]!, f.at, false, () => onFrame(depth))]} />
      )).reverse()}
    </Section>
  );
}
