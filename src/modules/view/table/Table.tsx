/** The table stage: a scrolling list of rows for one layer.
 *
 *  No frame and no camera — the surface said so. The host mounts this where
 *  React Flow sits for the block module. */

import { rowsOf } from "./rows";
import { Row } from "./Row";
import type { Graph } from "../../../graph/types";

export type TableProps = {
  graph: Graph;
  layer: string | null;
  picked: string | null;
  onPick: (id: string) => void;
  onOpen: (id: string) => void;
};

/** Proxies (and blocks) of the open layer, drawn as rows. */
export function Table({ graph, layer, picked, onPick, onOpen }: TableProps) {
  const rows = rowsOf(graph, layer);

  return (
    <div className="contents" style={{ overflow: "auto", height: "100%" }}>
      {rows.length === 0 ? (
        <div className="empty">empty</div>
      ) : (
        <table className="contents-table">
          <thead>
            <tr>
              <th>form</th>
              <th>name</th>
              <th>type</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Row
                key={row.id}
                row={row}
                picked={picked === row.id}
                onPick={onPick}
                onOpen={onOpen}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
