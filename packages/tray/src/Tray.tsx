/** The context tray: **one shell, one context, one tab per question.**
 *
 *  **The context is what the tray is about**, and the canvas decides it unless
 *  something else is held:
 *
 *  | gesture | context |
 *  |---|---|
 *  | pick one thing on the canvas | that thing |
 *  | pick nothing, or several | the open layer — the workspace at the root |
 *  | a settings toggle on the rail | the workspace, or a blank definition |
 *  | a definition row, or a row of this tray's own tables | held until the canvas is touched |
 *
 *  **The head names the context** — *workspace*, *block* or *relation*, and the
 *  name — with the chevron before it. The tabs sit under it, in the body,
 *  because they are questions about that context rather than about the tray.
 *
 *  **Rules are read nowhere yet.** See ST.17.
 *
 *  A pure function of its props, like every other surface: it holds which tab,
 *  which filter and the drafts, and every gesture leaves as an action name, a
 *  selection or a hold. */

import { useState, type MouseEvent } from "react";
import { children, def_named, def_of, def_slot, default_for, is_container, is_interface,
         module_of, owner_of, shipped, shown_name,
         type Act, type Definition, type Graph, type Id } from "@mnd/core";
import { Icon } from "@mnd/theme";
import { rows_of, type Row, type Sort } from "./rows";
import { Styles } from "./Styles";
import { Fields } from "./Fields";
import { Packages } from "./Packages";
import { Definitions } from "./Definitions";
import { Entry } from "./Entry";
import { scope_chips, Table, type Column, type Scope } from "./Table";
import { Usages } from "./Usages";
import { aimed, blank, DRAFT, redraft, with_draft, type DraftGroup } from "./draft";

/** **What the tray holds that the canvas did not give it.** An id — the
 *  workspace, a definition, or the subject a table row was picked under — or a
 *  blank definition of one group. Absent, the canvas decides. */
export type Hold = { of: "id"; id: Id } | { of: "draft"; group: DraftGroup };

export type TrayProps = {
  graph: Graph;
  layer: Id | null;
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
  /** Which tab to show. Left alone, the tray keeps whichever tab was last open
   *  that still has something to say. */
  tab?: Tab;
  onTab?: (tab: Tab) => void;
  hold?: Hold | null;
  onHold?: (hold: Hold | null) => void;
  /** **Go to where a row lives**: open its layer and pick it there. Offered on a
   *  row that is not in the open layer, since one that is lights in place. */
  onView?: (layer: Id | null, id: Id) => void;
};

export type Tab = "settings" | "fields" | "contents" | "definitions" | "usages" | "packages";

/** **Three slots, and the words change with the subject.** *Settings* is what
 *  this is; the second slot is what it **declares**; the third is what
 *  **exists**. A tab that cannot be answered is absent rather than empty.
 *
 *  **A line's settings are the definition it follows**; definitions are every
 *  one a line can name, and usages are the lines. */
const SLOTS: Record<"block" | "workspace" | "relation", readonly Tab[]> = {
  block: ["settings", "fields", "contents", "definitions", "usages"],
  workspace: ["settings", "packages", "contents"],
  relation: ["settings", "definitions", "usages"],
};

const HEAD: readonly Column[] = [
  { key: "kind", label: "kind" },
  { key: "name", label: "name" },
  { key: "what", label: "what" },
  { key: "type", label: "type" },
];

/** What a filter narrows to. `all` is not a sort, so it is named beside them. */
const FILTERS: { sort: Sort | "all"; label: string }[] = [
  { sort: "all", label: "all" },
  { sort: "block", label: "blocks" },
  { sort: "interface", label: "interfaces" },
  { sort: "relationship", label: "relations" },
  { sort: "group", label: "groups" },
  { sort: "note", label: "notes" },
];

/** The layer a thing is drawn in: a block in its parent's, an interface in its
 *  owner's, and a relationship where its first end is drawn. */
function home_of(graph: Graph, id: Id): Id | null {
  const e = graph.edges[id];
  const b = graph.blocks[e ? owner_of(graph, e.from) : id];
  if (!b) return null;
  const home = is_interface(b) ? graph.blocks[b.parent ?? ""]?.parent : b.parent;
  /** **The root layer is `null`**, as the open layer names it. */
  return !home || home === graph.root ? null : home;
}

