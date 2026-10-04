/** The definitions and type tabs: definitions in one table, the workspace's or an element's. */

import { useState } from "react";
import { def_at, def_named, def_of, isa, pinned_defs, type Act, type Domain, type Graph,
         type Id } from "@mnd/core";
import { Entry } from "./Entry";
import { def_path, types_for } from "./holder";
import { Choice, lit_row, Table, type Chips, type Column, type Line } from "./Table";
import { def_rows, type DefRow } from "./rows";

/** Which of the library's listings the tray is narrowed to. */
/** Where the tray was pointed. `packages` is a target the explorer sends, never a chip:
 *  a package's definitions read in the explorer, and its tab says what is drawn on. */
export type Only = "all" | "pinned" | "workspace" | "packages";

/** A narrowing of the library: a listing, a group, a package. */
export type Shelf = { only: Only; group?: Domain; from?: string };

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
  /** The definition the element already follows, which heads the listing. */
  follows: Id | null;
  /** What is selected on the canvas, which *apply* points at the lit row. */
  lines: readonly Id[];
  /** What *apply* names: the one thing picked, or how many. */
  target?: string;
  /** What the list opens narrowed to, as the explorer's section left it. */
  seed?: Shelf;
  /** Make the lit definition the context, offered on its row as *view*. Absent offers none. */
  onOpen?: (id: Id) => void;
  onAct: Act;
};

/** Why a name may not be used in a group, or null. */
export function taken(graph: Graph, name: string, group: Domain,
                      self?: Id): string | null {
  const other = def_named(graph, name, group);
  return !other || other.id === self ? null : `${other.name} already exists`;
}

