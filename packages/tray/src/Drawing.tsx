/** The card column: what it is and how many name it, then the drawing itself. */

import { alias_of, SCHEMA, def_of, base_of, role_of, shown_name,
         type Act, type Graph, type Id } from "@mnd/core";
import { Icon, role_icon, type IconName } from "@mnd/theme";
import { Card } from "./Card";
import { Wire } from "./Wire";
import { defined, held, kind_of, reading } from "./holder";

export type DrawingProps = { graph: Graph; id: Id; onAct: Act };

/** A count and its noun, plural where it is not one. */
const count = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

export function Drawing({ graph, id }: DrawingProps) {
  const it = held(graph, id);
  if (!it) return null;
  const { def: d, block: b, edge } = it;
  const { said, now } = reading(graph, id, it);
  const { kind, runs } = kind_of(graph, id, it);
  const { follows, own } = defined(graph, id, it, runs);

  const role = b ? role_of(graph, id) : null;
  /** A line's preview draws what the canvas does: the label it follows. */
  const label = runs ? own?.label ?? "" : d ? d.name : shown_name(graph, id);
  const word = (d ?? (b?.type ? graph.defs[b.type] : undefined))?.name ?? kind;

  /** Usages of this definition only, or blocks of its kind for a plain block. */
  const tally = runs
    ? Object.values(graph.edges).filter((x) => def_of(graph, x.id) === follows?.id).length
    : own ? Object.keys(graph.blocks).filter((x) => def_of(graph, x) === own.id).length
    : Object.values(graph.blocks).filter((x) => base_of(graph, x.id) === kind).length;
  const mark: IconName = runs ? (kind === "tie" ? "relation_tie" : "relation_plain")
    : role_icon(role ?? kind) ?? "role_leaf";
  const alias = now("card", "alias", "");

  return (
    <div className="drawing">
      {/* What it is, over the card that says it — the caption reads before the picture. */}
      <div className="kind-rows">
        <span><span className="holder">{runs ? "line type" : "card type"}</span>
          <span className="base">{kind}<Icon name={mark} size={12} /></span></span>
        {/* The workspace shows its schema; everything else its instance count. */}
        <span className="tally">
          {!d && id === graph.root ? `schema ${SCHEMA}` : count(tally, "instance")}
        </span>
      </div>
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
