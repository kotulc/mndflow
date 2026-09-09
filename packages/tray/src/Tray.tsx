/** The context tray: **two tabs, two questions.**
 *
 *  *Definition* is the one thing you have hold of, described — a block, a
 *  relationship or a definition out of the vocabulary, all in one panel.
 *  *Contents* is everything the layer holds, as a table: the only place a
 *  relationship or an interface is found without hunting for it on the drawing.
 *
 *  **One shell: tabs on the left, icon controls on the right.** Below it a
 *  body, and every body is the same pattern — an optional filter rail, optional
 *  column labels, then rows of a label and its content, banded for contrast.
 *
 *  **Three sizes, and two controls for them.** The chevron is a handle on the
 *  tray's own edge, centred and standing slightly above it — it is what you
 *  reach for to open and shut, so it sits on the seam rather than among the
 *  tabs. Expand is far right in the bar and takes the full height, which is
 *  what a long list of fields wants. **Nothing closes it but its own control** —
 *  a click on the canvas selects a row.
 *
 *  A pure function of its props, like every other surface: it holds which tab
 *  and which filter, and every gesture leaves as an action name or a
 *  selection. */

import { useState } from "react";
import { Icon } from "@mnd/theme";
import { rows_of, type Row, type Sort } from "./rows";
import { Element } from "./Element";
import { Chain } from "./Chain";
import { children, is_container, module_of, type Act, type Graph, type Id } from "@mnd/core";

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
  /** **Values, tags and definitions are edited here**, and every change leaves
   *  as an action name like every other gesture in the app. Absent, the tray
   *  lists and edits nothing. */
  onAct?: Act;
  /** Which tab to show. The rail's cog asks for `definition`; left alone the tray
   *  keeps whichever tab was last open. */
  tab?: Tab;
  onTab?: (tab: Tab) => void;
  /** Which definition the vocabulary folder has hold of. **It wins the
   *  definition tab while it is set**: picking a row there is asking about the
   *  definition, not about whatever block was picked before it. One panel
   *  describes all three, so this only decides *which id*. */
  pickedDef?: Id | null;
};

export type Tab = "definition" | "contents";

const HEAD: { key: "kind" | "name" | "what" | "type"; label: string; width: string }[] = [
  { key: "kind", label: "kind", width: "16%" },
  { key: "name", label: "name", width: "26%" },
  { key: "what", label: "what", width: "34%" },
  { key: "type", label: "type", width: "16%" },
];

/** What a filter narrows to. `all` is not a sort, so it is named beside them
 *  rather than being one. */
const FILTERS: { sort: Sort | "all" | "types"; label: string }[] = [
  { sort: "all", label: "all" },
  { sort: "block", label: "blocks" },
  { sort: "interface", label: "interfaces" },
  { sort: "relationship", label: "relations" },
  { sort: "group", label: "groups" },
  { sort: "note", label: "notes" },
  { sort: "types", label: "types" },
];

