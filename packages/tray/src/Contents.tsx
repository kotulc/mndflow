/** **The contents tab**: the card on the left, its kinds as filter rows under it; on the right
 *  what it holds, one table. The workspace holds everything, at any depth; a package and the
 *  workspace list their definitions too, as the library does. A reference holds nothing, so its
 *  contents is the one it stands for. Its text is the overview's. */

import { useState } from "react";
import { alias_of, children, of_ref, stands_for, type Act, type Graph,
         type Id } from "@mnd/core";
import { Icon } from "@mnd/theme";
import { NOOP } from "./Body";
import { Definitions, type Shelf } from "./Definitions";
import { Entry } from "./Entry";
import { ALL, Filters, Lead } from "./Lists";
import { rows_of, type Row, type Sort } from "./rows";
import { lit_row, Table, type Column } from "./Table";

const HEAD: readonly Column[] = [
  { key: "kind", label: "kind" },
  { key: "name", label: "name" },
  { key: "what", label: "what" },
  { key: "type", label: "type" },
];

/** A reference's contents is the one it stands for, so its name column says as much. */
const STANDS: readonly Column[] = HEAD.map((c) =>
  (c.key === "name" ? { ...c, label: "stands for" } : c));

/** What a filter narrows to, and its mark. */
const KINDS: readonly { sort: Sort; label: string; mark: string }[] = [
  { sort: "block", label: "blocks", mark: "▪" },
  { sort: "interface", label: "interfaces", mark: "›" },
  { sort: "relationship", label: "relations", mark: "—" },
  { sort: "group", label: "groups", mark: "▢" },
  { sort: "note", label: "notes", mark: "¶" },
];

/** The filter row for the definitions a package or the workspace files. */
export const DEFINITIONS = "definitions";

export type ContentsProps = {
  graph: Graph;
  /** What the tab is about: a block, a package, or the workspace. */
  id: Id;
  /** What is picked on the canvas, which the table lights where it lists it. */
  picked: readonly Id[];
  /** The kind chosen, kept by the tray per tab while the element stays. */
  on: string;
  onPick: (key: string) => void;
  /** The row lit in the table, the tray's own; told on so the canvas lights it too. */
  lit: Id | null;
  onLit: (id: Id | null) => void;
  /** Where the explorer pointed a library listing, for the definitions row. */
  shelf?: Shelf;
  onHover?: (id: Id | null) => void;
  onView?: (id: Id) => void;
  onOpen: (id: Id) => void;
  onAct?: Act;
};

