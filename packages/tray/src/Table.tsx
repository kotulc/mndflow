/** One table, wherever the tray lists things.
 *
 *  **Contents, templates, usages and packages are one layout.** They differ in
 *  where their rows come from and what the columns are called, which is data —
 *  so the markup is written once and the tabs hand it rows. Four copies of a
 *  `<table>` would have drifted the first time a column gained a title.
 *
 *  A cell holds a node rather than a string, which is what lets a row carry its
 *  own control — the usages table retypes in place, and needs no selection to
 *  do it. */

import type { ReactNode } from "react";

export type Column = {
  key: string;
  label: string;
  /** Left to the browser where it is absent, which is what a column of
   *  controls wants. */
  width?: string;
};

export type Line = {
  id: string;
  cells: Record<string, ReactNode>;
  /** What the browser shows on hover, per column. Strings only: a title is an
   *  attribute, so a node has nothing to give it. */
  titles?: Record<string, string>;
};

export type TableProps = {
  columns: readonly Column[];
  rows: readonly Line[];
  picked?: readonly string[];
  onPick?: (id: string) => void;
  onHover?: (id: string | null) => void;
  /** What stands in the body when there is nothing. **Said rather than blank**,
   *  because an empty table and a broken one look identical. */
  empty: string;
};

export function Table(props: TableProps) {
  const { columns, rows, picked = [], onPick, onHover, empty } = props;

  return (
    <table className="contents-table">
      <colgroup>
        {columns.map((c) => <col key={c.key} style={c.width ? { width: c.width } : undefined} />)}
      </colgroup>
      <thead>
        <tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
      </thead>
      <tbody onMouseLeave={() => onHover?.(null)}>
        {rows.map((row) => (
          <tr key={row.id}
              className={picked.includes(row.id) ? "picked" : ""}
              onMouseEnter={() => onHover?.(row.id)}
              onClick={onPick ? () => onPick(row.id) : undefined}>
            {columns.map((c) => (
              <td key={c.key} className={c.key} title={row.titles?.[c.key]}>
                {row.cells[c.key]}
              </td>
            ))}
          </tr>
        ))}
        {rows.length === 0 ? (
          <tr className="empty"><td colSpan={columns.length}>{empty}</td></tr>
        ) : null}
      </tbody>
    </table>
  );
}
