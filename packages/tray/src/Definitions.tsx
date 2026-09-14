/** The definitions tab: **every relation definition a line can name**, in one
 *  table over the whole workspace.
 *
 *  A definition is a name, an optional label and what it extends. The label is
 *  what a line naming it draws — a stereotype, exactly as typed — and is its
 *  own: extending a definition and giving it another label is how one look
 *  carries several names. **A name is the workspace's**, so one refused as
 *  taken is always here to be found.
 *
 *  | row | edits |
 *  |---|---|
 *  | the workspace's own | name, label, extends, remove |
 *  | the base line | name and label; it extends nothing and stays |
 *  | a package's | nothing — extend it instead |
 *
 *  **The last row adds one.** Picking a row holds it, so settings describes it;
 *  with lines selected on the canvas, the picked row offers **apply**, which
 *  points them at it. Picking alone never changes a drawing. */

import { useState } from "react";
import { def_named, def_of, isa, type Act, type Graph, type Id } from "@mnd/core";
import { Entry } from "./Entry";
import { Choice, Table, type Column } from "./Table";
import { def_rows, type DefRow } from "./rows";

const COLUMNS: readonly Column[] = [
  { key: "name", label: "name", width: "28%" },
  { key: "label", label: "label", width: "24%" },
  { key: "extends", label: "extends", width: "28%" },
  { key: "used", label: "used", width: "10%" },
  { key: "view", label: "", width: "4.5em" },
];

const SORTS = [
  { key: "all", word: "all" },
  { key: "labelled", word: "labelled" },
  { key: "package", word: "packages" },
] as const;

type Only = (typeof SORTS)[number]["key"];

export type DefinitionsProps = {
  graph: Graph;
  /** The definition the tray has hold of, lit. */
  held: Id | null;
  /** The lines selected on the canvas, which *apply* points at the picked row. */
  lines: readonly Id[];
  /** What a new row extends until another is picked — the one in hand. */
  from: Id;
  onPick: (id: Id) => void;
  onAct: Act;
};

/** Why a name may not be used, or null. **Said with what holds it.** */
export function taken(graph: Graph, name: string, self?: Id): string | null {
  const other = def_named(graph, name);
  if (!other || other.id === self) return null;
  return other.group === "block" ? `${other.name} is a block definition`
    : `${other.name} already exists`;
}

export function Definitions({ graph, held, lines, from, onPick, onAct }: DefinitionsProps) {
  const [only, set_only] = useState<Only>("all");
  const [name, set_name] = useState("");
  const [label, set_label] = useState("");
  const [up, set_up] = useState<Id | null>(null);

  const rows = def_rows(graph);
  const base = rows.find((r) => r.base)?.id;
  const fits = (r: DefRow, k: Only) =>
    k === "all" || (k === "package" ? !!r.from : !!r.label);

  /** What a definition may extend: never itself or anything below it. */
  const above = (self: Id | null) => rows
    .filter((r) => !self || (r.id !== self && !isa(graph, r.id).some((d) => d.id === self)))
    .map((r) => ({ value: r.id, word: r.name }));

  const extend = up && graph.defs[up] ? up : from;
  const clash = name.trim() ? taken(graph, name) : null;
  const add = () => {
    if (!name.trim() || clash) return;
    onAct("define", { name: name.trim(), group: "relation", extends: extend,
                      label: label.trim() });
    set_name("");
    set_label("");
    set_up(null);
  };

  return (
    <Table
      columns={COLUMNS}
      picked={held ? [held] : []}
      onPick={onPick}
      empty="nothing of that sort"
      chips={[{ key: "sort", on: only, onPick: (k) => set_only(k as Only),
                of: SORTS.map((s) => ({ ...s, count: rows.filter((r) => fits(r, s.key)).length })) }]}
      rows={rows.filter((r) => fits(r, only)).map((r) => {
        const mine = !r.from;
        return {
          id: r.id,
          titles: { name: r.from ? `${r.name}, from ${r.from}` : r.name, label: r.label },
          cells: {
            /** **Renamed in place**; the id stays, so nothing naming it is retyped. */
            name: mine ? (
              <Entry value={r.name} label={`rename ${r.name}`}
                     clash={(to) => taken(graph, to, r.id)}
                     onCommit={(to) => onAct("rename_def", { id: r.id, name: to })} />
            ) : `${r.name} · ${r.from}`,
            label: mine ? (
              <Entry value={r.label} label={`label of ${r.name}`} placeholder="no label" blank
                     onCommit={(to) => onAct("define", { name: r.name, label: to })} />
            ) : r.label,
            extends: !mine || r.base ? graph.defs[r.extends]?.name ?? "" : (
              <Choice value={r.extends} label={`what ${r.name} extends`} of={above(r.id)}
                      onPick={(id) => onAct("define", { name: r.name, extends: id })} />
            ),
            used: String(r.used),
            /** **Only on the row picked, and only where a line would change.** */
            view: r.id === held && lines.some((id) => def_of(graph, id) !== r.id) ? (
              <button className="chip" title={`point the selected lines at ${r.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAct("retype", { ids: [...lines], type: r.base ? "" : r.id });
                      }}>
                apply
              </button>
            ) : null,
          },
          /** **Removing keeps how its lines draw**: looks go down into each line,
           *  and anything extending it extends what it extended. */
          /** **The tray stays on definitions**: what was held goes to the base. */
          ...(mine && !r.base ? { drop: `remove ${r.name}`, onDrop: () => {
            onAct("unpin", { id: r.id });
            if (base && r.id === held) onPick(base);
          } } : {}),
        };
      })}
      adding={{
        ready: !!name.trim() && !clash,
        onAdd: add,
        title: "add this definition",
        cells: {
          name: (
            <>
              <input value={name} aria-label="definition name" placeholder="add a definition"
                     onChange={(e) => set_name(e.target.value)}
                     onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
              {clash ? <span className="from warn">{clash}</span> : null}
            </>
          ),
          label: (
            <input value={label} aria-label="label" placeholder="no label"
                   onChange={(e) => set_label(e.target.value)}
                   onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
          ),
          extends: <Choice value={extend} label="extends" of={above(null)} onPick={set_up} />,
          used: "",
          view: null,
        },
      }}
    />
  );
}
