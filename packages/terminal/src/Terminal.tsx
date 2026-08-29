/** The terminal: one collapsible strip. **Not a chat, and not a command
 *  palette.**
 *
 *  It **reflects context and action as you use the app** — you act on the
 *  canvas, the terminal says what happened — so it is a **mirror** as much as
 *  an input. And it answers **four commands**: add blocks, filter the
 *  workspace, search packages, and help. Help is the fallback and carries the
 *  whole action surface, which is what lets the strip stay four wide.
 *
 *  Two rules hold it in place. **It reads context and never changes it**,
 *  because it ranks *against* context and a surface that moved context would
 *  shift the ground its own ranking stands on. And **every capability it adds
 *  must exist without it**: if the only way to do something is to say it, it
 *  has stopped being optional. */

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { Score } from "@mnd/core";
import { Icon } from "@mnd/theme";
import { COMMANDS, rank, reads, spaced, warming, type Match, type Offer } from "./commands";
import type { Question } from "./loop/router";

export type { Offer };

export type TerminalProps = {
  offered: readonly Offer[];
  /** What the app last said. One channel, one place to look. */
  said?: string | null;
  /** Where the user is, reflected — never changed from here. */
  context?: string;
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
  /** Run an action by name. */
  onAct: (name: string) => void;
  /** One of the four, with what was typed after it. */
  onCommand?: (match: Match) => void;
  /** Text similarity, bound by the app. **Unbound, ranking is substring** —
   *  the cold fallback, and everything still works. */
  score?: Score;
  /** What the conversation is asking, when one is running. **The strip is
   *  whole without it** — every action it reaches is reachable by gesture. */
  question?: Question | null;
  /** The answer typed, or null to leave the question unanswered. */
  onAnswer?: (text: string | null) => void;
  /** **Quiet mode: the mirror muted, never the strip collapsed.** The two are
   *  different questions — whether it is here at all, and whether it echoes
   *  back what you just did — so they are two controls. What the app says for
   *  itself, a refusal or a repair report, is never muted. */
  quiet?: boolean;
  onQuiet?: (quiet: boolean) => void;
  /** What the highlight is resting on, so somebody else can light it. Null
   *  where nothing is highlighted or the strip is answering a question. */
  onPoint?: (offer: Offer | null) => void;
};

