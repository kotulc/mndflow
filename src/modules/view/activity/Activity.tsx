/** The activity stage: one behavior layer as lanes, actions and counted order.
 *
 *  No frame chrome here — the page mounts this where React Flow sits for the
 *  block module, same switch as table and matrix. Derived labels and inferred
 *  order take `DIM`; control nodes are counts drawn beside the action. */

import { outline } from "../../card";
import type { Graph } from "../../../graph/types";
import { stageOf, type ControlKind, type ControlNode, type Stage } from "./stage";

export type ActivityProps = {
  graph: Graph;
  layer: string | null;
  picked: string | null;
  onPick: (id: string) => void;
  onOpen: (id: string) => void;
};

const BOX = { w: 18, h: 14 };

/** Tiny mark for a counted control — shape from the card ask, nothing stored. */
function Mark({ kind, card }: { kind: ControlKind; card: ControlNode["card"] }) {
  const drawn = outline(card.shape, BOX);

  if (drawn.kind === "ellipse") {
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
  if (drawn.kind === "poly") {
    return (
      <svg width={BOX.w} height={BOX.h} aria-label={kind}>
        <title>{kind}</title>
        <polygon
          points={drawn.points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="currentColor"
        />
      </svg>
    );
  }

  // Fork / join bars are thin rects; others fill the box.
  const bar = kind === "fork" || kind === "join";
  return (
    <svg width={BOX.w} height={BOX.h} aria-label={kind}>
      <title>{kind}</title>
      <rect
        x={bar ? 2 : drawn.x} y={bar ? BOX.h / 2 - 1 : drawn.y}
        width={bar ? BOX.w - 4 : drawn.w} height={bar ? 2 : drawn.h}
        rx={drawn.round} fill="currentColor"
      />
    </svg>
  );
}

function marks_at(stage: Stage, action: string, side: "before" | "after") {
  return stage.controls.filter((c) => c.at === action && c.side === side);
}

/** Actions of the open layer, banded by lane, with order and counted marks. */
export function Activity({ graph, layer, picked, onPick, onOpen }: ActivityProps) {
  const stage = stageOf(graph, layer);

  if (stage.actions.length === 0) {
    return (
      <div className="contents" style={{ overflow: "auto", height: "100%" }}>
        <div className="empty">empty</div>
      </div>
    );
  }

  const by_lane = new Map<string, typeof stage.actions>();
  for (const action of stage.actions) {
    const key = action.lane || "";
    const list = by_lane.get(key) ?? [];
    list.push(action);
    by_lane.set(key, list);
  }

  const lane_name = (ref: string) =>
    ref ? (stage.lanes.find((l) => l.ref === ref)?.name ?? ref) : "—";

  return (
    <div className="contents" style={{ overflow: "auto", height: "100%" }}>
      <table className="contents-table">
        <thead>
          <tr>
            <th>lane</th>
            <th />
            <th>action</th>
            <th />
            <th>order</th>
          </tr>
        </thead>
        <tbody>
          {[...by_lane.entries()].map(([ref, actions]) =>
            actions.map((action, i) => {
              const before = marks_at(stage, action.id, "before");
              const after = marks_at(stage, action.id, "after");
              const leaving = stage.orders.filter((o) => o.from === action.id);
              const dim = action.derived ? stage.dim : undefined;

              return (
                <tr
                  key={action.id}
                  className={picked === action.id ? "picked" : undefined}
                  onClick={() => onPick(action.id)}
                  onDoubleClick={() => onOpen(action.id)}
                >
                  <td className="type">
                    {i === 0 ? lane_name(ref) : <span className="none">·</span>}
                  </td>
                  <td className="sort">
                    {before.map((c, n) => (
                      <Mark key={`${c.kind}-${n}`} kind={c.kind} card={c.card} />
                    ))}
                  </td>
                  <td className="name" style={dim}>
                    {action.label || "·"}
                  </td>
                  <td className="sort">
                    {after.map((c, n) => (
                      <Mark key={`${c.kind}-${n}`} kind={c.kind} card={c.card} />
                    ))}
                  </td>
                  <td className="type">
                    {leaving.length === 0 ? (
                      <span className="none">—</span>
                    ) : (
                      leaving.map((o) => {
                        const to = stage.actions.find((a) => a.id === o.to);
                        const label = `${to?.label || o.to}${o.guard ? ` [${o.guard}]` : ""}`;
                        return (
                          <div key={o.edge.id} style={o.inferred ? stage.dim : undefined}>
                            → {label}
                          </div>
                        );
                      })
                    )}
                  </td>
                </tr>
              );
            })
          )}
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
