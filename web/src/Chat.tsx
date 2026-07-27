/** The terminal.
 *
 *  It reads as a session rather than a form: past exchanges scroll away above,
 *  the current question types itself out, and the caret sits at the head of the
 *  line you are writing. The input carries no chrome of its own.
 *
 *  Suggestions sit to the right as a grid of tiles, the same shape a group
 *  shows its contents in. */

import { useEffect, useMemo, useRef } from "react";

import type { Question } from "./core/router";
import { tile } from "./core/layout";
import { suggest, type Suggestion } from "./core/suggest";
import type { Graph, Step } from "./core/types";
import type { Terms } from "./core/workflows";
import { useSettling } from "./useSettling";
import { useTypewriter } from "./useTypewriter";

type Props = {
  graph: Graph;
  steps: Step[];
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
  const { graph, steps, question, view, scope, terms, draft, onDraft, onTurn, onRun } = props;
  const { shown, done } = useTypewriter(question?.prompt ?? "");
  const tail = useRef<HTMLDivElement>(null);

  /** Everything answered so far, oldest first — the session's scrollback. */
  const history = useMemo(() => steps.filter((step) => step.prompt || step.input), [steps]);

  const chips = useMemo(
    () => suggest(graph, question, draft, view, scope, terms),
    [graph, question, draft, view, scope, terms],
  );

  // Keep the live line in view as the session grows.
  useEffect(() => tail.current?.scrollIntoView({ block: "end" }), [history.length, shown]);

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

  const { cols } = tile(Math.max(chips.length, 1));
  // Marks the moment the option set changes under the user's typing.
  const { settling, frame } = useSettling(chips.map((c) => c.key).join("|"));

  return (
    <div className="chat">
      <div className="terminal">
        <div className="scrollback">
          {history.map((step) => (
            <div key={step.id} className={`exchange ${step.status}`}>
              {step.prompt && <div className="said">{step.prompt}</div>}
              <div className="typed">
                <span className="caret">&gt;</span>
                <span>{step.input}</span>
                {!step.mutations.length && <span className="noop">no change</span>}
              </div>
            </div>
          ))}

          <div className="exchange live">
            <div className="said">
              {shown}
              {!done && <span className="cursor" />}
            </div>
            {done && question?.hint && <div className="hint">{question.hint}</div>}

            <label className="typed input">
              <span className="caret">&gt;</span>
              {!draft && <span className="cursor" />}
              <input
                value={draft}
                placeholder={draft ? "" : question?.placeholder || ""}
                onChange={(event) => onDraft(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && submit()}
              />
            </label>
          </div>

          <div ref={tail} />
        </div>
      </div>

      <div className="rail">
        <div className={`settling ${settling ? "on" : ""}`}>
          <span className="spinner">{settling ? frame : "·"}</span>
          <span className="count">
            {chips.filter((c) => !c.hint).length || "no"} option
            {chips.filter((c) => !c.hint).length === 1 ? "" : "s"}
          </span>
        </div>

        <div
          className="choices"
          style={{ gridTemplateColumns: `repeat(${Math.min(cols, 2)}, minmax(0, 1fr))` }}
        >
          {done &&
            chips.map((chip, index) => (
              <button
                key={chip.key}
                className={`chip ${chip.kind} ${chip.hint ? "ghost" : ""}`}
                style={{ animationDelay: `${index * 40}ms` }}
                onClick={() => run(chip)}
                disabled={chip.hint}
                title={chip.label}
              >
                {chip.label}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
