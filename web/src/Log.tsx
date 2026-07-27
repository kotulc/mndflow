/** Action log: one line per step applied, plus the single undo. Steps unwind in
 *  the order they were applied, so one button is enough — there is never a
 *  choice of what to undo next. */

import type { Step } from "./core/types";

type Props = {
  steps: Step[];
  undoable: boolean;
  onUndo: () => void;
};

export function Log({ steps, undoable, onUndo }: Props) {
  return (
    <section className="log">
      <div className="log-bar">
        <span>Actions</span>
        <button onClick={onUndo} disabled={!undoable}>
          Undo
        </button>
      </div>

      <div className="log-lines">
        {[...steps].reverse().map((step) => (
          <div key={step.id} className={`line ${step.status}`}>
            <span className="action">{step.action}</span>
            <span className="text">{step.input}</span>
            <span className="count">{step.mutations.length} change(s)</span>
          </div>
        ))}
        {steps.length === 0 && <div className="line empty">no actions yet</div>}
      </div>
    </section>
  );
}
