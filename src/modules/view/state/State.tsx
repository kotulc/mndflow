/** The state stage: one behavior layer as states and transitions.
 *
 *  No frame chrome here — the page mounts this where React Flow sits for the
 *  block module, same switch as activity. Empty offers `infer`; derived labels
 *  and inferred transitions take `DIM`; initial / final are counts. */

import { outline } from "../../card";
import type { Graph } from "../../../graph/types";
import { stageOf, type Mark, type MarkKind, type Stage } from "./stage";

export type StateProps = {
  graph: Graph;
  layer: string | null;
  picked: string | null;
  onPick: (id: string) => void;
  onOpen: (id: string) => void;
};

const BOX = { w: 18, h: 14 };

/** Tiny mark for a counted pseudostate — initial / final are ellipses. */
function MarkView({ kind, card }: { kind: MarkKind; card: Mark["card"] }) {
  const drawn = outline(card.shape, BOX);
  if (drawn.kind !== "ellipse") return null;

  return (
    <svg width={BOX.w} height={BOX.h} aria-label={kind}>
      <title>{kind}</title>
      <ellipse
        cx={drawn.cx} cy={drawn.cy} rx={drawn.rx} ry={drawn.ry}
        fill="currentColor" opacity={kind === "final" ? 0.35 : 1}
      />
    </svg>
  );
}

function marks_at(stage: Stage, state: string, side: "before" | "after") {
  return stage.marks.filter((m) => m.at === state && m.side === side);
}

/** States of the open layer with transitions and counted initial / final. */
export function State({ graph, layer, picked, onPick, onOpen }: StateProps) {
  const stage = stageOf(graph, layer);

  if (stage.states.length === 0) {
    return (
      <div className="contents" style={{ overflow: "auto", height: "100%" }}>
        <div className="empty">
          <div>empty</div>
          <div className="none">{stage.offer}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="contents" style={{ overflow: "auto", height: "100%" }}>
      {stage.reading && (
        <div className="none" style={{ padding: "0.5rem 0.75rem" }}>
          reading {stage.reading}
        </div>
      )}
      <table className="contents-table">
        <thead>
          <tr>
            <th />
            <th>state</th>
            <th />
            <th>transition</th>
          </tr>
        </thead>
        <tbody>
          {stage.states.map((state) => {
            const before = marks_at(stage, state.id, "before");
            const after = marks_at(stage, state.id, "after");
            const leaving = stage.transitions.filter((t) => t.from === state.id);
            const dim = state.derived ? stage.dim : undefined;

            return (
              <tr
                key={state.id}
                className={picked === state.id ? "picked" : undefined}
                onClick={() => onPick(state.id)}
                onDoubleClick={() => onOpen(state.id)}
              >
                <td className="sort">
                  {before.map((m, n) => (
                    <MarkView key={`${m.kind}-${n}`} kind={m.kind} card={m.card} />
                  ))}
                </td>
                <td className="name" style={dim}>
                  {state.label || "·"}
                </td>
                <td className="sort">
                  {after.map((m, n) => (
                    <MarkView key={`${m.kind}-${n}`} kind={m.kind} card={m.card} />
                  ))}
                </td>
                <td className="type">
                  {leaving.length === 0 ? (
                    <span className="none">—</span>
                  ) : (
                    leaving.map((t) => {
                      const to = stage.states.find((s) => s.id === t.to);
                      const via = t.label ? ` ${t.label}` : "";
                      const guard = t.guard ? ` [${t.guard}]` : "";
                      const label = `→${via} ${to?.label || t.to}${guard}`;
                      return (
                        <div key={t.edge.id} style={t.inferred ? stage.dim : undefined}>
                          {label}
                        </div>
                      );
                    })
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {stage.groups.length > 0 && (
        <table className="contents-table">
          <thead>
            <tr>
              <th>group</th>
              <th>members</th>
            </tr>
          </thead>
          <tbody>
            {stage.groups.map((g) => (
              <tr
                key={g.id}
                className={picked === g.id ? "picked" : undefined}
                onClick={() => onPick(g.id)}
              >
                <td className="name">{g.node.label || g.id}</td>
                <td className="type">{g.members.join(", ") || <span className="none">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
