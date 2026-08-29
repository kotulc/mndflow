/** The context tray: a table of everything the open layer holds.
 *
 *  **Two sizes, shut and open.** Shut it is a bar and nothing more; open, the
 *  stage shrinks and re-centres rather than being covered. **Nothing closes it
 *  but its own control** — a click on the canvas is how a row gets selected.
 *
 *  A pure function of its props, like every other surface: it holds nothing and
 *  every gesture leaves as an action name or a selection. */

import { Icon } from "@mnd/theme";
import { rows_of, type Row } from "./rows";
import { Editor } from "./Editor";
import type { Act, Graph, Id } from "@mnd/core";

export type TrayProps = {
  graph: Graph;
  layer: Id | null;
  label: string;
  open: boolean;
  onOpen: (open: boolean) => void;
  picked: readonly Id[];
  onPick: (ids: Id[]) => void;
  /** Hovering a row lights that thing on the stage. */
  onHover?: (id: Id | null) => void;
  /** **Values and definitions are edited here**, and every change leaves as an
   *  action name like every other gesture in the app. Absent, the tray lists
   *  and edits nothing — which is what it did before. */
  onAct?: Act;
};

const HEAD: { key: keyof Row; label: string; width: string }[] = [
  { key: "kind", label: "kind", width: "18%" },
  { key: "name", label: "name", width: "28%" },
  { key: "what", label: "what", width: "36%" },
  { key: "type", label: "type", width: "18%" },
];

export function Tray(props: TrayProps) {
  const { graph, layer, label, open, onOpen, picked, onPick, onHover, onAct } = props;
  const rows = rows_of(graph, layer);
  /** One row, one editor. Two things picked is a selection, and a selection is
   *  something you act on rather than something you fill in. */
  const one = picked.length === 1 ? picked[0]! : null;

  return (
    <section className={["tray", open ? "open" : "shut"].join(" ")} aria-label="Contents">
      <div className="tray-bar">
        <button className="chevron" title={open ? "shut the tray" : "open the tray"}
                onClick={() => onOpen(!open)}><Icon name={open ? "less" : "more"} /></button>
        <span className="name">{label}</span>
        <span className="holds">{rows.length} held</span>
      </div>

      {open ? (
        <div className="tray-body">
          {one && onAct ? <Editor graph={graph} id={one} onAct={onAct} /> : null}
          <table className="contents-table">
            <colgroup>{HEAD.map((h) => <col key={h.key} style={{ width: h.width }} />)}</colgroup>
            <thead>
              <tr>{HEAD.map((h) => <th key={h.key}>{h.label}</th>)}</tr>
            </thead>
            <tbody onMouseLeave={() => onHover?.(null)}>
              {rows.map((row) => (
                <tr key={row.id}
                    className={picked.includes(row.id) ? "picked" : ""}
                    onMouseEnter={() => onHover?.(row.id)}
                    onClick={() => onPick([row.id])}>
                  {HEAD.map((h) => (
                    <td key={h.key} className={h.key} title={row[h.key]}>{row[h.key]}</td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr className="empty"><td colSpan={HEAD.length}>this layer holds nothing yet</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
