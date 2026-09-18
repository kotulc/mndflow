/** The definitions and types tabs: definitions in one table, the workspace's or an element's. */

import { useState } from "react";
import { def_named, def_of, isa, block_base, pinned_defs, relation_base, shipped,
         type Act, type Graph, type Id } from "@mnd/core";
import { Entry } from "./Entry";
import { types_for } from "./holder";
import { Choice, Table, type Chips, type Column } from "./Table";
import { def_rows, type DefRow } from "./rows";

/** Which of the explorer's library folders a listing is narrowed to. */
/** Where the tray was pointed. `packages` is a target the explorer sends, never a chip:
 *  a package's definitions read in the explorer, and its tab says what is drawn on. */
export type Only = "all" | "pinned" | "workspace" | "packages";

/** A narrowing of the library: a folder, a group, a package. */
export type Shelf = { only: Only; group?: "block" | "relation"; from?: string;
                      /** The explorer folder it was picked from, which lists its group. */
                      folder?: Id };

const FOLDERS: readonly { key: Only; word: string }[] = [
  { key: "all", word: "all" }, { key: "pinned", word: "pinned" },
  { key: "workspace", word: "workspace" },
];

const GROUPS = [
  { key: "all", word: "all" }, { key: "block", word: "blocks" }, { key: "relation", word: "relations" },
] as const;

export type DefinitionsProps = {
  graph: Graph;
  /** The element in context, whose types are listed; absent lists the whole workspace. */
  about?: Id;
  /** The definition the tray has hold of, lit. */
  held: Id | null;
  /** What is selected on the canvas, which *apply* points at the picked row. */
  lines: readonly Id[];
  /** What *apply* names: the one thing picked, or how many. */
  target?: string;
  /** What the list opens narrowed to, as the explorer's section left it. */
  seed?: Shelf;
  onPick: (id: Id) => void;
  onAct: Act;
};

/** Why a name may not be used in a group, or null. */
export function taken(graph: Graph, name: string, group: "block" | "relation",
                      self?: Id): string | null {
  const other = def_named(graph, name, group);
  return !other || other.id === self ? null : `${other.name} already exists`;
}

