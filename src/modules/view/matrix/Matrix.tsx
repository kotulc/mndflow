/** The matrix stage: a scrolling N×N grid for one layer.
 *
 *  No frame and no camera — the surface said so. Axes are the same members a
 *  table would list; cells show relationships from row to column. */

import { gridOf } from "./grid";
import type { Graph } from "../../../graph/types";

export type MatrixProps = {
  graph: Graph;
  layer: string | null;
  picked: string | null;
  onPick: (id: string) => void;
  onOpen: (id: string) => void;
};

/** Proxies (and blocks) of the open layer, read against each other. */
export function Matrix({ graph, layer, picked, onPick, onOpen }: MatrixProps) {
  const grid = gridOf(graph, layer);

  if (grid.rows.length === 0) {
    return (
      <div className="contents" style={{ overflow: "auto", height: "100%" }}>
        <div className="empty">empty</div>
      </div>
    );
  }

  return (
    <div className="contents" style={{ overflow: "auto", height: "100%" }}>
      <table className="contents-table">
        <thead>
          <tr>
            <th />
            {grid.cols.map((col) => (
              <th
                key={col.id}
                className={picked === col.id ? "picked" : undefined}
                onClick={() => onPick(col.id)}
                onDoubleClick={() => { if (col.form !== "proxy") onOpen(col.id); }}
              >
                {col.name || "·"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row, ri) => (
            <tr key={row.id} className={picked === row.id ? "picked" : undefined}>
              <td
                className="name"
                onClick={() => onPick(row.id)}
                onDoubleClick={() => { if (row.form !== "proxy") onOpen(row.id); }}
              >
                {row.name || "·"}
              </td>
              {grid.cells[ri].map((cell) => (
                <td key={`${cell.row}:${cell.col}`} className={cell.marks.length ? "type" : undefined}>
                  {cell.marks.length
                    ? cell.marks.join(", ")
                    : <span className="none">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
