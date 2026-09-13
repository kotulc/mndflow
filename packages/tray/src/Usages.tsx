/** The usages tab: **every stereotype in play, and what wears it.**
 *
 *  Two tables stacked. The roster is stereotypes — *used or unused*, because an
 *  unused one is exactly what a roster has to be able to show and a run cannot
 *  be unused. Templates are left out of it, so a count here never has to say
 *  whether it means direct usages or everything down the chain.
 *
 *  **Retyping happens in the row.** A dropdown in the type cell, so twenty runs
 *  across four layers are retyped where they are listed — no selection to
 *  carry across layers, and no canvas to navigate. The cost is honest: this
 *  table does not select on click the way contents does. */

import { Table, type Column } from "./Table";
import { stereotype_rows, usage_rows } from "./rows";
import { stereotypes, type Act, type Graph, type Id } from "@mnd/core";

const ROSTER: readonly Column[] = [
  { key: "name", label: "stereotype", width: "40%" },
  { key: "template", label: "draws as", width: "38%" },
  { key: "used", label: "used", width: "22%" },
];

const INSTANCES: readonly Column[] = [
  { key: "name", label: "line", width: "20%" },
  { key: "what", label: "joins", width: "34%" },
  { key: "layer", label: "in", width: "24%" },
  { key: "type", label: "type", width: "22%" },
];

export type UsagesProps = {
  graph: Graph;
  /** Which stereotype the lower table is about. */
  held: Id | null;
  onHold: (id: Id) => void;
  onHover?: (id: Id | null) => void;
  onAct: Act;
};

export function Usages({ graph, held, onHold, onHover, onAct }: UsagesProps) {
  const roster = stereotype_rows(graph);
  /** **Only ever a stereotype below.** Holding a template from elsewhere would
   *  list nothing and say nothing about why. */
  const about = roster.some((r) => r.id === held) ? held : null;
  const runs = usage_rows(graph, about);
  const offered = stereotypes(graph);

  return (
    <div className="stack">
      <Table
        columns={ROSTER}
        rows={roster.map((r) => ({
          id: r.id,
          titles: { name: r.name, template: r.template },
          cells: { name: r.name, template: r.template, used: r.used ? String(r.used) : "unused" },
        }))}
        picked={about ? [about] : []}
        onPick={onHold}
        empty="no stereotypes yet — name a line to make one"
      />

      <Table
        columns={INSTANCES}
        onHover={onHover}
        rows={runs.map((r) => ({
          id: r.id,
          titles: { name: r.name, what: r.what, layer: r.layer },
          cells: {
            name: r.name,
            what: r.what,
            layer: r.layer,
            type: (
              <select value={r.type} aria-label={`what ${r.name} is`}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onAct("retype", { ids: [r.id], type: e.target.value })}>
                {offered.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            ),
          },
        }))}
        empty={about ? "nothing wears this yet" : "pick a stereotype to see what wears it"}
      />
    </div>
  );
}
