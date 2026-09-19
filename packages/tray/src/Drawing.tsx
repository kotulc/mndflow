/** The card column: what it is and how many name it, then the drawing itself. */

import { alias_of, SCHEMA, role_of, shown_name,
         type Act, type Graph, type Id } from "@mnd/core";
import { Icon, role_icon, type IconName } from "@mnd/theme";
import { Band } from "./Body";
import { Card } from "./Card";
import { Wire } from "./Wire";
import { defined, held, kind_of, reading } from "./holder";

export type DrawingProps = { graph: Graph; id: Id; onAct: Act };

export function Drawing({ graph, id }: DrawingProps) {
  const it = held(graph, id);
  if (!it) return null;
  const { def: d, block: b, edge } = it;
  const { said, now } = reading(graph, id, it);
  const { kind, runs } = kind_of(graph, id, it);
  const { own } = defined(graph, id, it, runs);

  const role = b ? role_of(graph, id) : null;
  /** A line's preview draws what the canvas does: the label it follows. */
  const label = runs ? own?.label ?? "" : d ? d.name : shown_name(graph, id);
  const word = (d ?? (b?.type ? graph.defs[b.type] : undefined))?.name ?? kind;

  const mark: IconName = runs ? (kind === "tie" ? "relation_tie" : "relation_plain")
    : role_icon(role ?? kind) ?? "role_leaf";
  const alias = now("card", "alias", "");

  return (
    <div className="drawing">
      {/* What it is, headed the way identity heads its own rows. */}
      <Band label={runs ? "line type" : "card type"}>
        <span className="base">{kind}<Icon name={mark} size={12} /></span>
        {!d && id === graph.root ? <span className="from">{`schema ${SCHEMA}`}</span> : null}
      </Band>
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
    </div>
  );
}
