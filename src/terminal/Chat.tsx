/** The terminal.
 *
 *  It has no frame of its own — it is the top of the page. Collapsed, it is
 *  one line: text entry with inline chips ranked against what is typed.
 *  Expanded, it adds a fixed placeholder prompt, a tutorial walk over the
 *  sample project, a context gloss from `samples/docs.json`, and the
 *  highlighted chip's own description — past exchanges, nudges and the
 *  question loop are gone (Z.9): the rail never asked anything expanded mode
 *  could not also ask collapsed, so it stopped asking.
 *
 *  Chips are the offered-action list (G.9a), ranked and highlighted by the
 *  arrows, plus at most one documentation keyword hit always last. Enter
 *  confirms. Taking anything other than the first-ranked action is an
 *  overrule — local feedback ranking learns from. Membership lives in
 *  `actions/offer`; this file only presents it. Clicking anywhere here puts
 *  the caret in the line. */

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";

import { warm } from "../embed/model";
import { useEmbeddings } from "../embed/useEmbeddings";
import { tile } from "../geometry/layout";
import { note, shape_of } from "../actions/feedback";
import { doc_for, doc_hit, type DocHit } from "./docs";
import { fill_args, phrases, ready, scored } from "../actions/rank";
import { walk_for } from "./tutorial";
import type { Graph } from "../graph/types";
import { refTo } from "../graph/types";
import type { Action, Args, Context, Picked } from "../actions";
import { useSettling } from "./useSettling";
import { useTypewriter } from "./useTypewriter";
import { Icon } from "../modules/icons";
// Side effect only: registers per-domain terms with the project seam (Z.9
// deleted the question loop that used to do this; this is what is left of it).
import "./terms";

/** Standing in for the old question loop's opening line — chosen once so it
 *  does not change under the user (Z.9: expanded asks nothing real any more). */
const PROMPTS = ["What's next?", "What action would you like to take?"];
const PROMPT = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];

type Props = {
  graph: Graph;
  view: string | null;
  picked: Picked;
  /** Project in context — bare refs resolve here. */
  project: string;
  /** Open projects by id — `infer` reads across them. */
  open: Record<string, Graph>;
  /** Cross-project selection the explorer holds. */
  chosen: string[];
  locked?: boolean;
  draft: string;
  onDraft: (text: string) => void;
  onAct: (name: string, args?: Args) => boolean;
};

