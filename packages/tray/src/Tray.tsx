/** The context tray: **one shell, one tab per question.**
 *
 *  *Settings* is what the one thing you have hold of is and how it draws,
 *  *fields* is what it carries, and *contents* is everything the layer holds as
 *  a table — the only place a relationship or an interface is found without
 *  hunting for it on the drawing.
 *
 *  **The tabs are what is answerable.** Nothing picked, and only contents has
 *  anything to say; pick a block, a relationship or a definition and the other
 *  two appear, both about that one thing. A tab that said *pick something* was
 *  a way of saying nothing.
 *
 *  **Rules are read nowhere yet.** The panel could state three of the five
 *  kinds and only show the other two, because `look` writes one scalar and
 *  `ends` and `degree` are nested records — and a surface that states half a
 *  vocabulary is worse than one that states none, since what it cannot say is
 *  invisible. `rules_of` and the `rules` component stand; the surface comes
 *  back when all five can be written. See ST.17.
 *
 *  **The bar is the handle.** Its whole background opens and shuts the tray,
 *  with the chevron centred in it saying which way it will go — reaching for the
 *  edge of a panel is the gesture people already have. Expand is far right and
 *  takes the full height, which is what a long list of fields wants.
 *
 *  A pure function of its props, like every other surface: it holds which tab
 *  and which filter, and every gesture leaves as an action name or a
 *  selection. */

import { useState, type MouseEvent } from "react";
import { Icon } from "@mnd/theme";
import { rows_of, type Row, type Sort } from "./rows";
import { Styles } from "./Styles";
import { Fields } from "./Fields";
import { Chain } from "./Chain";
import { Packages } from "./Packages";
import { Templates } from "./Templates";
import { Usages } from "./Usages";
import { children, def_of, is_container, isa, module_of,
         type Act, type Graph, type Id } from "@mnd/core";

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
  /** Which tab to show. The rail's cog asks for `settings`; left alone the tray
   *  keeps whichever tab was last open that still has something to say. */
  tab?: Tab;
  onTab?: (tab: Tab) => void;
  /** Which definition the definitions folder has hold of. **It wins while it is
   *  set**: picking a row there is asking about the definition, not about
   *  whatever block was picked before it. */
  pickedDef?: Id | null;
  /** **The templates tab picks a definition the way the explorer does.** One
   *  panel, one id — so a template row and a definition row set the same state
   *  rather than each keeping their own. */
  onPickDef?: (id: Id | null) => void;
  /** What the rail pointed the tray at, for the two subjects that are not an
   *  element. **Cleared by any selection**, which is how *what you have hold of
   *  wins* is kept true without anything having to arbitrate. */
  scope?: Scope;
};

/** What the tray is about. **Only where the subject cannot say it itself**: a
 *  layer is a block and needs no word, and an element is whatever is picked —
 *  so this names the workspace, and the relation vocabulary before a template
 *  has been picked out of it. */
export type Scope = "element" | "workspace" | "relation";

export type Tab = "settings" | "fields" | "contents" | "templates" | "usages" | "packages";

/** **Three slots, and the words change with the subject.** *Settings* is what
 *  this is; the second slot is what it **declares** — the values a block
 *  carries, the packages a project draws on, the templates a vocabulary offers;
 *  the third is what **exists** — the contents of a layer, or the runs wearing
 *  a stereotype.
 *
 *  A tab that cannot be answered is absent rather than empty, which is the rule
 *  the panel already kept: one that said *pick something* was a way of saying
 *  nothing. */