export function Contents({ graph, id, picked, on, onPick, lit, onLit, shelf, onHover, onView,
                           onOpen, onAct }: ContentsProps) {
  /** Field columns the reader asked for, in the order they asked. */
  const [columns, set_columns] = useState<string[]>([]);
  const [adding, set_adding] = useState("");
  const b = graph.blocks[id];
  /** The workspace holds everything; a package and the workspace file definitions. */
  const whole = id === graph.root;
  const files = b?.parent === null;
  const rows = rows_of(graph, whole ? null : id, whole);
  const shown = on === ALL ? rows : rows.filter((r) => r.sort === on);
  const asked = lit ? [lit] : picked;

  const cell = (row: Row, key: string) =>
    key in row.fields ? row.fields[key]! : String(row[key as keyof Row] ?? "");
  const offered = [...new Set(rows.flatMap((r) => Object.keys(r.fields)))]
    .filter((n) => !columns.includes(n)).sort();

  /** A reference holds nothing of its own — `of` is the whole of it. */
  if (of_ref(graph, id)) {
    const stands = stands_for(graph, id);
    const home = stands ? graph.blocks[stands.id]?.parent ?? null : null;
    const stood = stands ? rows_of(graph, home).find((r) => r.id === stands.id) ?? null : null;
    return (
      <div className="reads">
        <Lead graph={graph} id={id} />
        <Table columns={STANDS} acts="6rem" rows={[]} onHover={onHover}
               picked={lit_row(stood ? [stood] : [], asked)} onPick={onLit}
               empty={`${alias_of(graph, id, true)} stands for something that is gone`}
               {...(stood ? { lead: {
                 id: stood.id,
                 titles: Object.fromEntries(STANDS.map((h) => [h.key, cell(stood, h.key)])),
                 cells: { kind: stood.kind, name: stood.name, what: stood.what, type: stood.type },
                 actions: onView ? (
                   <button className="chip" title="open the layer this is in"
                           onClick={(e) => { e.stopPropagation(); onView(stood.id); }}>
                     view
                   </button>
                 ) : null,
               } } : {})} />
      </div>
    );
  }

  const on_row = lit_row(shown, asked);
  /** A column per field, so one value can be read down a layer. */
  const tools = (
    <>
      {columns.map((n) => (
        <button key={n} className="chip" title={`drop the ${n} column`}
                onClick={() => set_columns(columns.filter((c) => c !== n))}>
          {n}<Icon name="remove" size={10} />
        </button>
      ))}
      {offered.length ? (
        <select value={adding} aria-label="add a column"
                onChange={(e) => {
                  if (!e.target.value) return;
                  set_columns([...columns, e.target.value]);
                  set_adding("");
                }}>
          <option value="">+ column</option>
          {offered.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      ) : null}
    </>
  );
  const count = (sort: Sort) => rows.filter((r) => r.sort === sort).length;
  const seed: Shelf = shelf ?? (whole ? { only: "all" }
    : { only: "packages", from: b?.name ?? id });
  return (
    <div className="reads">
      <Lead graph={graph} id={id}>
        <Filters on={on} onPick={onPick}
                 onLight={(at) => onHover?.(at?.length === 1 ? at[0]! : null)}
                 groups={[
                   ...(files ? [{ rows: [{ key: DEFINITIONS, name: "definitions",
                                           mark: <span className="dash">◇</span> }] }] : []),
                   { label: "kinds", rows: [
                     { key: ALL, name: "all", count: rows.length },
                     ...KINDS.filter((k) => count(k.sort)).map((k) => ({
                       key: k.sort, name: k.label, count: count(k.sort),
                       mark: <span className="dash">{k.mark}</span>,
                       lights: rows.filter((r) => r.sort === k.sort).map((r) => r.id) })),
                   ] },
                 ]} />
      </Lead>
      <div className="lists">
        {on === DEFINITIONS ? (
          <Definitions key={JSON.stringify(seed)} seed={seed} graph={graph} follows={null}
                       lines={[]} onAct={onAct ?? NOOP} onLit={onLit}
                       onOpen={onOpen} />
        ) : (
          <Table
            columns={[...HEAD, ...columns.map((n) => ({ key: `@${n}`, label: n }))]}
            tools={tools} acts="6rem" picked={on_row} onPick={onLit} onHover={onHover}
            empty={whole ? "this workspace holds nothing yet"
              : children(graph, id).length ? "nothing of that sort" : "it holds nothing yet"}
            rows={shown.map((row) => {
              const block = graph.blocks[row.id];
              return {
                id: row.id,
                titles: Object.fromEntries([...HEAD.map((h) => [h.key, cell(row, h.key)]),
                                            ...columns.map((n) => [`@${n}`, cell(row, n)])]),
                cells: {
                  kind: row.kind, what: row.what, type: row.type,
                  /** A block is renamed in its row; a line is named by its type. */
                  name: onAct && block ? (
                    <Entry value={block.name ?? ""} label={`rename ${row.name}`}
                           placeholder={row.name} blank
                           onCommit={(to) => onAct("rename", { id: row.id, name: to })} />
                  ) : row.name,
                  ...Object.fromEntries(columns.map((n) => [`@${n}`,
                    onAct && block ? (
                      <Entry value={cell(row, n)} label={`${n} of ${row.name}`} blank
                             onCommit={(to) => onAct("field", { holder: row.id, name: n,
                                                                value: to })} />
                    ) : cell(row, n)])),
                },
                /** The lit row's view chip, which is the only way a row moves the context. */
                actions: onView && on_row.includes(row.id) ? (
                  <button className="chip" title="go to where it is drawn"
                          onClick={(e) => { e.stopPropagation(); onView(row.id); }}>
                    view
                  </button>
                ) : null,
                ...(onAct ? { onDrop: () => onAct("delete", { ids: [row.id] }),
                              drop: `delete ${row.name}` } : {}),
              };
            })} />
        )}
      </div>
    </div>
  );
}

/** Whether a block draws anything inside itself to list: what it holds, or, a reference, the
 *  one it stands for. The workspace and a package always do. */
export function holds_any(graph: Graph, id: Id): boolean {
  const b = graph.blocks[id];
  if (!b) return false;
  return b.parent === null || !!of_ref(graph, id) || rows_of(graph, id).length > 0;
}
