/** One row in the table — a block or a proxy drawn as a line.
 *
 *  Reuses the contents-table marks so the visual style stays untouched. Form
 *  is a cell, not a second look: a proxy is what the row *is*, said in the
 *  form column. */

import type { Row as RowData } from "./rows";

export type RowProps = {
  row: RowData;
  picked: boolean;
  onPick: (id: string) => void;
  onOpen: (id: string) => void;
};

/** One member as a table row. Double-click opens a container; a proxy has
 *  nowhere to go, so open is withheld. */
export function Row({ row, picked, onPick, onOpen }: RowProps) {
  const proxy = row.form === "proxy";

  return (
    <tr
      className={picked ? "picked" : undefined}
      onClick={() => onPick(row.id)}
      onDoubleClick={() => { if (!proxy) onOpen(row.id); }}
    >
      <td className="sort">{proxy ? "proxy" : "block"}</td>
      <td className="name">{row.name || "·"}</td>
      <td className="type">
        {row.type ? row.type : <span className="none">—</span>}
      </td>
    </tr>
  );
}
