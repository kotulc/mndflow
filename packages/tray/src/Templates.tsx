/** The templates table, **under the template tab's two columns**: what a line
 *  can be made to look like, the base one first.
 *
 *  **Picking a row describes it** above — one panel, one id, whichever was
 *  picked last. The rail stays out of it: a rail click says what a right drag
 *  draws, and merging the two would change what you draw next every time you
 *  glanced at a template.
 *
 *  **Every template but the base can be removed.** What named it keeps how it
 *  draws: its looks go down into each line, and anything extending it extends
 *  what it extended. */

import { base_template, type Act, type Graph, type Id } from "@mnd/core";
import { Icon } from "@mnd/theme";
import { Table, type Column } from "./Table";
import { template_rows } from "./rows";

const COLUMNS: readonly Column[] = [
  { key: "name", label: "template", width: "32%" },
  { key: "extends", label: "extends", width: "26%" },
  { key: "used", label: "used", width: "14%" },
  { key: "pinned", label: "pin line", width: "18%" },
  { key: "drop", label: "", width: "10%" },
];

export type TemplatesProps = {
  graph: Graph;
  /** The template being described, if the panel has hold of one. */
  held: Id | null;
  onPick: (id: Id) => void;
  onAct: Act;
};

export function Templates({ graph, held, onPick, onAct }: TemplatesProps) {
  const base = base_template(graph)?.name ?? "";
  return (
    <Table
      columns={COLUMNS}
      picked={held ? [held] : []}
      onPick={onPick}
      empty="no templates yet"
      rows={template_rows(graph).map((r) => ({
        id: r.id,
        titles: { name: r.name, extends: r.extends },
        cells: {
          name: r.name,
          /** **The base extends nothing, and everything else extends it** where
           *  nothing more particular was said. */
          extends: r.base ? "" : r.extends || base,
          used: String(r.used),
          pinned: (
            <input type="checkbox" checked={r.pinned} aria-label={`offer ${r.name} on the rail`}
                   onClick={(e) => e.stopPropagation()}
                   onChange={(e) =>
                     onAct("pin_line", { id: r.id, on: e.target.checked ? "yes" : "no" })} />
          ),
          drop: r.base ? null : (
            <button className="drop" title={`remove ${r.name}`}
                    onClick={(e) => { e.stopPropagation(); onAct("unpin", { id: r.id }); }}>
              <Icon name="remove" />
            </button>
          ),
        },
      }))}
    />
  );
}
