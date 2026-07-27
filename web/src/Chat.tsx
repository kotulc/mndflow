/** Chat pane: the active question typed out a character at a time, with the
 *  suggestions standing beside it.
 *
 *  The input carries no chrome of its own — it is a line of the terminal, and
 *  the caret in front of it is the only thing marking where you type. */

import { useMemo } from "react";

import type { Question } from "./core/router";
import { suggest, type Suggestion } from "./core/suggest";
import type { Graph } from "./core/types";
import type { Terms } from "./core/workflows";
import { useTypewriter } from "./useTypewriter";

type Props = {
  graph: Graph;
  question: Question | null;
  view: string | null;
  scope: string | null;
  terms: Terms;
  draft: string;
  onDraft: (text: string) => void;
  onTurn: (input: string) => void;
  onRun: (suggestion: Suggestion) => void;
};

export function Chat(props: Props) {
  const { graph, question, view, scope, terms, draft, onDraft, onTurn, onRun } = props;
  const { shown, done } = useTypewriter(question?.prompt ?? "");

  const chips = useMemo(
    () => suggest(graph, question, draft, view, scope, terms),
    [graph, question, draft, view, scope, terms],
  );

  function submit() {
    const text = draft.trim();
    if (!text) return;

    onDraft("");
    onTurn(text);
  }

  function run(chip: Suggestion) {
    if (chip.hint) return;

    onDraft("");
    chip.kind === "answer" ? onTurn(chip.value) : onRun(chip);
  }

  return (
    <div className="chat">
      <div className="prompt">
        <strong>
          {shown}
          <span className="cursor" />
        </strong>
        {done && question?.hint && <em>{question.hint}</em>}

        <div className="composer">
          <span className="caret">&gt;</span>
          <input
            value={draft}
            placeholder={question?.placeholder || "type, or pick something"}
            onChange={(event) => onDraft(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
          />
        </div>
      </div>

      <div className="choices">
        {done &&
          chips.map((chip, index) => (
            <button
              key={chip.key}
              className={`chip ${chip.hint ? "ghost" : ""} ${chip.kind}`}
              style={{ animationDelay: `${index * 45}ms` }}
              onClick={() => run(chip)}
              disabled={chip.hint}
            >
              {chip.label}
            </button>
          ))}
      </div>
    </div>
  );
}
