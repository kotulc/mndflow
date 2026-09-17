/** The card column: the drawing, its kind, how many name it, and whether it is pinned. */

import { alias_of, SCHEMA, def_of, module_of, pinned_defs, role_of, shown_name,
         type Act, type Graph, type Id } from "@mnd/core";
import { Icon, role_icon, type IconName } from "@mnd/theme";
import { Card } from "./Card";
import { Wire } from "./Wire";
import { DRAFT } from "./draft";
import { defined, held, kind_of, reading } from "./holder";

export type DrawingProps = { graph: Graph; id: Id; onAct: Act };

/** A count and its noun, plural where it is not one. */
const count = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

export function Drawing({ graph, id, onAct }: DrawingProps) {
  const it = held(graph, id);
  if (!it) return null;
  const { def: d, block: b, edge } = it;
  const { said, now } = reading(graph, id, it);
  const { kind, runs } = kind_of(graph, id, it);
  const { follows, own, fixed, wip } = defined(graph, id, it, runs);
  const listed = pinned_defs(graph, runs ? "relation" : "block").some((x) => x.id === own?.id);

  const role = b ? role_of(graph, id) : null;
  /** A line's preview draws what the canvas does: the label it follows. */
  const label = runs ? own?.label ?? "" : d ? d.name : shown_name(graph, id);
  const word = (d ?? (b?.type ? graph.defs[b.type] : undefined))?.name ?? kind;

  /** Usages of this definition only, or blocks of its kind for a plain block. */
  const tally = runs
    ? Object.values(graph.edges).filter((x) => def_of(graph, x.id) === follows?.id).length
    : own ? Object.keys(graph.blocks).filter((x) => def_of(graph, x) === own.id).length
    : Object.values(graph.blocks).filter((x) => module_of(graph, x.id) === kind).length;
  const mark: IconName = runs ? (kind === "tie" ? "relation_tie" : "relation_plain")
    : role_icon(role ?? kind);
  const alias = now("card", "alias", "");

  return (
    <div className="drawing">
      {runs ? (
        <Wire label={label} alias={edge ? alias_of(graph, id, true) : undefined}
              said={said} now={now} />
      ) : (
        <Card label={label}
              alias={!b ? undefined : alias === "show" ? alias_of(graph, id, true)
                : alias === "hide" ? undefined : alias_of(graph, id)}
              kind={word} icon={(now("card", "icon", "") || role_icon(role ?? kind)) as IconName}
              role={role ?? kind} said={said} now={now} />
      )}
      <div className="kind-rows">
        <span><span className="holder">{runs ? "line type" : "card type"}</span>
          <span className="base">{kind}<Icon name={mark} size={12} /></span></span>
        {/* The workspace shows its schema; everything else its instance count. */}
        <span className="tally">
          {!d && id === graph.root ? `schema ${SCHEMA}` : count(tally, "instance")}
        </span>
        {/* Pinned: a relation on the rail, a block in the pinned folder. */}
        {own && !fixed ? (
          <label className="check"
                 title={runs ? "Offer this on the rail, so a right drag can draw one"
                             : "List this in the explorer's pinned folder"}>
            <input type="checkbox" checked={listed} disabled={own.id === DRAFT || wip}
                   onChange={(e) => onAct("pin", { id: own.id,
                                                   on: e.target.checked ? "yes" : "no" })} />
            pinned
          </label>
        ) : null}
      </div>
    </div>
  );
}
