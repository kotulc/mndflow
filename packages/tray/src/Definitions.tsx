/** The definitions tab: every definition of one group, in one table. */

import { useState } from "react";
import { def_named, def_of, isa, may_retype, module_named, pinned_defs, relation_named, shipped,
         type Act, type Graph, type Id } from "@mnd/core";
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
  { key: "default", word: "defaults" },
  { key: "pinned", word: "pinned" },
  { key: "labelled", word: "labelled" },
  { key: "package", word: "packages" },
] as const;

export type Only = (typeof SORTS)[number]["key"];

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
  /** What the list opens narrowed to, as the explorer's section left it. */
  seed?: Only;
  /** One package, when the tray is pointed at it: the packages chip becomes that package. */
  pack?: string;
  onPick: (id: Id) => void;
  onAct: Act;
};

/** Why a name may not be used in a group, or null. */
export function taken(graph: Graph, name: string, group: "block" | "relation",
                      self?: Id): string | null {
  const other = def_named(graph, name, group);
  return !other || other.id === self ? null : `${other.name} already exists`;
}

export function Definitions({ graph, group, held, lines, target = "the selection", from, onPick,
                              onAct, seed = "all", pack }: DefinitionsProps) {
  const [only, set_only] = useState<Only>(seed);
  const [name, set_name] = useState("");
  const [label, set_label] = useState("");
  const [up, set_up] = useState<Id | null>(null);

  const rows = def_rows(graph, group);
  /** What the workspace pinned, which is a folder in the explorer and a chip here. */
  const pinned = new Set(pinned_defs(graph, group).map((d) => d.id));
  const fits = (r: DefRow, k: Only) =>
    k === "all" ? true
    : k === "package" ? (pack ? r.from === pack : !!r.from)
    : k === "default" ? r.base
    : k === "pinned" ? pinned.has(r.id)
    : !!r.label;
  /** A package in context names its own chip; a block group has no labels. */
  const sorts = SORTS.filter((s) => (group === "relation" || s.key !== "labelled"))
    .map((s) => (s.key === "package" && pack ? { ...s, word: pack } : s));

  /** What a definition may extend: never itself or below it, and a default only within its kind. */
  const kind = (id: Id) => (group === "relation" ? relation_named(graph, id) : module_named(graph, id));
  const floor = Object.values(graph.defs).filter((d) => d.group === group && shipped(d))
    .map((d) => ({ id: d.id, name: `base/${d.name}` }));
  const above = (self: Id | null) => [...floor, ...rows]
    .filter((r) => !self || (r.id !== self && !isa(graph, r.id).some((d) => d.id === self)
      && (graph.defs[self]?.default === undefined || kind(r.id) === graph.defs[self]!.default)))
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
            /** Renamed in place; the id stays, so nothing naming it is retyped. */
            name: mine && !r.base ? (
              <Entry value={r.name} label={`rename ${r.name}`}
                     clash={(to) => taken(graph, to, group, r.id)}
                     onCommit={(to) => onAct("rename_def", { id: r.id, name: to })} />
            ) : r.from ? `${r.name} · ${r.from}` : r.name,
            label: mine ? (
              <Entry value={r.label} label={`label of ${r.name}`} placeholder="no label" blank
                     onCommit={(to) => onAct("define", { name: graph.defs[r.id]!.name, group, label: to })} />
            ) : r.label,
            extends: !mine ? graph.defs[r.extends]?.name ?? "" : (
              <Choice value={r.extends} label={`what ${r.name} extends`} of={above(r.id)}
                      onPick={(id) => onAct("define", { name: graph.defs[r.id]!.name, group, extends: id })} />
            ),
            used: String(r.used),
          },
          /** Only on the row picked, and only where something would change. */
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
          /** Removing keeps how its lines draw; the tray moves to what it extended. */
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
