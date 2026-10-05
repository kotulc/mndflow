/** What a block may do: a definition's traits, a section of their own on its settings tab.
 *  **Stated on the definition**, so every block following it answers the same; a block shows none
 *  of its own. Each trait grants its settings; what none grants, a block may not do. */

import { all_defs, chain_of, def_at, domain_of, frozen, is_trait, traits_of, type Act,
         type Graph, type Id } from "@mnd/core";
import { Band, Body, Line } from "./Body";

export type TraitsProps = { graph: Graph; id: Id; onAct: Act };

/** Every trait as a toggle, lit two ways as a look is: **on** while in force, **set** where this
 *  definition changed it from what it extends, and struck where it let an inherited one go.
 *  Stating one states the whole set; a set matching the chain's gives it back. A frozen
 *  definition's traits read only. */
export function Traits({ graph, id, onAct }: TraitsProps) {
  const target = def_at(graph, id);
  if (!target || domain_of(graph, id) !== "block") return null;
  const own = target.traits;
  const held = traits_of(graph, target.id);
  const inherited = chain_of(graph, target.id).slice(1).find((d) => d.traits)?.traits ?? [];
  const fixed = frozen(graph, target.id);
  const offered = all_defs(graph).filter((d) => is_trait(graph, d.id));
  const called = (t: Id) => graph.blocks[t]?.name ?? t;

  /** The set with one trait toggled; the chain's own set is said by saying nothing. */
  const toggle = (t: Id) => {
    const next = held.includes(t) ? held.filter((x) => x !== t) : [...held, t];
    const same = next.length === inherited.length && next.every((x) => inherited.includes(x));
    onAct("trait", { ids: [target.id], traits: same ? null : next });
  };

  return (
    <div className="col traits">
      <Band label="traits" />
      <Body>
        <Line tip="What it may do: each trait grants settings. Inherited until this definition states its own set.">
          <span className="picks">
            {offered.map((d) => {
              const on = held.includes(d.id);
              const was = inherited.includes(d.id);
              const set = !!own && on !== was;
              const tip = set ? (on ? "added here" : "let go here") : on ? "inherited" : "";
              return (
                <button key={d.id} disabled={fixed}
                        className={["opt", on ? "on" : "", set ? "set" : "", set && !on ? "dropped" : ""]
                          .filter(Boolean).join(" ")}
                        title={[called(d.id), tip, d.body].filter(Boolean).join(" — ")}
                        onClick={() => toggle(d.id)}>
                  {called(d.id)}
                </button>
              );
            })}
          </span>
        </Line>
      </Body>
    </div>
  );
}
