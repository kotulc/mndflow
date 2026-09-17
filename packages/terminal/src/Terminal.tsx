/** The terminal: one collapsible strip. */

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { Score } from "@mnd/core";
import { Icon } from "@mnd/theme";
import { COMMANDS, rank, reads, spaced, warming,
         type Command, type Match, type Offer } from "./commands";

/** The rail's own chips: one per command, said the way the completion says it. */
const COMMAND_CHIPS: readonly Offer[] = Object.values(COMMANDS)
  .map((w) => ({ name: w.command, about: `${w.about} — ${w.asks}`, asks: w.asks }));

/** What a command chip writes into the line. */
const SIGIL: Record<Command, string> = { add: "+", search: "*", help: "?" };

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
  /** One of the commands, with what was typed after it. */
  onCommand?: (match: Match) => void;
  /** Text similarity, bound by the app. */
  score?: Score;
  /** Quiet mode: the mirror muted, never the strip collapsed. */
  quiet?: boolean;
  onQuiet?: (quiet: boolean) => void;
  /** What the highlight is resting on, so somebody else can light it. */
  onPoint?: (offer: Offer | null) => void;
};

export function Terminal(props: TerminalProps) {
  const { offered, said, context, expanded, onExpand, onAct, onCommand, score,
          quiet = false, onQuiet, onPoint } = props;
  const [draft, set_draft] = useState("");
  const [at, set_at] = useState(0);
  /** Bumped when the scorer can answer more, so readings are asked again. */
  const [warmth, warmer] = useState(0);

  /** Warm what is about to be asked about. */
  useEffect(() => {
    if (!score) return;
    score.warm(warming(offered));
    return score.watch(() => warmer((n) => n + 1));
  }, [score, offered]);

  const match = useMemo(() => reads(draft, score), [draft, score, warmth]);

  /** The rail is the commands, and only the commands. */
  const chips: readonly Offer[] = useMemo(() => {
    if (match?.command === "help") return rank(offered, match.rest, score);
    return COMMAND_CHIPS;
  }, [offered, match, score, warmth]);

  const here = chips[Math.min(at, chips.length - 1)];
  const says = match ? COMMANDS[match.command] : null;
  /** Whether the highlight is a command to fill in or a thing to run. */
  const commanding = match?.command !== "help";

  /** The lit target: what matched, or what help's subject would act on. */
  const pointing = useRef<string | null>(null);
  const point = useRef(onPoint);
  point.current = onPoint;
  const at_name = here?.name ?? null;
  useEffect(() => {
    if (pointing.current === at_name) return;
    pointing.current = at_name;
    point.current?.(at_name === null ? null : here ?? null);
    // `here` is read through the name it is identified by, which is what moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at_name]);

  const run = () => {
    /** A command with something after it runs; a command alone is offered. */
    if (match && match.rest && match.command !== "help") {
      onCommand?.(match);
    } else if (commanding && here) {
      set_draft(`${SIGIL[here.name as Command] ?? ""} `);
      set_at(0);
      return;
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

  /** Enter confirms the highlight and arrows move it. */
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
      set_draft("");
      set_at(0);
    }
  };

  return (
    <div className={["chat", expanded ? "expanded" : "collapsed"].join(" ")}>
      <div className="terminal">
        <div className="now">
          {said ? <div className="said">{said}</div> : null}
          {context ? <div className="hint">{context}</div> : null}
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
          {/* What it does and what it needs, read off the action itself. */}
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
            placeholder="add a block · search packages · ask for help"
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
                      /** A command chip fills the line; an action chip runs. */
                      if (commanding) { set_draft(`${SIGIL[offer.name as Command] ?? ""} `); }
                      else { onAct(offer.name); set_draft(""); }
                      set_at(0);
                    }}>
              {offer.name}
            </button>
          ))}
          {match && chips.length === 0 && says ? (
            <span className="hint">press enter to {says.command}</span>
          ) : null}
        </div>
        <button className="bound" type="button"
                title={expanded ? "shut the terminal" : "open the terminal"}
                onClick={() => onExpand(!expanded)}><Icon name={expanded ? "less" : "more"} /></button>
        {/* Mute: the mirror off, the strip unchanged. */}
        <button className="bound mute" type="button" aria-pressed={quiet}
                title={quiet ? "mirror what I do" : "quiet: stop mirroring what I do"}
                onClick={() => onQuiet?.(!quiet)}><Icon name={quiet ? "mirror_off" : "mirror_on"} /></button>
      </div>
    </div>
  );
}