export function Chat(props: Props) {
  const { graph, view, picked, project, open, chosen, locked, draft, onDraft, onAct } = props;
  const { shown, done } = useTypewriter(PROMPT);
  // Scoring reads a sync cache that fills async — re-rank as vectors land.
  const { revision } = useEmbeddings();
  const field = useRef<HTMLInputElement>(null);
  const [hi, setHi] = useState(0);
  /** Guidance half is shut by default — the rail minimises to one line. */
  const [expanded, setExpanded] = useState(false);
  /** Doc chip taken from the ranked list — surfaced under the line. */
  const [surfaced, setSurfaced] = useState<DocHit | null>(null);

  const refs = useMemo(() => {
    if (chosen.length) return chosen;
    if (picked?.kind === "node" || picked?.kind === "edge") {
      return [refTo(picked.id, project)];
    }
    return [];
  }, [chosen, picked, project]);

  const ctx: Context = useMemo(
    () => ({ graph, view, picked, locked, project, open }),
    [graph, view, picked, locked, project, open],
  );

  const idle = useMemo(() => scored(ctx, "", refs), [ctx, refs]);
  const ranked = useMemo(() => scored(ctx, draft, refs), [ctx, draft, refs, revision]);
  const available = useMemo(() => idle.map((r) => r.action), [idle]);
  const actions = useMemo(() => ranked.map((r) => r.action), [ranked]);
  const score_of = useMemo(
    () => new Map(ranked.map((r) => [r.action.name, r.score])),
    [ranked],
  );

  /** Keyword doc hit — always last, never displacing an action. */
  const hit = useMemo(() => doc_hit(draft), [draft]);
  const walk = useMemo(() => (expanded ? walk_for(ctx) : []), [expanded, ctx]);
  const gloss = useMemo(() => (expanded ? doc_for(ctx) : null), [expanded, ctx]);
  /** The highlighted chip's own description — the whole of expanded guidance. */
  const selected = actions[hi] ?? null;

  const chipKey = `${actions.map((c) => c.name).join("|")}|${hit?.term ?? ""}`;
  const chip_count = actions.length + (hit ? 1 : 0);

  // Warm every fillable action's phrases (and the draft) so ranking is not
  // waiting on the first keystroke against a cold cache.
  useEffect(() => {
    const words = available.flatMap(phrases);
    const typed = draft.trim();
    if (typed) words.push(typed);
    if (words.length) warm(words);
  }, [available, draft]);

  // A new set of chips resets the highlight to the first (default) entry.
  useEffect(() => {
    setHi(0);
  }, [chipKey]);

  useEffect(() => {
    if (hi >= chip_count) setHi(Math.max(0, chip_count - 1));
  }, [hi, chip_count]);

  // A new draft retires a taken gloss — the chip list is the source of truth.
  useEffect(() => {
    setSurfaced(null);
  }, [draft]);

  const { settling, frame } = useSettling(chipKey);
  const { cols } = tile(Math.max(chip_count, 1));
  /** Collapsed asks nothing — chips are ready without waiting on the prompt. */
  const show_chips = expanded ? done : true;

  /** Click outside a control focuses the line — the whole rail is the entry. */
  function focus_line(event: MouseEvent) {
    if ((event.target as HTMLElement).closest("button, input, a, textarea")) return;
    // Without this, the click's default action blurs the field we just focused.
    event.preventDefault();
    field.current?.focus();
  }

  function take(action: Action) {
    const args = fill_args(action, ctx, refs, draft);
    if (!ready(action, args)) {
      field.current?.focus();
      return;
    }

    // Ranking's default is the first action chip; anything else is an overrule.
    // The doc hit is never an action and never feeds learning.
    const top = actions[0];
    if (top && top.name !== action.name) {
      note({
        chose: action.name,
        ranked: top.name,
        entry: draft.trim(),
        shape: shape_of(ctx),
      });
    }

    onDraft("");
    onAct(action.name, args);
  }

  function take_doc(next: DocHit) {
    setSurfaced(next);
    field.current?.focus();
  }

  function press(event: KeyboardEvent<HTMLInputElement>) {
    // Up and down move the highlight: a one-line field has no use for them.
    // Left and right belong to the caret — taking them would make the draft
    // uneditable except by backspacing to the mistake.
    if (event.key === "ArrowDown") {
      if (!chip_count) return;
      event.preventDefault();
      setHi((n) => (n + 1) % chip_count);
      return;
    }
    if (event.key === "ArrowUp") {
      if (!chip_count) return;
      event.preventDefault();
      setHi((n) => (n - 1 + chip_count) % chip_count);
      return;
    }
    if (event.key !== "Enter") return;

    event.preventDefault();

    if (hit && hi === actions.length) {
      take_doc(hit);
      return;
    }

    const action = actions[hi];
    if (action) {
      const args = fill_args(action, ctx, refs, draft);
      if (ready(action, args)) take(action);
    }
  }

  return (
    <div
      className={`chat ${expanded ? "expanded" : "collapsed"}`}
      onMouseDown={focus_line}
    >
      <div className="terminal">
        <div className="now">
          {expanded && (
            <>
              <div className="said">
                {shown}
                {!done && <span className="cursor" />}
              </div>
              {done && selected && <div className="hint">{selected.about}</div>}
              {done && walk.map((line) => (
                <div key={line} className="hint">{line}</div>
              ))}
              {done && gloss && <div className="hint">{gloss}</div>}
            </>
          )}

          {surfaced && (
            <div className="hint">{surfaced.term} — {surfaced.text}</div>
          )}

          <label className="typed input">
            <span className="caret">&gt;</span>
            <span className="line">
              {/* Block cursor overlays the input's insertion point — not a
                  sibling ahead of it, or the flex gap puts it in the wrong place. */}
              {!draft && <span className="cursor" aria-hidden />}
              <input
                ref={field}
                value={draft}
                className={draft ? undefined : "empty"}
                onChange={(event) => onDraft(event.target.value)}
                onKeyDown={press}
              />
            </span>
          </label>
        </div>
      </div>

      <div className="rail">
        <div className="rail-pane contexts">
          {expanded && (
            <div className={`settling ${settling ? "on" : ""}`}>{settling ? frame : ""}</div>
          )}

          <div
            className="choices"
            style={
              expanded
                ? { gridTemplateColumns: `repeat(${Math.min(cols, 3)}, minmax(0, 1fr))` }
                : undefined
            }
          >
            {show_chips &&
              actions.map((chip, index) => (
                <button
                  key={chip.name}
                  type="button"
                  className={[
                    "chip",
                    index === hi ? "likely" : "",
                  ].join(" ")}
                  style={{ animationDelay: `${index * 70}ms` }}
                  onClick={() => take(chip)}
                  title={(score_of.get(chip.name) ?? 0).toFixed(2)}
                >
                  {chip.label}
                </button>
              ))}
            {show_chips && hit && (
              <button
                key={`doc:${hit.term}`}
                type="button"
                className={[
                  "chip",
                  "ghost",
                  hi === actions.length ? "likely" : "",
                ].join(" ")}
                style={{ animationDelay: `${actions.length * 70}ms` }}
                onClick={() => take_doc(hit)}
                title={`${hit.term} — ${hit.text}`}
              >
                {hit.term}
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          className="bound"
          aria-expanded={expanded}
          title={expanded ? "Collapse Page Intelligence" : "Expand Page Intelligence"}
          onClick={() => setExpanded((was) => !was)}
        >
          <Icon name={expanded ? "less" : "more"} />
        </button>
      </div>
    </div>
  );
}
