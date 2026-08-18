/** The matrix stage: a panel grid for one layer, modelled on Contents.
 *
 *  **Fills the stage**, for the reason the table does: a grid is asked for to
 *  be read across, and a third of the height with dead space above it is the
 *  worst size for that. Shrinks back to a panel on the tab. Hosts the crumbs; the
 *  types filter is a rail group (Y.4). Axes are the same members a table would
 *  list; cells paint as a heatmap (W.4) — a band per relationship kind, from
 *  `paint.ts`. */

import { useState } from "react";

import { Crumbs } from "../diagram/chrome";
import { nameOf, titleOf } from "../../../graph/fold";
import type { Graph } from "../../../graph/types";
import { trailOf } from "./chrome";
import { gridOf, type Cell } from "./grid";
import { bandsOf, type Band } from "./paint";
import { Icon } from "../../icons";

export type MatrixProps = {
  graph: Graph;
  layer: string | null;
  picked: string | null;
  onPick: (id: string) => void;
  /** Descend into an axis member, or navigate the crumb trail (null = project). */
  onOpen: (id: string | null) => void;
  /** Trail for the crumbs. Derived from the graph when the page omits it. */
  path?: string[];
  /** One layer up. Defaults to opening the open layer's parent. */
  onUp?: () => void;
  /** Narrow the list to one type. The rail owns this control now (Y.4) — the
   *  module says what the group lists (`ViewModule.types`) and stops drawing a
   *  cycle of its own. Absent is everything. */
  shown?: string | null;
};

/** Proxies (and blocks) of the open layer, read against each other. */
export function Matrix({
  graph, layer, picked, onPick, onOpen, path, onUp, shown = null,
}: MatrixProps) {
  const [expanded, setExpanded] = useState(true);

  const trail = path ?? trailOf(graph, layer);
  const grid = gridOf(graph, layer);

  const climb = onUp ?? (() => {
    if (!layer) {
      onOpen(null);
      return;
    }
    onOpen(graph.elements[layer]?.parent ?? null);
  });

  const where = layer ? nameOf(graph, graph.elements[layer]) : titleOf(graph);

  // The rail's types cycle narrows to one kind (Y.4); everything else about
  // which kinds a cell counts is the seam paint.ts leaves for P.9.
  const bandsFor = (cell: Cell): Band[] => {
    const bands = bandsOf(graph, cell);
    return shown ? bands.filter((band) => band.name === shown) : bands;
  };

  return (
    <div className="stage" style={{ display: "flex", flexDirection: "column" }}>
      <Crumbs
        graph={graph}
        view={layer}
        path={trail}
        onOpen={onOpen}
        onUp={climb}
      />

      {!expanded && <div style={{ flex: 1, minHeight: 0 }} aria-hidden />}

      <section
        className="tray open"
        style={expanded ? { height: "100%", flex: 1, minHeight: 0 } : undefined}
      >
        <div className="tray-bar">
          <span className="name">{where}</span>
          <button
            className={`tray-tab ${expanded ? "on" : ""}`}
            aria-expanded={expanded}
            title={expanded ? "Show as a panel" : "Fill the canvas"}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "partial " : "expand "}<Icon name={expanded ? "more" : "less"} />
          </button>
        </div>

        <div className="tray-body">
          <div className="contents" style={{ overflow: "auto" }}>
            {grid.rows.length === 0 ? (
              <div className="empty">empty</div>
            ) : (
              <table className="contents-table">
                <thead>
                  <tr>
                    <th />
                    {grid.cols.map((col) => (
                      <th
                        key={col.id}
                        className={picked === col.id ? "picked" : undefined}
                        onClick={() => onPick(col.id)}
                        onDoubleClick={() => {
                          if (col.form !== "proxy") onOpen(col.id);
                        }}
                      >
                        {col.name || "·"}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.rows.map((row, ri) => (
                    <tr
                      key={row.id}
                      className={picked === row.id ? "picked" : undefined}
                    >
                      <td
                        className="name"
                        onClick={() => onPick(row.id)}
                        onDoubleClick={() => {
                          if (row.form !== "proxy") onOpen(row.id);
                        }}
                      >
                        {row.name || "·"}
                      </td>
                      {grid.cells[ri].map((cell) => {
                        const bands = bandsFor(cell);
                        // One band per kind — a single kind fills the cell,
                        // several share it as equal stripes rather than a
                        // blended colour no single kind actually has.
                        const title = bands
                          .map((band) => `${band.name} (${band.count})`)
                          .join(", ");

                        return (
                          <td
                            key={`${cell.row}:${cell.col}`}
                            className={bands.length ? "matrix-cell" : undefined}
                            title={title || undefined}
                          >
                            {bands.length ? (
                              <div className="cell-heat">
                                {bands.map((band) => (
                                  <span
                                    key={band.type}
                                    className="band"
                                    style={{ background: band.fill, opacity: band.opacity }}
                                  />
                                ))}
                              </div>
                            ) : (
                              <span className="none">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
