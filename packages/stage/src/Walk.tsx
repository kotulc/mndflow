/** **Walking a path** (2026-11-04): over the canvas while a block owning a path is picked. Before
 *  it starts it offers the walk and says how many steps it has; walking, it says the step in
 *  words — *3 / 7 · App calls Tray: Tray, Overview* — and steps back, on, or stops. One hop is lit
 *  a step (stage `path.ts`), the camera fitting both its ends (the host's `stop`). */

import type { Hop } from "@mnd/core";

/** A path offered or walked: its steps, the one walked (null before it starts), each step in
 *  words, and how a step is gone to (null stops). */
export type Walking = { steps: readonly Hop[]; at: number | null; said: (h: Hop) => string;
                        onStep: (at: number | null) => void;
                        /** Walked from outside the canvas (a model's path, from the tray): lit
                         *  here, its controls there. */
                        outside?: boolean };

export function Walk({ walk }: { walk: Walking }) {
  const { steps, at, said, onStep } = walk;
  if (at === null) {
    return (
      <div className="mnd-walk">
        <button type="button" onClick={() => onStep(0)}>
          ▶ walk its path · {steps.length} {steps.length === 1 ? "step" : "steps"}
        </button>
      </div>
    );
  }
  return (
    <div className="mnd-walk">
      <button type="button" title="previous step" disabled={at <= 0}
              onClick={() => onStep(at - 1)}>‹</button>
      <span>{`${at + 1} / ${steps.length} · ${said(steps[at]!)}`}</span>
      <button type="button" title="next step" disabled={at >= steps.length - 1}
              onClick={() => onStep(at + 1)}>›</button>
      <button type="button" title="stop walking" onClick={() => onStep(null)}>✕</button>
    </div>
  );
}
