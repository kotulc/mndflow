/** What an element may do and how it looks by trait: any element's — a usage, a line or a
 *  definition — since each carries what its definition does and may add its own. Each trait grants
 *  its settings; what none grants, a block may not do. */

import { all_defs, carried_tags, entry, frozen, is_trait, traits_of, type Act, type Graph,
         type Id } from "@mnd/core";
import { Band, Body, Line } from "./Body";

export type TraitsProps = { graph: Graph; id: Id; onAct: Act };

/** Every trait as a toggle, lit two ways as a look is: **on** while in force, **set** where this
 *  element says so itself — added here, or dropped (struck) where its chain carries it. Toggling
 *  writes the element's own list, tags kept. A frozen element's traits read only. */
export function Traits({ graph, id, onAct }: TraitsProps) {
  const target = graph.blocks[id] ?? graph.edges[id];
  if (!target) return null;
  const own = target.tags ?? [];
  const held = traits_of(graph, id);
  const inherited = carried_tags(graph, id).filter((c) => c.from !== id).map((c) => c.id);
  const fixed = frozen(graph, graph.blocks[id] ? id : (target as { from: Id }).from);
  const offered = all_defs(graph).filter((d) => is_trait(graph, d.id));
  const called = (t: Id) => graph.blocks[t]?.name ?? t;

  /** Off where it is on — taken off its own list, or dropped where inherited — else on: a drop
   *  taken back, or added. */
  const toggle = (t: Id) => {
    const rest = own.filter((e) => entry(e).id !== t);
    const next = held.includes(t) ? (own.includes(t) ? rest : [...rest, `-${t}`])
      : inherited.includes(t) ? rest : [...rest, t];
    onAct("tag", { ids: [id], tags: next });
  };

  return (
    <div className="col traits">
      <Band label="traits" />
      <Body>
        <Line tip="What it may do and how it looks: each trait grants settings. It carries its definition's, and may add or drop its own.">
          <span className="picks">
            {offered.map((d) => {
              const on = held.includes(d.id);
              const set = own.some((e) => entry(e).id === d.id);
              const tip = set ? (on ? "added here" : "dropped here") : on ? "inherited" : "";
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