export function Tray(props: TrayProps) {
  const { graph, layer, open, onOpen, picked, onPick, onHover, onAct, onView,
          hold = null, onHold = () => {} } = props;
  const [held_tab, set_held_tab] = useState<Tab>("contents");
  /** **What a line's working definition will be saved as**, per line. */
  const [working, set_working] = useState<Record<Id, string>>({});
  /** **Full height, as a control of its own.** Shut and open is one question;
   *  how much room the body gets is another. */
  const [big, set_big] = useState(false);
  const [only, set_only] = useState<Sort | "all">("all");
  /** Field columns the reader asked for, in the order they asked. */
  const [columns, set_columns] = useState<string[]>([]);
  const [adding, set_adding] = useState("");
  /** **Where the listings reach**, shared by every table that asks, so a tab
   *  change keeps it. The layer until somebody asks for the workspace. */
  const [scope, set_scope] = useState<Scope>("layer");
  /** The listing a table row was picked from, kept while that row is the pick. */
  const [browse, set_browse] = useState<{ id: Id; within: Id | null } | null>(null);
  /** The definition row lit while something on the canvas is picked. */
  const [lit_def, set_lit_def] = useState<Id | null>(null);
  /** **One draft per group, kept until saved.** Clicking away puts the context
   *  back on the canvas and leaves the draft where it was. */
  const [drafts, set_drafts] = useState<Record<DraftGroup, Definition>>(
    () => ({ block: blank("block"), relation: blank("relation") }));

  /** **What the tray is about.** A hold wins while it stands; otherwise the one
   *  thing picked, and otherwise the open layer. */
  const drafting = hold?.of === "draft" ? hold.group : null;
  const view = drafting ? with_draft(graph, drafts[drafting]) : graph;
  const one = picked.length === 1 ? picked[0]! : null;
  const held_id = hold?.of === "id" && (view.defs[hold.id] || view.blocks[hold.id])
    ? hold.id : null;
  const here = layer ?? graph.root;
  const about: Id = drafting ? DRAFT : held_id ?? one ?? here;

  const of_relation = !!view.edges[about] || view.defs[about]?.group === "relation";
  const context = of_relation ? "relation" : about === graph.root ? "workspace" : "block";

  const tabs = SLOTS[context];
  const asked = props.tab ?? held_tab;
  const tab: Tab = tabs.includes(asked) ? asked : tabs[tabs.length - 1]!;
  const set_tab = (t: Tab) => { set_held_tab(t); props.onTab?.(t); };

  /** **A draft is edited through the registry**, and everything else goes out. */
  const act: Act = (name, args) => {
    if (name === "@working") {
      set_working((w) => ({ ...w, [String(args!["id"])]: String(args!["name"] ?? "") }));
      return;
    }
    if (drafting && aimed(args).includes(DRAFT)) {
      const next = redraft(view, drafts[drafting], name, args ?? {});
      if (typeof next !== "string") set_drafts((d) => ({ ...d, [drafting]: next }));
      return;
    }
    onAct?.(name, args);
  };

  /** **Whether a block or a line says anything about its own drawing** — its
   *  working definition, saved under a name. */
  const drawn_looks = (it: { looks?: Record<string, object> } | undefined) =>
    ["card", "style", "line"].some((key) => Object.keys(it?.looks?.[key] ?? {}).length > 0);
  const instance = about !== graph.root ? view.blocks[about] ?? view.edges[about] : undefined;

  /** **Saving files a definition under its name**, as one step: a draft whole, or
   *  a block's or a line's working look. A name already taken is said, and never
   *  looked up. */
  const draft = drafting ? drafts[drafting] : null;
  const line = view.edges[about] ?? null;
  const working_look = !!instance && drawn_looks(instance);
  const naming = draft ? draft.name.trim() : working_look ? (working[about] ?? "").trim() : "";
  /** **A name is unique within its group**, so a line may share a block's. */
  const group = draft ? draft.group : line ? "relation" : "block";
  const taken = !!naming && !!def_named(graph, naming, group);
  const save = !naming || taken ? null
    : draft ? () => {
      onAct?.("define", { name: naming, group: draft.group, extends: draft.extends ?? "",
                          ...(draft.label ? { label: draft.label } : {}),
                          components: draft.components, fields: draft.fields });
      set_drafts((d) => ({ ...d, [draft.group]: blank(draft.group) }));
      /** **The id `define` will file it under**, since the graph in hand is the
       *  one from before the save. */
      onHold({ of: "id", id: def_slot(graph, naming, group) });
    }
    : working_look ? () => {
      act("save_def", { id: about, name: naming });
      set_working((w) => ({ ...w, [about]: "" }));
    }
    : null;

  /** **What styling writes.** A block or a line naming a workspace definition
   *  styles that definition, so every usage follows; one that names none — or
   *  already says something of its own — keeps a working look to save. */
  const typed = instance?.type ? view.defs[instance.type] : undefined;
  const styled: Id = instance && typed && !shipped(typed) && !typed.from && !working_look
    ? typed.id : about;

  /** Whether the context says anything about its drawing at all, which is what
   *  *reset style* would give back — and whether it is somebody else's. */
  const holder = view.defs[styled] ?? view.blocks[styled] ?? view.edges[styled];
  const bag = holder && ("components" in holder ? holder.components : "looks" in holder ? holder.looks : undefined);
  const its_own = ["card", "style", "line"].some((key) => Object.keys(bag?.[key] ?? {}).length > 0);
  const borrowed = !!view.defs[styled]?.from;

  /** **What the table is about.** In the layer scope a container in context
   *  lists its own contents and anything else lists the open layer; the
   *  workspace scope lists everything. **A row picked from the table keeps the
   *  listing it was picked from**, so the table never swaps under the pointer. */
  const within = browse && one === browse.id ? browse.within
    : graph.blocks[about] && about !== graph.root
      && (is_container(graph, about) || module_of(graph, about) === "folder") ? about : layer;
  const deep = scope === "workspace";
  const rows = rows_of(graph, deep ? null : within, deep);
  const shown = only === "all" ? rows : rows.filter((r) => r.sort === only);

  const counted = (sort: Sort | "all") =>
    sort === "all" ? rows.length : rows.filter((r) => r.sort === sort).length;

  const offered = [...new Set(rows.flatMap((r) => Object.keys(r.fields)))]
    .filter((n) => !columns.includes(n)).sort();

  const cell = (row: Row, key: string) =>
    key in row.fields ? row.fields[key]! : String(row[key as keyof Row] ?? "");

  const chips = {
    key: "sort", on: only, onPick: (k: string) => set_only(k as Sort | "all"),
    of: FILTERS.map((f) => ({ key: f.sort, word: f.label, count: counted(f.sort) })),
  };
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

  /** **The definition a line context is about**: the one held, or the one the
   *  line picked resolves through. */
  const held_def = graph.defs[about] ? about : def_of(graph, about) ?? null;

  /** **A row picked here is the context now**, exactly as a pick on the canvas
   *  is: any held definition or draft is let go, and the table stays on the tab
   *  and listing it was picked from. */
  const pick_row = (id: Id) => {
    set_browse({ id, within });
    onPick([id]);
    onHold(null);
  };

  /** **With something picked on the canvas, a definition row only lights**, and
   *  offers to apply itself to what is picked; with nothing picked it becomes the
   *  context. */
  const targets = picked.filter((id) => (context === "relation" ? !!graph.edges[id]
                                                                : !!graph.blocks[id]));
  const pick_def = (id: Id) => {
    if (targets.length && !hold) { set_lit_def(id); return; }
    onHold({ of: "id", id });
  };
  const target_name = targets.length === 1 ? shown_name(graph, targets[0]!)
    : `${targets.length} ${context === "relation" ? "lines" : "blocks"}`;

  /** **The head names the context** — what it is and what it is called, and
   *  nothing about how it came to be the context. */
  const word = drafting ? `new ${drafting} definition`
    : view.defs[about] ? `${view.defs[about]!.group} definition`
    : context === "relation" ? "relation" : context;
  const name = drafting ? drafts[drafting].name
    : view.defs[about] ? view.defs[about]!.name : shown_name(graph, about);

  const on_bar = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onOpen(!open);
  };

  return (
    <section className={["tray", open ? "open" : "shut", open && big ? "big" : ""]
               .filter(Boolean).join(" ")} aria-label="Context">
      <div className="tray-bar" onClick={on_bar}
           title={open ? "shut the tray" : "open the tray"}>
        <span className="tray-chevron"><Icon name={open ? "less" : "more"} /></span>
        <span className="tray-context">
          <span className="word">{word}</span>
          {name ? <span className="name">{name}</span> : null}
          {picked.length > 1 && !hold ? <span className="note">{`${picked.length} items`}</span> : null}
        </span>

        <span className="tray-tools">
          {open && tab === "contents" ? <span className="holds">{shown.length} held</span> : null}
          {open ? (
            <button className={big ? "on" : ""}
                    title={big ? "give the stage its room back" : "take the full height"}
                    onClick={() => set_big(!big)}>
              <Icon name={big ? "collapse" : "expand"} />
            </button>
          ) : null}
        </span>
      </div>

      {open ? (
        <div className="tray-body">
          <div className="tray-tabs">
            {tabs.map((t) => (
              <button key={t} className={tab === t ? "on" : ""} onClick={() => set_tab(t)}>
                {t}
              </button>
            ))}
            {/* **The acts over the whole settings tab**, at the end of the strip
                that opened it: give every look back, and keep what was made. */}
            {onAct && tab === "settings" && about !== graph.root ? (
              <span className="tab-tools">
                <button className="reset" disabled={borrowed || !its_own}
                        title={its_own ? "give every look back to what it inherits"
                                          : "it says nothing of its own to give back"}
                        onClick={() => act("none", { ids: [styled] })}>
                  reset style
                </button>
                {drafting || working_look ? (
                  <button className="reset save" disabled={!save}
                          title={save ? "keep this in the table"
                            : taken ? `${naming} already exists`
                            : "name it to keep it"}
                          onClick={() => save?.()}>
                    save definition
                  </button>
                ) : null}
              </span>
            ) : null}
          </div>

          {onAct && tab === "settings" ? (
            <Styles graph={view} id={about} styled={styled} onAct={act}
                    working={working[about] ?? ""} />
          ) : null}
          {/* **A definition declares fields and an instance answers them.** */}
          {onAct && tab === "fields" ? <Fields graph={view} id={about} onAct={act} /> : null}
          {onAct && tab === "packages" ? <Packages graph={graph} /> : null}
          {onAct && tab === "definitions" ? (
            <Definitions graph={graph} group={context === "relation" ? "relation" : "block"}
                         held={targets.length && !hold ? lit_def ?? held_def : held_def}
                         onAct={act} lines={targets} target={target_name}
                         onPick={pick_def}
                         from={held_def ?? (context === "relation"
                           ? default_for(graph, "line", "relation")
                           : default_for(graph, "block")) ?? ""} />
          ) : null}
          {onAct && tab === "usages" ? (
            <Usages graph={graph} group={context === "relation" ? "relation" : "block"}
                    scope={scope} onScope={set_scope}
                    layer={layer} about={held_def}
                    picked={picked} onPick={pick_row} onHover={onHover} onAct={act}
                    {...(onView ? { onView: (id: Id) => onView(home_of(graph, id), id) } : {})}
                    home={(id) => home_of(graph, id)} />
          ) : null}

          {tab === "contents" && view.defs[about] ? (
            <p className="empty">pick an instance to see its contents</p>
          ) : tab === "contents" ? (
            <Table
              columns={[...HEAD, ...columns.map((n) => ({ key: `@${n}`, label: n }))]}
              chips={[scope_chips(scope, set_scope), chips]} tools={tools} acts="5rem"
              picked={picked} onPick={pick_row} onHover={onHover}
              empty={deep ? "this workspace holds nothing yet"
                : within === layer ? "this layer holds nothing yet"
                : children(graph, within).length ? "nothing of that sort"
                : "it holds nothing yet"}
              rows={shown.map((row) => {
                const home = home_of(graph, row.id);
                const block = graph.blocks[row.id];
                return {
                  id: row.id,
                  titles: Object.fromEntries([...HEAD.map((h) => [h.key, cell(row, h.key)]),
                                              ...columns.map((n) => [`@${n}`, cell(row, n)])]),
                  cells: {
                    kind: row.kind, what: row.what, type: row.type,
                    /** **A block is renamed in its row**; a line is named by its type. */
                    name: onAct && block ? (
                      <Entry value={block.name ?? ""} label={`rename ${row.name}`}
                             placeholder={row.name} blank
                             onCommit={(to) => act("rename", { id: row.id, name: to })} />
                    ) : row.name,
                    ...Object.fromEntries(columns.map((n) => [`@${n}`,
                      onAct && block ? (
                        <Entry value={cell(row, n)} label={`${n} of ${row.name}`} blank
                               onCommit={(to) => act("field", { holder: row.id, name: n,
                                                                value: to })} />
                      ) : cell(row, n)])),
                  },
                  /** **Only on the row picked, and only when it is elsewhere** —
                   *  one that is here already lights. */
                  actions: onView && picked.includes(row.id) && home !== layer ? (
                    <button className="chip" title="open the layer this is in"
                            onClick={(e) => { e.stopPropagation(); onView(home, row.id); }}>
                      view
                    </button>
                  ) : null,
                  ...(onAct ? { onDrop: () => act("delete", { ids: [row.id] }),
                                drop: `delete ${row.name}` } : {}),
                };
              })} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
