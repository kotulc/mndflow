/** Action log: one line per step the agent or the user applied, plus the
 *  single undo. Steps unwind in the order they were applied, so one button is
 *  enough — there is never a choice of what to undo next. */

import type { HistoryEntry } from "./api";

type Props = {
  history: HistoryEntry[];
  busy: boolean;
  onUndo: () => void;
};

export function Log({ history, busy, onUndo }: Props) {
  const undoable = history.some((entry) => entry.status === "applied");

  return (
    <section className="log">
      <div className="log-bar">
        <span>Actions</span>
        <button onClick={onUndo} disabled={busy || !undoable}>
          Undo
        </button>
      </div>

      <div className="log-lines">
        {history.map((entry) => (
          <div key={entry.id} className={`line ${entry.status}`}>
            <span className="status">{entry.status}</span>
            <span className="action">{entry.action}</span>
            <span className="text">{entry.input}</span>
            <span className="count">{entry.mutations} change(s)</span>
          </div>
        ))}
        {history.length === 0 && <div className="line empty">no actions yet</div>}
      </div>
    </section>
  );
}
