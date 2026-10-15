/** The card tab's right column: the lit key's choices — what the key is for, then each question it
 *  asks, titled over its chips and gathered by where each answer lives, then what acts on it.
 *  Chips light as a look's do: lit where they hold, accented where said here. A part of how it
 *  draws asks the look questions of that part. */

import { type Act, type Graph, type Id } from "@mnd/core";
import { Band } from "./Body";
import { Entry } from "./Entry";
import { Part } from "./Looks";
import type { Ask, Chip, Pair } from "./pairs";

export type ChoicesProps = { graph: Graph; id: Id; pair?: Pair | undefined; onAct: Act };

export function Choices({ graph, id, pair, onAct }: ChoicesProps) {
  if (!pair) return null;
  const empty = !pair.asks.length && !pair.verbs.length && !pair.look;
  return (
    <div className="col choices">
      {/* A key under a section is named with it: *label weight*, not *weight*. */}
      <Band label={pair.under ? `${pair.under} ${pair.word}` : pair.word} />
      <p className="about">{pair.about}</p>
      <fieldset className="asks rows" disabled={pair.fixed}>
        {pair.look ? (
          <Part graph={graph} id={id} group={pair.look} onAct={onAct} />
        ) : null}
        {pair.asks.map((ask) => (
          <Question key={ask.word} ask={ask} titled={ask.word !== pair.word} />
        ))}
        {empty ? (
          <p className="empty">{pair.text ? "typed on its line, on the left" : "nothing to choose"}</p>
        ) : null}
      </fieldset>
      {/* What acts on it stays live where the key reads only: viewing changes nothing here. */}
      {pair.verbs.length ? (
        <div className="verbs rows">
          {pair.verbs.map((v) => (
            <button key={v.word} className="opt verb" title={v.tip} onClick={v.run}>
              {v.word}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** One question: its title where the key's band does not already say it, then its chips gathered
 *  by where they live, then the box that makes a new one. */
function Question({ ask, titled }: { ask: Ask; titled: boolean }) {
  return (
    <div className="ask" title={ask.tip}>
      {titled ? <h6>{ask.word}</h6> : null}
      {gathered(ask.chips).map(([group, chips]) => (
        <div key={group} className="gathered">
          {group ? <span className="where">{group}</span> : null}
          <div className="chips">
            {chips.map((c) => (
              <button key={c.value} title={c.tip ?? c.word}
                      className={["opt", c.on ? "on" : "", c.on && c.set ? "set" : ""]
                        .filter(Boolean).join(" ")}
                      onClick={() => ask.pick(c)}>
                {c.word}
              </button>
            ))}
          </div>
        </div>
      ))}
      {ask.add ? (
        <div className="adding">
          <Entry value="" label={ask.add.placeholder} placeholder={ask.add.placeholder}
                 {...(ask.add.clash ? { clash: ask.add.clash } : {})}
                 onCommit={ask.add.commit} />
        </div>
      ) : null}
    </div>
  );
}

/** Chips gathered by where they live, in the order each place first appears; each place's chips
 *  by name. */
function gathered(chips: readonly Chip[]): [string, Chip[]][] {
  const by = new Map<string, Chip[]>();
  for (const c of chips) by.set(c.group ?? "", [...(by.get(c.group ?? "") ?? []), c]);
  return [...by].sort(([a], [z]) => a.localeCompare(z))
    .map(([g, cs]) => [g, cs.sort((a, z) => a.word.localeCompare(z.word))]);
}
