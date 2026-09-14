/** The definitions tab: **every definition of one group the workspace can
 *  name**, in one table — relation definitions for a line, block definitions for
 *  a block.
 *
 *  A definition is a name and what it extends; a relation definition also has a
 *  label, what a line naming it draws, exactly as typed. **A name is unique
 *  within its group**, so one refused as taken is always here to be found.
 *
 *  | row | edits |
 *  |---|---|
 *  | the workspace's own | name, label, extends, remove |
 *  | a default | label; it extends its base and stays |
 *  | a package's | nothing — extend it instead |
 *
 *  **The last row adds one.** Picking a row holds it, so settings describes it;
 *  with lines selected on the canvas, the picked row offers **apply**, which
 *  points them at it. Picking alone never changes a drawing. */

import { useState } from "react";
import { def_named, def_of, isa, may_retype, type Act, type Graph,
         type Id } from "@mnd/core";
import { Entry } from "./Entry";
import { Choice, Table, type Column } from "./Table";
import { def_rows, type DefRow } from "./rows";

const COLUMNS: readonly Column[] = [
  { key: "name", label: "name" },
  { key: "label", label: "label" },
  { key: "extends", label: "extends" },
  { key: "used", label: "used" },
];

/** A block definition has no label. */
const BLOCK_COLUMNS = COLUMNS.filter((c) => c.key !== "label");

const SORTS = [
  { key: "all", word: "all" },
  { key: "labelled", word: "labelled" },
  { key: "package", word: "packages" },
] as const;

type Only = (typeof SORTS)[number]["key"];

export type DefinitionsProps = {
  graph: Graph;
  /** Which definitions: a block's or a line's. */
  group: "block" | "relation";
  /** The definition the tray has hold of, lit. */
  held: Id | null;
  /** What is selected on the canvas, which *apply* points at the picked row. */
  lines: readonly Id[];
  /** What *apply* names: the one thing picked, or how many. */
  target?: string;
  /** What a new row extends until another is picked — the one in hand. */
  from: Id;
  onPick: (id: Id) => void;
  onAct: Act;
};

/** Why a name may not be used in a group, or null. **A block and a line may
 *  share a name**; two of one group may not. */
export function taken(graph: Graph, name: string, group: "block" | "relation",
                      self?: Id): string | null {
  const other = def_named(graph, name, group);
  return !other || other.id === self ? null : `${other.name} already exists`;
}

export function Definitions({ graph, group, held, lines, target = "the selection", from, onPick,
                              onAct }: DefinitionsProps) {
  const [only, set_only] = useState<Only>("all");
  const [name, set_name] = useState("");
  const [label, set_label] = useState("");
  const [up, set_up] = useState<Id | null>(null);

  const rows = def_rows(graph, group);
  const fits = (r: DefRow, k: Only) =>
    k === "all" || (k === "package" ? !!r.from : !!r.label);
  const sorts = group === "relation" ? SORTS : SORTS.filter((s) => s.key !== "labelled");

  /** What a definition may extend: a default or another definition, never
   *  itself or anything below it. */
  const above = (self: Id | null) => rows
    .filter((r) => !self || (r.id !== self && !isa(graph, r.id).some((d) => d.id === self)))
    .map((r) => ({ value: r.id, word: r.name }));

  const extend = up && graph.defs[up] ? up : from;
  const clash = name.trim() ? taken(graph, name, group) : null;
  const add = () => {
    if (!name.trim() || clash) return;
    onAct("define", { name: name.trim(), group, extends: extend,
                      ...(group === "relation" ? { label: label.trim() } : {}) });
    set_name("");
    set_label("");
    set_up(null);
  };

  return (
    <Table
      columns={group === "relation" ? COLUMNS : BLOCK_COLUMNS}
      acts="11rem"
      picked={held ? [held] : []}
      onPick={onPick}
      empty="nothing of that sort"
      chips={[{ key: "sort", on: only, onPick: (k) => set_only(k as Only),
                of: sorts.map((s) => ({ ...s, count: rows.filter((r) => fits(r, s.key)).length })) }]}
      rows={rows.filter((r) => fits(r, only)).map((r) => {
        const mine = !r.from;
        return {
          id: r.id,
          titles: { name: r.from ? `${r.name}, from ${r.from}` : r.name, label: r.label },
          cells: {
            /** **Renamed in place**; the id stays, so nothing naming it is retyped. */
            name: mine && !r.base ? (
              <Entry value={r.name} label={`rename ${r.name}`}
                     clash={(to) => taken(graph, to, group, r.id)}
                     onCommit={(to) => onAct("rename_def", { id: r.id, name: to })} />
            ) : r.from ? `${r.name} · ${r.from}` : r.name,
            label: mine ? (
              <Entry value={r.label} label={`label of ${r.name}`} placeholder="no label" blank
                     onCommit={(to) => onAct("define", { name: r.name, group, label: to })} />
            ) : r.label,
            extends: !mine || r.base ? graph.defs[r.extends]?.name ?? "" : (
              <Choice value={r.extends} label={`what ${r.name} extends`} of={above(r.id)}
                      onPick={(id) => onAct("define", { name: r.name, group, extends: id })} />
            ),
            used: String(r.used),
          },
          /** **Only on the row picked, and only where something would change.** */
          actions: r.id === held && lines.some((id) => def_of(graph, id) !== r.id
                                                    && (group === "relation"
                                                        || may_retype(graph, id, r.id))) ? (
            <button className="chip" title={`point ${target} at ${r.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAct("retype", { ids: [...lines], type: r.base ? "" : r.id });
                    }}>
              {`apply to ${target}`}
            </button>
          ) : null,
          /** **Removing keeps how its lines draw**: looks go down into each line,
           *  and anything extending it extends what it extended. */
          /** **The tray stays on definitions**: what was held goes to what it extended. */
          ...(mine && !r.base ? { drop: `remove ${r.name}`, onDrop: () => {
            onAct("remove_def", { id: r.id });
            if (r.extends && r.id === held) onPick(r.extends);
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
        },
      }}
    />
  );
}
