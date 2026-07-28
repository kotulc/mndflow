/** Action log: one line per step, and the way back through them. Steps unwind
 *  in the order they were applied and redo re-applies the last one undone, so
 *  two buttons cover it — there is never a choice of which step to take. */

import type { Step } from "./core/types";

type Props = {
  steps: Step[];
  undoable: boolean;
  redoable: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

export function Log({ steps, undoable, redoable, onUndo, onRedo }: Props) {
  return (
    <section className="log">
      <div className="log-bar">
        <span>Actions</span>
        <span className="actions">
          <button onClick={onUndo} disabled={!undoable}>
            Undo
          </button>
          <button onClick={onRedo} disabled={!redoable}>
            Redo
          </button>
        </span>
      </div>

      <div className="log-lines">
        {[...steps].reverse().map((step) => (
          <div key={step.id} className={`line ${step.status}`}>
            <span className="action">{step.action}</span>
            <span className="text">{step.input}</span>
          </div>
        ))}
        {steps.length === 0 && <div className="line empty">no actions yet</div>}
      </div>
    </section>
  );
}
