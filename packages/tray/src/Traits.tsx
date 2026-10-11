/** What a definition can do: its traits, one row each — the trait, what it lets the engine do, and
 *  a way to take it off — with `+` at the far end of the head to add one. Stated, the list is the
 *  definition's own; unsaid, it carries what it extends, and editing it makes it its own. A
 *  usage and a line carry their definition's, so the list is a definition's alone. */

import { useState } from "react";
import { all_defs, def_at, frozen, is_trait, traits_stated, type Act, type Graph,
         type Id } from "@mnd/core";
import { Icon } from "@mnd/theme";
import { Band, Body, Line } from "./Body";

export type TraitsProps = { graph: Graph; id: Id; onAct: Act };

export function Traits({ graph, id, onAct }: TraitsProps) {
  const [adding, set_adding] = useState(false);
  if (!def_at(graph, id)) return null;
  const { ids, from } = traits_stated(graph, id);
  const fixed = frozen(graph, id);
  const called = (t: Id) => graph.blocks[t]?.name ?? t;
  const offered = all_defs(graph).filter((d) => is_trait(graph, d.id) && !ids.includes(d.id))
    .sort((a, z) => a.name.localeCompare(z.name));
  /** Every edit writes the whole list, so an inherited one becomes its own. */
  const set = (traits: Id[]) => onAct("trait", { ids: [id], traits });

  return (
    <div className="col traits">
      <Band label="traits">
        {from && from !== id ? <span className="from">from {called(from)}</span> : null}
        {fixed || !offered.length ? null : adding ? (
          <select className="add" aria-label="add a trait" autoFocus value=""
                  onBlur={() => set_adding(false)}
                  onChange={(e) => {
                    set_adding(false);
                    if (e.target.value) set([...ids, e.target.value]);
                  }}>
            <option value="">add a trait</option>
            {offered.map((d) => <option key={d.id} value={d.id} title={d.body}>{d.name}</option>)}
          </select>
        ) : (
          <button className="add" title="add a trait" onClick={() => set_adding(true)}>
            <Icon name="add" />
          </button>
        )}
      </Band>
      <Body>
        {ids.map((t) => (
          <Line key={t} label={called(t)} tip={graph.blocks[t]?.body}>
            <span className="about">{graph.blocks[t]?.body ?? ""}</span>
            {fixed ? null : (
              <button className="drop" title={`take ${called(t)} off`}
                      onClick={() => set(ids.filter((x) => x !== t))}>
                <Icon name="remove" />
              </button>
            )}
          </Line>
        ))}
        {ids.length ? null : <p className="empty">none: the engine lets it do nothing more</p>}
      </Body>
    </div>
  );
}