export function Terminal(props: TerminalProps) {
  const { offered, said, context, expanded, onExpand, onAct, onCommand, score,
          question, onAnswer, quiet = false, onQuiet, onPoint } = props;
  const [draft, set_draft] = useState("");
  const [at, set_at] = useState(0);
  /** **How much the scorer knows.** Vectors land after the render that asked
   *  for them, so a bound scorer says when it can answer more than it could —
   *  and every reading that went through it has to be asked again. Counting is
   *  what puts *what it knows* in the dependencies: without it the re-render
   *  arrives and the memo hands back the cold answer it already had. */
  const [warmth, warmer] = useState(0);

  /** **Warm what is about to be asked about.** The four commands are fixed and
   *  the offered list moves with context, so the first word somebody types is
   *  not also the first thing that waits. */
  useEffect(() => {
    if (!score) return;
    score.warm(warming(offered));
    return score.watch(() => warmer((n) => n + 1));
  }, [score, offered]);

  const match = useMemo(() => reads(draft, score), [draft, score, warmth]);

  /** **A sigil still reaches its command while a question is pending.** The
   *  strip stays four wide whatever else is going on; anything else typed is
   *  the answer, because that is what the prompt asked for. */
  const answering = !!question && !(match && match.verb.length === 1
                                          && "+:*?".includes(match.verb));

  /** **Help carries the action surface**, so its argument filters every action
   *  there is. The other three take an argument rather than picking from a
   *  list, and offer the context's own actions until one is typed. */
  const chips: Offer[] = useMemo(() => {
    if (answering) return question!.choices.map((name) => ({ name, about: question!.hint }));
    if (!match) return [...offered];
    if (match.command === "help") return rank(offered, match.rest, score);
    return match.rest ? [] : [...offered];
  }, [offered, match, score, warmth, answering, question]);

  const here = chips[Math.min(at, chips.length - 1)];
  const says = match && !answering ? COMMANDS[match.command] : null;

  /** **One mechanism, two callers.** Filtering lights what matched; help lights
   *  what the thing it is describing would act on. Both go out the same way.
   *
   *  It fires when the **highlight** moves and not when the caller re-renders:
   *  a component that only works when its props are memoised is a component
   *  that will one day loop, and the caller cannot see why. */
  const pointing = useRef<string | null>(null);
  const point = useRef(onPoint);
  point.current = onPoint;
  const at_name = answering ? null : here?.name ?? null;
  useEffect(() => {
    if (pointing.current === at_name) return;
    pointing.current = at_name;
    point.current?.(at_name === null ? null : here ?? null);
    // `here` is read through the name it is identified by, which is what moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at_name]);

  const run = () => {
    if (answering) {
      const text = draft.trim() || here?.name;
      if (!text) return;
      onAnswer?.(text);
    } else if (match && match.rest && match.command !== "help") {
      onCommand?.(match);
    } else if (here) {
      onAct(here.name);
    } else if (match) {
      onCommand?.(match);
    } else {
      return;
    }
    set_draft("");
    set_at(0);
  };

  /** **`Enter` confirms the highlight and arrows move it**, because a default
   *  that is invisible and changes under the user is the version of adaptive
   *  ranking worth avoiding. */
  const on_key = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      set_at((n) => Math.min(n + 1, chips.length - 1));
    } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
      e.preventDefault();
      set_at((n) => Math.max(n - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run();
    } else if (e.key === "Escape") {
      /** **Escape abandons.** With nothing typed there is nothing left to
       *  abandon but the question, so it leaves that too. */
      if (answering && !draft.trim()) onAnswer?.(null);
      set_draft("");
      set_at(0);
    }
  };

  return (
    <div className={["chat", expanded ? "expanded" : "collapsed"].join(" ")}>
      <div className="terminal">
        <div className="now">
          {said ? <div className="said">{said}</div> : null}
          {/* The question, when one is running: what was asked, and how to
              answer it. Chips below are what it offers. */}
          {answering ? (
            <div className="asked">
              <b>{question!.prompt}</b>
              {question!.hint ? <span className="asks"> · {question!.hint}</span> : null}
            </div>
          ) : context ? <div className="hint">{context}</div> : null}
          {/* A completion says what it matched and fills an example. */}
          {says ? (
            <div className="matched">
              <b>{says.command}</b> — {says.about}
              <span className="asks">
                {" · "}{says.asks}: {match!.rest
                  ? <em>{match!.command === "add" ? spaced(match!.rest) : match!.rest}</em>
                  : <em className="example">{says.example}</em>}
              </span>
            </div>
          ) : null}
          {/* What it does, and what it needs — the second read off the action
              itself, so help teaches whatever the app currently is. */}
          {expanded && here && (!says || says.command === "help") ? (
            <div className="hint">
              {here.about}
              {here.asks ? <span className="asks"> · needs {here.asks}</span> : null}
            </div>
          ) : null}
        </div>
        <label className="typed input">
          <span className="caret">&gt;</span>
          <input
            value={draft}
            placeholder={answering
              ? "answer, or press escape to leave it"
              : "add a block · filter · search packages · ask for help"}
            onChange={(e) => { set_draft(e.target.value); set_at(0); }}
            onKeyDown={on_key}
          />
        </label>
      </div>

      <div className="rail">
        <div className="choices">
          {chips.map((offer, n) => (
            <button key={offer.name} type="button"
                    className={["chip", offer === here ? "on" : ""].filter(Boolean).join(" ")}
                    title={offer.about}
                    onMouseEnter={() => set_at(n)}
                    onClick={() => {
                      if (answering) onAnswer?.(offer.name);
                      else onAct(offer.name);
                      set_draft("");
                      set_at(0);
                    }}>
              {offer.name}
            </button>
          ))}
          {/* A question that offers nothing to pick still wants an answer, so
              what the rail says is what pressing enter would do. */}
          {(match || answering) && chips.length === 0 ? (
            <span className="hint">
              {says ? `press enter to ${says.command}` : "press enter to answer"}
            </span>
          ) : null}
        </div>
        <button className="bound" type="button"
                title={expanded ? "shut the terminal" : "open the terminal"}
                onClick={() => onExpand(!expanded)}><Icon name={expanded ? "less" : "more"} /></button>
        {/* The far right, and a static cursor: the mirror off, the strip
            unchanged. */}
        <button className="bound mute" type="button" aria-pressed={quiet}
                title={quiet ? "mirror what I do" : "quiet: stop mirroring what I do"}
                onClick={() => onQuiet?.(!quiet)}><Icon name={quiet ? "mirror_off" : "mirror_on"} /></button>
      </div>
    </div>
  );
}