export function Tray(props: TrayProps) {
  const { graph, layer, label, open, onOpen, picked, onPick, onHover, onAct,
          pickedDef = null } = props;
  const [held_tab, set_held_tab] = useState<Tab>("contents");
  /** **Full height, as a control of its own.** Shut and open is one question;
   *  how much room the body gets is another, and folding them into one chevron
   *  made a third state nobody could reach without passing through a second. */
  const [big, set_big] = useState(false);
  const tab = props.tab ?? held_tab;
  const set_tab = (t: Tab) => { set_held_tab(t); props.onTab?.(t); };
  const [only, set_only] = useState<Sort | "all" | "types">("all");
  /** Field columns the reader asked for, in the order they asked. */
  const [columns, set_columns] = useState<string[]>([]);
  const [adding, set_adding] = useState("");

  const one = picked.length === 1 ? picked[0]! : null;
  const held_def = pickedDef && graph.defs[pickedDef] ? pickedDef : null;

  /** **What the table is about.** A container you have hold of narrows it to
   *  that container's own contents; anything else, and the open layer is what
   *  is listed. Nothing picked is the layer either way. */
  const within = one && graph.blocks[one]
    && (is_container(graph, one) || module_of(graph, one) === "folder") ? one : layer;
  const rows = rows_of(graph, within);
  const shown = only === "all" || only === "types"
    ? rows : rows.filter((r) => r.sort === only);

  /** Every field name in the listing, so a column can be asked for by name
   *  rather than typed blind. */
  const offered = [...new Set(rows.flatMap((r) => Object.keys(r.fields)))]
    .filter((n) => !columns.includes(n)).sort();

  const cell = (row: Row, key: string) =>
    key in row.fields ? row.fields[key]! : String(row[key as keyof Row] ?? "");

  return (
    <section className={["tray", open ? "open" : "shut", open && big ? "big" : ""]
               .filter(Boolean).join(" ")} aria-label="Contents">
      {/* **Tabs left, controls right.** What the tray is showing is a question
          about the model; how big it is, is a question about the window, and
          the two do not belong in the same strip. */}
      {/* **The handle sits on the seam.** Opening and shutting is a gesture
          about the edge between the tray and the drawing, so the control is on
          that edge — centred, and standing proud of it so it can be reached
          while the tray is shut. */}
      <button className="tray-handle" title={open ? "shut the tray" : "open the tray"}
              onClick={() => onOpen(!open)}><Icon name={open ? "less" : "more"} /></button>

      <div className="tray-bar">
        {open ? (
          <span className="tabs">
            <button className={tab === "definition" ? "on" : ""}
                    onClick={() => set_tab("definition")}>definition</button>
            <button className={tab === "contents" ? "on" : ""}
                    onClick={() => set_tab("contents")}>contents</button>
          </span>
        ) : <span className="name">{label}</span>}
        {/* **A count, and only where counting says something.** *One element*
            restated what the panel below it was already showing. */}
        {open && tab === "contents"
          ? <span className="holds">{shown.length} held</span> : null}
        <span className="tray-tools">
          {open ? (
            <button className={big ? "on" : ""}
                    title={big ? "give the stage its room back" : "take the full height"}
                    onClick={() => set_big(!big)}>
              <Icon name={big ? "collapse" : "expand"} />
            </button>
          ) : null}
        </span>
      </div>

      {/* **One panel, one id.** A block, a relationship and a definition answer
          the same questions, so what is being described is whichever was picked
          last — and a definition wins, because picking one *is* what asking
          about it looks like. */}
      {open && tab === "definition" ? (
        <div className="tray-body">
          {(held_def ?? one) && onAct
            ? <Element graph={graph} id={(held_def ?? one)!} onAct={onAct} />
            : <p className="empty">pick one thing to describe it</p>}
        </div>
      ) : null}

      {open && tab === "contents" ? (
        <div className="tray-body">
          <div className="filters">
            {FILTERS.map((f) => (
              <button key={f.sort} className={only === f.sort ? "on" : ""}
                      onClick={() => set_only(f.sort)}>{f.label}</button>
            ))}
            {/* A column per field, so one value can be read down a layer. */}
            <span className="columns">
              {columns.map((name) => (
                <button key={name} className="chip" title={`drop the ${name} column`}
                        onClick={() => set_columns(columns.filter((c) => c !== name))}>
                  {name}<Icon name="remove" size={10} />
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
            </span>
          </div>

          {/* **The types filter is not a list of every definition** — it is what
              the thing you have hold of resolves through, base first and its own
              customisations last. Which is the only reading of "the types here"
              that tells you why a card looks the way it does. */}
          {only === "types" ? (
            <Chain graph={graph} id={one} />
          ) : (
            <table className="contents-table">
              <colgroup>
                {HEAD.map((h) => <col key={h.key} style={{ width: h.width }} />)}
                {columns.map((n) => <col key={n} />)}
              </colgroup>
              <thead>
                <tr>
                  {HEAD.map((h) => <th key={h.key}>{h.label}</th>)}
                  {columns.map((n) => <th key={n}>{n}</th>)}
                </tr>
              </thead>
              <tbody onMouseLeave={() => onHover?.(null)}>
                {shown.map((row) => (
                  <tr key={row.id}
                      className={picked.includes(row.id) ? "picked" : ""}
                      onMouseEnter={() => onHover?.(row.id)}
                      onClick={() => onPick([row.id])}>
                    {HEAD.map((h) => (
                      <td key={h.key} className={h.key} title={row[h.key]}>{row[h.key]}</td>
                    ))}
                    {columns.map((n) => (
                      <td key={n} className="value" title={cell(row, n)}>{cell(row, n)}</td>
                    ))}
                  </tr>
                ))}
                {shown.length === 0 ? (
                  <tr className="empty">
                    <td colSpan={HEAD.length + columns.length}>
                      {within === layer ? "this layer holds nothing yet"
                        : `${children(graph, within).length ? "nothing of that sort" : "it holds nothing yet"}`}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </section>
  );
}
