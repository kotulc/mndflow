/** The sequence stage: one behavior layer as columns, occurrences and messages.
 *
 *  No frame chrome here — the page mounts this where React Flow sits for the
 *  block module, same switch as activity. Derived labels and implied order
 *  take `DIM`; a message is an order that crosses columns. */

import type { Graph } from "../../../graph/types";
import { stageOf, type Stage } from "./stage";

export type SequenceProps = {
  graph: Graph;
  layer: string | null;
  picked: string | null;
  onPick: (id: string) => void;
  onOpen: (id: string) => void;
};

function label_of(stage: Stage, id: string): string {
  return stage.occurrences.find((o) => o.id === id)?.label || id;
}

function col_name(stage: Stage, ref: string): string {
  if (!ref) return "—";
  return stage.columns.find((c) => c.ref === ref)?.name ?? ref;
}

/** Occurrences of the open layer, one column per participant, order down. */
export function Sequence({ graph, layer, picked, onPick, onOpen }: SequenceProps) {
  const stage = stageOf(graph, layer);

  if (stage.occurrences.length === 0) {
    return (
      <div className="contents" style={{ overflow: "auto", height: "100%" }}>
        <div className="empty">empty</div>
      </div>
    );
  }

  const ranks = [...new Set(stage.occurrences.map((o) => o.rank))].sort((a, b) => a - b);
  const at = (rank: number, col: string) =>
    stage.occurrences.find((o) => o.rank === rank && o.column === col);

  return (
    <div className="contents" style={{ overflow: "auto", height: "100%" }}>
      <table className="contents-table">
        <thead>
          <tr>
            {stage.columns.length === 0 ? (
              <th>—</th>
            ) : (
              stage.columns.map((col) => (
                <th key={col.ref}>{col.name}</th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {ranks.map((rank) => (
            <tr key={rank}>
              {(stage.columns.length === 0
                ? [{ ref: "", name: "—" }]
                : stage.columns
              ).map((col) => {
                const occ = stage.columns.length === 0
                  ? stage.occurrences.find((o) => o.rank === rank)
                  : at(rank, col.ref);
                if (!occ) {
                  return (
                    <td key={col.ref || "—"} className="type">
                      <span className="none">·</span>
                    </td>
                  );
                }
                const dim = occ.derived ? stage.dim : undefined;
                return (
                  <td
                    key={occ.id}
                    className={picked === occ.id ? "picked name" : "name"}
                    style={dim}
                    onClick={() => onPick(occ.id)}
                    onDoubleClick={() => onOpen(occ.id)}
                  >
                    {occ.label || "·"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {stage.messages.length > 0 && (
        <table className="contents-table">
          <thead>
            <tr>
              <th>from</th>
              <th>message</th>
              <th>to</th>
            </tr>
          </thead>
          <tbody>
            {stage.messages.map((m, i) => {
              const style = m.implied || m.inferred ? stage.dim : undefined;
              const mark = m.implied ? "~" : "→";
              const guard = m.guard ? ` [${m.guard}]` : "";
              return (
                <tr key={m.edge?.id ?? `implied-${i}`} style={style}>
                  <td className="type">{col_name(stage, m.fromCol)}</td>
                  <td className="name">
                    {mark} {label_of(stage, m.from)}{guard}
                  </td>
                  <td className="type">{col_name(stage, m.toCol)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
