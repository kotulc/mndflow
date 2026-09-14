/** The usages tab: **the lines here, and what each draws as and is.**
 *
 *  The lines in the open layer — or every line in the project, for the
 *  workspace. Each row says the template it draws through and offers the type
 *  it names, so a line is retyped where it is listed. Picking a row selects the
 *  line, the way contents does. */

import { stereotypes, type Act, type Graph, type Id } from "@mnd/core";
import { Table, type Column } from "./Table";
import { usage_rows } from "./rows";

export type UsagesProps = {
  graph: Graph;
  layer: Id | null;
  /** The workspace's reading: every line in the project. */
  deep: boolean;
  picked: readonly Id[];
  onPick: (id: Id) => void;
  onHover?: (id: Id | null) => void;
  onAct: Act;
};

export function Usages({ graph, layer, deep, picked, onPick, onHover, onAct }: UsagesProps) {
  const offered = stereotypes(graph).filter((d) => !d.default);
  const columns: readonly Column[] = [
    { key: "name", label: "line", width: deep ? "18%" : "22%" },
    { key: "what", label: "joins", width: deep ? "26%" : "34%" },
    ...(deep ? [{ key: "layer", label: "in", width: "18%" }] : []),
    { key: "template", label: "template", width: "18%" },
    { key: "type", label: "type", width: deep ? "20%" : "26%" },
  ];

  return (
    <Table
      columns={columns}
      picked={picked}
      onPick={onPick}
      onHover={onHover}
      empty={deep ? "no lines in this project yet" : "no lines in this layer"}
      rows={usage_rows(graph, layer, deep).map((r) => ({
        id: r.id,
        titles: { name: r.name, what: r.what, layer: r.layer, template: r.template },
        cells: {
          name: r.name,
          what: r.what,
          layer: r.layer,
          template: r.template,
          type: (
            <select value={r.type} aria-label={`what ${r.name} is`}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onAct("retype", { ids: [r.id], type: e.target.value })}>
              <option value="">none</option>
              {offered.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          ),
        },
      }))}
    />
  );
}
