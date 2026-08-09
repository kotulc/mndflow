/** Action log: one line per step. What was done, newest first.
 *
 *  Going back through them is not offered here. Undo and redo are wanted
 *  constantly and this panel is not, so they live in the corner controls where
 *  reaching them never means opening anything first. */

import type { Step } from "../graph/types";

type Props = {
  steps: Step[];
};

export function Log({ steps }: Props) {
  return (
    <section className="log">

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
