/** What an element may do, by trait, and how it looks, by style: any element's — a usage, a line
 *  or a definition — since each carries what its definition does and may add its own. Each grants
 *  its settings; what no trait grants, a block may not do. */

import { all_defs, carried_tags, entry, frozen, is_style, is_trait, type Act, type Graph,
         type Id } from "@mnd/core";
import { Band, Body, Line } from "./Body";

export type TraitsProps = { graph: Graph; id: Id; onAct: Act;
                            /** Which it lists: capabilities, or looks. */
                            of?: "traits" | "styles" };

/** What each listing offers, and what it says of itself. */
const KINDS = {
  traits: { is: is_trait, tip: "What it may do: each trait grants a capability. It carries its definition's, and may add or drop its own." },
  styles: { is: is_style, tip: "How it looks: each style gives a look. It carries its definition's, and may add or drop its own." },
};

/** Every trait as a toggle, lit two ways as a look is: **on** while in force, **set** where this
 *  element says so itself — added here, or dropped (struck) where its chain carries it. Toggling
 *  writes the element's own list, tags kept. A frozen element's traits read only. */
export function Traits({ graph, id, onAct, of = "traits" }: TraitsProps) {
  const target = graph.blocks[id] ?? graph.edges[id];
  if (!target) return null;
  const own = target.tags ?? [];
  const { is, tip: about } = KINDS[of];
  const held = carried_tags(graph, id).map((c) => c.id).filter((t) => is(graph, t));
  const inherited = carried_tags(graph, id).filter((c) => c.from !== id).map((c) => c.id);
  const fixed = frozen(graph, graph.blocks[id] ? id : (target as { from: Id }).from);
  const offered = all_defs(graph).filter((d) => is(graph, d.id));
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
    <div className={`col ${of}`}>
      <Band label={of} />
      <Body>
        <Line tip={about}>
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