export function Definitions({ graph, about, follows, lines, target = "the selection", onOpen,
                              onAct, seed = { only: "all" } }: DefinitionsProps) {
  /** Which row is lit, which is the one clicked and nothing else: a pick lights and no more,
   *  the context moves on a chip, and what is followed says so on its own row. */
  const [lit, set_lit] = useState<Id | null>(null);
  const [only, set_only] = useState<Only>(seed.only);
  const [group, set_group] = useState<"all" | "block" | "relation">(seed.group ?? "all");
  /** Which package, where the explorer pointed at one. No chip picks it. */
  const from = seed.from ?? "all";
  const [name, set_name] = useState("");
  const [up, set_up] = useState<Id | null>(null);

  /** An element lists what it may follow, in that listing's own order — bases first. The
   *  workspace lists everything, narrowed by chips. */
  const fits = about ? types_for(graph, about).map((d, at) => [d.id, at] as const) : null;
  const fitting = fits ? new Map(fits) : null;
  /** Every definition there is, which is what a chain may be extended from. */
  const every = def_rows(graph);
  const all = fitting
    ? every.filter((r) => fitting.has(r.id))
           .sort((a, z) => fitting.get(a.id)! - fitting.get(z.id)!)
    : every;
  const pinned = new Set(pinned_defs(graph).map((d) => d.id));
  const in_folder = (r: DefRow, k: Only) =>
    k === "all" ? true
    : k === "pinned" ? pinned.has(r.id)
    : k === "workspace" ? !r.from
    : !!r.from && (from === "all" || r.from === from);
  const in_group = (r: DefRow, g: string) => g === "all" || r.group === g;
  const rows = fitting ? all : all.filter((r) => in_folder(r, only) && in_group(r, group));
  /** An element's own definition heads its types, since it answers what the rest offer. */
  const current = fitting ? rows.find((r) => r.id === follows) ?? null : null;
  const listed = current ? rows.filter((r) => r.id !== current.id) : rows;

  /** One group in view: the one listed, or the one chosen. */
  const one = fitting ? all[0]?.group ?? null : group === "all" ? null : group;

  const chips: Chips[] = fitting ? [] : [
    { key: "group", on: group, onPick: (k) => set_group(k as typeof group),
      of: GROUPS.map((g) => ({ ...g, count: all.filter((r) => in_folder(r, only) && in_group(r, g.key)).length })) },
    { key: "folder", on: only, onPick: (k) => set_only(k as Only),
      of: FOLDERS.map((f) => ({ ...f, count: all.filter((r) => in_group(r, group) && in_folder(r, f.key)).length })) },
  ];

  const columns: Column[] = [
    { key: "name", label: "name" },
    { key: "extends", label: "extends" },
    { key: "source", label: "source" },
    { key: "used", label: "used" },
  ];

  /** What a definition may extend: never itself or below it. */
  const above = (g: Domain, self: Id | null) => every
    .filter((r) => r.group === g)
    .filter((r) => !self || (r.id !== self && !isa(graph, r.id).some((d) => d.id === self)))
    .map((r) => ({ value: r.id, word: def_path(graph, def_at(graph, r.id)!) }));

  /** A new definition extends its group's base until another is picked. */
  const base = one === "relation" ? "line" : "block";
  const extend = up && def_at(graph, up) ? up : base;
  const clash = one && name.trim() ? taken(graph, name, one) : null;
  const add = () => {
    if (!one || !name.trim() || clash) return;
    onAct("define", { name: name.trim(), domain: one, extends: extend });
    set_name("");
    set_up(null);
  };

  /** What is lit: the row clicked and listed, else the first — the one it follows, where it has
   *  one, since that heads the listing. */
  const on = lit_row(current ? [current, ...listed] : listed, lit ? [lit] : []);

  /** One definition's row, wherever it sits. */
  const line = (r: DefRow): Line => {
    /** The workspace's own, so its identity is the workspace's to change. */
    const mine = !r.from && !r.base;
    /** What the element already follows, which is a state of the row and not an act on it. */
    const following = fitting && r.id === follows;
    /** What the lit row offers: apply it to the selection, or make it the context. */
    const applies = lines.some((id) => def_of(graph, id) !== r.id
                                    && types_for(graph, id).some((d) => d.id === r.id));
    return {
      id: r.id,
      titles: { name: r.name, source: r.from || "workspace" },
      cells: {
        /** Renamed in place; the id stays, so nothing naming it is retyped. */
        name: mine ? (
          <Entry value={r.name} label={`rename ${r.name}`}
                 clash={(to) => taken(graph, to, r.group, r.id)}
                 onCommit={(to) => onAct("rename", { id: r.id, name: to })} />
        ) : r.name,
        extends: !mine ? graph.blocks[r.extends]?.name ?? "" : (
          <Choice value={r.extends} label={`what ${r.name} extends`} of={above(r.group, r.id)}
                  onPick={(id) => onAct("retype", { ids: [r.id], type: id })} />
        ),
        source: r.from || "workspace",
        used: String(r.used),
      },
      /** An element's listing offers two acts on the lit row — apply it, which the one already
       *  applied never offers, and view its definition — and says which one is applied. The
       *  workspace's listing offers the view alone. */
      actions: (
        <>
          {following ? <span className="tag">applied</span> : null}
          {on.includes(r.id) && fitting && !following && applies ? (
            <button className="chip" title={`point ${target} at ${r.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAct("retype", { ids: [...lines], type: r.id });
                    }}>
              apply
            </button>
          ) : null}
          {on.includes(r.id) && onOpen ? (
            <button className="chip" title={`open ${r.name} to edit it`}
                    onClick={(e) => { e.stopPropagation(); onOpen(r.id); }}>
              {fitting ? "view definition" : "view"}
            </button>
          ) : null}
        </>
      ),
      /** Removing keeps how its usages draw; the listing lights what it extended. */
      ...(mine ? { drop: `remove ${r.name}`, onDrop: () => {
        onAct("remove_def", { id: r.id });
        if (r.extends && on.includes(r.id)) set_lit(r.extends);
      } } : {}),
    };
  };

  return (
    <Table
      columns={columns}
      acts={fitting ? "18rem" : "11rem"}
      picked={on}
      onPick={set_lit}
      empty="nothing of that sort"
      chips={chips}
      {...(current ? { lead: line(current) } : {})}
      rows={listed.map(line)}
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
          extends: <Choice value={extend} label="extends" of={above(one, null)} onPick={set_up} />,
          source: "workspace",
          used: "",
        },
      } } : {})}
    />
  );
}
