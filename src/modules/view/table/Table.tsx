/** The table stage: a panel of rows for one layer, modelled on Contents.
 *
 *  **Fills the stage.** Choosing *table* on the project's view toggle is asking
 *  for the layer as a list, so opening a third full with dead space above it
 *  answers a different question. It still shrinks back to a panel on the tab,
 *  which is the size the tray uses. Hosts the crumbs; the types filter is a
 *  rail group (Y.4). No frame, no camera. */

import { useState } from "react";

import { Crumbs } from "../diagram/chrome";
import { nameOf, titleOf } from "../../../graph/fold";
import type { Graph } from "../../../graph/types";
import { trailOf } from "./chrome";
import { rowsOf } from "./rows";
import { Row } from "./Row";
import { Icon } from "../../icons";

export type TableProps = {
  graph: Graph;
  layer: string | null;
  picked: string | null;
  onPick: (id: string) => void;
  /** Descend into a row, or navigate the crumb trail (null = project). */
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

/** Proxies (and blocks) of the open layer, drawn as rows in a tray. */
export function Table({
  graph, layer, picked, onPick, onOpen, path, onUp, shown = null,
}: TableProps) {
  const [expanded, setExpanded] = useState(true);

  const trail = path ?? trailOf(graph, layer);
  const rows = rowsOf(graph, layer);
  const listed = shown ? rows.filter((row) => row.type === shown) : rows;

  const climb = onUp ?? (() => {
    if (!layer) {
      onOpen(null);
      return;
    }
    onOpen(graph.elements[layer]?.parent ?? null);
  });

  const where = layer ? nameOf(graph, graph.elements[layer]) : titleOf(graph);

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
            {listed.length === 0 ? (
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
                  {listed.map((row) => (
                    <Row
                      key={row.id}
                      row={row}
                      picked={picked === row.id}
                      onPick={onPick}
                      onOpen={(id) => onOpen(id)}
                    />
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
