/** Chat pane: the active workflow question, typed out a character at a time,
 *  with the suggested answers appearing as chips once the line finishes. */

import { useState } from "react";

import type { WorkflowStep } from "./api";
import { useTypewriter } from "./useTypewriter";

type Props = {
  question: WorkflowStep | null;
  busy: boolean;
  onTurn: (input: string) => void;
};

export function Chat({ question, busy, onTurn }: Props) {
  const [draft, setDraft] = useState("");
  const { shown, done } = useTypewriter(question?.prompt ?? "What are you looking to build?");

  function submit() {
    const text = draft.trim();
    if (!text || busy) return;

    setDraft("");
    onTurn(text);
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
            placeholder={question?.placeholder || "Type your answer…"}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
            disabled={busy}
          />
          <button onClick={submit} disabled={busy}>
            Send
          </button>
        </div>
      </div>

      {done && question && question.choices.length > 0 && (
        <div className="choices">
          {question.choices.map((choice, index) => (
            <button
              key={choice}
              className="chip"
              style={{ animationDelay: `${index * 60}ms` }}
              onClick={() => onTurn(choice)}
              disabled={busy}
            >
              {choice}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
