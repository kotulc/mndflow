/** The relation templates tab: **what a line can be made to look like.**
 *
 *  The workspace's own vocabulary of line looks, which the explorer cannot hold
 *  — a definition has no parent, so it has no place in a containment tree, and
 *  reframing one as a block to fit would be the special-casing the tree is
 *  trying to lose.
 *
 *  **Picking a row describes it**, the same way picking a definition row in the
 *  explorer does: one panel, one id, whichever was picked last. The rail stays
 *  out of it — a rail click says what a right drag draws, and merging the two
 *  would change what you draw next every time you glanced at a template. */

import { Table, type Column } from "./Table";
import { template_rows } from "./rows";
import type { Act, Graph, Id } from "@mnd/core";

const COLUMNS: readonly Column[] = [
  { key: "name", label: "template", width: "38%" },
  { key: "extends", label: "extends", width: "26%" },
  { key: "used", label: "used", width: "14%" },
  { key: "pinned", label: "pin line", width: "22%" },
];

export type TemplatesProps = {
  graph: Graph;
  /** The template being described, if the panel has hold of one. */
  held: Id | null;
  onPick: (id: Id) => void;
  onAct: Act;
};

export function Templates({ graph, held, onPick, onAct }: TemplatesProps) {
  const rows = template_rows(graph);

  return (
    <Table
      columns={COLUMNS}
      picked={held ? [held] : []}
      onPick={onPick}
      empty="no templates yet — style a line and make a template of it"
      rows={rows.map((r) => ({
        id: r.id,
        titles: { name: r.name, extends: r.extends },
        cells: {
          name: r.name,
          extends: r.extends,
          used: r.used ? String(r.used) : "",
          /** **The rail toggle, in the row.** Listing a template is not making
           *  one, so it is its own control — and the row is where you are
           *  already looking at the list it joins. */
          pinned: (
            <input type="checkbox" checked={r.pinned} aria-label={`offer ${r.name} on the rail`}
                   onClick={(e) => e.stopPropagation()}
                   onChange={(e) =>
                     onAct("pin_line", { id: r.id, on: e.target.checked ? "yes" : "no" })} />
          ),
        },
      }))}
    />
  );
}
