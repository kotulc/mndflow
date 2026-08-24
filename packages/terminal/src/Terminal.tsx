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

import { useMemo, useState, type KeyboardEvent } from "react";
import { COMMANDS, reads, spaced, type Match } from "./commands";

/** One thing that can be reached from here. The sentence is what gets matched,
 *  because a name is too short to match against. */
export type Offer = {
  name: string;
  about: string;
};

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
};

/** Substring, which is the **cold fallback** for ranking. With the `score` port
 *  unbound this is all there is, and everything still works. */
function ranked(offered: readonly Offer[], draft: string): Offer[] {
  const want = draft.trim().toLowerCase();
  if (!want) return [...offered];
  return offered.filter((o) => `${o.name} ${o.about}`.toLowerCase().includes(want));
}

export function Terminal(props: TerminalProps) {
  const { offered, said, context, expanded, onExpand, onAct, onCommand } = props;
  const [draft, set_draft] = useState("");
  const [at, set_at] = useState(0);

  const match = useMemo(() => reads(draft), [draft]);

  /** **Help carries the action surface**, so its argument filters every action
   *  there is. The other three take an argument rather than picking from a
   *  list, and offer the context's own actions until one is typed. */
  const chips = useMemo(() => {
    if (!match) return [...offered];
    if (match.command === "help") return ranked(offered, match.rest);
    return match.rest ? [] : [...offered];
  }, [offered, match]);

  const here = chips[Math.min(at, chips.length - 1)];
  const says = match ? COMMANDS[match.command] : null;

  const run = () => {
    if (match && match.rest && match.command !== "help") {
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
          {expanded && !says && here ? <div className="hint">{here.about}</div> : null}
        </div>
        <label className="typed input">
          <span className="caret">&gt;</span>
          <input
            value={draft}
            placeholder="add a block · filter · search packages · ask for help"
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
                    onClick={() => { onAct(offer.name); set_draft(""); set_at(0); }}>
              {offer.name}
            </button>
          ))}
          {match && chips.length === 0 ? (
            <span className="hint">press enter to {says!.command}</span>
          ) : null}
        </div>
        <button className="bound" type="button"
                title={expanded ? "shut the terminal" : "open the terminal"}
                onClick={() => onExpand(!expanded)}>{expanded ? "▾" : "▸"}</button>
      </div>
    </div>
  );
}