const SLOTS: Record<"block" | "workspace" | "relation", readonly Tab[]> = {
  block: ["settings", "fields", "contents"],
  workspace: ["settings", "packages", "contents"],
  relation: ["settings", "templates", "usages"],
};

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
          pickedDef = null, onPickDef, scope = "element" } = props;
  const [held_tab, set_held_tab] = useState<Tab>("contents");
  /** Which stereotype the usages tab is reading. **The tab's own**, not the
   *  panel's — holding one says what the lower table lists and nothing about
   *  what the settings tab describes. */
  const [held_sort, set_held_sort] = useState<Id | null>(null);
  /** **Full height, as a control of its own.** Shut and open is one question;
   *  how much room the body gets is another, and folding them into one control
   *  made a third state nobody could reach without passing through a second. */
  const [big, set_big] = useState(false);
  const [only, set_only] = useState<Sort | "all" | "types">("all");
  /** Field columns the reader asked for, in the order they asked. */
  const [columns, set_columns] = useState<string[]>([]);
  const [adding, set_adding] = useState("");

  const one = picked.length === 1 ? picked[0]! : null;
  const held_def = pickedDef && graph.defs[pickedDef] ? pickedDef : null;
  /** **One panel, one id.** A block, a relationship and a definition answer the
   *  same questions, so what is described is whichever was picked last — and a
   *  definition wins, because picking one *is* asking about it. */
  const about = onAct ? held_def ?? one : null;

  /** **The subject says what this is, and the rail only where it cannot.** A
   *  run and a relation definition are both the relation vocabulary, whether
   *  you reached them from the canvas or from the rail — so context is derived
   *  from what is held, and there is no stored mode for a later selection to
   *  contradict. */
  const of_relation = !!about
    && (!!graph.edges[about] || graph.defs[about]?.group === "relation");
  const context = of_relation || (scope === "relation" && !about) ? "relation"
    : scope === "workspace" && (!about || about === graph.root) ? "workspace"
    : "block";

  /** **What can be answered is what is offered.** Contents is always there; the
   *  rest are about one thing, so they arrive with it.
   *
   *  **Nothing to do with a relationship has a fields tab.** An edge holds no
   *  values — what a connection has to say belongs to the blocks at its ends —
   *  so neither a run nor a relation *definition* has a schema to declare.
   *  **Templates and usages are the vocabulary's, not one template's**, so they
   *  stand whether or not anything is held. */
  const slots = SLOTS[context];
  const tabs: readonly Tab[] = slots.filter((t) =>
    t === "settings" ? !!about
      : t === "contents" ? context !== "relation"
      : true);
  const asked = props.tab ?? held_tab;
  const fallback: Tab = tabs.includes("contents") ? "contents" : tabs[tabs.length - 1] ?? "contents";
  const tab: Tab = tabs.includes(asked) ? asked : fallback;
  const set_tab = (t: Tab) => { set_held_tab(t); props.onTab?.(t); };

  /** **What the table is about.** A container you have hold of narrows it to
   *  that container's own contents; anything else, and the open layer is what
   *  is listed. Nothing picked is the layer either way. */
  const within = one && graph.blocks[one]
    && (is_container(graph, one) || module_of(graph, one) === "folder") ? one : layer;
  /** **The workspace is the whole project**, so its contents are everything
   *  under it rather than the top layer's. Not a widened scope: it is the same
   *  question — *what does this hold* — asked of the one holder that holds the
   *  lot. Every other subject stays one level, which is what keeps the word
   *  meaning one thing. */
  const deep = context === "workspace";
  const rows = rows_of(graph, deep ? null : within, deep);
  const shown = only === "all" || only === "types"
    ? rows : rows.filter((r) => r.sort === only);

  /** **How many each chip would leave**, said on the chip. A filter that says
   *  what it narrows to is one nobody has to try to find out — and *types* is a
   *  count of what the picked thing resolves through, which is the one number
   *  that is not about this layer. */
  const counted = (sort: Sort | "all" | "types") =>
    sort === "all" ? rows.length
      : sort === "types" ? (one ? isa(graph, def_of(graph, one)).length : 0)
      : rows.filter((r) => r.sort === sort).length;

  /** Every field name in the listing, so a column can be asked for by name
   *  rather than typed blind. */
  const offered = [...new Set(rows.flatMap((r) => Object.keys(r.fields)))]
    .filter((n) => !columns.includes(n)).sort();

  const cell = (row: Row, key: string) =>
    key in row.fields ? row.fields[key]! : String(row[key as keyof Row] ?? "");

  /** **The bar's background is the handle, and its controls are not.** A click
   *  that landed on a tab or on expand has already been answered. */
  const on_bar = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onOpen(!open);
  };

  return (
    <section className={["tray", open ? "open" : "shut", open && big ? "big" : ""]
               .filter(Boolean).join(" ")} aria-label="Contents">
      <div className="tray-bar" onClick={on_bar}
           title={open ? "shut the tray" : "open the tray"}>
        {open ? (
          <span className="tabs">
            {tabs.map((t) => (
              <button key={t} className={tab === t ? "on" : ""}
                      onClick={() => set_tab(t)}>{t}</button>
            ))}
          </span>
        ) : <span className="name">{label}</span>}

        {/* **The chevron says which way the bar will go.** Centred, because it
            is about the bar as a whole rather than about anything in it. */}
        <span className="tray-chevron"><Icon name={open ? "less" : "more"} /></span>

        <span className="tray-tools">
          {/* **A count, and only where counting says something.** *One element*
              restated what the panel below it was already showing. */}
          {open && tab === "contents"
            ? <span className="holds">{shown.length} held</span> : null}
          {open ? (
            <button className={big ? "on" : ""}
                    title={big ? "give the stage its room back" : "take the full height"}
                    onClick={() => set_big(!big)}>
              <Icon name={big ? "collapse" : "expand"} />
            </button>
          ) : null}
        </span>
      </div>

      {open && onAct && tab !== "contents" ? (
        <div className="tray-body">
          {tab === "settings" && about
            ? <Styles graph={graph} id={about} onAct={onAct} /> : null}
          {tab === "fields" && about
            ? <Fields graph={graph} id={about} onAct={onAct} /> : null}
          {tab === "packages" ? <Packages graph={graph} /> : null}
          {tab === "templates"
            ? <Templates graph={graph} held={held_def} onPick={onPickDef ?? (() => {})}
                         onAct={onAct} /> : null}
          {tab === "usages"
            ? <Usages graph={graph} held={held_sort} onHold={set_held_sort}
                      onHover={onHover} onAct={onAct} /> : null}
        </div>
      ) : null}

      {open && tab === "contents" ? (
        <div className="tray-body">
          <div className="filters">
            {FILTERS.map((f) => (
              <button key={f.sort} className={only === f.sort ? "on" : ""}
                      onClick={() => set_only(f.sort)}>
                {f.label}<span className="count">{counted(f.sort)}</span>
              </button>
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
