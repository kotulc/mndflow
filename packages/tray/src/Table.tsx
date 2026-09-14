/** One table, wherever the tray lists things.
 *
 *  **Contents, definitions, usages and packages are one layout.** They differ in
 *  where their rows come from and what the columns are called, which is data —
 *  so the markup is written once and the tabs hand it rows.
 *
 *  | part | given by |
 *  |---|---|
 *  | chips above | `chips`, one group per question; each narrows on its own |
 *  | a cell | a node, so a row carries its own control — `Entry`, `Choice` |
 *  | actions | a row's `actions` and `onDrop`, right-aligned in one compact last column |
 *  | the last row | `adding`: cells that write a new row, and the button that adds it |
 *
 *  **The data columns share the width evenly**; only the action column is sized.
 *
 *  Pure: it holds nothing, and every change leaves through a callback. */

import type { ReactNode } from "react";
import { Icon } from "@mnd/theme";

export type Column = { key: string; label: string };

export type Line = {
  id: string;
  cells: Record<string, ReactNode>;
  /** What the browser shows on hover, per column. Strings only: a title is an
   *  attribute, so a node has nothing to give it. */
  titles?: Record<string, string>;
  /** Chips that act on the row, set right in the action column beside remove. */
  actions?: ReactNode;
  /** Removes the row. Absent, the row cannot be removed. */
  onDrop?: () => void;
  /** Said on the remove button. */
  drop?: string;
};

/** **Where a listing reaches**: the open layer, or the whole workspace. */
export type Scope = "layer" | "workspace";

/** The scope chips, the same question in every table that asks it. */
export function scope_chips(on: Scope, onPick: (to: Scope) => void): Chips {
  return { key: "scope", on, onPick: (k) => onPick(k as Scope),
           of: [{ key: "layer", word: "layer" }, { key: "workspace", word: "workspace" }] };
}

/** **One question's chips**, lit one at a time. */
export type Chips = {
  key: string;
  of: readonly { key: string; word: string; count?: number }[];
  on: string;
  onPick: (key: string) => void;
};

/** The row that adds one. */
export type Adding = {
  cells: Record<string, ReactNode>;
  /** Whether what is written can be added yet. */
  ready: boolean;
  onAdd: () => void;
  title: string;
};

export type TableProps = {
  columns: readonly Column[];
  rows: readonly Line[];
  chips?: readonly Chips[];
  /** Anything else the chip bar carries, at its far end. */
  tools?: ReactNode;
  adding?: Adding;
  picked?: readonly string[];
  onPick?: (id: string) => void;
  onHover?: (id: string | null) => void;
  /** **The action column, reserved up front** at this width, so a chip appearing
   *  on a picked row never reflows the columns. Absent, a column is kept only
   *  where rows can be removed or added. */
  acts?: string;
  /** What stands in the body when there is nothing. **Said rather than blank**,
   *  because an empty table and a broken one look identical. */
  empty: string;
};

export function Table(props: TableProps) {
  const { columns, rows, chips = [], tools, adding, picked = [], onPick, onHover, empty,
          acts } = props;
  const drops = !!acts || !!adding || rows.some((r) => r.onDrop);
  /** **Set on the cells as well as the column**: the head and the body are laid
   *  out as two tables so the body can scroll, and neither reads a `<col>`. */
  const act_w = acts ?? "2rem";
  const span = columns.length + (drops ? 1 : 0);

  const cells = (of: Record<string, ReactNode>, titles?: Record<string, string>) =>
    columns.map((c) => (
      <td key={c.key} className={c.key} title={titles?.[c.key]}>
        {/* A control and its warning sit on one line. */}
        {typeof of[c.key] === "object" && of[c.key] !== null
          ? <span className="adding">{of[c.key]}</span> : of[c.key]}
      </td>
    ));

  return (
    <>
      {chips.length || tools ? <ChipBar chips={chips} tools={tools} /> : null}

      <table className="contents-table">
        <colgroup>
          {columns.map((c) => <col key={c.key} />)}
          {drops ? <col style={{ width: act_w }} /> : null}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c) => <th key={c.key}>{c.label}</th>)}
            {drops ? <th style={{ width: act_w }} /> : null}
          </tr>
        </thead>
        <tbody onMouseLeave={() => onHover?.(null)}>
          {rows.map((row) => (
            <tr key={row.id}
                className={picked.includes(row.id) ? "picked" : ""}
                onMouseEnter={() => onHover?.(row.id)}
                onClick={onPick ? () => onPick(row.id) : undefined}>
              {cells(row.cells, row.titles)}
              {drops ? (
                <td className="drop" style={{ width: act_w }}>
                  <span className="acts">
                    {row.actions}
                    {/* **Only on the row picked**, so a remove is never one stray click. */}
                    {row.onDrop && picked.includes(row.id) ? (
                      <button className="drop" title={row.drop ?? "remove"}
                              onClick={(e) => { e.stopPropagation(); row.onDrop!(); }}>
                        <Icon name="remove" />
                      </button>
                    ) : null}
                  </span>
                </td>
              ) : null}
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr className="empty"><td colSpan={span}>{empty}</td></tr>
          ) : null}
          {adding ? (
            <tr className="add">
              {cells(adding.cells)}
              <td className="drop" style={{ width: act_w }}>
                <span className="acts">
                  <button className="drop" title={adding.title} disabled={!adding.ready}
                          onClick={adding.onAdd}>
                    <Icon name="add" />
                  </button>
                </span>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </>
  );
}

/** **The bar above a table**: each group of chips, then any tools at the far
 *  end. Drawn on its own where a tab shows something other than a table. */
export function ChipBar({ chips, tools }: { chips: readonly Chips[]; tools?: ReactNode }) {
  return (
    <div className="filters">
      {chips.map((g, i) => (
        <span key={g.key} className={i ? "chips split" : "chips"}>
          {g.of.map((c) => (
            <button key={c.key} className={g.on === c.key ? "on" : ""}
                    onClick={() => g.onPick(c.key)}>
              {c.word}
              {c.count === undefined ? null : <span className="count">{c.count}</span>}
            </button>
          ))}
        </span>
      ))}
      {tools ? <span className="columns">{tools}</span> : null}
    </div>
  );
}

/** A pick among a few, in a cell. */
export function Choice({ value, label, of, onPick }: {
  value: string; label: string;
  of: readonly { value: string; word: string }[];
  onPick: (value: string) => void;
}) {
  return (
    <select value={value} aria-label={label} onClick={(e) => e.stopPropagation()}
            onChange={(e) => onPick(e.target.value)}>
      {of.map((o) => <option key={o.value} value={o.value}>{o.word}</option>)}
    </select>
  );
}