export function Definitions({ graph, about, held, lines, target = "the selection", onPick, onAct,
                              seed = { only: "all" } }: DefinitionsProps) {
  const [only, set_only] = useState<Only>(seed.only);
  const [group, set_group] = useState<"all" | "block" | "relation">(seed.group ?? "all");
  /** Which package, where the explorer pointed at one. No chip picks it. */
  const from = seed.from ?? "all";
  const [name, set_name] = useState("");
  const [label, set_label] = useState("");
  const [up, set_up] = useState<Id | null>(null);

  /** An element lists what it may follow; the workspace lists everything, narrowed by chips. */
  const fitting = about ? new Set(types_for(graph, about).map((d) => d.id)) : null;
  const all = def_rows(graph).filter((r) => !fitting || fitting.has(r.id));
  const pinned = new Set([...pinned_defs(graph, "block"), ...pinned_defs(graph, "relation")]
    .map((d) => d.id));
  const in_folder = (r: DefRow, k: Only) =>
    k === "all" ? true
    : k === "pinned" ? pinned.has(r.id)
    : k === "workspace" ? !r.from
    : !!r.from && (from === "all" || r.from === from);
  const in_group = (r: DefRow, g: string) => g === "all" || r.group === g;
  const rows = fitting ? all : all.filter((r) => in_folder(r, only) && in_group(r, group));

  /** One group in view: the one listed, or the one chosen. */
  const one = fitting ? all[0]?.group ?? null : group === "all" ? null : group;
  const labelled = one !== "block";

  const chips: Chips[] = fitting ? [] : [
    { key: "group", on: group, onPick: (k) => set_group(k as typeof group),
      of: GROUPS.map((g) => ({ ...g, count: all.filter((r) => in_folder(r, only) && in_group(r, g.key)).length })) },
    { key: "folder", on: only, onPick: (k) => set_only(k as Only),
      of: FOLDERS.map((f) => ({ ...f, count: all.filter((r) => in_group(r, group) && in_folder(r, f.key)).length })) },
  ];

  const columns: Column[] = [
    { key: "name", label: "name" },
    ...(labelled ? [{ key: "label", label: "label" }] : []),
    { key: "extends", label: "extends" },
    { key: "source", label: "source" },
    { key: "used", label: "used" },
  ];

  /** What a definition may extend: never itself or below it, and a default only within its kind. */
  const kind = (id: Id) => (graph.defs[id]?.group === "relation" ? relation_base(graph, id)
                                                                  : block_base(graph, id));
  const above = (g: "block" | "relation", self: Id | null) => [
    ...Object.values(graph.defs).filter((d) => d.group === g && shipped(d))
      .map((d) => ({ id: d.id, name: `base/${d.name}` })),
    ...all.filter((r) => r.group === g)]
    .filter((r) => !self || (r.id !== self && !isa(graph, r.id).some((d) => d.id === self)
      && (graph.defs[self]?.default === undefined || kind(r.id) === graph.defs[self]!.default)))
    .map((r) => ({ value: r.id, word: r.name }));

  /** A new definition extends its group's base until another is picked. */
  const base = one === "relation" ? "line" : "block";
  const extend = up && graph.defs[up] ? up : base;
  const clash = one && name.trim() ? taken(graph, name, one) : null;
  const add = () => {
    if (!one || !name.trim() || clash) return;
    onAct("define", { name: name.trim(), group: one, extends: extend,
                      ...(one === "relation" ? { label: label.trim() } : {}) });
    set_name("");
    set_label("");
    set_up(null);
  };

  return (
    <Table
      columns={columns}
      acts="11rem"
      picked={held ? [held] : []}
      onPick={onPick}
      empty="nothing of that sort"
      chips={chips}
      rows={rows.map((r) => {
        const mine = !r.from;
        const def = graph.defs[r.id]!;
        return {
          id: r.id,
          titles: { name: r.name, label: r.label, source: r.from || "workspace" },
          cells: {
            /** Renamed in place; the id stays, so nothing naming it is retyped. */
            name: mine && !r.base ? (
              <Entry value={r.name} label={`rename ${r.name}`}
                     clash={(to) => taken(graph, to, r.group, r.id)}
                     onCommit={(to) => onAct("rename_def", { id: r.id, name: to })} />
            ) : r.name,
            label: r.group === "block" ? "" : mine ? (
              <Entry value={r.label} label={`label of ${r.name}`} placeholder="no label" blank
                     onCommit={(to) => onAct("define", { name: def.name, group: r.group, label: to })} />
            ) : r.label,
            extends: !mine ? graph.defs[r.extends]?.name ?? "" : (
              <Choice value={r.extends} label={`what ${r.name} extends`} of={above(r.group, r.id)}
                      onPick={(id) => onAct("define", { name: def.name, group: r.group, extends: id })} />
            ),
            source: r.from || "workspace",
            used: String(r.used),
          },
          /** Only on the row picked, and only where something would change. */
          actions: r.id === held && lines.some((id) => def_of(graph, id) !== r.id
                                                    && types_for(graph, id).some((d) => d.id === r.id)) ? (
            <button className="chip" title={`point ${target} at ${r.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAct("retype", { ids: [...lines], type: r.id });
                    }}>
              {`apply to ${target}`}
            </button>
          ) : null,
          /** Removing keeps how its usages draw; the tray moves to what it extended. */
          ...(mine && !r.base ? { drop: `remove ${r.name}`, onDrop: () => {
            onAct("remove_def", { id: r.id });
            if (r.extends && r.id === held) onPick(r.extends);
          } } : {}),
        };
      })}
      /** A new definition needs one group, so the row adds only with one in view. */
      {...(one && !fitting ? { adding: {
        ready: !!name.trim() && !clash,
        onAdd: add,
        title: "add this definition",
        cells: {
          name: (
            <>
              <input value={name} aria-label="definition name"
                     placeholder={`add a ${one} definition`}
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
          extends: <Choice value={extend} label="extends" of={above(one, null)} onPick={set_up} />,
          source: "workspace",
          used: "",
        },
      } } : {})}
    />
  );
}
