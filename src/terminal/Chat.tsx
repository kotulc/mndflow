/** The terminal.
 *
 *  It has no frame of its own — it is the top of the page. Past exchanges rise
 *  and fade out at the edge rather than scrolling in a box, so the session
 *  reads as one continuous thing with the live line always at the foot.
 *
 *  Suggestions take the other half of the row, tiled in the same treemap shape
 *  a group shows its contents in. That is the whole of this file's business:
 *  the readout that used to share the rail now slides in from the page's own
 *  right edge, and knows nothing about the terminal. */

import { useMemo } from "react";

import { tile } from "../geometry/layout";
import type { Question } from "./router";
import { likeliest, suggest, type Suggestion } from "./suggest";
import type { Graph, Step } from "../graph/types";
import type { Terms } from "./workflows";
import { useEmbeddings } from "../embed/useEmbeddings";
import { useSettling } from "./useSettling";
import { useTypewriter } from "./useTypewriter";

/** How many past exchanges stay on screen before they fade off the top. */
const RECENT = 6;

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

  /** The tail of the conversation. Only answered questions: hand edits are
   *  already listed in the action log, and repeating them here would bury the
   *  exchange that the terminal is for. */
  const history = useMemo(
    () => steps.filter((step) => step.question).slice(-RECENT),
    [steps],
  );

  // `revision` is a dependency because scoring reads a cache that fills after
  // the render that asked for it.
  const { revision } = useEmbeddings();
  const chips = useMemo(
    () => suggest(graph, question, draft, view, scope, terms),
    [graph, question, draft, view, scope, terms, revision],
  );

  const { settling, frame } = useSettling(chips.map((chip) => chip.key).join("|"));
  const { cols } = tile(Math.max(chips.length, 1));
  const likely = likeliest(chips);

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
      <div className="terminal">
        <div className="past">
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
        </div>

        <div className="now">
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
      </div>

      <div className="rail">
        <div className="rail-pane contexts">
          <div className={`settling ${settling ? "on" : ""}`}>{settling ? frame : ""}</div>

          <div
            className="choices"
            style={{ gridTemplateColumns: `repeat(${Math.min(cols, 3)}, minmax(0, 1fr))` }}
          >
            {done &&
              chips.map((chip, index) => (
                <button
                  key={chip.key}
                  className={[
                    "chip",
                    chip.kind,
                    chip.hint ? "ghost" : "",
                    chip.key === likely ? "likely" : "",
                  ].join(" ")}
                  style={{ animationDelay: `${index * 70}ms` }}
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

    </div>
  );
}
